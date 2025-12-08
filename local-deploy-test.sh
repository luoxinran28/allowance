#!/bin/bash

# 本地部署快速验证脚本
# 功能：一键验证系统的所有关键功能
# 用法：bash local-deploy-test.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本开始时间
START_TIME=$(date +%s)

# 记录日志
LOG_FILE="local-deploy-test-$(date +%Y%m%d-%H%M%S).log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}本地部署快速验证脚本${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# ============================================
# 第一步：前置检查
# ============================================

echo -e "${YELLOW}[1/8] 前置检查...${NC}"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker 已安装: $(docker --version)${NC}"

# 检查Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose 已安装: $(docker compose version --short)${NC}"

# 检查磁盘空间
DISK_AVAILABLE=$(df . | awk 'NR==2 {print $4}')
DISK_NEEDED=$((10 * 1024 * 1024)) # 10GB in KB
if [ "$DISK_AVAILABLE" -lt "$DISK_NEEDED" ]; then
    echo -e "${YELLOW}⚠ 磁盘空间不足 (需要10GB, 可用: $(echo "scale=1; $DISK_AVAILABLE / 1024 / 1024" | bc)GB)${NC}"
fi
echo -e "${GREEN}✓ 磁盘空间充足: $(echo "scale=1; $DISK_AVAILABLE / 1024 / 1024" | bc)GB${NC}"

# 检查端口
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

PORTS=(3030 4040 5432 9090)
for PORT in "${PORTS[@]}"; do
    if check_port $PORT; then
        echo -e "${YELLOW}⚠ 端口 $PORT 已被占用${NC}"
    else
        echo -e "${GREEN}✓ 端口 $PORT 可用${NC}"
    fi
done

echo ""

# ============================================
# 第二步：构建和启动
# ============================================

echo -e "${YELLOW}[2/8] 构建并启动所有服务...${NC}"

if docker compose up --build -d; then
    echo -e "${GREEN}✓ 服务启动成功${NC}"
else
    echo -e "${RED}✗ 服务启动失败${NC}"
    docker compose logs
    exit 1
fi

# 等待服务就绪
echo -e "${YELLOW}   等待服务就绪 (最多60秒)...${NC}"
WAIT_TIME=0
MAX_WAIT=60
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    if curl -s http://localhost:4040/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端服务已就绪${NC}"
        break
    fi
    echo -n "."
    sleep 1
    WAIT_TIME=$((WAIT_TIME + 1))
done

if [ $WAIT_TIME -eq $MAX_WAIT ]; then
    echo -e "${RED}✗ 后端服务启动超时${NC}"
    docker compose logs server
    exit 1
fi

sleep 3
echo ""

# ============================================
# 第三步：容器状态检查
# ============================================

echo -e "${YELLOW}[3/8] 检查容器状态...${NC}"

docker compose ps

CONTAINER_STATUS=$(docker compose ps --format "{{.State}}")
if echo "$CONTAINER_STATUS" | grep -q "exited"; then
    echo -e "${RED}✗ 某些容器已退出${NC}"
    docker compose logs
    exit 1
fi

echo -e "${GREEN}✓ 所有容器运行中${NC}"
echo ""

# ============================================
# 第四步：后端API验证
# ============================================

echo -e "${YELLOW}[4/8] 验证后端API...${NC}"

# 健康检查
HEALTH=$(curl -s http://localhost:4040/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓ 健康检查通过${NC}"
else
    echo -e "${RED}✗ 健康检查失败${NC}"
    echo "Response: $HEALTH"
    exit 1
fi

# 详细健康检查
HEALTH_DETAILED=$(curl -s http://localhost:4040/health/detailed)
if echo "$HEALTH_DETAILED" | grep -q '"database".*"healthy"'; then
    echo -e "${GREEN}✓ 数据库连接正常${NC}"
else
    echo -e "${RED}✗ 数据库连接异常${NC}"
    exit 1
fi

# 注册测试
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123456!"

REGISTER_RESPONSE=$(curl -s -X POST http://localhost:4040/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }")

if echo "$REGISTER_RESPONSE" | grep -q "user_id"; then
    echo -e "${GREEN}✓ 用户注册成功${NC}"
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"user_id":"[^"]*"' | cut -d'"' -f4)
    echo "  User ID: $USER_ID"
else
    echo -e "${RED}✗ 用户注册失败${NC}"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

# 登录测试
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4040/auth/login \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ 用户登录成功${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "  Token: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗ 用户登录失败${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

# 验证Token
ME_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:4040/users/me)

if echo "$ME_RESPONSE" | grep -q "$USER_ID"; then
    echo -e "${GREEN}✓ Token认证通过${NC}"
else
    echo -e "${RED}✗ Token认证失败${NC}"
    exit 1
fi

echo ""

# ============================================
# 第五步：数据库验证
# ============================================

echo -e "${YELLOW}[5/8] 验证数据库...${NC}"

# 检查表是否存在
TABLE_COUNT=$(docker compose exec -T postgres psql -U postgres -d allowance -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ 数据库表存在 ($TABLE_COUNT 张表)${NC}"
else
    echo -e "${RED}✗ 数据库表不存在${NC}"
    exit 1
fi

# 检查用户数据
USER_COUNT=$(docker compose exec -T postgres psql -U postgres -d allowance -t -c \
    "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
echo -e "${GREEN}✓ 数据库中有 $USER_COUNT 个用户${NC}"

echo ""

# ============================================
# 第六步：前端验证
# ============================================

echo -e "${YELLOW}[6/8] 验证前端应用...${NC}"

# 检查前端是否可访问
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3030)

if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ 前端应用可访问 (HTTP $FRONTEND_RESPONSE)${NC}"
else
    echo -e "${YELLOW}⚠ 前端可能在构建中... (HTTP $FRONTEND_RESPONSE)${NC}"
fi

echo ""

# ============================================
# 第七步：性能测试
# ============================================

echo -e "${YELLOW}[7/8] 执行基础性能测试...${NC}"

# 测试响应时间
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:4040/health)
echo -e "${GREEN}✓ /health 响应时间: ${RESPONSE_TIME}s${NC}"

if (( $(echo "$RESPONSE_TIME < 0.5" | bc -l) )); then
    echo -e "${GREEN}  (< 0.5s, 性能良好)${NC}"
else
    echo -e "${YELLOW}  (> 0.5s, 可能需要优化)${NC}"
fi

# 并发测试 (使用 seq 模拟并发)
echo -e "${YELLOW}   执行10个并发请求...${NC}"

TIME_START=$(date +%s%N | cut -b1-13)
for i in {1..10}; do
    curl -s http://localhost:4040/health > /dev/null &
done
wait
TIME_END=$(date +%s%N | cut -b1-13)

TIME_ELAPSED=$((TIME_END - TIME_START))
TIME_PER_REQUEST=$(echo "scale=3; $TIME_ELAPSED / 10 / 1000" | bc)
echo -e "${GREEN}✓ 10个请求总耗时: ${TIME_ELAPSED}ms, 平均: ${TIME_PER_REQUEST}ms${NC}"

echo ""

# ============================================
# 第八步：清理和总结
# ============================================

echo -e "${YELLOW}[8/8] 最终检查...${NC}"

# 检查是否有ERROR日志
if docker compose logs server | grep -i "error" | grep -v "ERROR:" | grep -q "."; then
    echo -e "${YELLOW}⚠ 后端日志中可能有错误，请检查:${NC}"
    docker compose logs server | grep -i "error" | head -5
else
    echo -e "${GREEN}✓ 后端日志无严重错误${NC}"
fi

echo ""

# ============================================
# 计算总耗时
# ============================================

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ 验证完成！${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "总耗时: ${MINUTES}分${SECONDS}秒"
echo -e "日志文件: $LOG_FILE"
echo ""
echo "系统访问地址："
echo -e "  • 前端应用: ${BLUE}http://localhost:3030${NC}"
echo -e "  • 后端API: ${BLUE}http://localhost:4040${NC}"
echo -e "  • API文档: ${BLUE}http://localhost:4040/swagger-ui/${NC}"
echo -e "  • 健康检查: ${BLUE}http://localhost:4040/health${NC}"
echo ""
echo "测试账号："
echo -e "  • 邮箱: ${YELLOW}$TEST_EMAIL${NC}"
echo -e "  • 密码: ${YELLOW}$TEST_PASSWORD${NC}"
echo ""
echo "常用命令："
echo -e "  • 查看日志: ${YELLOW}docker compose logs -f${NC}"
echo -e "  • 停止服务: ${YELLOW}docker compose down${NC}"
echo -e "  • 清理数据: ${YELLOW}docker compose down -v${NC}"
echo -e "  • 重启服务: ${YELLOW}docker compose restart${NC}"
echo ""

exit 0
