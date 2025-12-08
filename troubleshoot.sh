#!/bin/bash

# 本地部署故障排除脚本
# 功能：诊断和修复常见的部署问题
# 用法：bash troubleshoot.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}本地部署故障排除诊断工具${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# ============================================
# 诊断菜单
# ============================================

show_menu() {
    echo -e "${YELLOW}请选择诊断项目:${NC}"
    echo ""
    echo "1. 快速诊断 (运行所有检查)"
    echo "2. 检查Docker安装和配置"
    echo "3. 检查端口占用问题"
    echo "4. 检查容器状态"
    echo "5. 检查后端服务"
    echo "6. 检查前端服务"
    echo "7. 检查数据库连接"
    echo "8. 查看容器日志"
    echo "9. 清理Docker资源"
    echo "10. 修复常见问题"
    echo "0. 退出"
    echo ""
    read -p "请输入选择 (0-10): " choice
}

# ============================================
# 诊断函数
# ============================================

# 1. 快速诊断
quick_diagnosis() {
    echo -e "${YELLOW}执行快速诊断...${NC}"
    echo ""
    
    echo -e "${BLUE}1. Docker 状态${NC}"
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker 已安装${NC}"
        docker --version
    else
        echo -e "${RED}✗ Docker 未安装${NC}"
    fi
    echo ""
    
    echo -e "${BLUE}2. Docker Compose 状态${NC}"
    if command -v docker compose &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose 已安装${NC}"
        docker compose version --short
    else
        echo -e "${RED}✗ Docker Compose 未安装${NC}"
    fi
    echo ""
    
    echo -e "${BLUE}3. 容器运行状态${NC}"
    docker compose ps
    echo ""
    
    echo -e "${BLUE}4. 后端服务检查${NC}"
    if curl -s http://localhost:4040/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端服务正常${NC}"
    else
        echo -e "${RED}✗ 后端服务无响应${NC}"
    fi
    echo ""
    
    echo -e "${BLUE}5. 前端服务检查${NC}"
    if curl -s http://localhost:3030 >/dev/null 2>&1; then
        echo -e "${GREEN}✓ 前端服务正常${NC}"
    else
        echo -e "${RED}✗ 前端服务无响应${NC}"
    fi
    echo ""
    
    echo -e "${BLUE}6. 数据库连接检查${NC}"
    if docker compose exec -T postgres psql -U postgres -d allowance -c "SELECT 1" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ 数据库连接正常${NC}"
    else
        echo -e "${RED}✗ 数据库连接异常${NC}"
    fi
    echo ""
}

# 2. 检查Docker
check_docker() {
    echo -e "${YELLOW}检查Docker配置...${NC}"
    echo ""
    
    echo -e "${BLUE}Docker版本:${NC}"
    docker --version
    echo ""
    
    echo -e "${BLUE}Docker后台进程状态:${NC}"
    if docker ps >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker守护进程运行正常${NC}"
    else
        echo -e "${RED}✗ Docker守护进程无响应${NC}"
        echo "尝试重启Docker:"
        echo "  - macOS: brew services restart docker"
        echo "  - Linux: sudo systemctl restart docker"
        echo "  - Windows: 重启Docker Desktop"
    fi
    echo ""
    
    echo -e "${BLUE}Docker镜像:${NC}"
    docker images | grep -E "postgres|node|rust" || echo "未找到相关镜像"
    echo ""
    
    echo -e "${BLUE}Docker网络:${NC}"
    docker network ls
    echo ""
}

# 3. 检查端口
check_ports() {
    echo -e "${YELLOW}检查端口占用...${NC}"
    echo ""
    
    PORTS=(3030 4040 5432 6379 9090 9100 3000)
    
    for PORT in "${PORTS[@]}"; do
        echo -n "端口 $PORT: "
        if command -v lsof &> /dev/null; then
            if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
                PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
                PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "未知")
                echo -e "${RED}✗ 已占用 (PID: $PID, $PROCESS)${NC}"
            else
                echo -e "${GREEN}✓ 可用${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ 无法检查 (需要lsof)${NC}"
        fi
    done
    echo ""
    
    echo -e "${YELLOW}如需释放端口，可以执行:${NC}"
    echo "  kill -9 <PID>"
    echo ""
}

# 4. 检查容器状态
check_containers() {
    echo -e "${YELLOW}检查容器状态...${NC}"
    echo ""
    
    echo -e "${BLUE}容器列表:${NC}"
    docker compose ps
    echo ""
    
    echo -e "${BLUE}容器详细信息:${NC}"
    docker compose ps -a
    echo ""
    
    echo -e "${BLUE}最近停止的容器:${NC}"
    docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Status}}"
    echo ""
}

# 5. 检查后端
check_backend() {
    echo -e "${YELLOW}检查后端服务...${NC}"
    echo ""
    
    echo -e "${BLUE}容器状态:${NC}"
    docker compose ps server
    echo ""
    
    echo -e "${BLUE}内存和CPU:${NC}"
    docker stats allowance-server --no-stream 2>/dev/null || echo "容器未运行"
    echo ""
    
    echo -e "${BLUE}最近日志 (最后20行):${NC}"
    docker compose logs --tail=20 server
    echo ""
    
    echo -e "${BLUE}健康检查:${NC}"
    echo "  GET /health"
    curl -s http://localhost:4040/health | jq . 2>/dev/null || \
    curl -s http://localhost:4040/health || echo "无响应"
    echo ""
    echo ""
}

# 6. 检查前端
check_frontend() {
    echo -e "${YELLOW}检查前端服务...${NC}"
    echo ""
    
    echo -e "${BLUE}容器状态:${NC}"
    docker compose ps client
    echo ""
    
    echo -e "${BLUE}最近日志 (最后20行):${NC}"
    docker compose logs --tail=20 client
    echo ""
    
    echo -e "${BLUE}服务响应:${NC}"
    curl -s -I http://localhost:3030 | head -5
    echo ""
}

# 7. 检查数据库
check_database() {
    echo -e "${YELLOW}检查数据库...${NC}"
    echo ""
    
    echo -e "${BLUE}容器状态:${NC}"
    docker compose ps postgres
    echo ""
    
    echo -e "${BLUE}数据库连接:${NC}"
    if docker compose exec -T postgres psql -U postgres -d allowance -c "SELECT version();" 2>/dev/null; then
        echo -e "${GREEN}✓ 连接成功${NC}"
    else
        echo -e "${RED}✗ 连接失败${NC}"
    fi
    echo ""
    
    echo -e "${BLUE}表统计:${NC}"
    docker compose exec -T postgres psql -U postgres -d allowance -c \
        "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "获取失败"
    echo ""
    
    echo -e "${BLUE}数据库大小:${NC}"
    docker compose exec -T postgres psql -U postgres -d allowance -c \
        "SELECT pg_size_pretty(pg_database_size('allowance'));" 2>/dev/null || echo "获取失败"
    echo ""
}

# 8. 查看日志
view_logs() {
    echo -e "${YELLOW}选择要查看的日志:${NC}"
    echo "1. 所有服务日志"
    echo "2. 后端日志"
    echo "3. 前端日志"
    echo "4. 数据库日志"
    echo "5. 实时日志 (ctrl+c 停止)"
    echo ""
    read -p "请输入选择: " log_choice
    
    case $log_choice in
        1)
            docker compose logs --tail=50
            ;;
        2)
            docker compose logs --tail=50 server
            ;;
        3)
            docker compose logs --tail=50 client
            ;;
        4)
            docker compose logs --tail=50 postgres
            ;;
        5)
            docker compose logs -f
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            ;;
    esac
    echo ""
}

# 9. 清理资源
cleanup_docker() {
    echo -e "${YELLOW}Docker 资源清理选项:${NC}"
    echo "1. 停止所有容器 (不删除)"
    echo "2. 删除所有容器 (保留数据)"
    echo "3. 删除所有数据卷 (删除所有数据)"
    echo "4. 清理未使用的镜像"
    echo "5. 完全清理 (删除容器+卷+镜像)"
    echo "0. 取消"
    echo ""
    read -p "请输入选择: " cleanup_choice
    
    case $cleanup_choice in
        1)
            echo -e "${YELLOW}停止所有容器...${NC}"
            docker compose stop
            echo -e "${GREEN}完成${NC}"
            ;;
        2)
            echo -e "${YELLOW}删除所有容器...${NC}"
            docker compose rm -f
            echo -e "${GREEN}完成${NC}"
            ;;
        3)
            echo -e "${RED}警告: 这将删除所有数据!${NC}"
            read -p "确认删除? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                docker compose down -v
                echo -e "${GREEN}完成${NC}"
            else
                echo -e "${YELLOW}已取消${NC}"
            fi
            ;;
        4)
            echo -e "${YELLOW}清理未使用的镜像...${NC}"
            docker image prune -f
            echo -e "${GREEN}完成${NC}"
            ;;
        5)
            echo -e "${RED}警告: 这将删除所有容器、卷和镜像!${NC}"
            read -p "确认执行? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                docker compose down -v
                docker image prune -af
                echo -e "${GREEN}完成${NC}"
            else
                echo -e "${YELLOW}已取消${NC}"
            fi
            ;;
        0)
            echo -e "${YELLOW}已取消${NC}"
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            ;;
    esac
    echo ""
}

# 10. 修复问题
fix_issues() {
    echo -e "${YELLOW}常见问题修复:${NC}"
    echo "1. 重启所有服务"
    echo "2. 重建镜像 (不删除数据)"
    echo "3. 重置数据库"
    echo "4. 修复权限问题"
    echo "5. 清理Docker缓存"
    echo "0. 返回"
    echo ""
    read -p "请输入选择: " fix_choice
    
    case $fix_choice in
        1)
            echo -e "${YELLOW}重启所有服务...${NC}"
            docker compose restart
            sleep 5
            echo -e "${GREEN}完成${NC}"
            ;;
        2)
            echo -e "${YELLOW}重建镜像...${NC}"
            docker compose build --no-cache
            docker compose up -d
            echo -e "${GREEN}完成${NC}"
            ;;
        3)
            echo -e "${RED}警告: 这将删除数据库中的所有数据!${NC}"
            read -p "确认重置? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                echo -e "${YELLOW}重置数据库...${NC}"
                docker compose down -v
                docker compose up -d
                sleep 10
                echo -e "${GREEN}完成${NC}"
            else
                echo -e "${YELLOW}已取消${NC}"
            fi
            ;;
        4)
            echo -e "${YELLOW}修复权限...${NC}"
            sudo chown -R $USER:$USER .
            chmod +x local-deploy-test.sh troubleshoot.sh
            echo -e "${GREEN}完成${NC}"
            ;;
        5)
            echo -e "${YELLOW}清理Docker缓存...${NC}"
            docker system prune -f
            echo -e "${GREEN}完成${NC}"
            ;;
        0)
            echo ""
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            ;;
    esac
    echo ""
}

# ============================================
# 主循环
# ============================================

while true; do
    show_menu
    
    case $choice in
        1)
            quick_diagnosis
            ;;
        2)
            check_docker
            ;;
        3)
            check_ports
            ;;
        4)
            check_containers
            ;;
        5)
            check_backend
            ;;
        6)
            check_frontend
            ;;
        7)
            check_database
            ;;
        8)
            view_logs
            ;;
        9)
            cleanup_docker
            ;;
        10)
            fix_issues
            ;;
        0)
            echo -e "${BLUE}退出诊断工具${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}无效选择，请重试${NC}"
            ;;
    esac
    
    read -p "按Enter键继续..."
done
