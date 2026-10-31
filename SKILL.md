---
name: huaweicloud-service-call
description: |
  调用华为云任意 REST 服务的最小技能：内置零依赖 SDK-HMAC-SHA256 签名，拿到 AK/SK 即可读 IAM / ECS / OBS 等资源，
  并把「身份确认 → 列资源 → 通用只读调用」整理成固定四步，避免每次现写签名和排错。
  Use when the user wants to call Huawei Cloud APIs from a script or agent — 例如「列出我的云服务器」「查一下账号 ID」
  「帮我调一下华为云某个接口」"call Huawei Cloud API" "list my ECS instances" "get my Huawei Cloud account id"。
  Do NOT use for 计费/下单/删除类写操作（本技能只做只读 GET）。
metadata:
  tags: huawei-cloud, rest, ak-sk, signature, read-only
  version: 2026.10.31.001
---

# 调用华为云服务

拿 AK/SK 直接调华为云 REST 接口，不需要安装官方 SDK。**签名已内置**，重点在「先确认身份，再读资源，最后才自由调用」。

## 前置

| 项 | 说明 |
|----|------|
| 凭证 | 环境变量 `HUAWEICLOUD_SDK_AK` / `HUAWEICLOUD_SDK_SK`（临时凭证再加 `HUAWEICLOUD_SDK_SECURITY_TOKEN`） |
| 运行时 | Node.js ≥ 18（用到内置 `fetch` 与 `node:crypto`） |
| 区域 | 环境变量 `HUAWEICLOUD_REGION`，缺省 `cn-north-4` |

> 只读边界：脚本层只暴露 GET（`hw_raw` 除外，但仍建议只发 GET）。删除/创建类动作请走控制台或自建流程。

## 四步工作流

### Step 1：确认身份（必做）

```bash
node scripts/hw.mjs whoami
# #domain=<账号ID> name=<账号名>
```

拿不到 `#domain` 时**不要继续**，先按 `references/troubleshooting.md` 排查签名与凭证。

### Step 2：确认区域

```bash
node scripts/hw.mjs regions --limit 10
# #regions=<总数> 逐行 <region-id> <中文名>
```

### Step 3：按服务列资源

```bash
node scripts/hw.mjs ecs:servers --region cn-north-4
# #count=<n> 逐行 <name> <id前8位> <status> <flavor>
```

脚本内部会自动用 `/v3/projects` 把区域换成 project id，再调 `/v2.1/{project_id}/servers/detail`。

### Step 4：通用只读调用

```bash
node scripts/hw.mjs raw --service iam --path /v3/projects --json
node scripts/hw.mjs raw --service ecs --path /v2.1/<project_id>/flavors/detail --region cn-north-4
```

## 脚本契约

| 命令 | 成功信号（exit 0 + stdout 首行） | 失败 |
|------|--------------------------------|------|
| `whoami` | `#domain=<id> name=<name>` | exit 1，stderr 含 `401` 或 `NO_CREDS` |
| `regions` | `#regions=<n>` | exit 1 |
| `ecs:servers` | `#count=<n>` | exit 1 |
| `raw` | `#status=<http码>` + JSON | exit 1（非 2xx） |

统一约定：**首行 `#key=value` 供程序解析，其后是人类可读内容**；`--json` 时只输出纯 JSON。

## 签名要点（自己实现时会踩的三个坑）

1. **CanonicalURI 必须补尾部 `/`**：签名用 `/v3/auth/domains/`，请求路径不带斜杠
2. **CanonicalHeaders 块本身以换行结尾**，导致头块与 SignedHeaders 之间有一条空行
3. 华为云 **没有** AWS 那种 date/region/service 密钥派生，签名密钥直接就是 SK

更细的排查见 [references/troubleshooting.md](references/troubleshooting.md)，接口清单见 [references/apis.md](references/apis.md)。
