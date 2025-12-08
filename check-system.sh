#!/bin/bash

# Pre-flight Check Script - Validate System Before Running docker-run.sh

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   系统就绪检查 PRE-FLIGHT CHECK             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0

# 1. Check Docker installation
echo "▶ 检查 Docker 安装..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "  ✅ $DOCKER_VERSION"
    ((PASSED++))
else
    echo "  ❌ Docker 未安装"
    ((FAILED++))
fi
echo ""

# 2. Check Docker daemon
echo "▶ 检查 Docker 守护进程..."
if docker ps &> /dev/null; then
    echo "  ✅ Docker 守护进程正在运行"
    ((PASSED++))
else
    echo "  ❌ Docker 守护进程未运行"
    echo "    请启动 Docker Desktop 后重试"
    ((FAILED++))
fi
echo ""

# 3. Check Docker Compose
echo "▶ 检查 Docker Compose..."
if docker compose version &> /dev/null || command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version 2>/dev/null || docker-compose --version)
    echo "  ✅ $COMPOSE_VERSION"
    ((PASSED++))
else
    echo "  ❌ Docker Compose 未安装"
    ((FAILED++))
fi
echo ""

# 4. Check project files
echo "▶ 检查项目文件..."
if [ -f "docker-compose.yml" ]; then
    echo "  ✅ docker-compose.yml 存在"
    ((PASSED++))
else
    echo "  ❌ docker-compose.yml 不存在"
    ((FAILED++))
fi
echo ""

if [ -f "docker-compose.override.yml" ]; then
    echo "  ✅ docker-compose.override.yml 存在"
    ((PASSED++))
else
    echo "  ⚠️  docker-compose.override.yml 不存在（可选）"
fi
echo ""

if [ -f "docker-run.sh" ]; then
    echo "  ✅ docker-run.sh 存在"
    ((PASSED++))
else
    echo "  ❌ docker-run.sh 不存在"
    ((FAILED++))
fi
echo ""

# 5. Check available ports
echo "▶ 检查端口可用性..."
PORTS_OK=true

for PORT in 3030 4040 5432; do
    if ! netstat -ano 2>/dev/null | grep -q ":$PORT " && \
       ! lsof -i ":$PORT" 2>/dev/null && \
       ! ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
        echo "  ✅ 端口 $PORT 可用"
    else
        echo "  ⚠️  端口 $PORT 可能已被占用"
        PORTS_OK=false
    fi
done
echo ""

# 6. Check disk space
echo "▶ 检查磁盘空间..."
if [ -d "." ]; then
    if [ "$(uname)" = "Darwin" ]; then
        FREE_GB=$(df . | tail -1 | awk '{print $4}')
    else
        FREE_GB=$(($(stat -f -c "%a*%s" . 2>/dev/null || stat -c "%a*%s" . 2>/dev/null) / 1024 / 1024 / 1024))
    fi
    
    if [ "$FREE_GB" -gt 5 ]; then
        echo "  ✅ 磁盘空间充足 (>5GB 可用)"
        ((PASSED++))
    else
        echo "  ⚠️  磁盘空间可能不足 (<5GB 可用)"
    fi
fi
echo ""

# 7. Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                      检查总结 SUMMARY                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ 通过: $PASSED"
echo "❌ 失败: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 系统已就绪！可以运行 docker-run.sh"
    echo ""
    echo "下一步："
    echo "  bash docker-run.sh"
    echo ""
    exit 0
else
    echo "⚠️  存在 $FAILED 个问题需要解决，请参考上面的错误信息"
    echo ""
    echo "常见解决方案："
    echo "  1. Docker 未启动: 启动 Docker Desktop"
    echo "  2. Docker 未安装: https://docs.docker.com/install/"
    echo "  3. 端口被占用: 关闭占用端口的应用"
    echo ""
    exit 1
fi
