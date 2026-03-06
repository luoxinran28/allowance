# UPID、Nonce、License 机制

**状态**: ✅ 已完成  
**创建日期**: 2025-11-12  
**最后更新**: 2026-03-06

---

## UPID（统一产品标识）

- 格式：`UPID-{product_slug}-{tier}`，例如 `UPID-kwongfu-free`
- 用户注册时，UPID 由 HTML meta 标签 `allowance-upid` 自动获取
- UPID 存储在 `users.source_upid` 字段，标识用户注册来源产品
- 每个产品的不同规格（free/standard/premium）对应不同 UPID

## Nonce 防重放机制

- 所有 POST/PUT/DELETE 请求携带三重验证：`X-Timestamp` + `X-Nonce` + `X-Sign`
- 签名算法：HMAC-SHA256，签名内容为 `${timestamp}${nonce}${bodyHash}`
- Nonce 存储在 Redis 中，每个 Nonce 只能使用一次
- 前端 `api-client.ts` 自动注入，后端 `middleware/nonce.rs` 验证
- Redis 缓存服务：`services/redis_nonce_service.rs`

## License（许可证）

- License 为自包含 JWT，支持离线验证
- JWT 内容：user_id, product_id, tier, daily_limit, monthly_limit, exp
- 三级配额分配模型：
  - 组织级：`org_product_licenses`（组织购买的产品池）
  - 团队级：`team_product_quotas`（从组织池划分的配额）
  - 用户级：`team_member_license_assignments`（个人 JWT 许可证）
- 免费用户注册时获得 `free_user_licenses`（永久有效）
- 后端实现：`utils/license.rs`，前端验证：`client/lib/license.ts`
