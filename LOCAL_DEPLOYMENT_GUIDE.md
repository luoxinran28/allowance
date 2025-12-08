# 本地部署和测试验证指南

**目的**: 在本地环境完整验证整个系统的功能和稳定性，确保所有组件正常工作

**需时**: 约 30-45 分钟 (包括构建时间)

---

## 📋 前置检查

### 系统要求

```bash
# 检查 Docker 版本 (需要 20.10+)
docker --version

# 检查 Docker Compose 版本 (需要 2.0+)
docker compose version

# 检查磁盘空间 (需要至少 10GB)
df -h

# 检查 RAM (需要至少 4GB 可用)
free -h
```

### 端口可用性检查

```bash
# 检查以下端口是否被占用
lsof -i :3030    # 前端端口
lsof -i :4040    # 后端端口
lsof -i :5432    # PostgreSQL 端口
lsof -i :6379    # Redis 端口 (如果启用)
lsof -i :9090    # Prometheus 端口

# 如果端口被占用，需要停止占用的进程
# kill -9 <PID>
```

---

## 🚀 快速启动 (5分钟)

### 方式一：完整启动 (推荐)

```bash
# 1. 进入项目目录
cd /path/to/allowance

# 2. 一键启动所有服务
docker compose up --build

# 3. 等待所有服务就绪 (约 2-3 分钟)
# 观察日志输出，等待以下提示：
# ✓ allowance-server  | Server listening on 0.0.0.0:4040
# ✓ allowance-client  | Ready in 1.2s
# ✓ allowance-postgres | database system is ready to accept connections
```

### 方式二：后台运行

```bash
# 启动所有服务，并在后台运行
docker compose up --build -d

# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止所有服务
docker compose down

# 停止并清理所有数据
docker compose down -v
```

### 方式三：分步启动 (调试用)

```bash
# 只启动数据库和后端
docker compose up --build postgres server

# 新开一个终端窗口，运行前端
cd client && npm run dev
```

---

## ✅ 验证清单

### 1. 容器状态检查

```bash
# 检查所有容器是否运行
docker compose ps

# 预期输出:
# NAME                 STATUS
# allowance-postgres   Up (healthy)
# allowance-server     Up (healthy)
# allowance-client     Up

# 检查容器日志是否有错误
docker compose logs server | tail -50
docker compose logs client | tail -50
docker compose logs postgres | tail -50
```

**✅ 检查项**:
- [ ] 所有容器状态为 `Up`
- [ ] 至少一个容器状态为 `Up (healthy)`
- [ ] 日志中无 ERROR 或 FATAL

---

### 2. 后端API验证

#### 基础健康检查

```bash
# 简单健康检查
curl http://localhost:4040/health

# 预期响应:
# {"status":"healthy","timestamp":"2024-12-08T10:30:00Z"}
```

#### 详细健康检查

```bash
curl http://localhost:4040/health/detailed

# 预期响应结构:
{
  "status": "healthy",
  "timestamp": "2024-12-08T10:30:00Z",
  "checks": {
    "database": {
      "status": "healthy",
      "response_time_ms": 2.5
    },
    "cache": {
      "status": "healthy",
      "response_time_ms": 0.1
    },
    "memory": {
      "status": "healthy",
      "response_time_ms": 0.5
    }
  }
}
```

#### 就绪检查 (K8s readiness probe)

```bash
curl http://localhost:4040/health/ready

# 预期响应:
# {"ready":true,"dependencies":["database","cache"]}
```

**✅ 检查项**:
- [ ] `/health` 返回 200 状态码
- [ ] `/health/detailed` 的所有 checks 都是 `healthy`
- [ ] `/health/ready` 返回 `ready: true`
- [ ] 响应时间 < 500ms

---

### 3. API功能验证

#### 注册和登录流程

```bash
# 1. 注册新用户
curl -X POST http://localhost:4040/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Password123456!"
  }'

# 预期响应:
# {"user_id":"U1a2b3c4d5e6f789","email":"testuser@example.com",...}

# 2. 登录
curl -X POST http://localhost:4040/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Password123456!"
  }'

# 预期响应:
# {"token":"eyJ0eXAiOiJKV1QiLCJhbGc...","user":{"id":...,"email":...}}

# 保存 token 供后续请求使用
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."
```

#### 使用Token访问受保护的API

```bash
# 获取用户信息 (需要 token)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4040/users/me

# 预期响应:
# {"id":"U1a2b3c4d5e6f789","email":"testuser@example.com",...}
```

#### 测试权限检查

```bash
# 尝试无 token 访问受保护的API
curl http://localhost:4040/users/me

# 预期返回 401 Unauthorized
# {"error":"Missing or invalid token"}

# 尝试使用过期 token
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:4040/users/me

# 预期返回 401 Unauthorized
```

**✅ 检查项**:
- [ ] 注册成功，返回 user_id
- [ ] 登录成功，返回有效的 token
- [ ] 使用 token 可以访问受保护的 API
- [ ] 无 token 访问返回 401
- [ ] 无效 token 访问返回 401

---

### 4. 前端应用验证

#### 页面加载检查

```bash
# 访问前端应用
curl http://localhost:3030

# 预期:返回 HTML 内容，包含 <title>Allowance</title> 或类似

# 检查静态资源加载
curl -I http://localhost:3030/_next/static/...
# 预期: 200 OK
```

#### 浏览器访问测试

```bash
# 在浏览器中打开
http://localhost:3030

# 应该看到:
# ✓ 登录页面正确加载
# ✓ CSS 样式已应用
# ✓ 页面在 2 秒内完全加载
```

#### 登录流程测试

```bash
# 在前端执行:
1. 打开 http://localhost:3030/auth/login
2. 输入注册的邮箱和密码
3. 点击登录
4. 应该重定向到 /dashboard
5. 检查浏览器控制台是否有错误
```

**✅ 检查项**:
- [ ] 页面可以加载 (200 OK)
- [ ] CSS 样式正确应用
- [ ] 无 404 错误
- [ ] 登录流程完成
- [ ] 浏览器控制台无红色错误

---

### 5. 数据库验证

#### 连接验证

```bash
# 进入 PostgreSQL 容器
docker compose exec postgres psql -U postgres -d allowance

# 或使用外部客户端连接
psql -h localhost -U postgres -d allowance -c "\dt"

# 预期: 显示数据库中的所有表
```

#### 数据表检查

```bash
# 列出所有表
\dt

# 预期表列表包括:
# ✓ users
# ✓ user_roles
# ✓ permissions
# ✓ products
# ✓ user_licenses
# ✓ teams
# ✓ organizations
# ... 等等

# 检查数据量
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM user_roles;
SELECT COUNT(*) FROM user_licenses;

# 预期: 数据库应该有测试数据
```

#### 运行迁移检查

```bash
# 查看迁移历史
SELECT version, installed_on FROM _sqlx_migrations ORDER BY version DESC;

# 预期: 所有迁移应该是 success
```

**✅ 检查项**:
- [ ] 可以连接到数据库
- [ ] 所有预期的表都存在
- [ ] 表中有数据
- [ ] 所有迁移都成功应用

---

### 6. 权限系统验证

#### 创建不同权限级别的用户

```bash
# 创建 Free 用户 (已在注册时自动分配)
# Free 用户无法访问 Premium 功能

# 创建 Standard 用户
# 需要管理员将其升级到 Standard

# 创建 Premium 用户
# 需要管理员将其升级到 Premium
```

#### 测试权限检查API

```bash
# 检查用户权限
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4040/users/me/permissions

# 预期响应:
# {"permissions":["read_dashboard","view_licenses",...]}

# 检查特定权限
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4040/users/me/has-permission/create_team

# 预期响应:
# {"has_permission": true/false}
```

#### 测试权限门禁

```bash
# 尝试执行需要高权限的操作 (未授权)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4040/admin/users

# 预期返回 403 Forbidden
# {"error":"Permission denied"}

# 使用管理员账号执行相同操作
# 应该返回 200 OK
```

**✅ 检查项**:
- [ ] 不同权限级别的用户有不同的权限列表
- [ ] 权限检查 API 返回正确结果
- [ ] 未授权操作返回 403
- [ ] 授权操作返回 200

---

### 7. E2E测试验证

#### 准备测试环境

```bash
# 确保系统运行中
docker compose ps
# 所有容器应该是 Up

# 进入客户端目录
cd client

# 安装依赖
npm ci
```

#### 运行权限系统E2E测试

```bash
# 运行完整的权限系统测试
npm run test:e2e -- 10-permission-system

# 预期输出:
# ✓ 50+ tests passed
# ✓ 0 failed
# ✓ 运行时间: 2-5 分钟

# 测试应该覆盖:
# ✓ Free 用户限制 (5 tests)
# ✓ Standard 用户权限 (4 tests)
# ✓ Premium 用户功能 (10 tests)
# ✓ Admin 用户访问 (4 tests)
# ✓ UI 元素可见性 (5+ tests)
```

#### 运行所有E2E测试

```bash
# 运行完整的 E2E 测试套件
npm run test:e2e

# 预期:
# ✓ 所有测试文件通过
# ✓ 总测试时间: 5-10 分钟
```

#### 交互模式测试 (手动验证)

```bash
# 在浏览器中运行测试
npm run test:e2e:ui

# 在打开的UI中:
# 1. 选择特定测试用例
# 2. 点击 "Run" 执行
# 3. 在右侧窗口观察浏览器交互
# 4. 查看断言是否通过
```

#### 调试单个测试

```bash
# 运行特定测试，带有详细输出
npm run test:e2e:debug -- tests/10-permission-system.spec.ts

# 在VS Code中调试:
# 1. 在测试文件中设置断点
# 2. 运行: npm run test:e2e:debug
# 3. 在VS Code调试器中单步执行
```

**✅ 检查项**:
- [ ] E2E测试套件全部通过
- [ ] 无跳过的测试 (skip)
- [ ] 无失败的测试 (fail)
- [ ] 测试覆盖权限检查
- [ ] 测试覆盖UI交互

---

### 8. 性能和压力测试

#### 基础性能检查

```bash
# 简单性能测试 (单个请求)
time curl http://localhost:4040/health

# 预期: 响应时间 < 100ms

# 测试不同端点的响应时间
for i in {1..10}; do
  time curl http://localhost:4040/users/me -H "Authorization: Bearer $TOKEN"
done

# 预期: 平均响应时间 < 500ms
```

#### 并发请求测试

```bash
# 使用 ab (Apache Bench) 进行压力测试
# (如果未安装，使用 apt install apache2-utils)

ab -n 100 -c 10 http://localhost:4040/health
# -n 100: 发送 100 个请求
# -c 10: 并发数为 10

# 预期结果:
# Requests per second: > 100 req/s
# Failed requests: 0
# Time per request: < 100ms
```

#### 数据库连接池检查

```bash
# 检查数据库连接数
docker compose exec postgres psql -U postgres -d allowance -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# 预期:
# 活跃连接数 < 最大连接数 (100)
# 没有长期挂起的连接
```

**✅ 检查项**:
- [ ] 单个请求响应时间 < 100ms
- [ ] 并发处理能力 > 100 req/s
- [ ] 数据库连接池管理正常
- [ ] 无内存泄漏迹象

---

### 9. 日志和错误处理

#### 检查应用日志

```bash
# 查看后端日志 (最后 50 行)
docker compose logs server | tail -50

# 预期:
# ✓ 无 ERROR 或 PANIC 级别日志
# ✓ 有 INFO 级别的请求日志
# ✓ 有 WARN 级别的预期警告 (非致命)

# 查看前端日志
docker compose logs client | tail -50

# 预期:
# ✓ 无 error 信息
# ✓ 构建完成提示
# ✓ 开发服务器启动提示
```

#### 检查数据库日志

```bash
# 查看 PostgreSQL 日志
docker compose logs postgres | tail -30

# 预期:
# ✓ 无 ERROR 级别日志
# ✓ 数据库启动成功
# ✓ 连接接受提示
```

#### 在浏览器控制台检查错误

```bash
# 打开浏览器开发者工具 (F12)
# 切换到 Console 标签页

# 预期:
# ✓ 无红色错误信息
# ✓ 可能有黄色警告 (如废弃API) 但不影响功能
# ✓ Network 标签中无 4xx/5xx 红色请求
```

**✅ 检查项**:
- [ ] 应用日志无 ERROR/PANIC
- [ ] 数据库日志无异常
- [ ] 浏览器控制台无红色错误
- [ ] Network 请求都是 200/201/304

---

### 10. 清理和关闭验证

#### 优雅关闭

```bash
# 停止所有容器
docker compose down

# 预期: 所有容器逐个停止，无错误消息

# 验证容器已停止
docker compose ps

# 预期: 无运行中的容器
```

#### 数据持久化检查

```bash
# 重新启动系统
docker compose up -d

# 检查数据是否保留
docker compose exec postgres psql -U postgres -d allowance -c \
  "SELECT COUNT(*) FROM users;"

# 预期: 用户数据仍然存在

# 清理所有数据和卷
docker compose down -v

# 重新启动
docker compose up -d

# 检查数据库是否被重置
docker compose exec postgres psql -U postgres -d allowance -c \
  "SELECT COUNT(*) FROM users;"

# 预期: 只有初始化的默认数据 (如有)
```

**✅ 检查项**:
- [ ] 容器正常停止
- [ ] 容器重启后数据保留
- [ ] 清理后数据被重置
- [ ] 重新启动无错误

---

## 🛠️ 故障排除

### 问题：容器无法启动

```bash
# 检查日志
docker compose logs

# 常见原因:
# 1. 端口被占用
docker lsof -i :4040  # 查找占用进程
kill -9 <PID>         # 杀死进程

# 2. Docker 镜像构建失败
docker compose build --no-cache  # 强制重新构建

# 3. 磁盘空间不足
df -h  # 检查磁盘

# 4. 网络问题
docker network ls
docker network inspect bridge
```

### 问题：数据库连接失败

```bash
# 检查 PostgreSQL 容器
docker compose exec postgres psql -U postgres -c "\l"

# 检查网络连接
docker compose exec server ping postgres

# 检查环境变量
docker compose exec server env | grep DATABASE_URL

# 手动连接测试
docker compose exec postgres psql -U postgres -d allowance
```

### 问题：前端无法连接到后端

```bash
# 检查后端是否运行
curl http://localhost:4040/health

# 检查 API_URL 配置
docker compose exec client env | grep NEXT_PUBLIC_API_URL

# 检查网络
docker compose exec client ping server

# 查看浏览器控制台 (F12)
# 检查 CORS 错误或网络错误
```

### 问题：E2E测试失败

```bash
# 查看测试日志
npm run test:e2e -- --reporter=verbose

# 查看测试视频 (如果生成)
ls test-results/

# 调试模式运行
npm run test:e2e:debug

# 检查系统状态
docker compose ps
curl http://localhost:4040/health
```

---

## 📊 验证检查清单

打印此清单，逐项检查：

```
□ 系统要求检查
  □ Docker 20.10+
  □ Docker Compose 2.0+
  □ 磁盘空间 10GB+
  □ RAM 4GB+ 可用

□ 启动和基础检查
  □ docker compose up --build 成功
  □ 所有容器状态为 Up
  □ 至少一个容器为 (healthy)

□ 后端验证
  □ /health 返回 200
  □ /health/detailed 所有 checks healthy
  □ /health/ready 返回 ready: true
  □ 注册和登录流程正常
  □ Token 认证工作
  □ 权限检查返回正确结果

□ 前端验证
  □ 页面加载速度 < 2s
  □ CSS 样式正确应用
  □ 登录流程完成
  □ 浏览器控制台无红色错误

□ 数据库验证
  □ 可以连接数据库
  □ 所有表存在
  □ 表中有数据
  □ 迁移全部成功

□ E2E 测试
  □ 权限系统测试通过 (50+)
  □ 无失败测试
  □ 测试覆盖各权限级别

□ 性能测试
  □ 响应时间 < 100ms
  □ 并发能力 > 100 req/s
  □ 数据库连接正常

□ 清理和重启
  □ 优雅关闭无错误
  □ 数据重启后保留
  □ 清理后数据重置
  □ 重启无错误
```

---

## 📞 如需帮助

如果验证过程中遇到问题，请：

1. **收集信息**:
   ```bash
   # 保存系统状态
   docker compose ps > status.txt
   docker compose logs > logs.txt
   docker version >> logs.txt
   ```

2. **检查文档**:
   - [server/README.md](server/README.md) - 后端文档
   - [client/README.md](client/README.md) - 前端文档
   - 项目的 GitHub Issues

3. **反馈问题时提供**:
   - 出错的具体步骤
   - 完整的错误信息
   - 系统日志输出
   - 环境信息 (OS, Docker版本等)

---

**完成验证后，系统已确认可以在本地正常运行！** ✅

