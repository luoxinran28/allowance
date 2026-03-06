# KwongFu 集成实施方案

**状态**: ✅ 已完成  
**创建日期**: 2026-01-22  
**最后更新**: 2026-03-06

---

## 已完成的 5 个阶段

| 阶段 | 内容 | 涉及文件 |
|------|------|---------|
| Phase 1 | CORS 配置 — 添加 KwongFu origins | `server/src/main.rs` 或 CORS 配置 |
| Phase 2 | 产品注册 — UKWONGFU0001 | `products` 表 |
| Phase 3 | JWT 密钥文档 — HS256 共享验证 | `.env` JWT_SECRET |
| Phase 4 | 登录响应增强 — 添加 tier 字段 | `handlers/auth.rs`, AuthResponse 结构体 |
| Phase 5 | Admin 管理 — KwongFu 用户 tier 升级 | 现有 License 管理功能 |

## Tier 映射规则

### 无 source_upid（Allowance 自身前端）

| 用户 Tier | 返回值 |
|-----------|--------|
| allstar | "allstar" |
| premium | "premium" |
| standard | "standard" |
| free | "free" |

### 有 source_upid（KwongFu 等外部产品）

| License 状态 | 返回值 |
|-------------|--------|
| 有 premium license | "premium" |
| 有 standard license | "standard" |
| 无 license | "free" |
