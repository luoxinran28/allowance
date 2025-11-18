#!/bin/bash

# Docker Development Setup Script for Allowance Authorization Management System

echo "🚀 Setting up Allowance Authorization Management System with Docker"
echo ""

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

# Build backend (Rust) - Optimized for development speed
echo ""
echo "🔨 Building backend (Rust/Cargo) - Development mode..."
cd server

# Use debug build for faster development compilation
# Enable mold linker if available for even faster linking
BUILD_CMD="cargo build -j $(nproc)"
if command -v mold &> /dev/null; then
    echo "🐌 Using mold linker for faster linking..."
    export RUSTFLAGS="-C link-arg=-fuse-ld=mold"
fi

if ! $BUILD_CMD; then
    echo "❌ Backend build failed. Please check the errors above."
    exit 1
fi
echo "✅ Backend build completed successfully (debug mode - much faster!)"
cd ..

# Build frontend (Next.js)
echo ""
echo "🔨 Building frontend (Next.js)..."
cd client
if ! npm install; then
    echo "❌ Frontend npm install failed. Please check the errors above."
    exit 1
fi
if ! npm run build; then
    echo "❌ Frontend build failed. Please check the errors above."
    exit 1
fi
echo "✅ Frontend build completed successfully"
cd ..

# Build and start the services
echo ""
echo "🏗️  Building and starting services..."
echo "This may take a few minutes on first run..."
echo ""

if command -v docker-compose &> /dev/null; then
    docker-compose up --build -d
else
    docker compose up --build -d
fi

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
echo "🎉 All services are running in development mode!"
echo ""
echo "📱 Access your application:"
echo "   Frontend: http://localhost:3030"
echo "   Backend API: http://localhost:4040"
echo "   Database: localhost:5432 (postgres/password)"
echo ""
echo "⚡ Performance optimizations applied:"
echo "   • Debug builds instead of release (much faster compilation)"
echo "   • Parallel compilation with -j $(nproc)"
echo "   • Mold linker if available (even faster linking)"
echo ""
echo "📊 Useful commands:"
echo "   View logs: docker-compose logs -f [service-name]"
echo "   Stop services: docker-compose down"
echo "   Restart service: docker-compose restart [service-name]"
echo "   View running containers: docker ps"
echo ""
echo "🔧 For hot reload development:"
echo "   1. Uncomment volumes in docker-compose.override.yml"
echo "   2. Use 'cargo watch -x run' in server/ for auto-rebuild"
echo "   3. Use 'npm run dev' in client/ for frontend auto-rebuild"
echo ""
echo "📝 Next steps:"
echo "   1. Visit http://localhost:3030 to access the application"
echo "   2. Register a new user account"
echo "   3. Check the API health at http://localhost:4040/health"