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
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if [ "$(docker ps --filter "name=$service" --filter "health=healthy" --format "{{.Names}}")" == "$service" ]; then
            echo "✅ $service is healthy"
            return 0
        fi

        echo "⏳ Waiting for $service... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done

    echo "❌ $service failed to become healthy"
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
echo "   Frontend: http://localhost:3001"
echo "   Backend API: http://localhost:3000"
echo "   Database: localhost:5432 (postgres/password)"
echo ""
echo "📊 Useful commands:"
echo "   View logs: docker-compose logs -f [service-name]"
echo "   Stop services: docker-compose down"
echo "   Restart service: docker-compose restart [service-name]"
echo "   View running containers: docker ps"
echo ""
echo "🔧 For development with hot reload, uncomment the volumes in docker-compose.override.yml"
echo ""
echo "📝 Next steps:"
echo "   1. Visit http://localhost:3001 to access the application"
echo "   2. Register a new user account"
echo "   3. Check the API health at http://localhost:3000/health"