# 常用只读接口速查

> 所有接口都需要签名头；endpoint 规则为 `{service}.{region}.myhuaweicloud.com`。
> `{pid}` = project id，由 `GET /v3/projects` 按 region 名匹配取得。

## IAM

| 动作 | 方法 | 路径 |
|------|------|------|
| 确认身份（返回账号 domain） | GET | `/v3/auth/domains` |
| 列出区域 | GET | `/v3/regions` |
| 列出 project | GET | `/v3/projects` |
| 列出用户组 | GET | `/v3/groups` |
| 列出 IAM 用户 | GET | `/v3/users` |

## ECS

| 动作 | 方法 | 路径 |
|------|------|------|
| 云服务器详情列表 | GET | `/v2.1/{pid}/servers/detail` |
| 规格列表 | GET | `/v2.1/{pid}/flavors/detail` |
| 镜像列表 | GET | `/v2.1/{pid}/images` |
| 可用分区 | GET | `/v2.1/{pid}/os-availability-zone` |

## VPC

| 动作 | 方法 | 路径 |
|------|------|------|
| VPC 列表 | GET | `/v1/{pid}/vpcs` |
| 子网列表 | GET | `/v1/{pid}/subnets` |
| 安全组列表 | GET | `/v1/{pid}/security-groups` |

## OBS

OBS 用另一套子资源接口，签名头一致但路径是桶级：

```
GET /?obs            # 列桶
GET /{bucket}?prefix=&max-keys=100   # 列对象
```

> OBS 的 host 形态为 `{bucket}.obs.{region}.myhuaweicloud.com`，签名时 host 要带桶名。

## 调用示例

```bash
# 账号身份
node scripts/hw.mjs whoami

# 区域
node scripts/hw.mjs regions --limit 10

# ECS
node scripts/hw.mjs ecs:servers --region cn-north-4

# 任意只读接口
node scripts/hw.mjs raw --service ecs --path /v2.1/<pid>/flavors/detail --json
```
