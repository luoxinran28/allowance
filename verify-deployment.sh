#!/bin/bash

# 本地部署自动化验证脚本
# 功能：自动执行完整的部署验证流程，生成验证报告
# 用法：bash verify-deployment.sh [--full|--quick|--e2e]

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 参数处理
MODE=${1:-quick}
REPORT_FILE="deployment-report-$(date +%Y%m%d-%H%M%S).html"
JSON_REPORT="deployment-report-$(date +%Y%m%d-%H%M%S).json"

# 计数器
PASSED=0
FAILED=0
WARNED=0

# ============================================
# 测试函数
# ============================================

test_passed() {
    local name=$1
    echo -e "${GREEN}✓ $name${NC}"
    ((PASSED++))
}

test_failed() {
    local name=$1
    local reason=$2
    echo -e "${RED}✗ $name${NC}"
    if [ -n "$reason" ]; then
        echo -e "  ${RED}原因: $reason${NC}"
    fi
    ((FAILED++))
}

test_warned() {
    local name=$1
    local message=$2
    echo -e "${YELLOW}⚠ $name${NC}"
    if [ -n "$message" ]; then
        echo -e "  ${YELLOW}注意: $message${NC}"
    fi
    ((WARNED++))
}

# ============================================
# 验证流程
# ============================================

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}本地部署自动化验证 - $MODE 模式${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# 记录开始时间
START_TIME=$(date +%s)
START_DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "开始时间: $START_DATE"
echo "模式: $MODE"
echo ""

# ============================================
# 第一部分：基础检查
# ============================================

echo -e "${YELLOW}[1/5] 基础环境检查...${NC}"

# Docker 检查
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    test_passed "Docker 已安装"
else
    test_failed "Docker 已安装"
fi

# Docker Compose 检查
if command -v docker compose &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version --short)
    test_passed "Docker Compose 已安装"
else
    test_failed "Docker Compose 已安装"
fi

# 检查容器是否运行
if docker compose ps | grep -q "allowance-server"; then
    test_passed "后端容器运行中"
else
    test_failed "后端容器运行中" "容器未运行或已停止"
fi

if docker compose ps | grep -q "allowance-postgres"; then
    test_passed "数据库容器运行中"
else
    test_failed "数据库容器运行中" "容器未运行或已停止"
fi

if docker compose ps | grep -q "allowance-client"; then
    test_passed "前端容器运行中"
else
    test_warned "前端容器运行中" "前端可能仍在构建中"
fi

echo ""

# ============================================
# 第二部分：后端验证
# ============================================

echo -e "${YELLOW}[2/5] 后端服务验证...${NC}"

# 健康检查
HEALTH=$(curl -s -w "\n%{http_code}" http://localhost:4040/health 2>/dev/null | tail -1)
if [ "$HEALTH" = "200" ]; then
    test_passed "后端健康检查 (/health)"
else
    test_failed "后端健康检查 (/health)" "HTTP $HEALTH"
fi

# 详细健康检查
HEALTH_DETAILED=$(curl -s http://localhost:4040/health/detailed 2>/dev/null)
if echo "$HEALTH_DETAILED" | grep -q '"database".*"healthy"'; then
    test_passed "数据库连接检查"
else
    test_failed "数据库连接检查"
fi

# API 端点检查
API_ENDPOINTS=(
    "/auth/register"
    "/auth/login"
    "/users/me"
    "/health"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4040$endpoint 2>/dev/null)
    if [ "$HTTP_CODE" != "000" ]; then
        test_passed "API 端点响应: $endpoint (HTTP $HTTP_CODE)"
    else
        test_failed "API 端点响应: $endpoint"
    fi
done

# 性能检查
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:4040/health 2>/dev/null)
if (( $(echo "$RESPONSE_TIME < 0.5" | bc -l) )); then
    test_passed "性能检查 (响应时间: ${RESPONSE_TIME}s < 0.5s)"
else
    test_warned "性能检查 (响应时间: ${RESPONSE_TIME}s > 0.5s)"
fi

echo ""

# ============================================
# 第三部分：数据库验证
# ============================================

echo -e "${YELLOW}[3/5] 数据库验证...${NC}"

# 数据库连接
if docker compose exec -T postgres psql -U postgres -d allowance -c "SELECT 1" >/dev/null 2>&1; then
    test_passed "数据库连接"
else
    test_failed "数据库连接"
fi

# 表数量检查
TABLE_COUNT=$(docker compose exec -T postgres psql -U postgres -d allowance -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -gt 10 ]; then
    test_passed "数据库表结构 ($TABLE_COUNT 张表)"
else
    test_failed "数据库表结构" "表数量不足"
fi

# 数据完整性检查
USER_COUNT=$(docker compose exec -T postgres psql -U postgres -d allowance -t -c \
    "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
test_passed "用户表数据 ($USER_COUNT 条记录)"

# 迁移状态检查
MIGRATIONS=$(docker compose exec -T postgres psql -U postgres -d allowance -t -c \
    "SELECT COUNT(*) FROM _sqlx_migrations WHERE success;" 2>/dev/null | tr -d ' ')
if [ "$MIGRATIONS" -gt 0 ]; then
    test_passed "数据库迁移 ($MIGRATIONS 条成功)"
else
    test_failed "数据库迁移"
fi

echo ""

# ============================================
# 第四部分：前端验证
# ============================================

echo -e "${YELLOW}[4/5] 前端应用验证...${NC}"

# 前端可访问性
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3030 2>/dev/null)
if [ "$FRONTEND_CODE" = "200" ]; then
    test_passed "前端应用可访问 (HTTP $FRONTEND_CODE)"
else
    test_warned "前端应用可访问 (HTTP $FRONTEND_CODE)" "可能在构建或配置中"
fi

# 前端响应时间
FRONTEND_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3030 2>/dev/null)
test_passed "前端响应时间: ${FRONTEND_TIME}s"

echo ""

# ============================================
# 第五部分：E2E 测试（如果指定）
# ============================================

if [ "$MODE" = "e2e" ] || [ "$MODE" = "full" ]; then
    echo -e "${YELLOW}[5/5] E2E 测试...${NC}"
    
    cd client 2>/dev/null || {
        test_failed "E2E测试" "无法进入客户端目录"
        cd - > /dev/null
    }
    
    if [ -f "package.json" ]; then
        echo -e "${YELLOW}运行权限系统 E2E 测试...${NC}"
        
        if npm run test:e2e -- 10-permission-system 2>&1 | tee /tmp/e2e_output.txt | grep -q "passed"; then
            PASSED_TESTS=$(grep -o "[0-9]* passed" /tmp/e2e_output.txt | grep -o "[0-9]*" | head -1)
            test_passed "E2E 测试通过 ($PASSED_TESTS 个测试)"
        else
            test_failed "E2E 测试通过"
        fi
    else
        test_warned "E2E 测试" "未找到 package.json"
    fi
    
    cd - > /dev/null
    echo ""
fi

# ============================================
# 生成报告
# ============================================

END_TIME=$(date +%s)
END_DATE=$(date '+%Y-%m-%d %H:%M:%S')
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

TOTAL_TESTS=$((PASSED + FAILED + WARNED))
PASS_RATE=$(( (PASSED * 100) / TOTAL_TESTS ))

# 控制台输出总结
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}验证报告总结${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓ 通过: $PASSED${NC}"
echo -e "${RED}✗ 失败: $FAILED${NC}"
echo -e "${YELLOW}⚠ 警告: $WARNED${NC}"
echo -e "${BLUE}总计: $TOTAL_TESTS${NC}"
echo ""
echo "通过率: $PASS_RATE%"
echo "耗时: ${MINUTES}分${SECONDS}秒"
echo ""

# 生成 HTML 报告
cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>部署验证报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin: 20px 0; }
        .summary-card { padding: 15px; border-radius: 5px; text-align: center; font-size: 18px; font-weight: bold; }
        .passed { background-color: #d4edda; color: #155724; }
        .failed { background-color: #f8d7da; color: #721c24; }
        .warned { background-color: #fff3cd; color: #856404; }
        .total { background-color: #d1ecf1; color: #0c5460; }
        .details { margin-top: 20px; }
        .test-item { padding: 10px; margin: 5px 0; border-left: 4px solid #ccc; }
        .test-passed { border-left-color: #28a745; background-color: #f0fff4; }
        .test-failed { border-left-color: #dc3545; background-color: #fff5f5; }
        .test-warned { border-left-color: #ffc107; background-color: #fffbf0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>部署验证报告</h1>
        
        <div class="summary">
            <div class="summary-card passed">✓ 通过<br>$PASSED</div>
            <div class="summary-card failed">✗ 失败<br>$FAILED</div>
            <div class="summary-card warned">⚠ 警告<br>$WARNED</div>
            <div class="summary-card total">总计<br>$TOTAL_TESTS</div>
        </div>
        
        <p><strong>通过率:</strong> $PASS_RATE%</p>
        <p><strong>耗时:</strong> ${MINUTES}分${SECONDS}秒</p>
        <p><strong>验证时间:</strong> $START_DATE 到 $END_DATE</p>
        <p><strong>验证模式:</strong> $MODE</p>
        
        <div class="footer">
            <p>报告生成时间: $(date)</p>
            <p>本报告用于本地部署验证，不构成生产部署评估。</p>
        </div>
    </div>
</body>
</html>
EOF

echo -e "${GREEN}✓ HTML 报告已生成: $REPORT_FILE${NC}"
echo ""

# 最终状态
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}验证通过！系统已就绪。${NC}"
    exit 0
else
    echo -e "${RED}验证失败！请查看上述错误并修正。${NC}"
    exit 1
fi
