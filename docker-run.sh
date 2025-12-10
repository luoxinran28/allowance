#!/bin/bash

# Docker Development Setup Script for Allowance Authorization Management System
# ⚠️  DEVELOPMENT MODE ONLY - Do not use in production

echo "🚀 Setting up Allowance Authorization Management System (Development Mode)"
echo ""

# Safety check - only allow in development environment
if [ "$DEPLOYMENT_ENV" == "production" ] || [ "$NODE_ENV" == "production" ]; then
    echo "❌ ERROR: This script is for development only. Production environments cannot run this script."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

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
    local max_attempts=5
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if [ "$service" == "allowance-client" ]; then
            # Client doesn't have health check, just check if it's running
            if [ "$(docker ps --filter "name=$service" --filter "status=running" --format "{{.Names}}")" == "$service" ]; then
                echo "✅ $service is running"
                return 0
            fi
        elif [ "$(docker ps --filter "name=$service" --filter "health=healthy" --format "{{.Names}}")" == "$service" ]; then
            echo "✅ $service is healthy"
            return 0
        fi

        echo "⏳ Waiting for $service... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done

    echo "❌ $service failed to start"
    return 1
}

# Check PostgreSQL
if ! check_service "allowance-postgres"; then
    echo "❌ PostgreSQL failed to start. Check logs with: docker logs allowance-postgres"
    exit 1
fi

# Check Server
if ! check_service "allowance-server"; then
    echo "❌ Server failed to start. Check logs with: docker logs allowance-server"
    exit 1
fi

# Check Client
if ! check_service "allowance-client"; then
    echo "❌ Client failed to start. Check logs with: docker logs allowance-client"
    exit 1
fi

echo ""
echo "🎉 All services are running!"
echo ""
echo "📱 Access your application:"
echo "   Frontend: http://localhost:3030"
echo "   Backend API: http://localhost:4040"
echo "   Database: localhost:5432 (postgres/password)"
echo ""
echo "🔥 HOT RELOAD ENABLED:"
echo "   • Rust backend: Auto-rebuilds on code changes via 'cargo watch'"
echo "   • Next.js frontend: Auto-rebuilds on code changes via 'npm run dev'"
echo "   • File changes sync immediately (volume mounted)"
echo ""
echo "📊 Useful commands:"
echo "   View logs: $COMPOSE_CMD logs -f [service-name]"
echo "   Stop services: $COMPOSE_CMD down"
echo "   Restart service: $COMPOSE_CMD restart [service-name]"
echo "   View running containers: docker ps"
echo "   Enter container: docker exec -it allowance-server bash"
echo ""
echo "💡 Development tips:"
echo "   • Make code changes in your IDE - they'll hot reload automatically"
echo "   • Check container logs for compilation errors: $COMPOSE_CMD logs -f server"
echo "   • Database data persists between restarts"
echo "   • To stop: $COMPOSE_CMD down"
echo ""
echo "🔄 Database Reset:"
echo "   • Reset database: bash setup_db_v3.sh"
echo "   • This will clear all data and reload seed data from database/seed_data.sql"
echo "   • Starts fresh server with migrations applied"
echo ""
echo "📝 Next steps:"
echo "   1. Visit http://localhost:3030 to access the application"
echo "   2. Register a new user account"
echo "   3. Check the API health at http://localhost:4040/health"