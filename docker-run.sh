#!/bin/bash

# Docker Development Setup Script for Allowance Authorization Management System

echo "🚀 Setting up Allowance Authorization Management System (Development Mode)"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ Docker is installed"

# Check if Docker daemon is running
echo "⏳ Checking Docker daemon..."
MAX_WAIT=60
WAITED=0
while ! docker ps &> /dev/null; do
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo "❌ Docker daemon is not running after waiting ${MAX_WAIT}s."
        echo ""
        echo "Please start Docker Desktop:"
        echo "  • Windows: Click Docker Desktop in Start Menu or taskbar"
        echo "  • macOS: brew services start docker (or open /Applications/Docker.app)"
        echo "  • Linux: sudo systemctl start docker"
        echo ""
        echo "Then run this script again."
        exit 1
    fi
    
    if [ $WAITED -eq 0 ]; then
        echo "⏳ Docker daemon is starting, please wait... (max ${MAX_WAIT}s)"
    fi
    
    sleep 2
    WAITED=$((WAITED + 2))
    echo -n "."
done

echo ""
echo "✅ Docker daemon is running"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker Compose is installed"

# Determine which compose command to use
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# Build and start the services with override
echo ""
echo "🏗️  Building and starting services (with docker-compose.override.yml)..."
echo "This may take a few minutes on first run (downloading Docker images)..."
echo ""

$COMPOSE_CMD up --build -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start up..."

# Function to check if a service is healthy
check_service() {
    local service=$1
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        # Get container state
        local container_state=$(docker ps --filter "name=$service" --format "{{.State}}" 2>/dev/null)
        
        if [ -z "$container_state" ]; then
            echo "⏳ Waiting for $service to exist... (attempt $attempt/$max_attempts)"
        elif [ "$container_state" != "running" ]; then
            echo "⏳ $service state: $container_state (attempt $attempt/$max_attempts)"
        else
            # Check health status if available
            local health=$(docker ps --filter "name=$service" --format "{{.Status}}" 2>/dev/null)
            
            if [[ "$health" == *"healthy"* ]]; then
                echo "✅ $service is healthy"
                return 0
            elif [[ "$health" == *"unhealthy"* ]]; then
                echo "⚠️  $service is running but unhealthy (attempt $attempt/$max_attempts)"
            else
                # No health check, just running is OK
                echo "✅ $service is running"
                return 0
            fi
        fi

        sleep 2
        ((attempt++))
    done

    echo "❌ $service failed to start after ${max_attempts} attempts"
    echo "   Check logs with: docker compose logs $service"
    return 1
}

# Check PostgreSQL
if ! check_service "allowance-postgres"; then
    echo ""
    echo "Attempting to view PostgreSQL logs..."
    docker compose logs allowance-postgres 2>/dev/null | tail -20
    exit 1
fi

# Check Server
if ! check_service "allowance-server"; then
    echo ""
    echo "Attempting to view Server logs..."
    docker compose logs allowance-server 2>/dev/null | tail -20
    exit 1
fi

# Check Client
if ! check_service "allowance-client"; then
    echo ""
    echo "Note: Client may still be building. Checking again..."
    sleep 10
    if ! check_service "allowance-client"; then
        echo ""
        echo "Attempting to view Client logs..."
        docker compose logs allowance-client 2>/dev/null | tail -20
        exit 1
    fi
fi

echo ""
echo "🎉 All services are running!"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📱 ACCESS YOUR APPLICATION:"
echo "═══════════════════════════════════════════════════════════"
echo "   Frontend:    http://localhost:3030"
echo "   Backend API: http://localhost:4040"
echo "   Health Check: http://localhost:4040/health"
echo "   Database:    localhost:5432 (user: postgres, pass: password)"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🔥 HOT RELOAD ENABLED:"
echo "═══════════════════════════════════════════════════════════"
echo "   • Rust backend auto-reloads on code changes"
echo "   • Next.js frontend auto-rebuilds on code changes"
echo "   • All file changes sync immediately via volumes"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 USEFUL COMMANDS:"
echo "═══════════════════════════════════════════════════════════"
echo "   View logs:"
echo "     docker compose logs -f              (all services)"
echo "     docker compose logs -f server       (backend only)"
echo "     docker compose logs -f client       (frontend only)"
echo "     docker compose logs -f postgres     (database only)"
echo ""
echo "   Manage containers:"
echo "     docker compose ps                   (show status)"
echo "     docker compose restart service      (restart a service)"
echo "     docker compose down                 (stop all)"
echo "     docker compose down -v              (stop and remove data)"
echo ""
echo "   Access containers:"
echo "     docker compose exec server bash     (enter backend)"
echo "     docker compose exec postgres psql -U postgres -d allowance"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "💡 DEVELOPMENT TIPS:"
echo "═══════════════════════════════════════════════════════════"
echo "   • Make code changes in your IDE"
echo "   • Changes auto-reload automatically"
echo "   • Check logs for compilation errors"
echo "   • Database data persists between restarts"
echo "   • Press Ctrl+C won't stop containers (running in background)"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🚀 NEXT STEPS:"
echo "═══════════════════════════════════════════════════════════"
echo "   1. Open browser: http://localhost:3030"
echo "   2. Register a new user account"
echo "   3. Test the application"
echo "   4. Monitor logs: docker compose logs -f"
echo ""
echo "═══════════════════════════════════════════════════════════"