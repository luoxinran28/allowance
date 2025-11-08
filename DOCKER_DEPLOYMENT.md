# Docker Deployment Guide

## Quick Start

### Prerequisites
- Docker 20.10+
- Docker Compose 1.29+
- Git

### Environment Variables

Create or update `.env` file in the project root:

```env
# PostgreSQL
POSTGRES_DB=allowance
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
DATABASE_URL=postgres://postgres:password@postgres:5432/allowance
JWT_SECRET=fake-jwt-secret-for-testing-123456789012345678901234567890
JWT_EXPIRATION_HOURS=24
REFRESH_TOKEN_EXPIRATION_DAYS=7

# Email (optional for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@allowance.com

# Frontend
FRONTEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001

# Tokens
ACTIVATION_TOKEN_EXPIRATION_HOURS=24
PASSWORD_RESET_TOKEN_EXPIRATION_HOURS=1

# Logging
RUST_LOG=debug
```

---

## Build and Run

### Option 1: Full Stack (Recommended)

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Rebuild Specific Service

```bash
# Rebuild backend server
docker-compose build server --no-cache
docker-compose up -d server

# Rebuild frontend client
docker-compose build client --no-cache
docker-compose up -d client
```

### Option 3: Development Mode with Hot Reload

Create `docker-compose.override.yml`:

```yaml
services:
  server:
    volumes:
      - ./server/src:/app/src
    command: cargo watch -x run

  client:
    volumes:
      - ./client:/app
      - /app/node_modules
    command: npm run dev
```

Then run:

```bash
docker-compose up -d
```

---

## Service Health Checks

### Check Service Status

```bash
# View container status
docker-compose ps

# Expected output:
# NAME                 STATUS
# allowance-postgres   Up (healthy)
# allowance-server     Up (healthy)
# allowance-client     Up
```

### Manual Health Checks

```bash
# PostgreSQL
docker exec allowance-postgres pg_isready -U postgres -d allowance

# Server API
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Frontend
curl http://localhost:3001
# Expected: Next.js HTML response
```

---

## Database Initialization

The PostgreSQL database is automatically initialized using migration files from `./database/migrations/`:

1. Container starts with `postgres:15-alpine`
2. Init scripts from `./database/migrations/*.sql` are executed
3. Database `allowance` is created
4. Schema and sample data are loaded

### Verify Database

```bash
# Connect to database
docker exec -it allowance-postgres psql -U postgres -d allowance

# List tables
\dt

# Check users
SELECT * FROM users;

# Exit
\q
```

### Manual Database Operations

```bash
# Create backup
docker exec allowance-postgres pg_dump -U postgres allowance > backup.sql

# Restore from backup
docker exec -i allowance-postgres psql -U postgres allowance < backup.sql

# Reset database (destructive!)
docker-compose down -v  # Remove volumes
docker-compose up -d    # Recreate everything
```

---

## Network and Port Configuration

### Service Networking

Services communicate via Docker network: `allowance_default`

- **PostgreSQL**: `postgres:5432` (internal), `localhost:5432` (external)
- **Server**: `server:3000` (internal), `localhost:3000` (external)
- **Client**: `client:3001` (internal), `localhost:3001` (external)

### Port Mapping

```yaml
# docker-compose.yml
postgres:
  ports:
    - "5432:5432"   # host:container

server:
  ports:
    - "3000:3000"   # host:container

client:
  ports:
    - "3001:3001"   # host:container
```

### Change Ports

```yaml
# docker-compose.override.yml
services:
  postgres:
    ports:
      - "5433:5432"

  server:
    ports:
      - "3001:3000"

  client:
    ports:
      - "3002:3001"
```

---

## Volume Management

### Persistent Data

```yaml
volumes:
  postgres_data:
    driver: local
```

Located at: `docker volume ls` and `docker volume inspect`

### Volume Operations

```bash
# List all volumes
docker volume ls

# Inspect volume
docker volume inspect allowance_postgres_data

# Remove volume (caution: data loss!)
docker volume rm allowance_postgres_data

# Backup volume
docker run --rm -v allowance_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volume
docker volume create --name allowance_postgres_data
docker run --rm -v allowance_postgres_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

---

## Logging and Monitoring

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs server
docker-compose logs client
docker-compose logs postgres

# Follow logs (tail)
docker-compose logs -f server

# Last 100 lines
docker-compose logs --tail=100 server

# Timestamped logs
docker-compose logs -t server
```

### Container Inspection

```bash
# Show container details
docker inspect allowance-server

# Check resource usage
docker stats allowance-server

# Get shell access
docker exec -it allowance-server /bin/bash

# View environment variables
docker exec allowance-server env
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs server

# Rebuild without cache
docker-compose build server --no-cache

# Remove and recreate
docker-compose rm -f server
docker-compose up -d server
```

### Database Connection Issues

```bash
# Verify connection string
echo $DATABASE_URL

# Test from server container
docker exec allowance-server psql $DATABASE_URL -c "SELECT 1;"

# Check PostgreSQL logs
docker-compose logs postgres
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Use different port
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
# (with override mapping different ports)
```

### Build Failures

```bash
# Clear build cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache

# Check disk space
docker system df
```

---

## Production Considerations

### Security

- [ ] Change `JWT_SECRET` to strong random value
- [ ] Update `SMTP_PASSWORD` with real credentials
- [ ] Remove `RUST_LOG=debug` (set to `info`)
- [ ] Use HTTPS with proper certificates
- [ ] Implement rate limiting
- [ ] Enable CORS properly
- [ ] Use environment-specific `.env` files

### Performance

- [ ] Use `--restart=always` in production
- [ ] Add resource limits
- [ ] Implement connection pooling
- [ ] Use CDN for static files
- [ ] Setup load balancing
- [ ] Monitor database query performance

### Backup Strategy

```bash
# Automated daily backup
0 2 * * * docker exec allowance-postgres pg_dump -U postgres allowance > /backups/allowance-$(date +\%Y\%m\%d).sql
```

### Production docker-compose.yml

```yaml
services:
  postgres:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  server:
    restart: always
    environment:
      - RUST_LOG=info
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  client:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: docker/setup-buildx-action@v1

      - name: Build and push
        uses: docker/build-push-action@v2
        with:
          context: ./server
          push: true
          tags: myregistry.azurecr.io/allowance-server:latest

      - name: Deploy
        run: |
          docker-compose pull
          docker-compose up -d
```

---

## Useful Docker Commands

```bash
# Container management
docker-compose ps                    # List containers
docker-compose start                 # Start stopped containers
docker-compose stop                  # Stop running containers
docker-compose restart              # Restart containers
docker-compose rm                   # Remove stopped containers

# Image management
docker-compose build                # Build images
docker image ls                     # List images
docker image rm <image-id>          # Remove image

# Network management
docker network ls                   # List networks
docker network inspect allowance_default  # Inspect network

# Clean up
docker system prune                 # Remove unused images/containers
docker volume prune                 # Remove unused volumes
docker system prune -a              # Complete cleanup
```

---

## Testing Deployed Application

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'

# Frontend access
open http://localhost:3001
```

---

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Services pass health checks
- [ ] Database connectivity verified
- [ ] API endpoints responding
- [ ] Frontend loads correctly
- [ ] Logs show no errors
- [ ] Backup strategy in place
- [ ] Monitoring setup complete
- [ ] Documentation updated
