# 本地部署快速参考卡片

## 🚀 快速启动 (30秒)

```bash
# 一键启动
docker compose up --build -d

# 等待 2-3 分钟后，访问
http://localhost:3030      # 前端
http://localhost:4040      # 后端API
```

---

## ✅ 验证命令

### 后端健康检查
```bash
curl http://localhost:4040/health
```

### 前端访问
```bash
curl http://localhost:3030
```

### 数据库连接
```bash
docker compose exec postgres psql -U postgres -d allowance -c "SELECT COUNT(*) FROM users;"
```

### 完整验证 (推荐)
```bash
bash local-deploy-test.sh
```

---

## 🔍 诊断工具

```bash
# 打开交互式故障排除工具
bash troubleshoot.sh

# 自动化验证
bash verify-deployment.sh quick      # 快速验证
bash verify-deployment.sh full       # 完整验证
bash verify-deployment.sh e2e        # 包括E2E测试
```

---

## 📊 服务访问地址

| 服务 | 地址 | 功能 |
|------|------|------|
| 前端应用 | http://localhost:3030 | 用户界面 |
| 后端API | http://localhost:4040 | REST API |
| API文档 | http://localhost:4040/swagger-ui/ | Swagger文档 |
| 健康检查 | http://localhost:4040/health | 服务状态 |
| PostgreSQL | localhost:5432 | 数据库 |

---

## 👤 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| Free | free@allowance.test | Pass888999 |
| Standard | standard@allowance.test | Pass888999 |
| Premium | premium@allowance.test | Pass888999 |
| Admin | admin@allowance.test | Pass888999 |

---

## 📋 常用命令

### 容器管理
```bash
# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f              # 所有服务
docker compose logs -f server       # 后端
docker compose logs -f client       # 前端
docker compose logs -f postgres     # 数据库

# 启动/停止
docker compose up -d                # 后台启动
docker compose down                 # 停止所有
docker compose restart              # 重启所有
docker compose restart server       # 重启单个服务
```

### 数据库操作
```bash
# 进入数据库交互模式
docker compose exec postgres psql -U postgres -d allowance

# 查询用户
SELECT * FROM users LIMIT 10;

# 统计表
SELECT COUNT(*) FROM users;

# 退出
\q
```

### 开发模式
```bash
# 后端热重载 (Rust)
cd server
cargo watch -x run

# 前端热重载 (Next.js)
cd client
npm run dev
```

---

## 🧹 清理操作

```bash
# 停止但保留数据
docker compose stop

# 删除容器但保留数据
docker compose down

# 删除一切（包括数据）
docker compose down -v

# 清理磁盘空间
docker system prune -f
```

---

## 🛠️ 故障排除快速表

| 问题 | 解决方案 |
|------|---------|
| 端口被占用 | `lsof -i :PORT` 找到进程，`kill -9 PID` 杀死 |
| 容器无法启动 | `docker compose logs` 查看错误，`docker compose build --no-cache` 重建 |
| 数据库连接失败 | `docker compose restart postgres` 重启数据库 |
| 前端无法连接后端 | 检查 `NEXT_PUBLIC_API_URL` 环境变量 |
| E2E测试失败 | 确保后端正常运行，查看 `npm run test:e2e -- --reporter=verbose` |

---

## 📝 验证检查清单

打印此清单并逐项检查：

```
□ Docker 和 Docker Compose 已安装
□ 所有容器状态为 "Up"
□ 后端 /health 返回 200
□ 前端可以在浏览器中打开
□ 可以登录测试账号
□ 数据库中有数据
□ E2E 测试全部通过
□ 日志中无严重错误
```

---

## 📚 完整文档

- **详细部署指南**: `LOCAL_DEPLOYMENT_GUIDE.md`
- **后端文档**: `server/README.md`
- **前端文档**: `client/README.md`
- **项目状态**: `PHASE8_COMPLETION_SUMMARY.md`

---

## 🆘 需要帮助？

1. **查看日志**
   ```bash
   docker compose logs
   ```

2. **运行诊断工具**
   ```bash
   bash troubleshoot.sh
   ```

3. **查看完整验证指南**
   ```bash
   cat LOCAL_DEPLOYMENT_GUIDE.md
   ```

4. **检查问题**
   - 错误消息中的具体信息
   - 系统日志: `docker compose logs`
   - 浏览器控制台: F12 打开开发者工具

---

**祝你部署顺利！** ✨

Last Updated: 2024-12-08
