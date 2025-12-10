## Local Development Setup

### Quick Start

#### 1. First Time Setup (Database + Full Application)

```bash
# Reset database and load seed data
bash setup_db_v3.sh

# Start all services (postgres, server, client with auto-reload)
bash docker-run.sh
```

#### 2. Normal Development (Application Only)

```bash
# Start services (assumes database is already initialized)
bash docker-run.sh
```

#### 3. Reset Database During Development

```bash
# Reset database and reload seed data
bash setup_db_v3.sh

# Services will restart automatically
bash docker-run.sh
```

### Available Scripts

#### `setup_db_v3.sh` - Database Management
- ✅ Stops all services
- ✅ Clears PostgreSQL volume
- ✅ Starts PostgreSQL only
- ✅ Runs migrations via server
- ✅ Loads seed data
- ✅ Shows database summary

**When to use**: Before first development session, or when you need to reset test data

#### `docker-run.sh` - Application Startup
- ✅ Builds Docker images
- ✅ Starts all services (postgres, server, client)
- ✅ Enables hot-reload for backend and frontend
- ✅ Waits for services to be healthy
- ✅ Shows access URLs

**When to use**: Every development session after database is initialized

#### `verify_setup.sh` - Health Check
- ✅ Shows database counts
- ✅ Shows user tier distribution
- ✅ Checks API health
- ✅ Checks frontend accessibility

**When to use**: Quick verification that system is running

### Access Points

- **Frontend**: http://localhost:3030
- **Backend API**: http://localhost:4040
- **API Documentation**: http://localhost:4040/swagger-ui/
- **Database**: localhost:5432 (postgres/password)

### Test Accounts

All test users have password: `Pass88899`

| Email | Tier | Organization |
|-------|------|--------------|
| admin@allowance.test | allstar | - |
| boss1@allowance.test | premium | ACME01 |
| boss2@allowance.test | premium | STARTUP1 |
| leader1@allowance.test | standard | ACME01 |
| leader2@allowance.test | standard | STARTUP1 |
| member1@allowance.test | standard | ACME01 |
| member2@allowance.test | standard | ACME01 |
| member3@allowance.test | standard | STARTUP1 |
| free@allowance.test | free | - |

### Useful Commands

```bash
# View logs
docker-compose logs -f [service-name]
docker-compose logs -f server     # Backend logs
docker-compose logs -f client     # Frontend logs
docker-compose logs -f postgres   # Database logs

# Stop services
docker-compose down

# Restart a service
docker-compose restart [service-name]

# Enter container
docker exec -it allowance-server bash
docker exec -it allowance-postgres psql -U postgres

# Database queries
docker exec allowance-postgres psql -U postgres -d allowance -c "SELECT email, tier FROM users;"
```

### Database Structure

**Four-Tier Authorization System**:
- `free` (Tier 1): Unassigned users
- `standard` (Tier 2): Team members
- `premium` (Tier 3): Organization bosses
- `allstar` (Tier 4): System administrators

**Key Tables**:
- `users` - User accounts with tier and organization assignment
- `organizations` - Organization entities
- `teams` - Team entities within organizations
- `products` - Product definitions
- `product_versions` - Tiered product versions

### Troubleshooting

**Database shows empty after docker-run.sh**
- This is expected - docker-run.sh doesn't load seed data
- Run `bash setup_db_v3.sh` first

**Services not starting**
- Check logs: `docker-compose logs [service-name]`
- Ensure port 3030, 4040, 5432 are available
- Try full restart: `docker-compose down && bash docker-run.sh`

**Migrations failing**
- Database schema corruption: `bash setup_db_v3.sh` to reset
- Check server logs for migration errors

**Hot reload not working**
- Verify volumes are mounted: `docker volume ls`
- Check file permissions in project directory
- Restart services: `docker-compose restart server client`

### Development Workflow

1. **Start development session**:
   ```bash
   bash docker-run.sh
   ```

2. **Make code changes** in your IDE:
   - Backend changes automatically recompile via `cargo watch`
   - Frontend changes automatically reload via Next.js dev server

3. **Check logs** if something breaks:
   ```bash
   docker-compose logs -f [service-name]
   ```

4. **Reset database** if needed:
   ```bash
   bash setup_db_v3.sh
   ```

5. **End session**:
   ```bash
   docker-compose down
   ```

### Environment Variables

**Backend (.env required)**:
```env
DATABASE_URL=postgres://postgres:password@postgres:5432/allowance
JWT_SECRET=fake-jwt-secret-for-testing-123456789012345678901234567890
JWT_EXPIRATION_HOURS=24
FRONTEND_URL=http://localhost:3030
```

**Frontend (.env.local optional)**:
```env
NEXT_PUBLIC_API_URL=http://localhost:4040
NEXT_PUBLIC_API_SECRET=fake-jwt-secret-for-testing-123456789012345678901234567890
```

### See Also

- `database/seed_data.sql` - Test data that gets loaded
- `server/migrations/` - Database schema files
- `docker-compose.yml` - Service configuration
- `docker-compose.override.yml` - Development overrides
