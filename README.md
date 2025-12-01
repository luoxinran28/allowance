# Allowance Authorization Management System

A comprehensive product authorization and license management system with UPID-based products, RBAC, and payment processing.

## Tech Stack

- **Backend**: Rust/Axum + PostgreSQL + Redis
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Security**: JWT authentication, HMAC-SHA256 nonce validation
- **Deployment**: Docker Compose

## Quick Start

See [STARTUP_GUIDE.md](STARTUP_GUIDE.md) for complete setup instructions.

```bash
# Start all services
docker compose up --build

# Access application
# Frontend: http://localhost:3030
# Backend API: http://localhost:4040
```

## Documentation

- [STARTUP_GUIDE.md](STARTUP_GUIDE.md) - Setup and deployment
- [database/README_MIGRATIONS.md](database/README_MIGRATIONS.md) - Database schema
- [server/README.md](server/README.md) - Backend documentation
- [client/README.md](client/README.md) - Frontend documentation

## Project Status

✅ **Complete**: Authentication, RBAC, licensing, payments, batch operations, production deployment.

---

**Version**: 1.0  
**Last Updated**: December 1, 2025
