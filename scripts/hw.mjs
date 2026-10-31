#!/usr/bin/env node
// hw.mjs —— 华为云只读调用脚本（技能入口）
// 首行固定输出 #key=value，便于上层程序解析；--json 时只输出纯 JSON。

import { callApi, DEFAULT_REGION, loadCreds } from './client.mjs'

const argv = process.argv.slice(2)

function takeFlag(name) {
  const i = argv.indexOf(`--${name}`)
  if (i < 0) return undefined
  const value = argv[i + 1]
  if (!value || value.startsWith('--')) return true
  argv.splice(i, 2)
  return value
}

const region = takeFlag('region') || process.env.HUAWEICLOUD_REGION || DEFAULT_REGION
const asJson = takeFlag('json') === true
const limit = Number(takeFlag('limit') || 0)
const command = argv.shift() || 'help'

function out(key, value) {
  console.log(`#${key}=${value}`)
}

function fail(message) {
  console.error(`ERROR ${message}`)
  process.exit(1)
}

function ensureCreds() {
  const creds = loadCreds()
  if (!creds.ak || !creds.sk) fail('NO_CREDS 请设置 HUAWEICLOUD_SDK_AK / HUAWEICLOUD_SDK_SK')
  return creds
}

async function whoami() {
  const res = await callApi({ service: 'iam', method: 'GET', path: '/v3/auth/domains', region })
  if (res.status === 401) fail(`401 签名被拒 ${res.text.slice(0, 200)}`)
  if (!res.ok) fail(`HTTP ${res.status} ${res.text.slice(0, 200)}`)
  const d = res.json?.domains?.[0] ?? {}
  if (asJson) return console.log(JSON.stringify(d, null, 2))
  out('domain', d.id ?? '')
  console.log(`name=${d.name ?? ''}`)
}

async function regions() {
  const res = await callApi({ service: 'iam', method: 'GET', path: '/v3/regions', region })
  if (!res.ok) fail(`HTTP ${res.status} ${res.text.slice(0, 200)}`)
  let list = (res.json?.regions ?? []).map((r) => ({
    id: r.id,
    name: r.locales?.['zh-cn'] ?? r.locales?.['en-us'] ?? '',
  }))
  if (limit > 0) list = list.slice(0, limit)
  if (asJson) return console.log(JSON.stringify(list, null, 2))
  out('regions', res.json?.regions?.length ?? list.length)
  for (const r of list) console.log(`${r.id} ${r.name}`)
}

async function projectId() {
  const res = await callApi({ service: 'iam', method: 'GET', path: '/v3/projects', region })
  if (!res.ok) fail(`HTTP ${res.status} 查询 project 失败`)
  const projects = res.json?.projects ?? []
  const hit = projects.find((p) => p.name === region) ?? projects[0]
  if (!hit) fail(`区域 ${region} 无可用 project`)
  return hit.id
}

async function ecsServers() {
  const pid = await projectId()
  const res = await callApi({ service: 'ecs', method: 'GET', path: `/v2.1/${pid}/servers/detail`, region })
  if (!res.ok) fail(`HTTP ${res.status} ${res.text.slice(0, 200)}`)
  const servers = res.json?.servers ?? []
  if (asJson) return console.log(JSON.stringify(servers, null, 2))
  out('count', servers.length)
  for (const s of servers) {
    console.log(`${s.name} ${String(s.id).slice(0, 8)} ${s.status} ${s.flavor?.id ?? ''}`)
  }
}

async function raw() {
  const service = takeFlag('service') || argv.shift()
  const path = takeFlag('path') || argv.shift()
  const method = (takeFlag('method') || 'GET').toUpperCase()
  if (!service || !path) fail('raw 需要 --service 与 --path')
  if (method !== 'GET') fail('本技能只允许 GET')
  const res = await callApi({ service, method, path, region })
  if (asJson) {
    if (!res.ok) fail(`HTTP ${res.status}`)
    return console.log(JSON.stringify(res.json ?? res.text, null, 2))
  }
  out('status', res.status)
  console.log(JSON.stringify(res.json ?? res.text, null, 2))
  if (!res.ok) process.exit(1)
}

async function main() {
  switch (command) {
    case 'whoami':
      ensureCreds()
      return whoami()
    case 'regions':
      ensureCreds()
      return regions()
    case 'ecs:servers':
      ensureCreds()
      return ecsServers()
    case 'raw':
      ensureCreds()
      return raw()
    default:
      console.log(`hw.mjs —— 华为云只读调用
用法:
  node scripts/hw.mjs whoami
  node scripts/hw.mjs regions [--limit 10]
  node scripts/hw.mjs ecs:servers [--region cn-north-4]
  node scripts/hw.mjs raw --service <s> --path <p> [--region r] [--json]
全局: --json 纯 JSON 输出；--region 覆盖区域（默认 ${DEFAULT_REGION}）`)
  }
}

main().catch((err) => fail(err.message))
