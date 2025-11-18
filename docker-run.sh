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

# Check if docker-compose.override.yml has development volumes enabled
if ! grep -q "volumes:" docker-compose.override.yml; then
    echo ""
    echo "⚠️  Development volumes not enabled!"
    echo "For fast development iteration, you should uncomment the volumes in docker-compose.override.yml"
    echo "This enables hot reload for both Rust backend and Next.js frontend."
    echo ""
    read -p "Do you want me to enable development volumes? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Enabling development volumes..."
        # Uncomment the volume sections in docker-compose.override.yml
        sed -i 's/# \(volumes:\)/\1/' docker-compose.override.yml
        sed -i 's/# \(  - \.\/server:\/app\)/\1/' docker-compose.override.yml
        sed -i 's/# \(  - \/app\/target\)/\1/' docker-compose.override.yml
        sed -i 's/# \(  - \.\/client:\/app\)/\1/' docker-compose.override.yml
        sed -i 's/# \(  - \/app\/node_modules\)/\1/' docker-compose.override.yml
        sed -i 's/# \(  - \/app\/.next\)/\1/' docker-compose.override.yml
        # Also uncomment the hot reload commands
        sed -i 's/# \(command: cargo watch -x run\)/\1/' docker-compose.override.yml
        sed -i 's/# \(command: npm run dev\)/\1/' docker-compose.override.yml
        echo "✅ Development volumes and hot reload commands enabled!"
    fi
fi

# Build and start the services with development volumes
echo ""
echo "🏗️  Building and starting services with development volumes..."
echo "This may take a few minutes on first run (downloading Docker images)..."
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
echo "🎉 All services are running with development volumes!"
echo ""
echo "📱 Access your application:"
echo "   Frontend: http://localhost:3030"
echo "   Backend API: http://localhost:4040"
echo "   Database: localhost:5432 (postgres/password)"
echo ""
echo "🔥 Hot reload is enabled:"
echo "   • Rust backend: Auto-rebuilds on code changes"
echo "   • Next.js frontend: Auto-rebuilds on code changes"
echo "   • Database: Persistent data across restarts"
echo ""
echo "📊 Useful commands:"
echo "   View logs: docker-compose logs -f [service-name]"
echo "   Stop services: docker-compose down"
echo "   Restart service: docker-compose restart [service-name]"
echo "   View running containers: docker ps"
echo "   Enter container: docker exec -it allowance-server bash"
echo ""
echo "💡 Development tips:"
echo "   • Code changes are reflected immediately (no rebuild needed)"
echo "   • Use your IDE/editor normally - files are volume-mounted"
echo "   • Check container logs for any compilation errors"
echo "   • Database data persists between restarts"
echo ""
echo "📝 Next steps:"
echo "   1. Visit http://localhost:3030 to access the application"
echo "   2. Register a new user account"
echo "   3. Check the API health at http://localhost:4040/health"
echo "   4. Make code changes - they'll hot reload automatically!"