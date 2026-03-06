# Allowance 授权管理系统 - 核心规格说明

**状态**: ✅ 已完成  
**创建日期**: 2025-11-28  
**最后更新**: 2026-03-06

---

## 系统定位

B端企业级用户授权管理系统，实现 **组织 → 团队 → 用户** 三级授权体系。

## 授权流程

1. **用户注册** → tier=free → 获得免费许可证（永久有效）
2. **组织采购** → Admin 创建产品并分配给组织 → 生成 `org_product_licenses`
3. **团队配额** → Admin 为团队分配配额（从组织池划分） → 约束：所有团队配额总和 ≤ 组织总名额
4. **成员分配** → Team Leader 添加成员并选择产品 → 消耗配额 → tier 升级为 standard
5. **使用验证** → 用户获得 JWT 许可证 → 产品端离线验证
6. **成员移除** → 释放配额 → 若不属于任何团队 → 降级为 free

## 数据模型

### 核心表

| 表名 | 用途 |
|------|------|
| `users` | 用户表，含 tier/source_upid/organization_id |
| `free_user_licenses` | 免费用户许可证（永久有效） |
| `org_product_licenses` | 组织产品许可证池（total/assigned/available） |
| `team_product_quotas` | 团队产品配额（allocated/used/available） |
| `team_member_license_assignments` | 成员许可证分配记录 |
| `user_license_history` | 审计日志 |
| `user_groups` | 团队成员关系（role: leader/admin/member） |
| `organizations` | 组织信息 |
| `groups` | 团队信息 |
| `products` | 产品信息（含 UPID） |

### 数据关系

```
organizations → org_product_licenses → team_product_quotas → team_member_license_assignments → users
                                                                                                ↓
                                                                                        free_user_licenses
```

## 关键约束

| 约束 | 规则 |
|------|------|
| 配额总和 | 所有团队 allocated_count 总和 ≤ 组织 total_count |
| 注册来源 | 添加成员时必须包含用户注册来源产品 |
| 配额使用 | used_count ≤ allocated_count |
| 许可证唯一 | 同一用户在同一团队只能获得同一产品一次（UNIQUE 约束） |

## 业务服务

| 服务 | 文件 | 职责 |
|------|------|------|
| AuthService | `auth_service.rs` | 注册/登录/Token |
| TeamQuotaService | `team_quota_service.rs` | 配额分配/消耗/释放 |
| FreeUserService | `free_user_service.rs` | 免费许可证管理 |
| UserGroupService | `user_group_service.rs` | 团队成员增删 + Tier 转变 |
| LicenseHistoryService | `license_history_service.rs` | 审计日志 |
| PermissionService | `permission_service.rs` | Tier 权限校验 |
| OrganizationService | `organization_service.rs` | 组织 + Boss 管理 |
