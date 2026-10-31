# 常见问题排查

## 1. `401 verify ak sk signature failed`

IAM 的错误详情里会**回显它自己算出的 canonical_request**（`|` 是换行可视化）。把它和脚本拼装的结果逐段对比，差异立刻定位。三类常见原因：

| 现象 | 原因 | 修法 |
|------|------|------|
| 回显里路径是 `/v3/auth/domains/`，你的是 `/v3/auth/domains` | CanonicalURI 少尾部斜杠 | 签名前统一补 `/`（非根路径） |
| 回显里头块与 SignedHeaders 之间是 `||`（空行），你的是一个 `|` | CanonicalHeaders 块本身以换行结尾 | 拼 canonicalRequest 时头块末尾保留 `\n` |
| 签名算出来一直不对，但结构与回显一致 | 误用了 AWS 的 date/region/service 四级密钥派生 | 华为云只有一次 HMAC，密钥就是 SK |

## 2. `401` 但结构完全一致

检查参与签名的头是否**与实际发出的头一致**：`SignedHeaders` 里列了 `x-domain-id`，就一定要真的发出这个头，且值要一致（前后不能有空格）。

## 3. `404 APIGW.0101 The API does not exist or has not been published`

路径写错，或该接口需要 project 级路径。例如 ECS 列举必须是：

```
/v2.1/{project_id}/servers/detail
```

project id 从 `GET /v3/projects` 里按 region 名匹配。

## 4. `NO_CREDS`

环境变量没设。Windows PowerShell：

```powershell
$env:HUAWEICLOUD_SDK_AK = "..."
$env:HUAWEICLOUD_SDK_SK = "..."
```

## 5. 临时凭证

用 STS 临时凭证时，除了 AK/SK 还要设置 `HUAWEICLOUD_SDK_SECURITY_TOKEN`，脚本会自动加 `X-Security-Token` 头并纳入签名。

## 6. 时钟偏移

`X-Sdk-Date` 与服务器时间偏差过大（一般 > 15 分钟）会被拒。校准系统时间后重试。
