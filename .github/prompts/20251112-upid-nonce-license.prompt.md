---
mode: agent
---
2025年11月12日需求：
需要一个产品的upid，用于表示某个产品的唯一标识符;

用户注册时：
 - 用户在登陆页面登陆发现账号没有被注册，则进行账号密码的注册；
 - 注册时只需要提交邮箱和密码，当前产品的upid由html里面的meta标签，如属性“allowance-upid”，里面自动获取;
 - 用户首次注册默认是免费用户；

用户登陆时：
 - 不仅需要提交用户名及密码，还需要提交当前产品的upid，用于区分不同产品的用户登陆;
 - 产品的upid，如果从网页登陆，可以在html里面的meta标签里面获取，如属性“allowance-upid”，目前只有网页端产品，今后如果从其他客户端登陆，可以通过配置文件等方式获取upid;
 - token:
    - 用户提交登陆时，后端需要校验用户名及密码，如果正确，则继续校验该用户所属的组织Organization是否有被该产品upid授权使用权限;
    - 如果不存在，提示该产品没有被allowance授权；
    - 如果存在，则需要校验该upid对应的授权码license是否有效，如果授权码过期或者达到最大用户数，则拒绝登陆，并提示该产品的授权码无效；
    - 如果授权码license有效，则允许用户登陆，并生成相应无状态token返回给前端，前端存储在localstorage里面;
 - nonce:
    - 每次post写相关的API访问，需要生成新的nonce值，采用"timestamp + nonce + sign(SHA256)"三重验证机制，目的是防止API重放攻击，请注意nonce值只能使用一次，避免重复使用;
    - 后端每次收到请求时，都需要校验token的合法性及nonce的有效性，nonce只能使用一次，存放在redis里面，nonce的值可以是一个随机字符串，校验发现重复使用，则拒绝请求返回已经当前收到请求正在处理的提示;
    - 需要建立一个redis的服务器缓存用于存放nonce，并且定期清理过期的nonce，redis由docker容器化部署；
 - 前端每次调用post接口时，都需要提交当前的token及nonce;
 - 使用合理的中间件来处理token及nonce的校验逻辑；

产品授权管理：
 - 需要为产品定义不同的upid：
   - upid格式为uuidv4-{product_slug}-{tier},例如UPID-minerbond-basic;
   - 每一个产品需要包含产品名；
	 - 每一个产品可能有不同规格的功能，例如basic, pro, enterprise等；
	 - 以上不同的信息对应不同的upid，每次有新的产品规格时，都需要生成一个新的upid，并在数据库中存储；
 - License：
    - License绑定org_id及upid;
    - 由系统管理员创建产品时生成license：
    - 包含upid信息；
    - 包含授权码的生成时间以及到期时间等；
    - 包含产品允许使用的最大用户数；
    - 包含授权给对应的组织id；
    - 以上信息的改变都应该有对应不同的授权码license；
 - license由系统管理员分配给对应组织下的小组的产品负责人；
 - 产品负责人指的是小组领导team leader级别的用户；
 - 产品负责人可以将不同的授权码license分配给包括自己在内的小组普通员工使用，每分配一次记录一次更新一次数量，直到达到license允许的最大用户数；
 - 产品负责人可以移除某个普通员工的授权码使用权限，释放名额；
 - 普通员工用户登陆后，可以申请使用某个产品的授权码license，申请后需要产品负责人审批通过后，才能使用该产品的授权码；
 - 小组领导审批普通员工的产品使用申请时，可以选择批准或者拒绝；
 - 用户登陆系统后，可以只读查询产品的所属授权码license信息以及有效期；

---

## 解决方案（Solution）

### 1. 架构概览

#### 核心模型关系
```
Product (UPID)
├── upid: UPID-minerbond-basic (unique)
├── product_slug: minerbond
├── tier: basic|pro|enterprise
├── name: Minerbond
└── licenses: 1-to-many

License
├── id: (primary key)
├── upid: (foreign key to Product)
├── org_id: (指定授权的组织)
├── issued_at: timestamp
├── expires_at: timestamp
├── max_users: int
├── current_users: int (动态更新)
└── revoked: boolean

Organization
└── licenses: 1-to-many (可拥有多个Product的License)

Team (属于Organization)
└── team_leaders: 1-to-many (team_leader角色用户)

User
├── org_id: (所属组织)
├── team_id: (所属团队，可选)
├── roles: 1-to-many (free_user, standard_employee, team_leader, admin)
└── user_licenses: 1-to-many (分配的License，通过approval流程)

UserLicense (中间表)
├── user_id
├── license_id
├── assigned_at: timestamp
├── assigned_by: admin_user_id
└── revoked_at: (optional)

LicenseApproval (审批流程)
├── id: (primary key)
├── user_id: (申请人，standard_employee)
├── license_id: (申请的License)
├── status: pending|approved|rejected
├── requested_at: timestamp
├── approver_id: (team_leader)
├── approved_at: (optional)
└── remarks: (optional)
```

### 2. 数据库迁移（Migration）

新增迁移文件：`007_add_product_and_license_tables.sql`

```sql
-- Products表：存储产品UPID配置
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    upid VARCHAR(255) UNIQUE NOT NULL,  -- 格式: UPID-{product_slug}-{tier}
    product_slug VARCHAR(100) NOT NULL,
    tier VARCHAR(50) NOT NULL,           -- basic|pro|enterprise
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Licenses表：存储授权码
CREATE TABLE IF NOT EXISTS licenses (
    id BIGSERIAL PRIMARY KEY,
    upid VARCHAR(255) NOT NULL,
    org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    max_users INT NOT NULL,
    current_users INT DEFAULT 0,
    revoked BOOLEAN DEFAULT FALSE,
    created_by BIGINT NOT NULL REFERENCES users(id),  -- 创建者(admin)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upid) REFERENCES products(upid) ON DELETE CASCADE,
    CHECK (current_users <= max_users)
);

-- UserLicense表：用户和License的关联
CREATE TABLE IF NOT EXISTS user_licenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_id BIGINT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL,
    assigned_by BIGINT NOT NULL REFERENCES users(id),  -- 分配者(team_leader/admin)
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, license_id),
    CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)
);

-- LicenseApproval表：审批流程
CREATE TABLE IF NOT EXISTS license_approvals (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_id BIGINT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
    requested_at TIMESTAMP NOT NULL,
    approver_id BIGINT REFERENCES users(id),        -- team_leader/admin
    approved_at TIMESTAMP,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('pending', 'approved', 'rejected')),
    CHECK ((status = 'pending' AND approver_id IS NULL AND approved_at IS NULL)
        OR (status IN ('approved', 'rejected') AND approver_id IS NOT NULL AND approved_at IS NOT NULL))
);

-- 索引优化
CREATE INDEX idx_products_upid ON products(upid);
CREATE INDEX idx_licenses_org_id ON licenses(org_id);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);
CREATE INDEX idx_user_licenses_user_id ON user_licenses(user_id);
CREATE INDEX idx_user_licenses_license_id ON user_licenses(license_id);
CREATE INDEX idx_license_approvals_user_id ON license_approvals(user_id);
CREATE INDEX idx_license_approvals_license_id ON license_approvals(license_id);
CREATE INDEX idx_license_approvals_status ON license_approvals(status);
```

### 3. 后端模型定义（Rust）

#### 文件：`server/src/models/product.rs`
```rust
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: i64,
    pub upid: String,                 // 唯一标识：UPID-minerbond-basic
    pub product_slug: String,         // minerbond
    pub tier: String,                 // basic|pro|enterprise
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct License {
    pub id: i64,
    pub upid: String,                 // 关联的产品UPID
    pub org_id: i64,
    pub issued_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub max_users: i32,
    pub current_users: i32,           // 已分配用户数
    pub revoked: bool,
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserLicense {
    pub id: i64,
    pub user_id: i64,
    pub license_id: i64,
    pub assigned_at: DateTime<Utc>,
    pub assigned_by: i64,
    pub revoked_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LicenseApproval {
    pub id: i64,
    pub user_id: i64,
    pub license_id: i64,
    pub status: String,               // pending|approved|rejected
    pub requested_at: DateTime<Utc>,
    pub approver_id: Option<i64>,
    pub approved_at: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// 响应模型（DTO）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductResponse {
    pub id: i64,
    pub upid: String,
    pub name: String,
    pub tier: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseResponse {
    pub id: i64,
    pub upid: String,
    pub expires_at: DateTime<Utc>,
    pub max_users: i32,
    pub current_users: i32,
    pub revoked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseApprovalResponse {
    pub id: i64,
    pub user_id: i64,
    pub license_id: i64,
    pub status: String,
    pub requested_at: DateTime<Utc>,
    pub approved_at: Option<DateTime<Utc>>,
}
```

### 4. Nonce验证机制

#### 文件：`server/src/utils/nonce.rs`（新增）
```rust
use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};
use std::fmt::Write;

type HmacSha256 = Hmac<Sha256>;

/// 生成请求体的SHA256哈希
pub fn hash_body(body: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(body);
    format!("{:x}", hasher.finalize())
}

/// 验证Sign签名
/// sign = HMAC-SHA256(timestamp + nonce + body_hash, secret_key)
pub fn verify_sign(
    timestamp: &str,
    nonce: &str,
    body_hash: &str,
    provided_sign: &str,
    secret_key: &str,
) -> bool {
    let message = format!("{}{}{}", timestamp, nonce, body_hash);
    
    let mut mac = HmacSha256::new_from_slice(secret_key.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(message.as_bytes());
    
    let computed_sign = format!("{:x}", mac.finalize().into_bytes());
    computed_sign == provided_sign
}

/// 验证Nonce是否过期（3分钟）
pub fn is_nonce_expired(timestamp: i64) -> bool {
    let now = chrono::Utc::now().timestamp();
    now - timestamp > 180  // 3 * 60 秒
}
```

#### 文件：`server/src/middleware/nonce.rs`（新增）
```rust
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
    http::StatusCode,
};
use redis::AsyncCommands;
use crate::AppState;
use crate::utils::nonce::{verify_sign, is_nonce_expired};

/// Nonce校验中间件
/// 提取header中的 X-Timestamp, X-Nonce, X-Sign 进行验证
pub async fn nonce_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, (StatusCode, String)> {
    // 仅验证POST/PUT/DELETE请求
    if !matches!(request.method(), axum::http::Method::POST | axum::http::Method::PUT | axum::http::Method::DELETE) {
        return Ok(next.run(request).await);
    }

    let timestamp_header = request.headers().get("X-Timestamp")
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::BAD_REQUEST, "Missing X-Timestamp header".to_string()))?;
    
    let nonce_header = request.headers().get("X-Nonce")
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::BAD_REQUEST, "Missing X-Nonce header".to_string()))?;
    
    let sign_header = request.headers().get("X-Sign")
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::BAD_REQUEST, "Missing X-Sign header".to_string()))?;

    // 验证timestamp格式和过期时间
    let timestamp: i64 = timestamp_header.parse()
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid timestamp format".to_string()))?;
    
    if is_nonce_expired(timestamp) {
        return Err((StatusCode::UNAUTHORIZED, "Request expired".to_string()));
    }

    // 验证Sign（需要body哈希）
    let body_bytes = axum::body::to_bytes(request.into_body(), usize::MAX)
        .await
        .map_err(|_| (StatusCode::BAD_REQUEST, "Failed to read body".to_string()))?;
    
    let body_hash = crate::utils::nonce::hash_body(&body_bytes);
    
    if !verify_sign(
        timestamp_header,
        nonce_header,
        &body_hash,
        sign_header,
        &state.config.api_secret_key,
    ) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid signature".to_string()));
    }

    // 检查Nonce是否已使用
    let mut redis = state.redis.get_connection()
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Redis connection failed".to_string()))?;
    
    let nonce_key = format!("nonce:{}", nonce_header);
    let exists: bool = redis.exists(&nonce_key)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Redis error".to_string()))?;
    
    if exists {
        return Err((StatusCode::CONFLICT, "Request already processed".to_string()));
    }

    // 标记Nonce已使用，TTL 3分钟
    let _: () = redis.set_ex(&nonce_key, "1", 180)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Redis error".to_string()))?;

    // 重建request（因为body已读）
    let new_request = Request::builder()
        .method(request.method().clone())
        .uri(request.uri().clone())
        .body(axum::body::Body::from(body_bytes))
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to rebuild request".to_string()))?;

    Ok(next.run(new_request).await)
}
```

### 5. 登录流程更新

#### 文件：`server/src/services/auth_service.rs`（修改login方法）

登录时校验流程：
1. 验证用户名/密码
2. **新增**：验证Organization是否授权该UPID产品
3. **新增**：验证License是否有效（未过期、未被撤销、未满座）
4. 生成JWT token（包含UPID和权限信息）

```rust
pub async fn login(
    pool: &PgPool,
    redis: &redis::Client,
    email: &str,
    password: &str,
    upid: &str,  // 新增参数
) -> AppResult<LoginResponse> {
    // 1. 验证用户名/密码
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = $1"
    )
    .bind(email)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized("Invalid credentials".to_string()))?;

    if !verify_password(password, &user.password_hash)? {
        return Err(AppError::Unauthorized("Invalid credentials".to_string()));
    }

    // 2. 验证UPID产品是否存在
    let product = sqlx::query_as::<_, Product>(
        "SELECT * FROM products WHERE upid = $1"
    )
    .bind(upid)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized("Product not authorized".to_string()))?;

    // 3. 验证Organization是否有该产品的License
    let license = sqlx::query_as::<_, License>(
        "SELECT * FROM licenses 
         WHERE upid = $1 AND org_id = $2 AND revoked = FALSE 
         AND expires_at > NOW()"
    )
    .bind(upid)
    .bind(user.org_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::Unauthorized("Product license not available".to_string()))?;

    // 4. 验证License是否已满座
    if license.current_users >= license.max_users {
        return Err(AppError::Unauthorized("License user limit reached".to_string()));
    }

    // 5. 生成JWT token
    let token = generate_jwt(&user, upid)?;
    
    Ok(LoginResponse {
        user: UserResponse::from(user),
        token,
        upid: upid.to_string(),
    })
}
```

### 6. 前端API客户端更新

#### 文件：`client/lib/api-client.ts`（添加方法）

```typescript
class ApiClient {
  private apiSecret: string;

  // 生成Nonce和Sign
  private async generateNonce(): Promise<{
    timestamp: string;
    nonce: string;
    sign: string;
  }> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
    const bodyHash = await this.hashBody({});  // 空body

    const message = `${timestamp}${nonce}${bodyHash}`;
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    const secretBuffer = encoder.encode(this.apiSecret);

    // HMAC-SHA256
    const key = await crypto.subtle.importKey('raw', secretBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, messageBuffer);
    const sign = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return { timestamp, nonce, sign };
  }

  private async hashBody(body: any): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(body));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async login(email: string, password: string, upid: string) {
    const { timestamp, nonce, sign } = await this.generateNonce();
    return this.client.post('/auth/login', 
      { email, password, upid },
      {
        headers: {
          'X-Timestamp': timestamp,
          'X-Nonce': nonce,
          'X-Sign': sign,
        }
      }
    );
  }

  async requestLicense(licenseId: number) {
    const { timestamp, nonce, sign } = await this.generateNonce();
    return this.client.post('/licenses/request',
      { license_id: licenseId },
      {
        headers: {
          'X-Timestamp': timestamp,
          'X-Nonce': nonce,
          'X-Sign': sign,
        }
      }
    );
  }
}
```

### 7. 实现优先级和步骤

#### Phase 1：基础设施（优先级最高）
1. 添加Product和License表迁移
2. 实现Nonce验证中间件和工具函数
3. 更新后端login逻辑

#### Phase 2：前端集成
1. 更新API客户端支持Nonce生成
2. 在登录页面自动读取meta标签中的UPID
3. 测试login流程

#### Phase 3：审批流程
1. 实现LicenseApproval流程（员工申请、team leader审批）
2. 添加admin面板审批页面
3. 实现License分配/释放逻辑

#### Phase 4：查询接口
1. 用户查看分配的License列表
2. Team leader查看待审批申请
3. Admin管理所有License和产品

### 8. 新增API端点列表

```
# 产品管理（Admin）
POST   /admin/products              - 创建产品UPID
GET    /admin/products              - 列表查询产品
DELETE /admin/products/{id}         - 删除产品

# License管理（Admin）
POST   /admin/licenses              - 创建License
GET    /admin/licenses              - 查询License
PATCH  /admin/licenses/{id}         - 更新License（续期、变更max_users）
DELETE /admin/licenses/{id}         - 撤销License

# License分配（Team Leader）
POST   /licenses/assign             - 分配License给员工
DELETE /licenses/revoke/{id}        - 移除员工License

# License申请与审批（Employee & Team Leader）
POST   /licenses/request            - 员工申请License
GET    /approvals                   - 查看待审批申请（Team Leader）
POST   /approvals/{id}/approve      - 批准申请
POST   /approvals/{id}/reject       - 拒绝申请

# 查询接口（Employee）
GET    /licenses/mine               - 查看自己的License
GET    /products                    - 查看可用产品
```

---

## 总结

此方案完整覆盖了需求中的：
- ✅ UPID格式和产品管理
- ✅ License生成、分配、审批流程
- ✅ Nonce防重放攻击机制（timestamp + nonce + sign）
- ✅ Token和Nonce验证中间件
- ✅ 登录时的级联校验（用户 → 组织授权 → License有效性）
- ✅ 用户License查询（只读）

代码遵循项目现有的服务层架构、错误处理模式和RBAC集成方式。建议从Phase 1开始实现。

