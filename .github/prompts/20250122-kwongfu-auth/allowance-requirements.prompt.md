# Allowance 对 KwongFu 的集成支持

**状态**: ✅ 已完成  
**创建日期**: 2026-01-22  
**最后更新**: 2026-03-06

---

## 已完成配置

| 需求 | 状态 |
|------|------|
| CORS 允许 KwongFu 前端访问 | ✅ 已添加 localhost:3060, localhost:4060 |
| 注册 KwongFu 产品 (UPID: UKWONGFU0001) | ✅ 已插入 products 表 |
| JWT 共享密钥 (HS256) | ✅ 已验证算法兼容，密钥可配置共享 |
| 登录响应包含 tier 字段 | ✅ 已实现双路径 tier 判定 |
| Admin 管理 KwongFu 用户升级 | ✅ 通过现有 License 管理功能 |

## Tier 判定双路径

- **有 source_upid**（KwongFu 登录）：根据 UPID 对应的 License 状态返回 tier
- **无 source_upid**（Allowance 自身登录）：根据用户全局 tier 返回

## 向后兼容

- source_upid 为可选参数，Allowance 前端无需修改
- 响应格式仅增加字段，不删除/重命名现有字段
