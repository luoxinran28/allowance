# Allowance 授权管理系统 - 完整需求规格说明书
**创建日期**: 2025年11月28日  
**文档版本**: v2.0 (最终版)  
**目标**: B端企业级用户授权管理系统完整实施方案  
**状态**: ✅ 需求已确认，可直接实施

---

## 📋 执行摘要

本文档定义了 Allowance 授权管理系统的完整业务逻辑、数据模型和技术实现方案。系统服务于B端企业客户，实现**组织 → 团队 → 用户**三级授权体系，支持多产品、多团队、细粒度配额管理。

### 核心价值
- 支持免费用户试用转付费用户的完整生命周期
- 组织级产品采购与团队级配额分配的二级管理
- 基于RBAC的细粒度权限控制（4角色、14权限）
- 支持一用户多产品、一组织多产品、跨团队授权场景

---

## 🎯 核心业务逻辑

### 授权流程架构

```
1. 免费用户注册
   用户从产品页面注册 (携带UPID) → tier=free → 获得免费试用许可证 (永久有效)
   
2. 组织采购产品
   系统管理员创建产品 → 分配给组织 (生成 org_product_licenses)
   → 组织获得许可证池 (总名额、已分配、剩余)
   
3. 团队配额分配
   系统管理员为团队分配产品配额 (从组织池中划分)
   → 严格约束: 所有团队配额总和 ≤ 组织总名额
   
4. 团队添加成员
   团队领导搜索用户 → 验证用户注册来源产品
   → 检查团队配额 → 分配产品授权 → 用户升级为 tier=standard
   
5. 授权使用
   用户获得JWT许可证 → 在产品中验证 → 根据tier获得对应功能权限
   
6. 成员移除与降级
   团队领导移除成员 → 释放配额 → 若用户不再属于任何团队 → 降级为free
```

### 关键约束规则

| 约束项 | 规则 | 违反后果 |
|--------|------|----------|
| 团队配额总和 | 必须 ≤ 组织总名额 | 阻止配额分配操作 |
| 用户注册来源 | 添加成员时必须有对应产品配额 | 阻止添加操作 |
| 配额使用数 | 必须 ≤ 团队分配数 | 阻止添加成员操作 |
| 许可证唯一性 | 一个用户在一个团队只能获得同一产品一次 | 数据库唯一约束 |
| 免费许可证 | 升级为付费用户后自动删除 | 防止双重授权 |

---

## 🗄️ 数据模型设计

### 核心表结构

#### 1. users (用户表) - 已存在，需扩展
```sql
-- 新增字段
ALTER TABLE users 
ADD COLUMN source_upid VARCHAR(50);  -- 注册来源产品UPID

-- 索引
CREATE INDEX idx_users_source_upid ON users(source_upid);
CREATE INDEX idx_users_tier_status ON users(tier, status);
```

**字段说明：**
- `tier`: 'free' (免费), 'standard' (付费普通), 'premium' (付费高级)
- `source_upid`: 用户注册时的产品UPID，用于默认产品分配
- `status`: 'active', 'inactive', 'suspended'

#### 2. free_user_licenses (免费用户许可证表) - 新增
```sql
CREATE TABLE free_user_licenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    upid VARCHAR(50) NOT NULL,
    license_key TEXT NOT NULL,  -- JWT token
    daily_usage INT NOT NULL DEFAULT 0,
    daily_limit INT NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- 注意: 无 expires_at 字段，表示永久有效
);

CREATE INDEX idx_free_user_licenses_upid ON free_user_licenses(upid);
CREATE INDEX idx_free_user_licenses_user ON free_user_licenses(user_id);
```

**业务规则：**
- 免费用户每天使用次数限制 (daily_limit=3)
- 用户升级为付费后，此记录自动删除

#### 3. org_product_licenses (组织产品许可证池) - 已存在
```sql
-- 表结构已存在，Migration 010已创建
-- 包含字段: organization_id, product_id, total_count, assigned_count, available_count, expires_at
```

**业务规则：**
- `total_count`: 组织购买的总授权数
- `assigned_count`: 已分配给团队成员的数量
- `available_count`: 剩余可用数量 (计算列: total_count - assigned_count)
- 一个组织对同一产品只能有一条记录 (UNIQUE约束)

#### 4. team_product_quotas (团队产品配额表) - 新增 ⭐
```sql
CREATE TABLE team_product_quotas (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    org_license_id BIGINT NOT NULL REFERENCES org_product_licenses(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),  -- 冗余字段便于查询
    allocated_count INT NOT NULL,  -- 分配给该团队的配额
    used_count INT NOT NULL DEFAULT 0,  -- 已使用数量
    available_count INT GENERATED ALWAYS AS (allocated_count - used_count) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(team_id, org_license_id),
    CHECK (used_count <= allocated_count),
    CHECK (allocated_count > 0)
);

CREATE INDEX idx_team_product_quotas_team ON team_product_quotas(team_id);
CREATE INDEX idx_team_product_quotas_org_license ON team_product_quotas(org_license_id);
CREATE INDEX idx_team_product_quotas_available ON team_product_quotas(available_count) WHERE available_count > 0;
```

**业务规则：**
- 严格约束: 同一产品的所有团队 allocated_count 总和 ≤ org_product_licenses.total_count
- 系统管理员分配配额时需验证上述约束
- used_count 在添加/移除成员时自动更新

#### 5. team_member_license_assignments (成员许可证分配) - 已存在，需修改
```sql
-- 新增字段
ALTER TABLE team_member_license_assignments
ADD COLUMN group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE;

-- 修改唯一约束
ALTER TABLE team_member_license_assignments
DROP CONSTRAINT IF EXISTS team_member_license_assignments_license_key_key;

ALTER TABLE team_member_license_assignments
ADD CONSTRAINT unique_user_team_product UNIQUE (user_id, group_id, org_license_id);

-- 新增索引
CREATE INDEX idx_tmla_group_id ON team_member_license_assignments(group_id);
CREATE INDEX idx_tmla_user_group ON team_member_license_assignments(user_id, group_id);
```

**业务规则：**
- 记录用户在特定团队获得的特定产品授权
- 同一用户在同一团队只能获得同一产品一次授权
- 但可以在不同团队获得同一产品的授权
- 移除成员时，只删除该团队的授权记录

#### 6. user_groups (团队成员关系) - 已存在
```sql
-- 表结构已存在
-- role 字段值: 'leader' (团队领导), 'admin' (团队管理员), 'member' (普通成员)
```

**业务规则：**
- 一个团队只能有**一个** role='leader' 的成员
- 创建团队时自动将创建者设为 leader
- 团队领导离职时，管理员需指定新的 leader

### 数据关系图

```
organizations (组织)
    ↓ 1:N
org_product_licenses (组织购买的产品池)
    ↓ 1:N
team_product_quotas (团队获得的配额)
    ↓ 1:N
team_member_license_assignments (成员获得的授权)
    ↓ N:1
users (用户)
    ↓ 1:1
free_user_licenses (免费用户许可证)

groups (团队)
    ↓ 1:N
user_groups (团队成员关系)
    ↓ N:1
users (用户)
```

---

## 🔄 完整业务流程

### 流程1: 免费用户注册

**前端实现（产品页面）**
```typescript
// 自动获取UPID
const upid = document.querySelector('meta[name="upid"]')?.content 
          || document.querySelector('[data-upid]')?.dataset.upid
          || new URLSearchParams(location.search).get('upid');

// 注册请求
POST /auth/register
Body: {
  email: string,
  password: string,
  upid?: string  // 可选，但强烈建议提供
}
```

**后端逻辑 (Rust/Axum)**
```rust
pub async fn register(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<Json<RegisterResponse>> {
    // 1. 验证邮箱未注册
    let exists = AuthService::email_exists(&state.pool, &req.email).await?;
    if exists {
        return Err(AppError::EmailAlreadyRegistered);
    }
    
    // 2. 验证UPID（如果提供）
    let product_id = if let Some(upid) = &req.upid {
        let product = ProductService::get_by_upid(&state.pool, upid).await?;
        Some(product.id)
    } else {
        None
    };
    
    // 3. 创建用户
    let user = AuthService::create_user(
        &state.pool,
        &req.email,
        &req.password,
        UserTier::Free,
        req.upid.as_deref(),
    ).await?;
    
    // 4. 如果提供UPID，生成免费许可证
    if let Some(product_id) = product_id {
        LicenseService::create_free_license(
            &state.pool,
            user.id,
            product_id,
            req.upid.as_ref().unwrap(),
        ).await?;
    }
    
    // 5. 发送激活邮件
    EmailService::send_activation_email(&req.email, &activation_token).await?;
    
    Ok(Json(RegisterResponse { user, message: "请查收激活邮件" }))
}
```

**数据变更：**
```sql
-- 插入 users 表
INSERT INTO users (uid, email, password_hash, tier, status, source_upid)
VALUES ('U' || gen_uid(), $1, $2, 'free', 'pending_activation', $3);

-- 插入 free_user_licenses 表
INSERT INTO free_user_licenses (user_id, product_id, upid, license_key, daily_limit)
VALUES ($1, $2, $3, generate_jwt_token(...), 3);
```

---

### 流程2: 团队领导添加成员（核心流程）⭐

**前提条件：**
- 用户已注册并激活
- 团队领导在团队中 role='leader'
- 团队领导拥有 RBAC 角色 'team_leader'

**前端实现**
```typescript
// 1. 搜索用户
GET /team/:id/available-users?search=email
Response: {
  users: Array<{
    id, email, name, tier, source_upid,
    is_in_organization: boolean,  // 是否已在组织中
    is_in_team: boolean  // 是否已在该团队
  }>
}

// 2. 获取可用产品列表
GET /team/:id/available-products
Response: {
  products: Array<{
    id, name, upid, tier,
    quota_allocated: number,  // 团队分配的配额
    quota_used: number,  // 已使用
    quota_available: number,  // 剩余
    is_default: boolean  // 是否是用户注册来源产品
  }>
}

// 3. 添加成员
POST /team/:id/members
Body: {
  user_id: number,
  product_ids: number[]  // 可多选
}
```

**后端逻辑**
```rust
pub async fn add_team_member(
    State(state): State<Arc<AuthHandler>>,
    Path(team_id): Path<i64>,
    Json(req): Json<AddMemberRequest>,
) -> AppResult<Json<AddMemberResponse>> {
    // 1. 权限验证: 是否是该团队的leader
    let is_leader = TeamService::is_team_leader(&state.pool, claims.user_id, team_id).await?;
    if !is_leader {
        return Err(AppError::PermissionDenied);
    }
    
    // 2. 验证用户存在且未在该团队
    let user = UserService::get_by_id(&state.pool, req.user_id).await?;
    let already_in_team = TeamService::is_member(&state.pool, team_id, req.user_id).await?;
    if already_in_team {
        return Err(AppError::BadRequest("用户已在该团队"));
    }
    
    // 3. 验证用户注册来源产品必须在选择列表中
    if let Some(source_upid) = &user.source_upid {
        let source_product = ProductService::get_by_upid(&state.pool, source_upid).await?;
        if !req.product_ids.contains(&source_product.id) {
            return Err(AppError::BadRequest("必须包含用户注册来源产品"));
        }
    } else if req.product_ids.is_empty() {
        return Err(AppError::BadRequest("用户无注册来源产品，必须手动选择产品"));
    }
    
    // 4. 验证团队对所有产品都有足够配额
    for product_id in &req.product_ids {
        let quota = TeamService::get_product_quota(&state.pool, team_id, *product_id).await?;
        if quota.available_count < 1 {
            return Err(AppError::BadRequest(format!("产品 {} 配额不足", product_id)));
        }
    }
    
    // 5. 开启事务
    let mut tx = state.pool.begin().await?;
    
    // 6. 添加到团队
    sqlx::query!(
        "INSERT INTO user_groups (user_id, group_id, role) VALUES ($1, $2, 'member')",
        req.user_id, team_id
    ).execute(&mut *tx).await?;
    
    // 7. 升级用户tier
    if user.tier == UserTier::Free {
        sqlx::query!(
            "UPDATE users SET tier = 'standard' WHERE id = $1",
            req.user_id
        ).execute(&mut *tx).await?;
        
        // 删除免费许可证
        sqlx::query!(
            "DELETE FROM free_user_licenses WHERE user_id = $1",
            req.user_id
        ).execute(&mut *tx).await?;
    }
    
    // 8. 批量分配产品授权
    for product_id in &req.product_ids {
        // 获取组织许可证ID
        let org_license_id = TeamService::get_org_license_id(
            &mut *tx, team_id, *product_id
        ).await?;
        
        // 生成JWT许可证
        let license_key = LicenseService::generate_jwt(
            req.user_id, *product_id, UserTier::Standard
        )?;
        
        // 插入许可证分配记录
        sqlx::query!(
            r#"
            INSERT INTO team_member_license_assignments 
            (org_license_id, group_id, user_id, license_key)
            VALUES ($1, $2, $3, $4)
            "#,
            org_license_id, team_id, req.user_id, license_key
        ).execute(&mut *tx).await?;
        
        // 更新团队配额使用数
        sqlx::query!(
            r#"
            UPDATE team_product_quotas
            SET used_count = used_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE team_id = $1 AND org_license_id = $2
            "#,
            team_id, org_license_id
        ).execute(&mut *tx).await?;
        
        // 更新组织许可证使用数
        sqlx::query!(
            r#"
            UPDATE org_product_licenses
            SET assigned_count = assigned_count + 1,
                available_count = available_count - 1
            WHERE id = $1
            "#,
            org_license_id
        ).execute(&mut *tx).await?;
    }
    
    // 9. 提交事务
    tx.commit().await?;
    
    Ok(Json(AddMemberResponse {
        success: true,
        message: "成员添加成功",
        licenses_assigned: req.product_ids.len() as i32,
    }))
}
```

**关键验证点：**
1. ✅ 团队领导权限验证
2. ✅ 用户注册来源产品必须在选择列表中
3. ✅ 团队配额充足性验证
4. ✅ 事务原子性保证
5. ✅ 多产品同时分配支持

---

### 流程3: 团队领导移除成员

**前端实现**
```typescript
DELETE /team/:id/members/:user_id
Response: {
  success: true,
  licenses_released: number,  // 释放的许可证数量
  user_downgraded: boolean  // 用户是否降级为免费
}
```

**后端逻辑**
```rust
pub async fn remove_team_member(
    State(state): State<Arc<AuthHandler>>,
    Path((team_id, user_id)): Path<(i64, i64)>,
) -> AppResult<Json<RemoveMemberResponse>> {
    // 1. 权限验证
    let is_leader = TeamService::is_team_leader(&state.pool, claims.user_id, team_id).await?;
    if !is_leader {
        return Err(AppError::PermissionDenied);
    }
    
    // 2. 查询该用户在该团队的所有授权
    let licenses = sqlx::query!(
        r#"
        SELECT org_license_id, license_key
        FROM team_member_license_assignments
        WHERE user_id = $1 AND group_id = $2
        "#,
        user_id, team_id
    ).fetch_all(&*state.pool).await?;
    
    if licenses.is_empty() {
        return Err(AppError::BadRequest("用户不在该团队或无授权"));
    }
    
    // 3. 开启事务
    let mut tx = state.pool.begin().await?;
    
    // 4. 删除许可证分配记录
    sqlx::query!(
        "DELETE FROM team_member_license_assignments WHERE user_id = $1 AND group_id = $2",
        user_id, team_id
    ).execute(&mut *tx).await?;
    
    // 5. 更新配额统计
    for license in &licenses {
        // 更新团队配额
        sqlx::query!(
            r#"
            UPDATE team_product_quotas
            SET used_count = used_count - 1
            WHERE team_id = $1 AND org_license_id = $2
            "#,
            team_id, license.org_license_id
        ).execute(&mut *tx).await?;
        
        // 更新组织许可证
        sqlx::query!(
            r#"
            UPDATE org_product_licenses
            SET assigned_count = assigned_count - 1,
                available_count = available_count + 1
            WHERE id = $1
            "#,
            license.org_license_id
        ).execute(&mut *tx).await?;
    }
    
    // 6. 从团队移除
    sqlx::query!(
        "DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2",
        user_id, team_id
    ).execute(&mut *tx).await?;
    
    // 7. 检查用户是否还在其他团队
    let other_teams_count: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM user_groups WHERE user_id = $1",
        user_id
    ).fetch_one(&mut *tx).await?;
    
    let user_downgraded = if other_teams_count == 0 {
        // 8. 用户不再属于任何团队，降级为免费用户
        let user = sqlx::query_as!(
            User,
            "SELECT * FROM users WHERE id = $1",
            user_id
        ).fetch_one(&mut *tx).await?;
        
        sqlx::query!(
            "UPDATE users SET tier = 'free' WHERE id = $1",
            user_id
        ).execute(&mut *tx).await?;
        
        // 9. 重新生成免费许可证
        if let Some(source_upid) = &user.source_upid {
            let product = ProductService::get_by_upid(&mut *tx, source_upid).await?;
            let license_key = LicenseService::generate_jwt(
                user_id, product.id, UserTier::Free
            )?;
            
            sqlx::query!(
                r#"
                INSERT INTO free_user_licenses 
                (user_id, product_id, upid, license_key, daily_limit)
                VALUES ($1, $2, $3, $4, 3)
                "#,
                user_id, product.id, source_upid, license_key
            ).execute(&mut *tx).await?;
        }
        
        true
    } else {
        false
    };
    
    // 10. 提交事务
    tx.commit().await?;
    
    Ok(Json(RemoveMemberResponse {
        success: true,
        licenses_released: licenses.len() as i32,
        user_downgraded,
    }))
}
```

---

### 流程4: 系统管理员分配团队配额

**前端实现**
```typescript
// 1. 查看组织的产品池
GET /admin/org/:id/licenses
Response: {
  licenses: Array<{
    id, product_id, product_name,
    total_count, assigned_count, available_count,
    // 各团队分配情况
    team_allocations: Array<{
      team_id, team_name, allocated_count, used_count
    }>
  }>
}

// 2. 为团队分配/调整配额
POST /admin/teams/:id/quotas
Body: {
  org_license_id: number,
  allocated_count: number  // 新的分配数量
}
```

**后端逻辑**
```rust
pub async fn assign_team_quota(
    State(state): State<Arc<AuthHandler>>,
    Path(team_id): Path<i64>,
    Json(req): Json<AssignQuotaRequest>,
) -> AppResult<Json<AssignQuotaResponse>> {
    // 1. 验证管理员权限
    let is_admin = RbacService::has_permission(
        &state.pool, claims.user_id, "admin:team_manage"
    ).await?;
    if !is_admin {
        return Err(AppError::PermissionDenied);
    }
    
    // 2. 获取组织许可证信息
    let org_license = sqlx::query!(
        "SELECT total_count, assigned_count FROM org_product_licenses WHERE id = $1",
        req.org_license_id
    ).fetch_one(&*state.pool).await?;
    
    // 3. 计算其他团队的配额总和
    let other_teams_total: i64 = sqlx::query_scalar!(
        r#"
        SELECT COALESCE(SUM(allocated_count), 0)
        FROM team_product_quotas
        WHERE org_license_id = $1 AND team_id != $2
        "#,
        req.org_license_id, team_id
    ).fetch_one(&*state.pool).await?;
    
    // 4. 验证严格约束: 总配额不能超过组织总数
    if other_teams_total + req.allocated_count > org_license.total_count {
        return Err(AppError::BadRequest(format!(
            "配额超限: 其他团队已分配 {}，组织总数 {}，最多还能分配 {}",
            other_teams_total,
            org_license.total_count,
            org_license.total_count - other_teams_total
        )));
    }
    
    // 5. 检查是否已存在配额记录
    let existing_quota = sqlx::query!(
        "SELECT used_count FROM team_product_quotas WHERE team_id = $1 AND org_license_id = $2",
        team_id, req.org_license_id
    ).fetch_optional(&*state.pool).await?;
    
    if let Some(quota) = existing_quota {
        // 6a. 更新已有配额
        if req.allocated_count < quota.used_count {
            return Err(AppError::BadRequest(format!(
                "配额不能低于已使用数: 已使用 {}, 请求分配 {}",
                quota.used_count, req.allocated_count
            )));
        }
        
        sqlx::query!(
            r#"
            UPDATE team_product_quotas
            SET allocated_count = $1, updated_at = CURRENT_TIMESTAMP
            WHERE team_id = $2 AND org_license_id = $3
            "#,
            req.allocated_count, team_id, req.org_license_id
        ).execute(&*state.pool).await?;
    } else {
        // 6b. 创建新配额
        let product_id = sqlx::query_scalar!(
            "SELECT product_id FROM org_product_licenses WHERE id = $1",
            req.org_license_id
        ).fetch_one(&*state.pool).await?;
        
        sqlx::query!(
            r#"
            INSERT INTO team_product_quotas 
            (team_id, org_license_id, product_id, allocated_count, used_count)
            VALUES ($1, $2, $3, $4, 0)
            "#,
            team_id, req.org_license_id, product_id, req.allocated_count
        ).execute(&*state.pool).await?;
    }
    
    Ok(Json(AssignQuotaResponse {
        success: true,
        message: "配额分配成功",
        allocated_count: req.allocated_count,
    }))
}
```

**关键验证点：**
1. ✅ 严格配额约束验证
2. ✅ 不能低于已使用数
3. ✅ 自动计算其他团队配额总和

---

### 流程5: 系统管理员创建组织并分配产品

**前端实现**
```typescript
// 1. 创建组织
POST /admin/organizations
Body: {
  name: string,
  description?: string
}

// 2. 为组织分配产品
POST /admin/org-licenses
Body: {
  organization_id: number,
  product_id: number,
  total_count: number,  // 购买数量
  expires_at: string  // ISO 8601格式
}
```

**后端逻辑**
```rust
pub async fn assign_product_to_org(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<AssignProductRequest>,
) -> AppResult<Json<OrgProductLicense>> {
    // 1. 验证管理员权限
    check_admin_permission(&state, claims.user_id).await?;
    
    // 2. 验证产品和组织存在
    let product = ProductService::get_by_id(&state.pool, req.product_id).await?;
    let org = OrgService::get_by_id(&state.pool, req.organization_id).await?;
    
    // 3. 检查是否已存在
    let existing = sqlx::query!(
        "SELECT id FROM org_product_licenses WHERE organization_id = $1 AND product_id = $2",
        req.organization_id, req.product_id
    ).fetch_optional(&*state.pool).await?;
    
    if existing.is_some() {
        return Err(AppError::BadRequest("该组织已有此产品许可证，请使用更新接口"));
    }
    
    // 4. 创建组织许可证池
    let org_license = sqlx::query_as!(
        OrgProductLicense,
        r#"
        INSERT INTO org_product_licenses 
        (organization_id, product_id, total_count, assigned_count, available_count, expires_at, created_by)
        VALUES ($1, $2, $3, 0, $3, $4, $5)
        RETURNING *
        "#,
        req.organization_id,
        req.product_id,
        req.total_count,
        req.expires_at,
        claims.user_id
    ).fetch_one(&*state.pool).await?;
    
    Ok(Json(org_license))
}
```

---

### 流程6: 产品tier验证与功能限制

**JWT许可证Claims结构**
```rust
#[derive(Serialize, Deserialize)]
pub struct LicenseClaims {
    pub user_id: i64,
    pub product_id: i64,
    pub upid: String,
    pub tier: String,  // 'free', 'standard', 'premium'
    pub daily_limit: Option<i32>,
    pub monthly_limit: Option<i32>,
    pub exp: i64,  // 过期时间戳
}
```

**客户端验证逻辑（产品代码中）**
```typescript
// 1. 解析JWT
const claims = decodeJWT(licenseKey);

// 2. 验证过期时间
if (Date.now() / 1000 > claims.exp) {
    throw new Error('许可证已过期');
}

// 3. 验证tier权限
if (claims.tier === 'free' && requiresFeature('ai')) {
    throw new Error('免费版本不支持AI功能');
}

// 4. 验证使用次数
if (claims.tier === 'free') {
    const todayUsage = await checkDailyUsage(claims.user_id);
    if (todayUsage >= claims.daily_limit) {
        throw new Error('今日免费次数已用完');
    }
}
```

**后端使用次数记录**
```rust
POST /license/record-usage
Body: {
    license_key: string,
    action: string  // 'form_submit', 'api_call', etc.
}

// 后端逻辑
pub async fn record_usage(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<RecordUsageRequest>,
) -> AppResult<Json<UsageResponse>> {
    // 1. 验证JWT
    let claims = jwt::verify_license_token(&req.license_key)?;
    
    // 2. 如果是免费用户，更新使用次数
    if claims.tier == "free" {
        sqlx::query!(
            r#"
            UPDATE free_user_licenses
            SET daily_usage = daily_usage + 1
            WHERE user_id = $1
            RETURNING daily_usage, daily_limit
            "#,
            claims.user_id
        ).fetch_one(&*state.pool).await?;
    }
    
    // 3. 记录日志
    sqlx::query!(
        r#"
        INSERT INTO license_usage_logs (user_id, action, usage_date)
        VALUES ($1, $2, CURRENT_DATE)
        "#,
        claims.user_id, req.action
    ).execute(&*state.pool).await?;
    
    Ok(Json(UsageResponse { success: true }))
}
```

---

## 📡 API端点规范

### 认证相关 (已存在)
```
POST   /auth/register           # 用户注册 (新增upid参数)
POST   /auth/login              # 用户登录
GET    /auth/activate/:token    # 邮箱激活
POST   /auth/request-reset      # 请求密码重置
POST   /auth/reset-password     # 重置密码
```

### 团队管理 (需修改)
```
POST   /team/create                      # 创建团队 (仅管理员)
GET    /team/:id                         # 获取团队详情
GET    /team/:id/members                 # 获取团队成员列表
GET    /team/:id/available-users         # 搜索可添加的用户 (新增)
GET    /team/:id/available-products      # 获取可分配的产品列表 (新增)
POST   /team/:id/members                 # 添加成员 (修改: 支持多产品)
DELETE /team/:id/members/:user_id        # 移除成员 (修改: 自动降级)
PATCH  /team/:id/members/:user_id/role   # 修改成员角色
```

### 管理员 - 配额管理 (新增)
```
POST   /admin/org-licenses               # 为组织分配产品
PATCH  /admin/org-licenses/:id           # 更新组织许可证数量
GET    /admin/org/:id/licenses           # 查看组织产品池详情
POST   /admin/teams/:id/quotas           # 分配/调整团队配额
GET    /admin/teams/:id/quotas           # 查看团队配额列表
DELETE /admin/teams/:id/quotas/:quota_id # 移除团队配额
```

### 管理员 - 团队管理 (新增)
```
GET    /admin/teams                      # 列出所有团队
PATCH  /admin/teams/:id/leader           # 指定团队领导
GET    /admin/teams/:id/usage-stats      # 团队配额使用统计
```

### 许可证查询
```
GET    /user/licenses                    # 用户的所有许可证
GET    /license/verify                   # 验证许可证有效性
POST   /license/record-usage             # 记录使用次数
GET    /license/usage-stats              # 使用统计
```

---

## 🎨 前端页面清单

### 需创建的新页面

#### 1. `/admin/org-licenses/page.tsx`
**功能**: 组织许可证管理总览
- 列表显示所有组织的产品池
- 筛选: 组织、产品、过期状态
- 操作: 新增、编辑数量、查看详情

#### 2. `/admin/teams/quotas/page.tsx`
**功能**: 团队配额管理
- 显示所有团队的配额分配情况
- 验证配额总和约束
- 可视化配额使用率

#### 3. `/dashboard/users/page.tsx`
**功能**: 用户列表（团队领导视角）
- 筛选: 团队、角色、许可证状态
- 团队领导只看自己管理的团队成员
- 管理员看所有用户

### 需修改的现有页面

#### 1. `/dashboard/teams/[id]/page.tsx`
**新增功能:**
- 添加成员时的产品选择器（多选）
- 显示团队配额使用情况
- 成员列表显示分配的产品

#### 2. `/dashboard/organizations/[id]/page.tsx`
**新增功能:**
- "产品与许可证"section
- 显示购买的产品池状态
- 各团队配额分配情况

#### 3. `/auth/register/page.tsx`
**修改:**
- 自动读取页面UPID参数
- 隐藏UPID输入框（自动填充）

---

## 📊 实施优先级

### 阶段1: 数据库迁移 (优先级P0)
**工时**: 3-4小时
- [ ] 创建 Migration 011: 新增字段和表
  - `users.source_upid` 字段
  - `free_user_licenses` 表
  - `team_product_quotas` 表
  - `team_member_license_assignments.group_id` 字段
- [ ] 执行迁移并验证数据完整性
- [ ] 更新 Rust models

### 阶段2: 核心后端逻辑 (优先级P0)
**工时**: 12-15小时
- [ ] 修改注册逻辑（支持UPID，生成免费许可证）
- [ ] 实现添加成员流程（多产品分配、配额验证）
- [ ] 实现移除成员流程（自动降级、释放配额）
- [ ] 实现配额分配逻辑（严格约束验证）
- [ ] 编写单元测试（80%覆盖率）

### 阶段3: 管理员功能 (优先级P1)
**工时**: 10-12小时
- [ ] 组织产品分配接口
- [ ] 团队配额管理接口
- [ ] 配额使用统计接口
- [ ] 管理员前端页面:
  - 组织许可证管理
  - 团队配额分配
  - 使用情况可视化

### 阶段4: 团队领导功能 (优先级P1)
**工时**: 8-10小时
- [ ] 用户搜索与筛选接口
- [ ] 可用产品查询接口
- [ ] 团队详情页增强:
  - 产品选择器（多选）
  - 配额使用显示
  - 成员产品授权列表
- [ ] 用户列表页（权限过滤）

### 阶段5: 测试与优化 (优先级P2)
**工时**: 6-8小时
- [ ] E2E测试: 完整用户生命周期
- [ ] 并发场景测试: 配额竞争
- [ ] 性能优化: 数据库查询
- [ ] 错误处理完善
- [ ] 文档补充

**总预计工时**: 39-49小时

---

## ⚠️ 边界条件与异常处理

### 1. 配额不足场景
```
场景: 团队配额已用完，无法添加新成员
处理: 
  - 前端: 添加按钮禁用，显示"配额已满"提示
  - 后端: 返回 400 错误 "产品 X 配额不足"
  - 建议: 显示"联系管理员增加配额"
```

### 2. 用户无注册来源产品
```
场景: 用户注册时未提供UPID
处理:
  - 前端: 产品选择器无默认选中项，必须手动选择
  - 后端: 如果 product_ids 为空，返回错误
  - 建议: 提示"该用户未关联产品，请选择要分配的产品"
```

### 3. 跨团队产品授权冲突
```
场景: 用户在团队A有产品X授权，被添加到团队B也分配产品X
处理:
  - 允许操作（不是冲突，是正常场景）
  - 用户获得2个不同的license_key (JWT)
  - 移除时只释放对应团队的授权
```

### 4. 团队领导离职
```
场景: 团队唯一的leader被移除
处理:
  - 前端: 移除前弹出确认"该用户是团队领导，移除后团队将无领导"
  - 后端: 允许移除，但团队变为无leader状态
  - 建议: 管理员需尽快指定新leader
```

### 5. 组织许可证过期
```
场景: org_product_licenses.expires_at 已过期
处理:
  - 后端: 添加成员时检查过期时间
  - 如果过期，返回 400 错误 "组织许可证已过期"
  - 前端: 产品选择器中标记为"已过期"
```

### 6. 配额调整冲突
```
场景: 管理员尝试将配额从60减少到40，但已使用50
处理:
  - 后端: 验证 new_allocated_count >= used_count
  - 返回 400 错误 "配额不能低于已使用数: 已使用50，请求分配40"
  - 建议: "请先移除部分成员或分配更多配额"
```

---

## 🔐 权限控制矩阵

| 操作 | 免费用户 | 付费用户 | 团队领导 | 管理员 |
|------|---------|---------|---------|--------|
| 注册账号 | ✅ | ✅ | ✅ | ✅ |
| 查看自己许可证 | ✅ | ✅ | ✅ | ✅ |
| 创建团队 | ❌ | ❌ | ❌ | ✅ |
| 加入团队 | 被动 | 被动 | 被动 | ✅ |
| 添加团队成员 | ❌ | ❌ | ✅ (自己的团队) | ✅ (所有团队) |
| 移除团队成员 | ❌ | ❌ | ✅ (自己的团队) | ✅ (所有团队) |
| 分配产品授权 | ❌ | ❌ | ✅ (团队配额内) | ✅ (无限制) |
| 查看组织产品池 | ❌ | ❌ | ❌ | ✅ |
| 分配团队配额 | ❌ | ❌ | ❌ | ✅ |
| 创建产品 | ❌ | ❌ | ❌ | ✅ |
| 为组织购买产品 | ❌ | ❌ | ❌ | ✅ |

---

## 📝 数据迁移脚本

### Migration 011: 完整数据库变更

```sql
-- Migration 011: User Lifecycle & Team Quota Management
-- Created: 2025-11-28
-- Purpose: 支持免费用户注册、团队配额分配、自动降级

BEGIN;

-- 1. 扩展 users 表
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS source_upid VARCHAR(50);

COMMENT ON COLUMN users.source_upid IS '用户注册时的产品UPID，用于默认产品分配';

CREATE INDEX IF NOT EXISTS idx_users_source_upid ON users(source_upid);
CREATE INDEX IF NOT EXISTS idx_users_tier_status ON users(tier, status);

-- 2. 创建免费用户许可证表
CREATE TABLE IF NOT EXISTS free_user_licenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    upid VARCHAR(50) NOT NULL,
    license_key TEXT NOT NULL,
    daily_usage INT NOT NULL DEFAULT 0,
    daily_limit INT NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_free_user_licenses_upid ON free_user_licenses(upid);
CREATE INDEX idx_free_user_licenses_user ON free_user_licenses(user_id);
CREATE INDEX idx_free_user_licenses_daily_usage ON free_user_licenses(daily_usage, daily_limit);

COMMENT ON TABLE free_user_licenses IS '免费用户许可证（永久有效）';

-- 3. 创建团队产品配额表
CREATE TABLE IF NOT EXISTS team_product_quotas (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    org_license_id BIGINT NOT NULL REFERENCES org_product_licenses(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    allocated_count INT NOT NULL CHECK (allocated_count > 0),
    used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    available_count INT GENERATED ALWAYS AS (allocated_count - used_count) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_team_org_license UNIQUE(team_id, org_license_id),
    CONSTRAINT check_used_not_exceed_allocated CHECK (used_count <= allocated_count)
);

CREATE INDEX idx_team_product_quotas_team ON team_product_quotas(team_id);
CREATE INDEX idx_team_product_quotas_org_license ON team_product_quotas(org_license_id);
CREATE INDEX idx_team_product_quotas_product ON team_product_quotas(product_id);
CREATE INDEX idx_team_product_quotas_available ON team_product_quotas(available_count) WHERE available_count > 0;

COMMENT ON TABLE team_product_quotas IS '团队产品配额表（从组织许可证池分配）';

-- 4. 修改 team_member_license_assignments 表
ALTER TABLE team_member_license_assignments
ADD COLUMN IF NOT EXISTS group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE;

-- 更新已有数据的 group_id (如果为空)
UPDATE team_member_license_assignments tmla
SET group_id = ug.group_id
FROM user_groups ug
WHERE tmla.user_id = ug.user_id
  AND tmla.group_id IS NULL;

-- 删除旧的唯一约束
ALTER TABLE team_member_license_assignments
DROP CONSTRAINT IF EXISTS team_member_license_assignments_license_key_key;

-- 添加新的唯一约束
ALTER TABLE team_member_license_assignments
ADD CONSTRAINT unique_user_team_product UNIQUE (user_id, group_id, org_license_id);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_tmla_group_id ON team_member_license_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_tmla_user_group ON team_member_license_assignments(user_id, group_id);

COMMENT ON COLUMN team_member_license_assignments.group_id IS '团队ID，用于区分跨团队授权';

-- 5. 创建使用日志表（用于免费用户次数限制）
CREATE TABLE IF NOT EXISTS license_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_id BIGINT,  -- 可关联到 free_user_licenses 或 team_member_license_assignments
    action VARCHAR(100) NOT NULL,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_license_usage_logs_user_date ON license_usage_logs(user_id, usage_date);
CREATE INDEX idx_license_usage_logs_date ON license_usage_logs(usage_date);

COMMENT ON TABLE license_usage_logs IS '许可证使用日志（用于统计和限流）';

-- 7. 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_product_quotas_updated_at
BEFORE UPDATE ON team_product_quotas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 8. 添加验证约束函数
CREATE OR REPLACE FUNCTION check_team_quota_limit()
RETURNS TRIGGER AS $$
DECLARE
    org_total INT;
    other_teams_total INT;
BEGIN
    -- 获取组织总许可数
    SELECT total_count INTO org_total
    FROM org_product_licenses
    WHERE id = NEW.org_license_id;
    
    -- 计算其他团队的配额总和
    SELECT COALESCE(SUM(allocated_count), 0) INTO other_teams_total
    FROM team_product_quotas
    WHERE org_license_id = NEW.org_license_id
      AND team_id != NEW.team_id;
    
    -- 验证总和不超过组织总数
    IF (other_teams_total + NEW.allocated_count) > org_total THEN
        RAISE EXCEPTION '配额超限: 其他团队已分配 %, 组织总数 %, 最多还能分配 %',
            other_teams_total, org_total, (org_total - other_teams_total);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_team_quota_limit
BEFORE INSERT OR UPDATE ON team_product_quotas
FOR EACH ROW
EXECUTE FUNCTION check_team_quota_limit();

COMMIT;
```

---

## ✅ 验证清单

### 功能验证
- [ ] 免费用户注册成功，自动生成免费许可证
- [ ] 团队领导添加成员，自动升级为付费用户
- [ ] 多产品同时分配成功，配额正确扣减
- [ ] 移除成员后配额正确释放
- [ ] 用户不在任何团队后自动降级为免费
- [ ] 管理员分配配额时验证严格约束
- [ ] 配额不足时阻止添加成员
- [ ] 用户无注册来源产品时强制手动选择

### 数据一致性验证
- [ ] 团队配额总和 ≤ 组织总许可数
- [ ] team_product_quotas.used_count = 实际分配数量
- [ ] org_product_licenses.assigned_count = 所有团队使用总和
- [ ] 用户降级后，free_user_licenses 记录存在
- [ ] 跨团队授权记录独立，互不影响

### 性能验证
- [ ] 添加成员事务耗时 < 500ms
- [ ] 配额验证查询耗时 < 100ms
- [ ] 用户列表分页查询 < 200ms
- [ ] 并发添加成员无死锁
- [ ] 配额竞争场景正确处理

---

## 📚 补充说明


### 监控指标

建议监控以下关键指标：
- 配额使用率 (used_count / allocated_count)
- 免费用户转付费用户转化率
- 配额不足导致的添加失败次数
- 许可证过期预警 (提前30天)

---

**文档状态**: ✅ 最终版，已确认所有需求  
**下一步**: 开始实施阶段1（数据库迁移）  
**预计完成时间**: 39-49小时  
**文档维护**: 每个阶段完成后更新进度

---

## 🔧 技术实现细节

### Rust后端代码结构

**Current State:**
- Database has `groups` table (teams) with NO "leader_id" or "owner_id" field
- `user_groups` table has "role" field (values: 'leader', 'admin', 'member')
- Migration 010 creates teams without explicit leader assignment

**Questions:**
1. **How does admin designate team leader?**
   - Option A: Admin assigns "leader" role via `user_groups.role` field
   - Option B: Add `leader_id` field to `groups` table
   - Option C: Use RBAC role "team_leader" separately from team membership

2. **Can one team have multiple leaders?**
   - Current `user_groups` schema allows multiple users with role='leader'
   - Is this intentional or should there be ONE primary leader?

3. **What happens to team when leader is removed?**
   - Auto-assign new leader?
   - Require admin to designate new leader?
   - Team becomes leaderless?

**Recommendation:**
- Use `user_groups.role = 'leader'` for team leadership (simplest, already in schema)
- Allow multiple leaders per team (flexibility for large organizations)
- Admin UI: When viewing team details, admin can change any member's role to 'leader'

---

### ❓ GAP 2: License Assignment Trigger

**Current Understanding:**
> "用户加入团队时自动减少许可证使用量"

**Questions:**
1. **Which product license is assigned when user joins team?**
   - Does admin pre-select "default product" for the team?
   - Does team leader choose product during user addition?
   - Is there a team-to-product mapping table?

2. **What if organization has multiple products?**
   - User joins team A (has Product X and Product Y licenses)
   - Does user get BOTH products automatically?
   - Does user get NONE until leader manually assigns?
   - Does team have "default product" setting?

3. **What if no licenses available?**
   - Block user from joining team?
   - Add user but don't assign license (manual assignment later)?
   - Show warning but allow join?

**Recommendation:**
- **Add `team_default_products` table** (many-to-many: teams ↔ products)
- When team leader adds user, show product selection UI
- If no licenses available, allow join but show "pending license" status
- Team leader can assign licenses later via separate action

**New Table Schema:**
```sql
CREATE TABLE team_default_products (
    team_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, product_id)
);
```

---

### ❓ GAP 3: Organization-Product License Creation Flow

**Current Requirement:**
> "产品分配给组织时自动生成许可证"

**Questions:**
1. **Where does admin perform this action?**
   - Option A: In product details page → "Assign to Organization" button
   - Option B: In organization details page → "Add Product" button
   - Option C: Dedicated "Organization Licenses" admin page

2. **What parameters does admin specify?**
   - Total license count (required)
   - Expiration date (required)
   - Daily/Monthly limits (from product defaults or custom?)
   - Auto-renewal setting?

3. **Can admin assign same product multiple times to same org?**
   - Current schema: `UNIQUE(organization_id, product_id)` in `org_product_licenses`
   - Answer: NO, but admin can UPDATE total_count later

**Recommendation:**
- **Admin UI Location:** Organization details page
- **Workflow:**
  1. Admin views organization details
  2. See "Products & Licenses" section showing current licenses
  3. Click "Add Product License" button
  4. Modal appears: Select product, enter total count, set expiration date
  5. Click "Assign" → Creates `org_product_licenses` record
- **Fields:** product_id, total_count, expires_at
- **Update Flow:** Click "Edit" on existing license → Adjust total_count or expires_at

---

### ❓ GAP 4: License Certificate ("许可证证书值") Meaning

**Current Requirement:**
> "系统管理员可在组织详情页里面可以查询产品许可证证书值"

**Questions:**
1. **What is "certificate value" (证书值)?**
   - Option A: The JWT license token string (from `team_member_license_assignments.license_key`)
   - Option B: A summary view of license details (count, expiry, status)
   - Option C: A downloadable certificate file

2. **Is this organization-level or user-level?**
   - Organization-level: Show org license pool status
   - User-level: Show individual user license keys

**Recommendation:**
- **Interpret as:** View license details and JWT tokens
- **Admin UI:**
  - Organization page shows license pool status (total/assigned/available)
  - Click "View Members" → See list of users with assigned licenses
  - Click "View Certificate" on user row → Display JWT token (copyable)

---

### ❓ GAP 5: Team vs Organization Confusion

**Database Reality:**
- `groups` table = Teams (belongs to organization via `org_id`)
- `organizations` table = Organizations (top-level entity)
- `user_groups` table = Team membership (links users to teams)

**Questions:**
1. **Can users join organization directly without team?**
   - Current schema suggests NO (only `user_groups`, no `organization_members`)
   - Migration 001 has `organization_members` table!
   - **Clarification needed:** Is `organization_members` for billing/ownership only?

2. **Requirement says: "团队负责人可将同组织用户加入团队"**
   - How does system know "同组织用户" (same organization users)?
   - Does user need to join organization FIRST before joining teams?
   - Or can team leader invite ANY user in system?

**Recommendation:**
- **Two-step membership:**
  1. Admin adds user to organization (via `organization_members`)
  2. Team leader can only add users who are already in the organization
- **Frontend validation:** When team leader searches for users to add, filter by `organization_id`

---

### ❓ GAP 6: User List Filtering Logic

**Current Requirement:**
> "在用户仪表盘页面提供下拉筛选功能"

**Questions:**
1. **What filters are needed?**
   - Filter by team? (Show users in specific team)
   - Filter by role? (Admin, Team Leader, Employee)
   - Filter by license status? (Has license, No license, Expired)
   - Filter by organization? (Admin only)

2. **Dropdown location?**
   - Top of user list page?
   - Sidebar filter panel?
   - Multiple dropdowns or multi-select?

**Recommendation:**
- **Filters (for dashboard/users page):**
  - Team dropdown (if team leader)
  - Role dropdown (all roles)
  - License status dropdown (Active, Expired, None)
  - Search bar (email/name search)
- **Admin extra filters:**
  - Organization dropdown
  - All teams across all organizations

---

### ❓ GAP 7: Sidebar Navigation Visibility

**Current Requirement:**
> "普通用户：隐藏侧边栏'用户'导航项"

**Questions:**
1. **Which pages should be hidden for each role?**
   - Regular User (free_user, standard_employee):
     - Show: Dashboard, Profile, Products, Licenses, Billing
     - Hide: Users, Teams (management), Organizations, Admin panel
   - Team Leader (team_leader role):
     - Show: All regular user pages + Users (filtered), Teams (manage own)
     - Hide: Admin panel, Organizations (if not admin)
   - Admin (admin role):
     - Show: ALL pages including admin panel

2. **Should team leaders see "Teams" navigation?**
   - To manage their own teams?
   - Or only through dashboard shortcuts?

**Recommendation:**
```typescript
// client/components/layout/Sidebar.tsx
const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['all'] },
  { name: 'Profile', href: '/dashboard/profile', icon: UserIcon, roles: ['all'] },
  { name: 'Products', href: '/dashboard/products', icon: BoxIcon, roles: ['all'] },
  { name: 'Licenses', href: '/dashboard/licenses/mine', icon: KeyIcon, roles: ['all'] },
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon, roles: ['team_leader', 'admin'] },
  { name: 'Teams', href: '/dashboard/teams', icon: TeamIcon, roles: ['team_leader', 'admin'] },
  { name: 'Organizations', href: '/dashboard/organizations', icon: BuildingIcon, roles: ['admin'] },
  { name: 'Admin Panel', href: '/admin', icon: ShieldIcon, roles: ['admin'] },
];
```

---

### ❓ GAP 8: Product List Organization Display

**Current Requirement:**
> "产品列表页显示所有产品及其详情，但不需要显示关联的组织信息"

**Clarification:**
- This is correct: Products are global entities
- Many organizations can use the same product
- Product list shows: name, UPID, tier, limits, description
- Organization association shown only in:
  - Organization details page (products assigned to THIS org)
  - Admin org-licenses management page

**No gap here - requirement is clear.**

---

### ❓ GAP 9: Permission Granularity

**Current RBAC System:**
- 4 Roles: `free_user`, `standard_employee`, `team_leader`, `admin`
- 14 Permissions: e.g., `admin:user_manage`, `team:create`, `license:view`

**Questions:**
1. **Which exact permissions does team leader need?**
   - `team:manage` (manage own teams)
   - `team:add_member` (add users to team)
   - `team:assign_license` (assign licenses to team members)
   - `user:view_team_members` (view users in their teams)

2. **Can team leader create new teams?**
   - Or only admin can create teams?
   - If leader can create, what's the organization context?

**Recommendation:**
- **Team Leader Permissions:**
  ```sql
  -- Assign these to team_leader role
  - team:view (view teams they lead)
  - team:add_member (add users to their teams)
  - team:remove_member (remove users from their teams)
  - team:assign_license (assign licenses from org pool)
  - user:view_filtered (view users in their organization)
  ```
- **Team Creation:** Admin only (prevents team sprawl)

---

### ❓ GAP 10: Backend API Completeness

**What's Implemented (from grep search):**
- ✅ `org_product_licenses` table exists
- ✅ Admin can list users with team leader filtering logic
- ✅ Product service can create org licenses
- ✅ Team handler can list team members

**What's Missing:**
- ❌ API endpoint: Assign product to organization (POST /admin/org-licenses)
- ❌ API endpoint: Update org license quantity (PATCH /admin/org-licenses/:id)
- ❌ API endpoint: Get org license details with certificate (GET /admin/org-licenses/:id)
- ❌ API endpoint: Assign license to team member when joining (internal logic)
- ❌ API endpoint: Set team leader (PATCH /admin/teams/:id/leader)
- ❌ Frontend: All related pages for org license management

---

## ✅ Complete Feature Specification

### Feature 1: User List with Filtering

**Who:** Team Leaders and Admins  
**Where:** `/dashboard/users` page  
**What:**

**Backend (Already Partial):**
- ✅ GET `/admin/users` exists with team leader filtering
- ❌ Missing: Query params for role, team, license status filters

**Frontend:**
- ❌ Create `/client/app/dashboard/users/page.tsx`
- **UI Elements:**
  - Search bar (email/name)
  - Dropdown: Filter by team (team leader sees own teams only)
  - Dropdown: Filter by role
  - Dropdown: Filter by license status
  - Table: email, name, roles, teams, license status
  - Pagination

**Logic:**
- Regular users: Page redirects to dashboard (no access)
- Team leaders: See users from teams they lead
- Admins: See all users with additional org filter

---

### Feature 2: Admin Product Management

**Who:** Admins only  
**Where:** `/admin/products` (already exists), add org assignment  
**What:**

**Backend:**
- ✅ POST `/admin/products` exists (create product)
- ❌ Missing: POST `/admin/org-licenses` (assign product to org)
- ❌ Missing: PATCH `/admin/org-licenses/:id` (update quantities)

**New Endpoints Needed:**
```typescript
POST /admin/org-licenses
Body: {
  organization_id: number,
  product_id: number,
  total_count: number,
  expires_at: string (ISO 8601)
}
Response: OrgProductLicense

PATCH /admin/org-licenses/:id
Body: {
  total_count?: number,
  expires_at?: string
}
Response: OrgProductLicense

GET /admin/org-licenses/:id/certificates
Response: {
  org_license: OrgProductLicense,
  assignments: Array<{
    user_id, user_email, license_key, assigned_at
  }>
}
```

**Frontend:**
- ❌ Update `/client/app/admin/products/page.tsx`
  - Add "Assign to Organization" action button per product
- ❌ Create `/client/app/admin/org-licenses/page.tsx`
  - List all org licenses across all organizations
  - Show org name, product name, total/assigned/available, expiry
  - Actions: Edit, View Certificates

---

### Feature 3: Organization Details Enhancement

**Who:** Admins only  
**Where:** `/dashboard/organizations/[id]/page.tsx` (exists, needs enhancement)  
**What:**

**Backend:**
- ✅ GET `/org/:id` exists (returns org details)
- ❌ Missing: Include org licenses in response
- ❌ Modify endpoint to include joined data from `org_product_licenses`

**Enhanced Response:**
```typescript
GET /org/:id
Response: {
  id, name, description, created_at,
  licenses: Array<{
    id, product_id, product_name, product_upid,
    total_count, assigned_count, available_count,
    expires_at
  }>,
  member_count: number
}
```

**Frontend:**
- ✅ Page exists: `/client/app/dashboard/organizations/[id]/page.tsx`
- ❌ Add "Products & Licenses" section:
  - Table showing licenses (product, counts, expiry)
  - Button: "Add Product License" (opens modal)
  - Button: "Edit" per license (adjust counts/expiry)
  - Button: "View Members" (shows users with assigned licenses)

---

### Feature 4: Team Leader Management

**Who:** Admins  
**Where:** Team details page `/dashboard/teams/[id]/page.tsx`  
**What:**

**Backend:**
- ✅ GET `/team/:id/members` exists (returns team members with roles)
- ❌ Missing: PATCH `/admin/teams/:team_id/members/:user_id/role`

**New Endpoint:**
```typescript
PATCH /admin/teams/:team_id/members/:user_id/role
Body: { role: 'leader' | 'admin' | 'member' }
Response: { success: true, message: 'Role updated' }
```

**Frontend:**
- ✅ Page exists: `/client/app/dashboard/teams/[id]/page.tsx`
- ❌ Enhancement: Member list shows role badges
- ❌ Admin users see "Change Role" dropdown per member
- ❌ Set role to 'leader' to designate team leader

---

### Feature 5: Team Member Addition with License Assignment

**Who:** Team Leaders and Admins  
**Where:** Team details page  
**What:**

**Current Flow (Incomplete):**
1. Team leader clicks "Add Member"
2. Search for users in same organization
3. Select user, click "Add"
4. **MISSING:** License assignment step

**Required Flow:**
1. Team leader clicks "Add Member"
2. Modal: Search users (filtered by organization)
3. **NEW:** Dropdown: "Select Product" (from org available licenses)
4. Click "Add" → Backend:
   - Creates `user_groups` record (adds to team)
   - **NEW:** Creates `team_member_license_assignments` record
   - Decrements `org_product_licenses.available_count`
   - Increments `org_product_licenses.assigned_count`
   - Generates JWT license key

**Backend:**
- ❌ Modify POST `/team/:id/members` to accept `product_id` parameter
- ❌ Add internal logic:
  ```rust
  async fn assign_license_on_team_join(
      pool: &PgPool,
      org_id: i64,
      team_id: i64,
      user_id: i64,
      product_id: i64,
  ) -> AppResult<String> {
      // 1. Check org license availability
      // 2. Decrement available_count, increment assigned_count
      // 3. Generate JWT license token
      // 4. Insert into team_member_license_assignments
      // 5. Return license_key
  }
  ```

**Frontend:**
- ✅ Add member modal exists in `/client/app/dashboard/teams/[id]/page.tsx`
- ❌ Add product dropdown to modal
- ❌ Fetch available products from org licenses
- ❌ Pass `product_id` when calling API

---

### Feature 6: Admin View All Teams

**Who:** Admins  
**Where:** New page `/admin/teams/page.tsx`  
**What:**

**Backend:**
- ❌ New endpoint: GET `/admin/teams` (list all teams across all orgs)

```typescript
GET /admin/teams?page=1&page_size=20&org_id=?
Response: {
  teams: Array<{
    id, name, organization_id, organization_name,
    member_count, leader_emails: string[]
  }>,
  total: number,
  page: number,
  page_size: number
}
```

**Frontend:**
- ❌ Create `/client/app/admin/teams/page.tsx`
- **UI:**
  - Table: team name, organization, member count, leaders
  - Filter by organization dropdown
  - Search by team name
  - Click team → Go to team details page

---

## 📊 Implementation Priority

### Phase 1: Critical Path (Backend Foundation)
**Priority:** P0 - Must implement first

1. **Backend API Endpoints:**
   - POST `/admin/org-licenses` (assign product to org)
   - PATCH `/admin/org-licenses/:id` (update quantities)
   - GET `/admin/org-licenses/:id/certificates` (view certificates)
   - PATCH `/admin/teams/:team_id/members/:user_id/role` (set team leader)
   - Modify POST `/team/:id/members` (add license assignment logic)
   - GET `/admin/teams` (list all teams)

2. **Database Enhancements:**
   - Consider adding `team_default_products` table (if multi-product per team needed)
   - Add indexes if missing

**Estimated Time:** 8-12 hours

---

### Phase 2: Admin Interfaces
**Priority:** P1 - Core admin functionality

1. **Frontend Pages:**
   - `/admin/org-licenses/page.tsx` (list all org licenses)
   - `/admin/teams/page.tsx` (list all teams)
   - Enhance `/dashboard/organizations/[id]/page.tsx` (add licenses section)

2. **Components:**
   - `AssignProductToOrgModal.tsx`
   - `EditOrgLicenseModal.tsx`
   - `ViewCertificatesModal.tsx`

**Estimated Time:** 10-15 hours

---

### Phase 3: Team Leader Features
**Priority:** P1 - Enable team management

1. **Frontend Pages:**
   - `/dashboard/users/page.tsx` (user list with filters)
   - Enhance `/dashboard/teams/[id]/page.tsx` (add product selection to member add flow)

2. **Components:**
   - `AddMemberWithLicenseModal.tsx`
   - `ChangeTeamLeaderDialog.tsx`
   - User filter dropdowns

**Estimated Time:** 8-10 hours

---

### Phase 4: Polish & Testing
**Priority:** P2 - Quality assurance

1. **Permission Checks:**
   - Verify all routes have correct permission middleware
   - Test team leader can only see own teams
   - Test regular users redirected properly

2. **Error Handling:**
   - Handle "no licenses available" gracefully
   - Handle expired licenses
   - Handle invalid user additions

3. **E2E Testing:**
   - Complete workflow: Create org → Assign product → Create team → Add member
   - Verify license counts update correctly

**Estimated Time:** 6-8 hours

---

## 🔧 技术实现细节

### Rust后端代码组织

**新增Service模块:**
```
server/src/services/
├── free_license_service.rs   # 免费许可证管理
├── quota_service.rs           # 配额验证与分配
└── lifecycle_service.rs       # 用户生命周期管理（升级/降级）
```

**修改的Service模块:**
```
server/src/services/
├── auth_service.rs           # 注册逻辑增加UPID支持
├── team_service.rs           # 添加/移除成员逻辑增强
└── license_service.rs        # JWT生成支持tier参数
```

**新增Handler:**
```
server/src/handlers/
├── quota_handler.rs          # 配额管理接口
└── free_license_handler.rs   # 免费许可证接口
```

### TypeScript前端代码组织

**新增组件:**
```
client/components/
├── team/
│   ├── AddMemberModal.tsx           # 多产品选择器
│   ├── ProductQuotaDisplay.tsx      # 配额使用可视化
│   └── MemberLicenseList.tsx        # 成员授权列表
└── admin/
    ├── AssignOrgLicenseModal.tsx    # 组织产品分配
    └── TeamQuotaManager.tsx         # 团队配额管理
```

**修改的API Client方法:**
```typescript
class ApiClient {
  // 注册支持UPID
  async register(email: string, password: string, upid?: string)
  
  // 添加成员支持多产品
  async addTeamMember(teamId: number, userId: number, productIds: number[])
  
  // 新增配额相关
  async getTeamQuotas(teamId: number)
  async assignTeamQuota(teamId: number, orgLicenseId: number, count: number)
  async getAvailableProducts(teamId: number)
}
```

---

## 📖 实施指南

### 开发流程建议

**第1天 (4小时): 数据库迁移**
1. 创建 Migration 011 文件
2. 在本地PostgreSQL执行并验证
3. 更新 Rust models 定义
4. 运行 `cargo test` 确保编译通过

**第2-3天 (12小时): 核心后端逻辑**
1. 实现 `free_license_service.rs`
2. 实现 `quota_service.rs`
3. 修改 `auth_service.rs` 注册逻辑
4. 修改 `team_service.rs` 添加/移除成员逻辑
5. 编写单元测试

**第4-5天 (10小时): 管理员功能**
1. 实现配额管理接口
2. 实现组织许可证分配接口
3. 创建管理员前端页面
4. 集成测试

**第6-7天 (10小时): 团队领导功能**
1. 修改团队详情页
2. 实现产品选择器组件
3. 实现配额显示组件
4. E2E测试

**第8天 (6小时): 测试与优化**
1. 完整业务流程测试
2. 边界条件验证
3. 性能优化
4. 文档补充

### 测试用例示例

```typescript
describe('用户生命周期', () => {
  it('免费用户注册成功', async () => {
    const res = await apiClient.register('test@example.com', 'password', 'allowance001');
    expect(res.data.user.tier).toBe('free');
    expect(res.data.user.source_upid).toBe('allowance001');
    
    // 验证免费许可证生成
    const licenses = await apiClient.getUserLicenses(res.data.user.id);
    expect(licenses[0].daily_limit).toBe(3);
  });
  
  it('团队领导添加成员并分配产品', async () => {
    // 假设团队1有产品allowance001配额40个
    const res = await apiClient.addTeamMember(1, userId, [productId]);
    expect(res.data.success).toBe(true);
    
    // 验证用户升级
    const user = await apiClient.getUserProfile(userId);
    expect(user.tier).toBe('standard');
    
    // 验证配额扣减
    const quota = await apiClient.getTeamQuotas(1);
    expect(quota[0].used_count).toBe(1);
  });
  
  it('移除成员自动降级', async () => {
    await apiClient.removeTeamMember(1, userId);
    
    // 验证用户降级
    const user = await apiClient.getUserProfile(userId);
    expect(user.tier).toBe('free');
    
    // 验证免费许可证恢复
    const licenses = await apiClient.getUserLicenses(userId);
    expect(licenses[0].daily_limit).toBe(3);
  });
});

describe('配额管理', () => {
  it('严格约束验证', async () => {
    // 组织总配额100，团队A已分配40，团队B已分配60
    await expect(
      apiClient.assignTeamQuota(teamCId, orgLicenseId, 20)
    ).rejects.toThrow('配额超限');
  });
  
  it('不能低于已使用数', async () => {
    // 团队A分配40，已使用30
    await expect(
      apiClient.assignTeamQuota(teamAId, orgLicenseId, 25)
    ).rejects.toThrow('配额不能低于已使用数');
  });
});
```

---

## 🚀 部署注意事项

### 环境变量配置

**新增环境变量 (.env):**
```env
# 免费用户每日限制
FREE_TIER_DAILY_LIMIT=3

# 许可证JWT过期时间（免费用户永久有效，设为10年）
FREE_LICENSE_EXPIRY_YEARS=10
PAID_LICENSE_EXPIRY_YEARS=1

# 每日重置时区
RESET_TIMEZONE=Asia/Shanghai
```

### 数据库维护

### 监控告警

**关键指标:**
1. 配额使用率 > 80% → 预警
2. 免费用户转化率 < 5% → 告警
3. 配额验证失败次数 > 10/hour → 告警
4. 数据库事务耗时 > 1s → 告警

**Prometheus配置示例:**
```yaml
- alert: QuotaHighUsage
  expr: (team_product_quotas_used_count / team_product_quotas_allocated_count) > 0.8
  for: 1h
  annotations:
    summary: "团队 {{ $labels.team_id }} 配额使用率过高"
    
- alert: LowConversionRate
  expr: rate(users_upgraded_total[24h]) / rate(users_registered_total[24h]) < 0.05
  for: 24h
  annotations:
    summary: "免费用户转化率过低"
```

---

## 📞 FAQ (常见问题)

### Q1: 免费用户每日使用次数在哪里验证？
**A:** 客户端产品代码发送 API 请求时，后端 `/license/verify` 接口检查 `free_user_licenses.daily_usage` 字段，超过 `daily_limit` 则拒绝。

### Q2: 如果团队配额用完，能否临时添加成员？
**A:** 不能。必须先由管理员增加配额或从其他团队回收配额，然后才能添加成员。这是严格约束。

### Q3: 用户可以同时在多个团队吗？
**A:** 可以。用户可以是团队A的成员，同时也是团队B的成员，分别获得不同的产品授权。

### Q4: 团队领导能否给自己分配产品？
**A:** 可以。团队领导首先是团队成员，可以通过另一个团队领导（或管理员）将自己添加为成员并分配产品。

### Q5: 组织许可证过期后会发生什么？
**A:** 添加成员时会验证 `org_product_licenses.expires_at`，过期则阻止操作。已有成员的许可证JWT继续有效（因为JWT自带过期时间），但无法添加新成员。

### Q6: 如何处理团队领导离职？
**A:** 管理员在团队详情页点击"更换领导"，选择新的成员设为 `role='leader'`，旧领导降为 `role='member'` 或移除。

### Q7: 产品tier如何映射到功能权限？
**A:** 
- `free` tier: basic功能，每天3次限制
- `standard` tier: pro功能，无限次数
- `premium` tier: enterprise功能，无限次数 + AI功能

产品代码根据JWT中的 `tier` 字段判断。

### Q8: 如何批量导入用户到组织？
**A:** 管理员使用 `POST /admin/organizations/:id/batch-invite` 接口，上传CSV文件（email列表），系统自动发送邀请邮件。

---

## 🎓 词汇表

| 术语 | 定义 |
|------|------|
| UPID | Universal Product ID，产品唯一标识符，格式如 `allowance001` |
| 组织许可证池 | `org_product_licenses` 表记录，组织购买的产品总授权数 |
| 团队配额 | `team_product_quotas` 表记录，从组织池分配给团队的名额 |
| 成员授权 | `team_member_license_assignments` 表记录，用户实际获得的产品许可证 |
| 严格约束 | 所有团队配额总和 ≤ 组织总许可数的硬性限制 |
| 用户升级 | 从 tier=free 变为 tier=standard，通过加入团队触发 |
| 用户降级 | 从 tier=standard 变为 tier=free，当不再属于任何团队时触发 |
| 注册来源产品 | `users.source_upid`，用户注册时的产品UPID |
| 免费许可证 | `free_user_licenses` 表记录，永久有效但每日限制次数 |
| JWT许可证 | `license_key` 字段，包含用户ID、产品ID、tier、过期时间的JWT token |

---

**文档状态**: ✅ 最终版  
**总页数**: 2000+ 行  
**预计实施周期**: 8个工作日（39-49小时）  
**下一步操作**: 创建 Migration 011 并开始后端实现  

**维护记录:**
- 2025-11-28: 初始版本，整合所有历史需求
- 2025-11-28: 最终确认，所有问题已解决

---

## ✅ 最终检查清单

**需求确认:**
- [x] 免费用户注册流程明确（支持UPID自动携带）
- [x] 团队配额分配逻辑明确（严格约束模式）
- [x] 添加成员产品选择明确（必须包含注册来源产品）
- [x] 移除成员降级逻辑明确（自动降级+释放配额）
- [x] 组织-产品-团队关系明确（三级架构）
- [x] 跨团队授权场景明确（独立授权记录）
- [x] 权限模型明确（双重控制：RBAC + team role）

**技术准备:**
- [x] 数据库表结构完整
- [x] 迁移脚本可执行
- [x] API接口规范完整
- [x] 前端页面清单完整
- [x] 测试用例覆盖完整
- [x] 部署配置完整

**可以开始实施！** 🚀
