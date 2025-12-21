#!/bin/bash

# ========================================
# Allowance 授权管理系统
# 生产环境部署脚本（阿里云）
# ========================================
# 适用场景：生产服务器上的完整部署流程
# 部署流程：Git Pull → 构建镜像 → 启动服务 → 配置环境变量
# ========================================

set -e  # 遇到错误立即退出

# ========================================
# 颜色定义
# ========================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ========================================
# 全局变量
# ========================================
PROJECT_DIR="/var/www/allowance"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

# ========================================
# 工具函数
# ========================================
print_header() {
    echo ""
    echo "========================================"
    echo -e "${CYAN}$1${NC}"
    echo "========================================"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "  $1"
}

# 检查是否为 root 用户
check_root() {
    if [ "$(id -u)" != "0" ]; then
        print_error "请使用 root 用户运行此脚本"
        print_info "运行: sudo bash deploy/deploy.sh"
        exit 1
    fi
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 未安装，请先安装"
        return 1
    fi
    return 0
}

# 检查必要的依赖
check_dependencies() {
    print_step "检查系统依赖..."
    
    local missing_deps=()
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    # 检查 Docker Compose（使用 docker compose 子命令）
    if ! docker compose version &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    # 检查 Git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "缺少以下依赖: ${missing_deps[*]}"
        print_info "请先安装缺少的依赖"
        exit 1
    fi
    
    print_success "系统依赖检查通过"
}

# 检查项目目录
check_project_dir() {
    print_step "检查项目目录..."
    
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "项目目录不存在: $PROJECT_DIR"
        print_info "请先执行: cd /opt && git clone <repository-url> allowance"
        exit 1
    fi
    
    if [ ! -d "$PROJECT_DIR/.git" ]; then
        print_warning "目录不是 Git 仓库: $PROJECT_DIR"
        print_info "建议使用 Git 管理代码版本"
    fi
    
    print_success "项目目录检查通过: $PROJECT_DIR"
}

# 检查并创建必要目录
setup_directories() {
    print_step "检查并创建必要目录..."

    local dirs_created=0

    # 创建 SSL 证书目录（如果使用 Nginx）
    if [ ! -d "/ssl" ]; then
        if mkdir -p /ssl 2>/dev/null; then
            chmod 755 /ssl
            print_success "创建 /ssl 目录"
            dirs_created=$((dirs_created + 1))
        else
            print_warning "没有权限创建 /ssl 目录，跳过 SSL 证书检查"
        fi
    fi

    if [ $dirs_created -eq 0 ]; then
        print_info "所有必要目录已存在"
    fi
}

# 检查 SSL 证书
check_ssl() {
    print_step "检查 SSL 证书..."
    
    local ssl_cert="/ssl/allowance.pem"
    local ssl_key="/ssl/allowance.key"
    
    if [ -f "$ssl_cert" ] && [ -f "$ssl_key" ]; then
        # 验证证书有效性
        if openssl x509 -in "$ssl_cert" -noout -checkend 0 >/dev/null 2>&1; then
            print_success "SSL 证书有效"
            
            # 显示证书过期时间
            local expiry=$(openssl x509 -in "$ssl_cert" -noout -enddate | cut -d= -f2)
            print_info "证书过期时间: $expiry"
            return 0
        else
            print_warning "SSL 证书已过期或无效"
            return 1
        fi
    else
        print_info "SSL 证书不存在，使用 HTTP 模式"
        print_info "证书路径: $ssl_cert"
        print_info "私钥路径: $ssl_key"
        print_info "如需 HTTPS，请配置 SSL 证书"
        return 0  # 不阻止部署，继续使用 HTTP
    fi
}

# 检查环境变量配置
check_env_file() {
    print_step "检查环境变量配置..."
    
    cd "$PROJECT_DIR"
    
    local env_files=("server/.env" "client/.env")
    local missing_files=()
    
    for env_file in "${env_files[@]}"; do
        if [ ! -f "$env_file" ]; then
            missing_files+=("$env_file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        print_error "以下环境变量文件不存在: ${missing_files[*]}"
        
        for env_file in "${missing_files[@]}"; do
            local example_file="${env_file}.example"
            if [ -f "$example_file" ]; then
                print_info "发现示例配置文件: $example_file"
                print_info "请复制并配置: cp $example_file $env_file"
            fi
        done
        return 1
    fi
    
    print_success "环境变量配置检查通过"
    return 0
}

# Git 拉取最新代码
git_pull() {
    print_step "拉取最新代码..."
    
    cd "$PROJECT_DIR"
    
    if [ ! -d ".git" ]; then
        print_warning "不是 Git 仓库，跳过代码更新"
        return 0
    fi
    
    # 保存当前分支
    local current_branch=$(git branch --show-current)
    print_info "当前分支: $current_branch"
    
    # 显示当前提交
    local current_commit=$(git rev-parse --short HEAD)
    print_info "当前提交: $current_commit"
    
    # 拉取代码
    if git pull origin "$current_branch"; then
        local new_commit=$(git rev-parse --short HEAD)
        
        if [ "$current_commit" = "$new_commit" ]; then
            print_success "代码已是最新版本"
        else
            print_success "代码更新成功: $current_commit → $new_commit"
        fi
    else
        print_error "代码拉取失败"
        print_info "请检查 Git 配置或网络连接"
        return 1
    fi
}

# 构建 Docker 镜像
build_images() {
    print_step "构建 Docker 镜像..."
    
    cd "$PROJECT_DIR"
    
    # 确定是否需要使用 --no-cache
    local build_args=""
    if [ "$1" = "--no-cache" ]; then
        build_args="--no-cache"
        print_info "使用 --no-cache 强制重新构建"
    fi
    
    # 构建镜像，实时显示输出
    if docker compose -f "$COMPOSE_FILE" build $build_args; then
        print_success "Docker 镜像构建成功"
        return 0
    else
        local build_exit_code=$?
        print_error "Docker 镜像构建失败 (退出码: $build_exit_code)"
        echo ""
        print_info "尝试重新运行构建命令以查看完整错误信息:"
        echo "  cd $PROJECT_DIR"
        echo "  docker compose -f $COMPOSE_FILE build $build_args"
        return 1
    fi
}

# 启动 Docker 服务
start_services() {
    print_step "启动 Docker 服务..."
    
    cd "$PROJECT_DIR"
    
    # 启动所有服务
    print_info "启动所有服务..."
    if docker compose -f "$COMPOSE_FILE" up -d; then
        print_success "所有服务已启动"
    else
        print_error "启动服务失败"
        return 1
    fi
}

# 检查服务状态
check_services() {
    print_step "检查服务状态..."
    
    cd "$PROJECT_DIR"
    
    # 显示服务状态
    docker compose -f "$COMPOSE_FILE" ps
    
    echo ""
    
    # 检查关键服务健康状态
    local unhealthy_services=()
    
    for service in server client postgres; do
        local status=$(docker compose -f "$COMPOSE_FILE" ps --format json "$service" 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$status" ]; then
            if [ "$status" != "healthy" ]; then
                unhealthy_services+=("$service")
            fi
        fi
    done
    
    if [ ${#unhealthy_services[@]} -ne 0 ]; then
        print_warning "以下服务状态异常: ${unhealthy_services[*]}"
        print_info "使用以下命令查看日志:"
        echo "  docker compose -f $COMPOSE_FILE logs ${unhealthy_services[*]}"
        return 1
    else
        print_success "所有服务运行正常"
        return 0
    fi
}

# 显示访问信息
show_access_info() {
    print_header "部署完成"
    
    echo "✅ Allowance 授权管理系统已部署完成"
    echo ""
    
    # 检查nginx服务是否运行
    if docker compose -f "$COMPOSE_FILE" ps nginx --format json 2>/dev/null | grep -q '"State":"running"'; then
        echo "🌐 网站访问地址（通过 Nginx 反向代理，绑定到 47.238.0.109:80）："
        echo "   前端 UI: http://47.238.0.109"
        echo "   后端 API: http://47.238.0.109/api/"
        echo "   健康检查: http://47.238.0.109/health"
    else
        echo "🌐 网站访问地址（直接访问容器）："
        echo "   后端 API: http://47.238.0.109:4040"
        echo "   前端 UI:  http://47.238.0.109:3030"
    fi
    echo ""
    
    echo "🛠️  常用管理命令："
    echo "   查看服务状态: docker compose -f $COMPOSE_FILE ps"
    echo "   查看日志:     docker compose -f $COMPOSE_FILE logs -f [service]"
    echo "   重启服务:     docker compose -f $COMPOSE_FILE restart [service]"
    echo "   停止服务:     docker compose -f $COMPOSE_FILE down"
    echo ""
    
    echo "📝 环境变量配置："
    echo "   配置文件: $PROJECT_DIR/server/.env 和 $PROJECT_DIR/client/.env"
    echo "   编辑配置后，运行: sudo bash deploy/deploy.sh rebuild"
    echo ""
    
    echo "🔒 重要提示："
    echo "   • 当前使用 HTTP 模式访问（无 SSL 证书）"
    echo "   • 购买域名和 SSL 证书后，可配置 Nginx 提供 HTTPS"
    echo "   • 数据库不暴露到互联网"
    echo ""
}

# 显示帮助信息
show_help() {
    cat <<EOF
Allowance 授权管理系统 - 部署脚本

用法: sudo bash deploy/deploy.sh [命令]

命令:
  install       首次部署（完整流程）
  update        更新部署（拉取代码 + 重新构建）
  restart       重启服务（不拉取代码）
  rebuild       强制重新构建镜像（使用 --no-cache）
  status        查看服务状态
  logs          查看服务日志
  help          显示此帮助信息

示例:
  # 首次部署
  sudo bash deploy/deploy.sh install

  # 更新代码并重新部署
  sudo bash deploy/deploy.sh update

  # 仅重启服务
  sudo bash deploy/deploy.sh restart

  # 强制重新构建
  sudo bash deploy/deploy.sh rebuild

  # 查看服务状态
  sudo bash deploy/deploy.sh status

  # 查看日志
  sudo bash deploy/deploy.sh logs
  sudo bash deploy/deploy.sh logs server

环境要求:
  - Docker 和 Docker Compose 已安装
  - 代码已通过 git clone 到 /var/www/allowance
  - server/.env 和 client/.env 文件已创建并配置
  - 可选: nginx/ssl/ 目录下有SSL证书（用于HTTPS）

权限说明:
  - 脚本需要在生产服务器上以 root 权限运行
  - 所有 Docker 命令都会自动使用 docker compose
  - 文件操作需要 root 权限

环境变量配置:
  - 配置文件: server/.env 和 client/.env (基于对应的 .env.example)
  - 修改配置后，运行 'sudo bash deploy/deploy.sh rebuild' 以应用更改

EOF
}

# 主函数 - 完整部署流程
do_install() {
    print_header "Allowance 首次部署"

    check_root
    check_dependencies
    check_project_dir
    setup_directories
    check_ssl

    if ! check_env_file; then
        print_error "环境变量配置不完整，请先配置"
        print_info "创建配置文件:"
        print_info "  cp server/.env.example server/.env"
        print_info "  cp client/.env.example client/.env"
        print_info "  vi server/.env  # 配置服务器环境变量"
        print_info "  vi client/.env  # 配置客户端环境变量"
        print_info "然后编辑这些文件填入真实配置值"
        exit 1
    fi

    git_pull
    build_images
    start_services
    sleep 5
    check_services
    show_access_info
}

# 更新部署
do_update() {
    print_header "Allowance 更新部署"

    check_root
    check_dependencies
    check_project_dir

    git_pull
    build_images

    print_step "重启服务..."
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" up -d

    sleep 5
    check_services
    show_access_info
}

# 重启服务
do_restart() {
    print_header "重启 Allowance 服务"

    check_root
    check_project_dir

    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" restart

    sleep 5
    check_services
}

# 强制重新构建
do_rebuild() {
    print_header "强制重新构建镜像"

    check_root
    check_dependencies
    check_project_dir

    build_images "--no-cache"

    print_step "重启服务..."
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" up -d

    sleep 5
    check_services
    show_access_info
}

# 查看状态
do_status() {
    print_header "服务状态"

    check_root
    check_project_dir

    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" ps
}

# 查看日志
do_logs() {
    check_root
    check_project_dir

    cd "$PROJECT_DIR"

    local service="${1:-}"

    if [ -z "$service" ]; then
        print_info "查看所有服务日志..."
        docker compose -f "$COMPOSE_FILE" logs -f
    else
        print_info "查看 $service 服务日志..."
        docker compose -f "$COMPOSE_FILE" logs -f "$service"
    fi
}

# ========================================
# 主程序入口
# ========================================
main() {
    local command="${1:-help}"
    
    case "$command" in
        install)
            do_install
            ;;
        update)
            do_update
            ;;
        restart)
            do_restart
            ;;
        rebuild)
            do_rebuild
            ;;
        status)
            do_status
            ;;
        logs)
            shift
            do_logs "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
