# 简化四层权限系统的自动化操作

**文档状态**: ✅ 实施中  
**创建日期**: 2026-02-10  
**关联文档**: `20251205-four-tier-needs.prompt.md`

---

## 背景

四层权限系统（free/standard/premium/allstar）在实施过程中积累了过多的自动化副作用（28个已实现 + 4个待实现），导致：
- 代码复杂度过高，难以调试（例如 add_boss 的 SQL 别名 bug 导致 500 错误）
- 级联操作过多，单个 API 调用触发 4-6 个隐式写操作
- Default Team 概念引入但 Rust model 未对齐，`is_default` 字段在代码中未映射
- 违反用户操作直觉，admin 无法预知一个操作会触发多少后续变更

## 设计原则

**显式操作优于隐式自动化**

参考行业标准（AWS IAM, Stripe, Auth0）：
- 管理操作应该是可预测的、可审计的
- 每个 API 调用做且仅做一件事
- 状态变更应由管理员显式触发，而非链式自动完成
- 保留符合直觉的最小自动化（如 tier 跟随身份变化）

## 具体简化方案

### ❶ 取消"创建组织时自动创建 Default Team"

- **原需求**: 创建组织时自动建 Default Team（20251205-four-tier-needs §19 Step2）
- **改为**: 创建组织后，Admin 手动创建所需团队
- **理由**: 类似 AWS 里先建 Account 再建 OU，拆分操作让每步可独立验证
- **代码影响**: `create_organization()` 保持不变（当前已经是简单创建，未实现自动建团队）
- **废弃概念**: `is_default` 列保留在数据库但不再使用，不再有"不可删除的默认团队"

### ❷ 取消"创建组织时同步指定 Boss"  

- **原需求**: 建组织时同步选 Boss 用户（20251205-four-tier-needs §19 Step1）
- **改为**: 两步操作：先 POST `/org` 创建组织 → 再 POST `/org/:id/bosses` 添加 Boss
- **理由**: 解耦操作，单步错误可独立定位排查
- **代码影响**: `create_organization()` 不变，`add_organization_boss()` 保持独立

### ❸ 取消"Boss 强制加入 Default Team"

- **原需求**: 添加 Boss 时自动加入 Default Team（§16, §19 Step3）
- **改为**: Boss 权限来自 `premium` tier，不依赖团队成员身份。Boss 管不管团队是 admin 手动操作
- **理由**: `is_default` 概念未在 Rust model 中映射，且 Boss 权限基于 tier 而非 team membership
- **代码影响**: `add_organization_boss()` 中删除查找 Default Team + 插入 user_teams 的逻辑

### ❹ 简化 free_user_licenses 的自动撤销/恢复

- **原需求**: 添加成员时自动撤销免费 license，移除时自动恢复（§Flow 2-3）
- **改为**: 
  - 添加成员时：不再显式删除 free_user_licenses 记录
  - 移除成员（降级为 free）时：不再自动恢复 free_user_licenses 记录
  - License 验证时：通过 tier 判断有效性——tier >= standard 时 free license 自然不生效
- **理由**: 减少 2 个事务内写操作，降低 remove_member 的复杂度（不再需要查 source_product_slug → 查 product_id → 查 upid → 创建 license）
- **代码影响**: 
  - `add_member()`: 删除 `FreeUserService::revoke_free_license` 调用
  - `remove_member()`: 删除 `FreeUserService::create_free_license` 调用及相关查询

### ❺ 简化 Boss 移除的降级逻辑

- **原需求**: 移除 Boss 时根据是否在非默认团队决定降级到 standard 还是 free + 清空 org_id + 移除默认团队（§19）
- **改为**: 移除 Boss → 统一降级为 `standard`，保留 `organization_id`。如需变 free，admin 另行把人从团队移除
- **理由**: 去掉 3 层条件判断和 `is_default` 依赖
- **代码影响**: `remove_organization_boss()` 简化为：删除 boss 记录 + UPDATE tier = 'standard'

### ❻ 保留的合理自动化（不改）

以下自动化符合用户直觉，保持不变：
- ✅ 注册 → tier = free（`auth_service.rs`）
- ✅ 添加团队成员 → 消耗配额 + 升级 free → standard（`user_group_service.rs`）
- ✅ 移除团队成员 → 释放配额 + 如果无团队则降级 standard → free（`user_group_service.rs`）
- ✅ 指定 Boss → 升级 premium + 设 organization_id（`organization_service.rs`）
- ✅ 审计日志自动记录（`license_history_service.rs`）

### ❼ 延迟实现（当前阶段不做）

- 🔜 许可证过期自动降级（需定时任务，MVP 阶段手动管理）
- 🔜 删除团队级联降级（先不做删除团队功能，或删除前手动移走成员）

## 副作用对比

| 操作 | 改动前 | 改动后 |
|------|--------|--------|
| 添加团队成员 | 6 (验证配额+消耗+加入+升级tier+撤销license+审计) | 4 (验证配额+消耗+加入+升级tier+审计) |
| 移除团队成员 | 6 (释放配额+移除+检查+降级+恢复license+审计) | 4 (释放配额+移除+检查+降级+审计) |
| 添加 Boss | 4 (插入boss+升级premium+设org+加默认团队) | 2 (插入boss+升级premium+设org) |
| 移除 Boss | 4 (删boss+条件降级+清org+移默认团队) | 2 (删boss+降级standard) |
| 创建组织 | 待实现 3 | 1 (仅创建) |
| **总计** | **~32** | **~18** |

## 影响的文件

| 文件 | 变更内容 |
|------|---------|
| `server/src/services/organization_service.rs` | 简化 add/remove boss |
| `server/src/services/user_group_service.rs` | 移除 free license 撤销/恢复 |
| `.github/prompts/20251205-four-tier-needs.prompt.md` | 更新需求反映简化方案 |
