---
mode: planning
---

# 前端页面需求分析报告（Frontend Requirements Analysis）

日期：2025年11月14日
基于：UPID/Nonce/License授权系统需求

## 📋 目录

1. [现有页面结构](#现有页面结构)
2. [新增功能需求映射](#新增功能需求映射)
3. [页面清单](#页面清单)
4. [详细页面规格](#详细页面规格)
5. [API集成清单](#api集成清单)
6. [实现优先级](#实现优先级)

---

## 现有页面结构

### 已有页面
```
client/app/
├── page.tsx                          ✅ 首页 - 显示欢迎信息
├── layout.tsx                        ✅ 根布局
├── globals.css                       ✅ 全局样式
├── auth/
│   ├── login/page.tsx               ✅ 登录页
│   ├── reset-password/page.tsx      ✅ 密码重置页
│   └── activate/page.tsx            ✅ 邮箱激活页
├── dashboard/
│   ├── page.tsx                     ✅ 仪表盘首页
│   ├── layout.tsx                   ✅ 仪表盘布局（侧边栏导航）
│   ├── profile/page.tsx             ✅ 用户资料页
│   ├── products/page.tsx            ✅ 产品/许可证页（管理员视图）
│   ├── billing/                     ✅ 计费相关
│   ├── batch/                       ✅ 批量许可证操作
│   ├── organizations/page.tsx       ✅ 组织管理
│   └── teams/page.tsx               ✅ 团队管理
└── admin/
    ├── layout.tsx                   ✅ Admin布局
    ├── users/page.tsx               ✅ 用户管理
    ├── products/page.tsx            ✅ 产品管理
    └── approvals/page.tsx           ✅ 审批管理
```

---

## 新增功能需求映射

### 需求 1: UPID产品识别（Registration & Login流程）

**当前状态：**
- ✅ 注册页面存在 (`/auth/login` - 可能同时处理注册)
- ❌ 未从HTML meta标签读取UPID
- ❌ 登录未发送UPID参数
- ❌ 未实现UPID校验逻辑

**需要修改：**
1. **登录页** (`/auth/login/page.tsx`)
   - ✏️ 从meta标签读取UPID：`<meta name="allowance-upid" content="UPID-product-tier">`
   - ✏️ 显示产品信息（UPID对应的产品名）
   - ✏️ 使用 `apiClient.loginWithUpid()` 替代 `apiClient.login()`
   - ✏️ 错误处理：产品未授权、许可证无效等

2. **首页** (`/page.tsx`)
   - ✏️ 添加meta标签UPID信息
   - ✏️ 显示当前产品信息

---

### 需求 2: Nonce签名验证（API请求层）

**当前状态：**
- ✅ API客户端已实现 `generateNonce()` 方法
- ✅ 已实现 `loginWithUpid()` 支持Nonce
- ❌ 其他POST/PUT/DELETE请求未添加Nonce

**需要修改：**
1. **API客户端** (`client/lib/api-client.ts`)
   - ✏️ 为所有POST/PUT/DELETE请求自动添加Nonce headers
   - ✏️ 或创建装饰方法 `postWithNonce()`, `putWithNonce()`, `deleteWithNonce()`
   - ✏️ 错误处理：409 Conflict（重复请求）、401 Unauthorized（无效签名）

2. **所有使用POST/PUT/DELETE的页面**
   - 需要确保正确使用带Nonce的API方法
   - 特别是：License分配、License撤销、审批操作等

---

### 需求 3: License管理与分配（Team Leader专用）

**当前状态：**
- ✅ Dashboard/products 存在
- ❌ 未实现License分配逻辑
- ❌ 未区分不同用户角色的权限

**需要新增/修改：**

#### 3.1 新增页面：Team Leader License管理页面
**路由：** `/dashboard/licenses/assign`

**功能：**
- 显示该team拥有的所有License
- 显示License的状态（已用/总数）
- 选择license后，列出可分配的team成员
- 分配License给员工（POST /licenses/assign）
- 撤销已分配的License（DELETE /licenses/revoke/{id}）
- 查看License申请列表（待审批）

**权限：** Team Leader角色

---

### 需求 4: License申请与审批流程（Employee & Team Leader）

**当前状态：**
- ✅ Admin/approvals 页面存在
- ❌ 未实现员工自助申请页面
- ❌ 审批页面可能未完全适配新的License审批流程

**需要新增/修改：**

#### 4.1 新增页面：License申请页面
**路由：** `/dashboard/licenses/request`

**功能：**
- 显示所有可用的产品/License
- 显示每个License的信息（tier、过期日期、当前用户数/最大用户数）
- 点击"申请"按钮提交申请（POST /licenses/request）
- 显示申请状态（pending/approved/rejected）
- 显示team leader的审批意见

**权限：** Standard Employee角色

#### 4.2 修改页面：Team Leader审批页面
**路由：** `/dashboard/licenses/approvals` 或 `/admin/approvals`

**功能：**
- ✏️ 显示待审批的License申请列表
- ✏️ 每条申请显示：申请人、申请的产品/License、申请时间
- ✏️ 支持批准（POST /approvals/{id}/approve）- 需要输入备注
- ✏️ 支持拒绝（POST /approvals/{id}/reject）- 需要输入拒绝原因
- ✏️ 显示已审批的申请（历史记录）

**权限：** Team Leader, Admin角色

---

### 需求 5: License信息查看（所有用户）

**当前状态：**
- ✅ Dashboard/products 存在
- ❌ 未明确实现License信息展示

**需要新增/修改：**

#### 5.1 新增页面：我的License页面
**路由：** `/dashboard/licenses/mine`

**功能：**
- 显示当前用户所有分配的License
- 显示License信息：产品名、UPID、tier、过期时间、当前用户数/最大
- 显示License状态（active/expired/revoked）
- 显示分配时间、分配者、是否已撤销
- 只读模式（查询接口）

**权限：** 所有认证用户

#### 5.2 新增页面：可用产品浏览页面
**路由：** `/dashboard/products/available`

**功能：**
- 显示组织内有效的License的所有产品
- 显示产品UPID、名称、tier、可用名额
- 从此页面可以跳转到"申请License"页面

**权限：** Standard Employee及以上

---

### 需求 6: Admin产品和License管理

**当前状态：**
- ✅ Admin/products 页面存在
- ❌ 未实现UPID产品的CRUD
- ❌ 未实现License的CRUD

**需要新增/修改：**

#### 6.1 修改页面：Admin产品管理
**路由：** `/admin/products`

**功能：**
- ✏️ 显示所有产品及其UPID
- ✏️ 列表字段：id、UPID（uuidv4-slug-tier）、product_slug、tier、name、description、创建时间
- ✏️ 新增产品（POST /admin/products）
  - 自动生成UPID格式
  - 输入：product_slug, tier, name, description
- ✏️ 删除产品（DELETE /admin/products/{id}）
- ✏️ 编辑产品信息
- ✏️ 查看产品关联的License列表

**权限：** Admin角色

#### 6.2 新增页面：Admin License管理
**路由：** `/admin/licenses`

**功能：**
- 显示所有License
- 列表字段：id、UPID、组织名、发放时间、过期时间、最大用户数、当前用户数、状态（active/expired/revoked）
- 新增License（POST /admin/licenses）
  - 选择产品UPID
  - 选择组织
  - 设置发放日期、过期日期、最大用户数
- 修改License（PATCH /admin/licenses/{id}）
  - 延期、修改max_users
- 撤销License（DELETE /admin/licenses/{id}）
  - 需要确认，会释放所有已分配的名额
- 查看License下分配给的所有用户

**权限：** Admin角色

---

### 需求 7: 登录流程完善

**当前状态：**
- ✅ 登录页面存在
- ❌ 未实现UPID检测和验证反馈
- ❌ 未处理License无效等新的错误场景

**需要修改：**

#### 7.1 修改登录页面
**路由：** `/auth/login`

**功能修改：**
- ✏️ 页面加载时自动从meta标签读取UPID
- ✏️ 显示当前产品信息（从UPID提取product_slug和tier展示）
- ✏️ 调用 `apiClient.loginWithUpid(email, password, upid)`
- ✏️ 增强错误处理：
  ```
  - "Invalid credentials" -> 用户名或密码错误
  - "Product not authorized" -> 该产品未授权使用此系统
  - "Product license not available" -> 组织未购买该产品许可
  - "License user limit reached" -> 许可证已满座
  - "License expired" -> 许可证已过期
  ```
- ✏️ 成功登录后：
  - 保存token到localStorage
  - 保存upid和产品信息
  - 重定向到dashboard

---

## 页面清单

### 📊 完整页面清单（汇总）

| 页面路由 | 页面名称 | 状态 | 优先级 | 权限要求 | 新增功能 |
|---------|---------|------|-------|--------|---------|
| `/page.tsx` | 首页 | ✏️ 修改 | P1 | 公开 | 添加UPID meta标签 |
| `/auth/login` | 登录页 | ✏️ 修改 | P1 | 公开 | UPID识别、Nonce签名、错误处理 |
| `/dashboard` | 仪表板首页 | ✅ 已有 | P2 | 认证用户 | 无 |
| `/dashboard/profile` | 用户资料 | ✅ 已有 | P3 | 认证用户 | 无 |
| **`/dashboard/licenses/mine`** | 我的许可证 | ❌ 新增 | P1 | 认证用户 | 查看分配的License |
| **`/dashboard/licenses/request`** | 申请许可证 | ❌ 新增 | P2 | Employee | 员工自助申请License |
| **`/dashboard/licenses/approvals`** | 审批许可证 | ❌ 新增 | P2 | Team Leader | Team Leader审批申请 |
| **`/dashboard/licenses/assign`** | 分配许可证 | ❌ 新增 | P2 | Team Leader | Team Leader分配License |
| **`/dashboard/products/available`** | 可用产品 | ❌ 新增 | P2 | Employee | 查看可用的产品和License |
| `/dashboard/products` | 产品管理（当前） | ✅ 已有 | P3 | Admin | 无 |
| `/dashboard/teams` | 团队管理 | ✅ 已有 | P3 | 认证用户 | 无 |
| `/dashboard/organizations` | 组织管理 | ✅ 已有 | P3 | 认证用户 | 无 |
| `/dashboard/billing` | 计费管理 | ✅ 已有 | P3 | 认证用户 | 无 |
| `/dashboard/batch` | 批量操作 | ✅ 已有 | P3 | Admin | 无 |
| `/admin/users` | 用户管理 | ✅ 已有 | P2 | Admin | 无 |
| **`/admin/products`** | 产品UPID管理 | ✏️ 修改 | P1 | Admin | UPID CRUD |
| **`/admin/licenses`** | 许可证管理 | ❌ 新增 | P1 | Admin | License CRUD |
| `/admin/approvals` | 审批管理（当前） | ✏️ 修改 | P2 | Admin | 适配新的License审批流程 |

**统计：**
- 已有页面：11个
- 新增页面：6个
- 修改页面：4个
- **总计：21个页面**

---

## 详细页面规格

### 1️⃣ 优先级 P1 - 核心功能（必须先做）

#### 1.1 首页 `/page.tsx`
```
目的：展示产品信息和快速导航
修改点：
- HTML head 添加：<meta name="allowance-upid" content="UPID-product-tier" />
- 可通过环境变量 NEXT_PUBLIC_PRODUCT_UPID 设置
- 首页展示当前产品名、tier等信息
- 如果未登录显示Login/Register按钮
- 如果已登录显示Dashboard按钮
```

#### 1.2 登录页 `/auth/login/page.tsx`
```
功能模块：
A. Meta标签UPID读取
   - componentDidMount/useEffect 读取：document.querySelector('meta[name="allowance-upid"]')?.content
   - 提取product_slug和tier展示

B. 登录表单
   - Email输入框
   - Password输入框
   - 产品信息展示（只读）：product_slug - tier
   - "登录"按钮

C. Nonce & Sign生成
   - 点击"登录"时调用 apiClient.loginWithUpid(email, password, upid)
   - API客户端内部处理Nonce生成和签名

D. 错误处理
   - 分类错误提示：
     * "用户名或密码错误" (InvalidCredentials)
     * "产品未授权" (Unauthorized - "Product not authorized")
     * "组织无许可" (Unauthorized - "Product license not available")
     * "许可证已满座" (Unauthorized - "License user limit reached")
     * "许可证已过期" (Unauthorized - "License expired")
   - 使用Toast/Alert展示错误

E. 成功流程
   - 保存token、upid、用户信息到localStorage
   - 重定向到 /dashboard

样式：参考现有登录页设计
```

#### 1.3 我的许可证 `/dashboard/licenses/mine`
```
功能需求：
A. 页面结构
   - 侧边栏：使用Dashboard现有导航
   - 主区域：许可证列表

B. 数据表格
   - 列表展示字段：
     * 产品名 (product.name)
     * UPID (upid)
     * 产品Tier (product.tier)
     * 过期日期 (expires_at)
     * 当前用户数/最大 (current_users/max_users)
     * 状态 (active/expired/revoked) - Badge颜色
     * 分配时间 (assigned_at)
     * 分配者 (assigned_by - user name)
   - 支持按状态筛选：全部、活跃、已过期、已撤销
   - 支持按产品搜索
   - 分页显示（每页10条）

C. 操作
   - 无操作按钮（只读查询）
   - 可点击行查看详细信息
   - 可导出列表

D. 调用API
   - GET /licenses/mine （新增）
   - 或 GET /user/licenses

E. 权限：所有认证用户

样式：卡片风格或表格风格，参考现有Dashboard设计
```

#### 1.4 Admin产品管理 `/admin/products`
```
功能需求：
A. 页面结构
   - 顶部：搜索框、"新增产品"按钮
   - 主区域：产品列表表格

B. 产品列表表格
   - 列表展示字段：
     * ID
     * UPID (格式: UPID-slug-tier)
     * Product Slug
     * Tier (badge颜色区分)
     * 产品名
     * 描述 (截断显示)
     * 创建时间
     * 操作 (编辑、删除、查看关联License)
   - 支持排序：按创建时间、按UPID
   - 支持搜索：按UPID或产品名
   - 分页显示（每页20条）

C. 新增产品 Modal/Page
   - 输入框：
     * Product Slug (文本框，必填，格式验证)
     * Tier (选择框: basic|pro|enterprise)
     * 产品名 (文本框，必填)
     * 描述 (文本域，可选)
   - "保存"按钮 -> POST /admin/products
   - 自动生成UPID格式提示

D. 编辑产品 Modal/Page
   - 显示现有信息
   - 可编辑：name、description
   - UPID、slug、tier 不可编辑
   - "更新"按钮 -> PATCH /admin/products/{id}

E. 删除产品
   - 确认对话框
   - 检查是否有关联License
   - DELETE /admin/products/{id}

F. 查看关联License
   - 点击"查看License"链接
   - 跳转到 /admin/licenses?product_upid=XXX

G. 调用API
   - POST /admin/products (新增)
   - GET /admin/products (列表)
   - PATCH /admin/products/{id} (编辑)
   - DELETE /admin/products/{id} (删除)
   - GET /admin/licenses?product_upid=XXX (查看关联)

H. 权限：Admin角色

样式：参考现有Admin用户管理页面
```

#### 1.5 Admin许可证管理 `/admin/licenses` (新增)
```
功能需求：
A. 页面结构
   - 顶部：搜索框、"新增许可证"按钮、筛选条件
   - 主区域：许可证列表表格

B. 许可证列表表格
   - 列表展示字段：
     * ID
     * UPID (链接到产品详情)
     * 组织名
     * 发放时间
     * 过期时间 (如果接近过期显示警告颜色)
     * 最大用户数
     * 当前用户数 (进度条显示 current/max)
     * 状态 (active/expired/revoked) - Badge
     * 操作 (续期、修改容量、撤销、查看用户)
   - 支持筛选：
     * 按状态：全部、活跃、已过期、已撤销
     * 按组织
     * 按产品UPID
   - 支持搜索：按UPID或组织名
   - 分页显示（每页20条）

C. 新增许可证 Modal/Page
   - 输入字段：
     * 产品UPID (下拉选择，必填)
     * 组织 (下拉选择，必填)
     * 发放日期 (日期选择器，默认today，必填)
     * 过期日期 (日期选择器，必填)
     * 最大用户数 (数字输入，必填)
   - 验证：过期日期 > 发放日期
   - "保存"按钮 -> POST /admin/licenses
   - 取消按钮

D. 编辑许可证 Modal/Page
   - 显示现有信息
   - 可编辑字段：
     * 过期日期 (续期)
     * 最大用户数 (修改容量)
     * UPID、组织、发放日期 不可编辑
   - "更新"按钮 -> PATCH /admin/licenses/{id}

E. 撤销许可证
   - 确认对话框：提示会释放所有已分配名额
   - 是否需要通知关联用户 (可选)
   - DELETE /admin/licenses/{id}
   - 后端应清理相关user_licenses记录

F. 查看许可证下的用户
   - 点击"查看用户"按钮
   - 显示Modal或页面，列出：
     * 用户邮箱、用户名
     * 分配时间、分配者
     * 是否已撤销、撤销时间

G. 调用API
   - POST /admin/licenses (新增)
   - GET /admin/licenses (列表，支持筛选)
   - PATCH /admin/licenses/{id} (修改)
   - DELETE /admin/licenses/{id} (撤销)
   - GET /admin/licenses/{id}/users (查看关联用户)

H. 权限：Admin角色

样式：参考现有Admin页面风格，采用表格+筛选器模式
```

---

### 2️⃣ 优先级 P2 - 核心业务流程（紧接着做）

#### 2.1 申请许可证 `/dashboard/licenses/request` (新增)
```
功能需求：
A. 页面结构
   - 顶部：分类标签 (全部、已申请、已批准、已拒绝)
   - 主区域：可申请License列表 + 申请记录

B. 可申请License列表
   - 卡片视图或表格视图
   - 字段显示：
     * 产品名、UPID、tier
     * 产品描述
     * 过期时间
     * 当前用户数/最大用户数 (进度条)
     * 状态标签
     * "申请"按钮 (如果当前用户未申请过)
   - 支持按产品名搜索
   - 支持按tier筛选

C. 申请Logic
   - 点击"申请"按钮 -> 弹出Modal
   - Modal内容：
     * 显示产品信息（只读）
     * 文本域：输入申请原因（可选）
     * "确认申请"和"取消"按钮
   - POST /licenses/request {license_id, reason?}
   - 成功后显示Success提示，刷新列表

D. 申请记录Tab
   - 显示该用户所有的License申请
   - 列表字段：
     * 产品名
     * 申请时间
     * 状态 (pending/approved/rejected) - Badge颜色
     * Team Leader批注/拒绝原因
     * 操作 (查看详情)
   - 支持按状态筛选

E. 调用API
   - GET /licenses/available (获取可申请的License列表)
   - POST /licenses/request (提交申请)
   - GET /licenses/requests (查看申请记录)

F. 权限：Standard Employee及以上

样式：卡片网格 + 列表混合设计，参考仪表板风格
```

#### 2.2 分配许可证 `/dashboard/licenses/assign` (新增)
```
功能需求：
A. 页面结构
   - 左侧：team下的可分配License列表
   - 右侧：分配操作面板

B. 可分配License列表
   - 该Team Leader所在team拥有的所有License
   - 字段：
     * 产品名、UPID
     * 最大用户数
     * 已分配用户数
     * 剩余名额（计算）
     * 过期时间
     * 状态
   - 点击一个License选中它
   - 选中后显示详细信息在右侧

C. 分配操作面板
   - 选中License的详细信息
   - Team成员列表（下拉或搜索框）
   - 显示可分配的成员（未被分配过该License的成员）
   - 分配数量输入（单次分配1个）
   - "分配给"按钮 -> POST /licenses/assign
   - 成功后刷新列表

D. 已分配用户列表
   - 该License已分配给的所有team成员
   - 字段：
     * 用户邮箱、用户名
     * 分配时间、分配者
     * 操作 (撤销)
   - 撤销操作 -> DELETE /licenses/revoke/{user_license_id}
   - 确认对话框
   - 成功后释放名额，刷新列表

E. 待审批申请面板
   - 显示Team Leader需要审批的License申请
   - 字段：
     * 申请人邮箱
     * 申请的产品/License
     * 申请时间
     * 申请原因（如有）
     * 操作 (批准、拒绝)
   - 点击"批准"-> 弹出Modal:
     * 显示申请信息
     * 可选项：是否自动分配该License给申请人
     * POST /approvals/{id}/approve
   - 点击"拒绝"-> 弹出Modal:
     * 显示申请信息
     * 文本域：输入拒绝原因（必填）
     * POST /approvals/{id}/reject

F. 调用API
   - GET /team/{team_id}/licenses (获取team的License列表)
   - GET /team/{team_id}/license/{license_id}/assignments (获取已分配用户)
   - POST /licenses/assign (分配License)
   - DELETE /licenses/revoke/{user_license_id} (撤销分配)
   - GET /team/{team_id}/approvals (获取待审批申请)
   - POST /approvals/{id}/approve (批准)
   - POST /approvals/{id}/reject (拒绝)

G. 权限：Team Leader角色

样式：分屏或选项卡设计，参考高级管理界面
```

#### 2.3 许可证审批 `/dashboard/licenses/approvals` 或 `/admin/approvals` (修改)
```
可选：如果Team Leader和Admin都用同一页面
或者：Team Leader用 /dashboard/licenses/approvals，Admin用 /admin/approvals

功能需求：
A. 页面结构
   - 顶部：分类标签 (全部、待审批、已批准、已拒绝)
   - 主区域：申请列表

B. 申请列表
   - 表格或卡片视图
   - 字段：
     * 申请人邮箱、用户名
     * 申请的产品名/UPID
     * License信息
     * 申请时间
     * 申请原因（截断显示）
     * 申请状态 (pending/approved/rejected) - Badge
     * 操作 (批准、拒绝、查看详情)
   - 支持搜索：按申请人邮箱或产品名
   - 支持筛选：按状态、按产品
   - 分页显示

C. 批准操作
   - 点击"批准"按钮 -> 弹出Modal
   - Modal内容：
     * 显示申请信息（只读）
     * 可选输入框：批注/备注
     * Checkbox: 自动分配License给申请人
     * "确认批准"和"取消"按钮
   - POST /approvals/{id}/approve {remarks?, auto_assign?}
   - 成功后：
     * 更新该行状态为"已批准"
     * 如果auto_assign=true，则自动在user_licenses添加记录

D. 拒绝操作
   - 点击"拒绝"按钮 -> 弹出Modal
   - Modal内容：
     * 显示申请信息（只读）
     * 文本域：输入拒绝原因（必填）
     * "确认拒绝"和"取消"按钮
   - POST /approvals/{id}/reject {reason}
   - 成功后更新该行状态为"已拒绝"

E. 查看详情
   - 展开或弹出Modal显示完整的申请信息和历史操作记录

F. 历史记录Tab
   - 显示已批准和已拒绝的申请
   - 字段：
     * 申请人、产品、申请时间
     * 批准/拒绝时间
     * 审批人
     * 审批意见

G. 调用API
   - GET /admin/approvals 或 GET /dashboard/approvals (获取申请列表)
   - POST /approvals/{id}/approve (批准)
   - POST /approvals/{id}/reject (拒绝)

H. 权限：Team Leader、Admin角色

样式：参考现有Admin/approvals页面设计，可复用
```

---

### 3️⃣ 优先级 P2 - 辅助功能

#### 2.4 可用产品浏览 `/dashboard/products/available` (新增)
```
功能需求：
A. 页面结构
   - 网格或列表视图显示所有可用产品
   - 顶部：搜索、筛选条件

B. 产品卡片
   - 产品名、描述
   - UPID (显示或隐藏)
   - Tier标签
   - License信息（如果有）：
     * 过期日期
     * 当前用户数/最大用户数
     * 可用名额
   - "申请License"按钮 -> 导航到 /dashboard/licenses/request?license_id=XXX

C. 筛选条件
   - 按Tier筛选 (basic/pro/enterprise)
   - 按产品搜索

D. 调用API
   - GET /products/available (获取可用的产品和License)

E. 权限：Standard Employee及以上

样式：卡片网格设计，参考仪表板产品展示
```

---

## API集成清单

### ✅ 已有API (无需新增)
```
POST   /auth/login                       - 已有，需修改支持UPID
POST   /auth/register                    - 已有
POST   /auth/activate                    - 已有
GET    /user/profile                     - 已有
GET    /user/licenses                    - 已有
```

### ❌ 需要后端新增的API

#### 产品管理
```
POST   /admin/products                   - 创建产品UPID
GET    /admin/products                   - 列表（支持分页、搜索）
GET    /admin/products/{id}              - 获取单个产品
PATCH  /admin/products/{id}              - 修改产品信息
DELETE /admin/products/{id}              - 删除产品
```

#### 许可证管理（Admin）
```
POST   /admin/licenses                   - 创建许可证
GET    /admin/licenses                   - 列表（支持筛选、分页）
GET    /admin/licenses/{id}              - 获取单个许可证
PATCH  /admin/licenses/{id}              - 修改许可证（续期、修改max_users）
DELETE /admin/licenses/{id}              - 撤销许可证
GET    /admin/licenses/{id}/users        - 查看已分配用户
```

#### 许可证管理（Team Leader & Employee）
```
GET    /licenses/mine                    - 我的许可证（查询当前用户已分配的License）
GET    /licenses/available               - 可用许可证（查询可申请的License）
POST   /licenses/request                 - 申请许可证
GET    /licenses/requests                - 查看申请记录
POST   /licenses/assign                  - 分配许可证给员工
DELETE /licenses/revoke/{id}             - 撤销许可证分配
```

#### 许可证审批
```
GET    /admin/approvals                  - 获取所有审批请求
GET    /dashboard/approvals 或          - 获取Team Leader的审批请求
       /team/{team_id}/approvals
GET    /approvals/{id}                   - 获取单个审批请求
POST   /approvals/{id}/approve           - 批准审批请求
POST   /approvals/{id}/reject            - 拒绝审批请求
```

#### 产品信息查询
```
GET    /products                         - 获取所有产品（分页）
GET    /products/{id}                    - 获取单个产品
GET    /products/available               - 获取组织内可用的产品（有有效License的）
```

---

## 实现优先级

### Phase 1: 基础设施与核心登录流程（第1周）
**优先级：P1 - 必须完成**

1. ✏️ 修改 `/page.tsx` - 添加UPID meta标签
2. ✏️ 修改 `/auth/login/page.tsx` - 支持UPID识别和Nonce签名
3. ✏️ 修改 `client/lib/api-client.ts` - 优化Nonce处理，为POST/PUT/DELETE自动添加
4. ✏️ 修改 `/admin/products/page.tsx` - 实现产品UPID的CRUD

**验收标准：**
- 用户能从meta标签读取UPID
- 用户能成功登录并通过Nonce验证
- Admin能创建产品并生成UPID
- 登录错误能正确显示（产品未授权、许可无效等）

---

### Phase 2: 许可证管理核心功能（第2周）
**优先级：P1 - 必须完成**

1. ❌ 新增 `/admin/licenses/page.tsx` - Admin许可证CRUD
2. ❌ 新增 `/dashboard/licenses/mine/page.tsx` - 查看我的许可证
3. ✏️ 修改 `/admin/approvals/page.tsx` - 适配新的License审批流程

**验收标准：**
- Admin能创建、修改、撤销许可证
- 用户能查看分配给自己的许可证
- Admin能在许可证管理页面查看关联的用户

---

### Phase 3: License申请与分配流程（第3周）
**优先级：P2 - 重要功能**

1. ❌ 新增 `/dashboard/licenses/request/page.tsx` - 员工申请许可
2. ❌ 新增 `/dashboard/licenses/assign/page.tsx` - Team Leader分配许可
3. ❌ 新增 `/dashboard/products/available/page.tsx` - 查看可用产品

**验收标准：**
- 员工能申请许可，Team Leader能审批
- Team Leader能查看和分配许可证给团队成员
- 许可证名额正确计算和显示

---

### Phase 4: 优化与测试（第4周）
**优先级：P3 - 完善功能**

1. 集成测试所有功能
2. 性能优化（分页、缓存）
3. UI/UX改进
4. 错误处理完善

---

## 前端技术需求

### 技术栈（已有）
- Next.js 14 + TypeScript
- Tailwind CSS
- React Hooks
- Zustand（状态管理）
- Axios（HTTP客户端）

### 新增可能需要的库
```json
{
  "react-table": "latest",          // 高级表格功能（排序、筛选）
  "date-fns": "latest",              // 日期处理
  "uuid": "latest",                  // UUID生成（已内置crypto）
  "react-hot-toast": "latest"        // Toast提示（可选，可用现有组件）
}
```

### 实现建议
1. 创建可复用的表格组件 `<DataTable>`
2. 创建可复用的Modal组件 `<ConfirmDialog>`，已有需复用
3. 创建API拦截器自动添加Nonce（在axios拦截器中）
4. 使用Zustand store统一管理user、auth、license状态
5. 创建权限检查HOC或Hook `usePermission(requiredRole)`

---

## 总结

### 📊 工作量评估
| 阶段 | 页面数 | 难度 | 估计工时 |
|------|-------|------|--------|
| Phase 1 | 2页修改 | 中 | 20小时 |
| Phase 2 | 3页（1新2改） | 中 | 24小时 |
| Phase 3 | 3页新增 | 高 | 28小时 |
| Phase 4 | 测试优化 | 中 | 16小时 |
| **总计** | **11页** | - | **88小时** |

### ✅ 检查清单
- [ ] 所有API端点后端已实现
- [ ] Nonce验证中间件已在后端部署
- [ ] 权限检查逻辑已在后端实现
- [ ] Database schema已创建（products, licenses, user_licenses, license_approvals）
- [ ] 前端路由文件夹已创建
- [ ] 前端组件库已更新
- [ ] 测试用例已准备

---

## 下一步行动

1. **后端确认**：确认所有API是否已实现/就绪
2. **前端框架**：确认是否需要新增依赖库
3. **设计规范**：确认UI设计（颜色、图标、布局）
4. **第一阶段启动**：确认后开始Phase 1实现

**预期完成时间：4周（20个工作日）**
