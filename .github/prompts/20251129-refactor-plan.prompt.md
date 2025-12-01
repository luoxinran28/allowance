# Allowance 系统重构方案
**创建日期**: 2025年11月29日  
**目标**: 将现有系统从审批流程改造为三层授权架构  
**状态**: ✅ 已确认所有业务规则

---

## 🚨 零、系统性风险分析与修复方案

### 0.1 已识别的三大系统性风险

#### **风险1: Migration 执行机制失效** 🔴 **[阻塞性]**

**问题描述**:
- Migration 011 文件已创建但从未执行
- `setup_db_v2.sh` 脚本未包含 011
- Rust 服务器启动时跳过所有迁移（"Skipping migrations"）
- `_sqlx_migrations` 表为空，无版本追踪

**影响**:
- ❌ `approval_requests` 表仍存在（应被删除）
- ❌ `free_user_licenses` 表不存在（应被创建）
- ❌ `team_product_quotas` 表不存在（应被创建）
- ❌ `user_license_history` 表不存在（应被创建）
- ❌ 数据库与代码完全不同步

**修复方案**: 
- ✅ 删除 `setup_db_v2.sh`，改用 `sqlx::migrate!()` 自动管理
- ✅ 完全重建数据库（DROP DATABASE + CREATE DATABASE）
- ✅ 启用 sqlx migrations 自动追踪

---

#### **风险2: Schema 冗余与设计混乱** 🟠 **[严重]**

**问题描述**:
当前数据库有 24 个表，存在以下冗余：

| 表名 | 状态 | 处理方案 |
|------|------|---------|
| `approval_requests` | 🗑️ 幽灵表（代码已删除） | **删除** |
| `license_approvals` | 🗑️ 幽灵表（代码已删除） | **删除** |
| `license_usage_history` | 🗑️ 与 `user_license_history` 重复 | **删除** |
| `bulk_operations` | 🗑️ 需求未提及 | **删除** |
| `license_batches` | 🗑️ 需求未提及 | **删除** |
| `user_licenses` | 🗑️ 与 `team_member_license_assignments` 冲突 | **删除** |
| `subscriptions` | 🗑️ 与 `users.tier` 重复 | **删除** |
| `product_versions` | ✅ 产品版本管理需要 | **保留** |
| `team_member_license_assignments` | ✅ 付费许可证（已有 group_id） | **保留** |

**许可证表最终设计** (设计B):
- ✅ `team_member_license_assignments` - 所有付费许可证（企业通过团队分配）
- ✅ `free_user_licenses` - 免费用户许可证（新增）

**修复方案**: 创建 Migration 012 清理冗余表

---

#### **风险3: 代码库冗余与AI扫描偏差** 🟡 **[中等]**

**问题描述**:
- 5 处死代码引用已删除的 approval 功能
- 前端保留断链导航（`/admin/approvals`）
- 注释误导（"For now, using admin approvals endpoint"）

**影响**:
- AI 可能认为需要创建 approval 功能
- 用户点击导航会 404
- 代码审查困难

**修复方案**: 清理所有 approval 相关引用

---

### 0.2 修复实施计划

#### **Phase 0: Migration 机制修复** ⚡ **[立即执行]**

**任务清单**:
1. ✅ 删除 `database/setup_db_v2.sh`
2. ✅ 修改 `server/src/main.rs` 启用 `sqlx::migrate!()`
3. ✅ 完全重建数据库
4. ✅ 执行所有 migrations (001-011)
5. ✅ 导入 `seed_data.sql`
6. ✅ 验证表结构正确

**验证标准**:
```bash
# 1. approval_requests 已删除
psql -c "\d approval_requests"  # 应返回 "不存在"

# 2. 新表已创建
psql -c "\d free_user_licenses"
psql -c "\d team_product_quotas"
psql -c "\d user_license_history"

# 3. migration 追踪生效
psql -c "SELECT version FROM _sqlx_migrations ORDER BY version"
# 应有 11 条记录
```

---

#### **Phase 0.5: Schema 清理** 🧹 **[紧随其后]**

**任务清单**:
1. ✅ 创建 Migration 012: 删除冗余表
   ```sql
   DROP TABLE IF EXISTS license_usage_history CASCADE;
   DROP TABLE IF EXISTS bulk_operations CASCADE;
   DROP TABLE IF EXISTS license_batches CASCADE;
   DROP TABLE IF EXISTS user_licenses CASCADE;
   DROP TABLE IF EXISTS subscriptions CASCADE;
   DROP TABLE IF EXISTS license_approvals CASCADE;  -- 如果 011 未删除
   ```

2. ✅ 验证最终表数量
   ```bash
   psql -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"
   # 应为 18-20 个表（24 - 7 = 17，加上新增的 3 个）
   ```

---

#### **Phase 0.6: 代码清理** 🗑️ **[配合执行]**

**任务清单**:
1. ✅ 删除文件:
   - `client/app/dashboard/licenses/assign/page.tsx`（或修复 API 调用）
   
2. ✅ 修改文件:
   - `client/app/admin/layout.tsx:38` - 删除 "Approvals" 导航

3. ✅ 全局搜索清理:
   ```bash
   grep -r "approval" client/ server/ --exclude-dir=node_modules --exclude-dir=target
   # 逐一确认是否需要删除
   ```

---

### 0.3 后续阶段（保持不变）

Phase 1-3 按原计划执行：
- Phase 1: 类型统一化（Subscription.tier 等）
- Phase 2: 业务逻辑补充（组织许可证 UPSERT、团队创建绑定组织）
- Phase 3: 数据一致性加固（CHECK 约束、悲观锁）

---

## 📊 一、差异分析总结

### 关键差异对比

| 模块 | 旧系统实现 | 新需求要求 | 影响范围 |
|------|-----------|----------|---------|
| **审批流程** | ✅ 已实现完整审批系统 | ❌ **不需要**审批流程 | 数据库、后端、前端 |
| **团队配额层** | ❌ 缺失 `team_product_quotas` | ✅ **必需**中间层 | 数据库、后端逻辑 |
| **免费用户许可** | ❌ 缺失 `free_user_licenses` | ✅ **必需**但无每日限制 | 数据库、后端逻辑 |
| **用户注册来源** | ❌ users表缺少 `source_upid` | ✅ **必需**记录注册来源 | 数据库、注册流程 |
| **用户分组表** | ❌ 缺失 `user_groups` | ✅ **必需**团队成员关系 | 数据库、团队管理 |
| **License历史** | ❌ 缺失 | ✅ **必需**记录所有变更 | 数据库、审计 |
| **产品分配逻辑** | 自动分配或简单审批 | **手动多选**产品 | 前端UI、后端API |
| **License架构** | 两层（组织→用户） | **三层**（组织→团队→用户） | 核心业务逻辑 |

---

## 🎯 二、业务规则确认

### 2.1 免费用户逻辑
- ✅ 免费用户**无每日使用次数限制**
- ✅ 免费用户初始状态：`tier=free`，无许可证
- ✅ **触发升级**: 团队领导将免费用户添加到团队时，系统自动分配产品许可证
- ✅ **升级后**: 用户自动变为 `tier=standard`（付费用户）
- ✅ **付费模式**: 线下处理，系统仅记录团队成员关系即代表付费

### 2.2 用户降级逻辑
- ✅ **仅实现** `standard→free` 降级路径
- ✅ `premium` 用户仅系统管理员拥有，**暂不实现** `premium→standard` 降级
- ✅ **触发条件**: 用户从最后一个团队被移除 → 自动降级为 `free`
- ✅ `free` 用户**由系统管理员批量删除**，无自动清理机制

### 2.3 产品分配规则
- ✅ 添加成员时**必须至少选择1个完整产品**（不能0个产品）
- ✅ 支持**多产品同时分配**（例如A+B+C）
- ✅ **无source_upid强制要求**: 用户可以选择任意产品（无强制绑定）
- ✅ **配额检查**: 若团队无用户 `source_upid` 对应的产品配额 → **阻止添加**，提示"团队无该产品配额"
- ✅ 若用户 `source_upid=NULL` → 可选择任意有配额的产品

### 2.4 免费许可证设计
- ✅ 使用 `free_user_licenses` 表记录免费用户许可证
- ✅ **无过期时间**: `expires_at` 字段不需要（永久有效）
- ✅ **升级处理**: 用户升级为 `standard` 时，删除对应 `free_user_licenses` 记录
- ✅ **降级处理**: 用户降级为 `free` 时，重新生成 `free_user_licenses` 记录

### 2.5 系统环境
- ✅ 系统内部逻辑: **UTC时区**
- ✅ 用户界面显示: 根据**用户所在时区**转换后显示
- ✅ 现有数据处理: **全量删除**所有脏数据，用seed_data重新导入

### 2.6 测试数据设置
- ✅ 所有组织、团队的默认配额: **10**
- ✅ 用户规模: 预计不超过 **1000人**
- ✅ 组织数: 不超过 **5个**
- ✅ 团队数: 不超过 **10个**
- ✅ 平均团队成员: **20-30人**
- ✅ 日常在线人数: 不超过 **100人**
- ✅ 并发场景: **无高并发需求**，可接受延迟和排队

---

## 🗄️ 三、数据库重构方案

### 3.1 新增表结构

#### users 表扩展
```sql
ALTER TABLE users 
ADD COLUMN source_upid VARCHAR(50);  -- 注册来源产品UPID

CREATE INDEX idx_users_source_upid ON users(source_upid);
CREATE INDEX idx_users_tier_status ON users(tier, status);
```

#### 3.1.1 free_user_licenses 表（新增）
```sql
CREATE TABLE free_user_licenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upid VARCHAR(50) NOT NULL,
    license_key TEXT NOT NULL,  -- JWT token
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 注意: 无 expires_at、daily_limit 等字段，表示永久有效且无使用限制
    -- 仅在用户升级为 tier=standard 时删除此记录
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_free_user_licenses_upid ON free_user_licenses(upid);
CREATE INDEX idx_free_user_licenses_user ON free_user_licenses(user_id);
CREATE INDEX idx_free_user_licenses_product ON free_user_licenses(product_id);
```

#### 3.1.2 team_product_quotas 表（新增）
```sql
CREATE TABLE team_product_quotas (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    upid VARCHAR(50) NOT NULL,
    allocated_count INT NOT NULL DEFAULT 10,  -- 管理员分配给团队的数量
    used_count INT NOT NULL DEFAULT 0,        -- 已分配给成员的数量
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, product_id),
    CONSTRAINT allocated_ge_used CHECK (allocated_count >= used_count)
);

CREATE INDEX idx_team_quotas_team_id ON team_product_quotas(team_id);
CREATE INDEX idx_team_quotas_org_id ON team_product_quotas(org_id);
CREATE INDEX idx_team_quotas_product_id ON team_product_quotas(product_id);
```

#### 3.1.3 user_license_history 表（新增）
```sql
CREATE TABLE user_license_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    team_id BIGINT REFERENCES groups(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,  -- 'license_created', 'license_revoked', 'tier_upgraded', 'tier_downgraded', 'free_upgraded_to_standard', 'standard_downgraded_to_free'
    old_tier VARCHAR(20),         -- 旧tier
    new_tier VARCHAR(20),         -- 新tier
    old_count INT,                -- 旧配额
    new_count INT,                -- 新配额
    reason VARCHAR(255),          -- 变更原因
    changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- 操作人
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB                -- 额外信息
);

CREATE INDEX idx_license_history_user ON user_license_history(user_id);
CREATE INDEX idx_license_history_action ON user_license_history(action);
CREATE INDEX idx_license_history_changed_at ON user_license_history(changed_at);
```

### 3.2 修改现有表

#### org_product_licenses 表扩展
```sql
ALTER TABLE org_product_licenses 
ADD COLUMN assigned_count INT DEFAULT 0,  -- 已分配给团队的配额
ADD COLUMN available_count INT GENERATED ALWAYS AS (total_count - assigned_count) STORED;

CREATE INDEX idx_org_licenses_assigned ON org_product_licenses(assigned_count);
```

**约束规则**:
- `assigned_count` = 所有 `team_product_quotas.allocated_count` 之和（对于同一产品）
- `available_count` = `total_count - assigned_count`（自动计算）
- 验证规则：所有团队配额总和 ≤ 组织总配额

### 3.3 删除现有表（Migration 011 + 012）

**Migration 011 删除**:
```sql
-- 删除审批相关表
DROP TABLE IF EXISTS approval_requests CASCADE;
DROP TABLE IF EXISTS license_approvals CASCADE;

-- 清理废弃权限
DELETE FROM permissions WHERE code = 'admin:approval_process';
DELETE FROM role_permissions WHERE permission_id NOT IN (
    SELECT id FROM permissions
);
```

**Migration 012 删除**（额外清理冗余表）:
```sql
-- 删除冗余/冲突表
DROP TABLE IF EXISTS license_usage_history CASCADE;
DROP TABLE IF EXISTS bulk_operations CASCADE;
DROP TABLE IF EXISTS license_batches CASCADE;
DROP TABLE IF EXISTS user_licenses CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
```

**最终保留的表** (预计 18-20 个):
- ✅ users, roles, permissions, role_permissions, user_roles
- ✅ organizations, groups, user_groups
- ✅ products, product_versions
- ✅ org_product_licenses, team_member_license_assignments
- ✅ free_user_licenses *(新增)*
- ✅ team_product_quotas *(新增)*
- ✅ user_license_history *(新增)*
- ✅ email_tokens, audit_logs
- ✅ payment_intents, invoices, stripe_webhook_events

### 3.4 数据迁移步骤（完全重建）

#### Step 1: 完全重建数据库
```bash
# 停止服务
docker-compose down

# 删除并重建数据库
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS allowance;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE allowance;"

# 启动服务（自动执行所有 migrations）
docker-compose up -d

# 或手动执行所有迁移（如果 sqlx::migrate! 未启用）
for i in {001..012}; do
  docker-compose exec -T postgres psql -U postgres -d allowance < database/migrations/${i}_*.sql
done
```

**注意**: 不再保留任何旧数据，完全从 seed_data.sql 重新导入

#### Step 2: 重新初始化组织和团队
```sql
-- 管理员从seed_data.sql导入新数据
-- 此时：
-- - users表有新用户（含source_upid字段）
-- - organizations表有新组织
-- - groups表有新团队
-- - products表有新产品
```

#### Step 3: 初始化团队配额
```sql
-- 为每个团队的每个组织产品创建默认配额（10个）
INSERT INTO team_product_quotas (team_id, org_id, product_id, upid, allocated_count, used_count)
SELECT 
    g.id,
    g.organization_id,
    p.id,
    p.upid,
    10,  -- 默认配额
    0
FROM groups g
CROSS JOIN organizations o ON g.organization_id = o.id
CROSS JOIN products p
WHERE o.id = g.organization_id
ON CONFLICT (team_id, product_id) DO NOTHING;
```

#### Step 4: 初始化org_product_licenses的分配数据
```sql
-- 计算每个组织的配额分配情况
UPDATE org_product_licenses opl
SET assigned_count = (
    SELECT COALESCE(SUM(tpq.allocated_count), 0)
    FROM team_product_quotas tpq
    WHERE tpq.org_id = opl.organization_id 
      AND tpq.product_id = opl.product_id
);
```

---

## 🔧 四、后端代码重构方案

### 4.1 删除审批相关代码

**删除文件**:
- `server/src/models/approval.rs`
- `server/src/services/approval_service.rs`（如存在）

**删除代码块**:
- `server/src/handlers/admin.rs`:
  - `list_approvals()` 函数及对应路由
  - `get_approval()` 函数及对应路由
  - `approve_request()` 函数及对应路由
  - `reject_request()` 函数及对应路由
  - `ApprovalActionRequest` 结构体

- `server/src/handlers/mod.rs`:
  - 审批相关路由注册（如 `/admin/approvals`、`/approvals/{id}/review`）

- `server/src/models/mod.rs`:
  - 移除 `mod approval;`

### 4.2 新增核心服务

#### 4.2.1 team_quota_service.rs（新建）
```rust
pub struct TeamQuotaService;

impl TeamQuotaService {
    /// 为团队分配产品配额（管理员操作）
    pub async fn allocate_quota(
        pool: &PgPool,
        team_id: i64,
        product_id: i64,
        upid: &str,
        allocated_count: i32,
    ) -> AppResult<TeamProductQuota>
    
    /// 验证团队配额是否充足
    pub async fn check_quota_available(
        pool: &PgPool,
        team_id: i64,
        product_id: i64,
        count: i32,
    ) -> AppResult<bool>
    
    /// 检查组织配额是否充足
    pub async fn check_org_quota_available(
        pool: &PgPool,
        org_id: i64,
        product_id: i64,
        additional_count: i32,
    ) -> AppResult<bool>
    
    /// 使用配额（添加成员时）
    pub async fn consume_quota(
        pool: &PgPool,
        team_id: i64,
        product_id: i64,
    ) -> AppResult<()>
    
    /// 释放配额（移除成员时）
    pub async fn release_quota(
        pool: &PgPool,
        team_id: i64,
        product_id: i64,
    ) -> AppResult<()>
    
    /// 获取团队配额汇总
    pub async fn get_team_quota_summary(
        pool: &PgPool,
        team_id: i64,
    ) -> AppResult<Vec<TeamQuotaResponse>>
}
```

#### 4.2.2 free_user_service.rs（新建）
```rust
pub struct FreeUserService;

impl FreeUserService {
    /// 为新注册免费用户创建许可证
    pub async fn create_free_license(
        pool: &PgPool,
        user_id: i64,
        product_id: i64,
        upid: &str,
    ) -> AppResult<FreeUserLicense>
    
    /// 用户升级时删除免费许可证
    pub async fn revoke_free_license(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<()>
    
    /// 用户降级时恢复免费许可证
    pub async fn restore_free_license(
        pool: &PgPool,
        user_id: i64,
        upid: &str,
    ) -> AppResult<FreeUserLicense>
    
    /// 批量删除免费用户
    pub async fn delete_free_users(
        pool: &PgPool,
        user_ids: Vec<i64>,
    ) -> AppResult<i64>  // 返回删除数量
}
```

#### 4.2.3 user_group_service.rs（新建）
```rust
pub struct UserGroupService;

impl UserGroupService {
    /// 添加用户到团队（带产品多选）
    /// 
    /// 业务逻辑:
    /// 1. 验证用户状态
    /// 2. 如果用户source_upid有值，检查团队是否有该产品配额
    /// 3. 检查所选产品的配额是否充足
    /// 4. 若用户是free，升级为standard，删除free_user_licenses
    /// 5. 为每个选中的产品创建user_license_assignment
    /// 6. 扣减team_product_quotas的used_count
    /// 7. 更新org_product_licenses的assigned_count
    /// 8. 记录到user_license_history
    pub async fn add_member(
        pool: &PgPool,
        team_id: i64,
        user_id: i64,
        selected_upids: Vec<String>,  // 必须至少1个产品
        role: &str,
        changed_by: i64,
    ) -> AppResult<Vec<UserGroup>>
    
    /// 更新成员的产品分配（暂未实现，后续可需）
    pub async fn update_member_products(
        pool: &PgPool,
        team_id: i64,
        user_id: i64,
        selected_upids: Vec<String>,
    ) -> AppResult<Vec<UserGroup>>
    
    /// 移除用户（自动处理降级逻辑）
    /// 
    /// 业务逻辑:
    /// 1. 删除user_groups记录
    /// 2. 删除team_member_license_assignments记录
    /// 3. 释放team_product_quotas中的used_count
    /// 4. 检查用户是否还在其他团队
    /// 5. 若不在任何团队，降级tier=free，恢复free_user_licenses
    /// 6. 记录到user_license_history
    pub async fn remove_member(
        pool: &PgPool,
        team_id: i64,
        user_id: i64,
        changed_by: i64,
    ) -> AppResult<()>
    
    /// 获取团队成员列表
    pub async fn list_team_members(
        pool: &PgPool,
        team_id: i64,
    ) -> AppResult<Vec<TeamMemberResponse>>
}
```

#### 4.2.4 license_history_service.rs（新建）
```rust
pub struct LicenseHistoryService;

impl LicenseHistoryService {
    /// 记录许可证变更历史
    pub async fn record_change(
        pool: &PgPool,
        user_id: i64,
        action: &str,
        old_tier: Option<&str>,
        new_tier: Option<&str>,
        reason: &str,
        changed_by: i64,
        metadata: Option<serde_json::Value>,
    ) -> AppResult<()>
}
```

### 4.3 重构现有服务

#### auth_service.rs
**修改**: 注册时记录 `source_upid`

```rust
pub async fn register(
    pool: &PgPool,
    email: &str,
    password: &str,
    source_upid: Option<&str>,  // 从URL或注册页面参数获取
) -> AppResult<User> {
    // ...验证逻辑...
    
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (uid, email, password_hash, tier, status, source_upid)
        VALUES ($1, $2, $3, 'free', 'active', $4)
        RETURNING *
        "#
    )
        .bind(uid)
        .bind(email)
        .bind(password_hash)
        .bind(source_upid)
        .fetch_one(pool)
        .await?;
    
    // 为免费用户生成许可证（如果指定了source_upid）
    if let Some(upid) = source_upid {
        let product = sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE upid = $1"
        )
            .bind(upid)
            .fetch_one(pool)
            .await?;
        
        FreeUserService::create_free_license(pool, user.id, product.id, upid).await?;
    }
    
    Ok(user)
}
```

#### team_service.rs
**修改**: 添加成员逻辑改为调用 `UserGroupService::add_member`，支持产品多选

```rust
pub async fn add_member(
    pool: &PgPool,
    team_id: i64,
    user_id: i64,
    selected_upids: Vec<String>,  // 新参数：选中的产品UPID列表
    role: &str,
) -> AppResult<Vec<UserGroup>> {
    UserGroupService::add_member(pool, team_id, user_id, selected_upids, role, admin_id).await
}
```

#### license_service.rs
**修改**: JWT生成时区分free和standard用户

```rust
pub async fn generate_license_token(
    pool: &PgPool,
    user_id: i64,
    product_id: i64,
) -> AppResult<String> {
    let user = get_user(pool, user_id).await?;
    
    // 区分tier获取限制
    let (daily_limit, monthly_limit) = if user.tier == UserTier::Free {
        (3, 100)  // 如果free有限制的话
    } else if user.tier == UserTier::Standard {
        (None, None)  // standard无限制
    } else {
        (None, None)  // premium无限制
    };
    
    // 生成JWT...
}
```

### 4.4 新增API处理器

#### handlers/team_quota.rs（新建）
```rust
pub async fn list_team_quotas(
    State(handler): State<Arc<AppHandler>>,
    Path(team_id): Path<i64>,
) -> AppResult<Json<Vec<TeamQuotaResponse>>>

pub async fn allocate_quota(
    State(handler): State<Arc<AppHandler>>,
    Json(req): Json<AllocateQuotaRequest>,
) -> AppResult<Json<TeamProductQuota>>

pub async fn update_quota(
    State(handler): State<Arc<AppHandler>>,
    Path(quota_id): Path<i64>,
    Json(req): Json<UpdateQuotaRequest>,
) -> AppResult<Json<TeamProductQuota>>
```

#### handlers/user_group.rs（新建/重构）
```rust
pub async fn add_team_member(
    State(handler): State<Arc<AppHandler>>,
    Path(team_id): Path<i64>,
    Json(req): Json<AddMemberRequest>,  // 含selected_upids字段
) -> AppResult<Json<Vec<UserGroupResponse>>>

pub async fn remove_team_member(
    State(handler): State<Arc<AppHandler>>,
    Path(team_id): Path<i64>,
    Path(user_id): Path<i64>,
) -> AppResult<Json<MessageResponse>>

pub async fn list_team_members(
    State(handler): State<Arc<AppHandler>>,
    Path(team_id): Path<i64>,
) -> AppResult<Json<Vec<TeamMemberResponse>>>
```

### 4.5 路由更新

```rust
// server/src/main.rs 或 handlers/mod.rs

// 删除审批相关路由
// - .route("/admin/approvals", get(admin::list_approvals))
// - .route("/admin/approvals/:id", get(admin::get_approval))
// - .route("/admin/approvals/:id/approve", post(admin::approve_request))
// - .route("/admin/approvals/:id/reject", post(admin::reject_request))
// - .route("/approvals", get(team::get_pending_approvals))

// 新增团队配额路由
.route("/admin/team-quotas/:team_id", get(team_quota::list_team_quotas))
.route("/admin/team-quotas", post(team_quota::allocate_quota))
.route("/admin/team-quotas/:quota_id", put(team_quota::update_quota))

// 新增/更新用户分组路由
.route("/teams/:team_id/members", post(user_group::add_team_member))
.route("/teams/:team_id/members/:user_id", delete(user_group::remove_team_member))
.route("/teams/:team_id/members", get(user_group::list_team_members))
```

---

## 💻 五、前端代码重构方案

### 5.1 删除废弃页面和组件

**删除目录**:
- `client/app/admin/approvals/` （整个目录）
- `client/app/dashboard/licenses/request/` （整个目录）
- `client/components/approvals/` （整个目录）

**删除API方法** (`client/lib/api-client.ts`):
- `getPendingApprovals()`
- `reviewLicenseRequest()`
- `listApprovals()`
- `getApproval()`
- `approveRequest()`
- `rejectRequest()`

### 5.2 新增页面

#### A. 管理员 - 团队配额分配页面
```
位置: client/app/admin/team-quotas/page.tsx

功能:
- 展示所有团队的产品配额分配情况
- 表格列: 团队名 | 组织 | 产品UPID | 已分配数 | 已使用数 | 剩余数 | 操作
- 操作按钮: "修改配额"（弹出Modal）
- Modal: 
  • 显示组织总配额和当前分配情况
  • 输入新的分配数量
  • 实时验证：新配额 ≤ 组织剩余可分配数
  • 提交变更

可视化显示:
- 组织维度: 总采购数 | 已分配给团队 | 可用余额
- 团队维度: 分配数 | 已使用 | 剩余
- 使用率百分比图表
```

### 5.3 重构现有页面

#### B. 团队领导 - 添加成员页面
```
位置: client/app/dashboard/teams/[id]/members/add.tsx

流程:
1. 搜索用户输入框（支持邮箱/UID搜索）
2. 显示搜索结果列表（用户邮箱、状态、当前tier）
3. 选择用户后，展示:
   - 用户基本信息
   - 用户source_upid（如果有）
   - 用户当前团队列表
4. **产品多选框**:
   - 从该团队拥有的所有产品中选择
   - 为每个产品显示: 产品名 | 剩余配额 | 复选框
   - 禁用配额已满的产品
   - 若用户有source_upid，提示：用户注册来源是该产品
5. **验证逻辑**:
   - 用户source_upid非空 + 团队无该产品配额 → 红色警告，阻止添加
   - 至少选择1个产品 → 允许
   - 0个产品选择 → 禁用提交按钮
6. 提交 → API调用 → 成功后刷新成员列表

错误提示:
- "该用户的注册来源产品 {upid} 不在团队配额中"
- "产品 {name} 配额不足（剩余 {n}）"
- "请至少选择1个产品"
- "该用户已是此团队成员"
```

#### C. 团队领导 - 成员管理页面
```
位置: client/app/dashboard/teams/[id]/members/page.tsx

现有功能保留:
- 成员列表展示
- 移除成员功能

新增功能:
- 表格新增列: "已分配产品" (显示该成员的所有产品列表)
- 操作按钮: "查看许可证"（弹窗显示该成员的所有许可证详情）
- 移除成员确认提示: "将释放该成员在 {products} 产品上的配额"

若需要未来扩展:
- 编辑成员产品分配（暂不实现）
```

### 5.4 API Client更新

```typescript
// client/lib/api-client.ts

// 删除审批相关（8个方法）
// - getPendingApprovals()
// - reviewLicenseRequest()
// - listApprovals()
// - getApproval()
// - approveRequest()
// - rejectRequest()

// 新增团队配额管理
+ listTeamQuotas(teamId: number): Promise<TeamQuotaResponse[]>
+ allocateTeamQuota(teamId: number, productId: number, allocatedCount: number): Promise<TeamProductQuota>
+ updateTeamQuota(quotaId: number, allocatedCount: number): Promise<TeamProductQuota>

// 新增用户分组管理
+ addTeamMember(
    teamId: number, 
    userId: number, 
    selectedUpids: string[],  // 关键：支持多产品选择
    role: string
  ): Promise<UserGroup[]>
+ removeTeamMember(teamId: number, userId: number): Promise<void>
+ listTeamMembers(teamId: number): Promise<TeamMemberResponse[]>

// 修改现有方法
● searchUsers(keyword: string): Promise<UserSearchResult[]>  // 用于添加成员时搜索
```

### 5.5 导航菜单更新

```typescript
// client/components/layout/Sidebar.tsx

// 管理员菜单
- { name: "审批管理", href: "/admin/approvals", icon: CheckCircle }  // 删除
+ { name: "团队配额", href: "/admin/team-quotas", icon: PieChart }   // 新增

// 团队领导菜单
- { name: "待审批申请", href: "/dashboard/approvals", icon: Clock }  // 删除

// 普通员工菜单
- { name: "申请许可证", href: "/dashboard/licenses/request", icon: Send }  // 删除

// 保留并增强
● { name: "我的团队", href: "/dashboard/teams", icon: Users }
  → 子菜单: "成员管理", "配额查看", "许可证查看"
```

---

## 🧪 六、测试和验证方案

### 6.1 单元测试

#### 配额验证测试
```rust
// server/tests/team_quota_tests.rs

#[tokio::test]
async fn test_allocate_quota_exceeds_org_limit() {
    // 验证: 分配总数超过组织总数时应失败
}

#[tokio::test]
async fn test_consume_quota_insufficient() {
    // 验证: 配额不足时添加成员应失败
}

#[tokio::test]
async fn test_release_quota_on_member_removal() {
    // 验证: 移除成员时应正确释放配额
}
```

#### 用户降级测试
```rust
// server/tests/user_group_tests.rs

#[tokio::test]
async fn test_add_member_source_upid_no_quota() {
    // 验证: 用户注册来源产品无配额时应阻止
}

#[tokio::test]
async fn test_remove_member_downgrades_to_free() {
    // 验证: 移除最后一个团队时应降级为free
}

#[tokio::test]
async fn test_downgrade_creates_free_license() {
    // 验证: 降级时应恢复free_user_licenses记录
}
```

### 6.2 集成测试场景

| 测试场景 | 验证点 | 预期结果 |
|---------|-------|---------|
| **免费用户升级流程** | 注册→加入团队→tier变化 | tier: free→standard, free_user_licenses删除 |
| **配额扣减准确性** | 添加3个成员 | team_product_quotas.used_count=3, org_product_licenses.assigned_count正确更新 |
| **多产品分配** | 同时分配3个产品 | 3条team_member_license_assignments记录 |
| **降级流程** | 从最后一个团队移除 | tier: standard→free, 恢复free_user_licenses |
| **配额约束** | 尝试超额分配 | 返回400错误，数据未变更 |
| **source_upid验证** | user.source_upid≠NULL，团队无该配额 | 阻止添加，提示错误 |

### 6.3 端到端测试脚本

```bash
# tests/e2e/test_three_tier_flow.sh

#!/bin/bash

echo "=== E2E Test: Three-Tier Authorization Flow ==="

# 获取测试token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4040/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@allowance.test","password":""}' \
  | jq -r '.token')

LEADER_TOKEN=$(curl -s -X POST http://localhost:4040/auth/login \
  -H "Content-Type: application/json" \    
，   -d '{"email":"leader1@allowance.test","password":""}' \
  | jq -r '.token')

echo "✓ Admin token acquired"
echo "✓ Leader token acquired"

# 场景1: 查看组织许可证池
echo -e "\n[Test 1] View organization license pools"
curl -s -X GET http://localhost:4040/admin/org-licenses/ACME001 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# 场景2: 分配团队配额
echo -e "\n[Test 2] Allocate team quotas"
curl -s -X POST http://localhost:4040/admin/team-quotas \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": 1,
    "product_id": 1,
    "allocated_count": 25
  }' | jq .

# 场景3: 查看团队配额
echo -e "\n[Test 3] View team quotas"
curl -s -X GET http://localhost:4040/admin/team-quotas/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# 场景4: 搜索用户（准备添加成员）
echo -e "\n[Test 4] Search users"
curl -s -X GET "http://localhost:4040/users/search?keyword=free%40allowance.test" \
  -H "Authorization: Bearer $LEADER_TOKEN" | jq .

# 场景5: 添加免费用户到团队（多产品）
echo -e "\n[Test 5] Add free user to team with multiple products"
curl -s -X POST http://localhost:4040/teams/1/members \
  -H "Authorization: Bearer $LEADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 5,
    "selected_upids": ["UALLOWANCE0001", "UPROD000001"],
    "role": "member"
  }' | jq .

# 验证: 用户tier已变为standard
curl -s -X GET http://localhost:4040/users/5 \
  -H "Authorization: Bearer $LEADER_TOKEN" | jq '.tier'

# 验证: free_user_licenses已删除
curl -s -X GET http://localhost:4040/users/5/free-licenses \
  -H "Authorization: Bearer $LEADER_TOKEN" | jq '.count'

# 场景6: 移除成员（应降级为free）
echo -e "\n[Test 6] Remove member from team"
curl -s -X DELETE http://localhost:4040/teams/1/members/5 \
  -H "Authorization: Bearer $LEADER_TOKEN" | jq .

# 验证: 用户tier已变为free
curl -s -X GET http://localhost:4040/users/5 \
  -H "Authorization: Bearer $LEADER_TOKEN" | jq '.tier'

# 验证: free_user_licenses已恢复
curl -s -X GET http://localhost:4040/users/5/free-licenses \
  -H "Authorization: Bearer $LEADER_TOKEN" | jq '.count'

echo -e "\n✓ All E2E tests completed"
```

---

## ⚠️ 七、数据删除和迁移清单

### 7.1 清理步骤

```sql
-- 在执行任何新建操作前，备份并清空现有数据

-- 1. 备份（可选）
COPY users TO '/tmp/users_backup.csv' WITH CSV;
COPY user_licenses TO '/tmp/user_licenses_backup.csv' WITH CSV;

-- 2. 清空业务数据
TRUNCATE TABLE approval_requests CASCADE;
TRUNCATE TABLE user_licenses CASCADE;
TRUNCATE TABLE subscriptions CASCADE;
TRUNCATE TABLE user_groups CASCADE;
TRUNCATE TABLE groups CASCADE;
TRUNCATE TABLE organizations CASCADE;
TRUNCATE TABLE org_product_licenses CASCADE;
TRUNCATE TABLE users CASCADE;  -- 保留admin账户或手动保留必要用户

-- 3. 重新导入测试数据
\i database/seed_data.sql
```

### 7.2 seed_data.sql 更新点

现有 `database/seed_data.sql` 需更新以支持新数据模型：

```sql
-- 新增: 在创建users时指定source_upid
INSERT INTO users (uid, email, password_hash, tier, status, source_upid, ...)
VALUES (..., 'UALLOWANCE0001', ...)

-- 新增: 创建free_user_licenses（仅对free用户）
INSERT INTO free_user_licenses (user_id, product_id, upid, license_key, ...)
SELECT u.id, p.id, p.upid, generate_license_key(), ...
FROM users u
CROSS JOIN products p
WHERE u.tier = 'free'

-- 新增: 创建team_product_quotas（为每个团队-产品对创建配额）
INSERT INTO team_product_quotas (team_id, org_id, product_id, upid, allocated_count, used_count)
SELECT g.id, o.id, p.id, p.upid, 10, 0
FROM groups g
CROSS JOIN organizations o ON g.organization_id = o.id
## 🚀 八、实施时间线（已更新）

| 阶段 | 任务 | 预计耗时 | 依赖 |
|------|------|---------|------|
| **0. Migration修复** | 删除setup_db_v2.sh、启用sqlx迁移、重建数据库 | **0.5天** | - |
| **0.5. Schema清理** | 创建Migration 012、删除冗余表、验证 | **0.5天** | Phase 0 |
| **0.6. 代码清理** | 删除死代码、修复断链、清理注释 | **0.5天** | - |
| **1. 类型统一** | 修复tier/status类型不匹配 | **1天** | Phase 0.5 |
| **2. 后端重构** | 删除审批代码、新建服务、重构处理器 | **2.5天** | Phase 1 |
| **3. 前端重构** | 删除审批页面、新建配额页面、重构团队成员页面 | **3天** | Phase 2 |
| **4. 集成测试** | 端到端测试、单元测试、性能验证 | **2天** | Phase 3 |
| **5. 文档更新** | 更新API文档、README、部署说明 | **0.5天** | Phase 4 |
| **总计** | | **10.5天** | |

**关键路径**: Phase 0 → 0.5 → 1 → 2 → 3 → 4 → 5  
**并行机会**: Phase 0.6 可与 Phase 0.5 同时进行on 011、执行数据迁移、清空脏数据、导入seed_data | 2天 | - |
| **2. 后端** | 删除审批代码、新建服务、重构处理器、更新路由 | 3天 | 数据库完成 |
| **3. 前端** | 删除审批页面、新建配额页面、重构团队成员页面 | 3天 | 后端API完成 |
| **4. 集成测试** | 端到端测试、单元测试、性能验证 | 2天 | 前后端完成 |
| **5. 文档更新** | 更新API文档、README、部署说明 | 1天 | 所有开发完成 |
| **总计** | | **11天** | |

---

## ✅ 九、成功标准

系统重构完成后，应满足以下所有条件：

1. ✅ **数据完整性**: 所有测试数据正确导入，无记录丢失
2. ✅ **功能完整性**: 新需求文档中的6大流程全部实现
3. ✅ **零审批痕迹**: 代码库、数据库、UI中无任何审批相关代码
4. ✅ **三层架构**: 组织→团队→用户授权链路清晰可追溯
5. ✅ **配额约束**: 数据库和应用层双重验证，无超卖可能
6. ✅ **免费升级**: 免费用户加入团队时自动升级为standard
7. ✅ **自动降级**: 用户移除后自动降级为free
8. ✅ **多产品支持**: 支持一个成员分配多个产品
9. ✅ **历史追踪**: user_license_history记录所有变更
10. ✅ **测试覆盖**: 核心流程有自动化测试覆盖

---

## 📌 十、重要提醒

1. **迁移不可逆**: 执行数据删除前务必备份（虽然现在都是测试数据）
2. **分阶段验证**: 完成每个阶段后立即验证，不要全部完成再测试
3. **Git提交粒度**: 建议按阶段提交（数据库迁移一次、后端一次、前端一次）
4. **依赖更新**: 检查 `Cargo.toml` 和 `package.json` 是否需要依赖更新
5. **环境变量**: 确认所有环境变量（JWT_SECRET、数据库连接等）配置正确

---

**本方案已获得产品负责人确认，可直接执行。**
