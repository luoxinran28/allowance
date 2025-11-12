# Allowance Authorization Management System - API Server

A production-grade Rust + Axum backend providing role-based access control (RBAC), team management, and license authorization with offline JWT verification.

## Quick Start

### Prerequisites
- **Rust 1.70+** - [Install](https://www.rust-lang.org/tools/install)
- **PostgreSQL 14+** - [Install](https://www.postgresql.org/download/)

### Development Setup

```bash
# Clone and setup
git clone https://github.com/luoxinran28/allowance.git
cd allowance/server

# Create .env file with your configuration
cp .env.example .env

# Build and run database migrations
sqlx migrate run

# Start development server (with auto-reload)
cargo watch -x run
```

The server will start on `http://localhost:4040`

### API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:4040/swagger-ui/
- **ReDoc**: http://localhost:4040/redoc/
- **OpenAPI JSON**: http://localhost:4040/api-docs/openapi.json

## Core Features

### Authentication & Authorization
- **Email-based registration** with verification tokens
- **JWT token-based** authentication (24h access, 7d refresh)
- **Role-based access control** (RBAC) with permission scoping
- **Password reset flow** with email verification

### License Management
- **Offline JWT verification** for license validation
- **Multi-tier licensing** (free, standard, premium)
- **Usage tracking** with daily and monthly limits
- **Product-based** licensing with version support

### Team & Organization
- **Team management** with role hierarchy (member, leader, admin)
- **Organization approval workflows** for user applications
- **Multi-group membership** with scoped permissions
- **Audit logging** for administrative actions

### Database-Backed RBAC
- **4 predefined roles**: free_user, standard_employee, team_leader, admin
- **14 permissions** across 5 resource areas
- **Scoped permissions** (user, product, team, organization, admin)
- **Dynamic role assignment** by administrators

## Key Endpoints

### Authentication
```
POST   /auth/register                   - Register new user
POST   /auth/login                      - Authenticate user
POST   /auth/activate                   - Activate account with token
POST   /auth/request-password-reset     - Request password reset
POST   /auth/reset-password             - Reset password with token
```

### User Management
```
GET    /user/profile                    - Get user profile
PUT    /user/profile                    - Update user profile
GET    /user/licenses                   - Get user's product licenses
```

### Products & Licenses
```
GET    /product/list                    - List available products
GET    /product/:product_id             - Get product details
POST   /product/license/generate        - Generate license for product
```

### Teams
```
POST   /team/create                     - Create new team
GET    /team/list                       - List user's teams
GET    /team/:team_id                   - Get team details
POST   /team/:team_id/members           - Add team member
GET    /team/:team_id/members           - List team members
DELETE /team/:team_id/members/:user_id  - Remove team member
PUT    /team/:team_id/members/:user_id  - Update member role
```

### Organizations
```
POST   /org/create                      - Create new organization
GET    /org                             - List organizations
GET    /org/search                      - Search organizations
GET    /org/my                          - Get user's organizations
GET    /org/:org_id                     - Get organization details
PUT    /org/:org_id                     - Update organization
DELETE /org/:org_id                     - Delete organization
```

### Admin Operations
```
GET    /admin/users                     - List all users (paginated)
GET    /admin/users/:user_id            - Get user details
POST   /admin/users/:user_id/role       - Assign role to user
DELETE /admin/users/:user_id/role       - Remove role from user
GET    /admin/approvals                 - List pending approvals
GET    /admin/approvals/:approval_id    - Get approval details
POST   /admin/approvals/:approval_id/approve  - Approve request
POST   /admin/approvals/:approval_id/reject   - Reject request
```

### Health Check
```
GET    /health                          - Server health status
```

**See the OpenAPI documentation for complete request/response schemas**

## Project Structure

```
src/
├── models/                    # Data structures
│   ├── user.rs               # User models and enums
│   ├── rbac.rs               # Role and Permission models
│   ├── organization.rs       # Organization models
│   ├── product.rs            # Product and License models
│   └── approval.rs           # Approval workflow models
│
├── services/                  # Business logic layer
│   ├── auth_service.rs       # Authentication & registration
│   ├── rbac_service.rs       # Permission checking
│   ├── team_service.rs       # Team management
│   ├── organization_service.rs  # Organization management
│   ├── admin_service.rs      # Admin operations
│   ├── license_service.rs    # License generation & verification
│   └── product_service.rs    # Product authorization
│
├── handlers/                  # HTTP endpoint handlers
│   ├── auth.rs               # /auth/* endpoints
│   ├── user.rs               # /user/* endpoints
│   ├── admin.rs              # /admin/* endpoints
│   ├── product.rs            # /product/* endpoints
│   ├── team.rs               # /team/* endpoints
│   └── organization.rs       # /org/* endpoints
│
├── middleware/                # Request middleware
│   ├── auth.rs               # JWT token validation
│   └── rbac.rs               # Permission checking
│
├── utils/                     # Shared utilities
│   ├── jwt.rs                # JWT token generation/verification
│   ├── crypto.rs             # Password hashing, UUID generation
│   ├── license.rs            # License token encoding/decoding
│   ├── email.rs              # Email sending
│   └── errors.rs             # Error types and handling
│
├── docs/                      # OpenAPI documentation
│   └── mod.rs                # Swagger/ReDoc configuration
│
├── db/                        # Database layer
│   └── mod.rs                # Connection pool and initialization
│
├── config.rs                 # Configuration management
└── main.rs                   # Application entry point
```

## Environment Configuration

Create a `.env` file with the following variables:

```env
# Server
SERVER_HOST=127.0.0.1
SERVER_PORT=4040

# Database
DATABASE_URL=postgres://user:password@localhost:5432/allowance

# JWT (minimum 32 characters for JWT_SECRET)
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRATION_HOURS=24
REFRESH_TOKEN_EXPIRATION_DAYS=7

# Email (SMTP configuration)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@allowance.com

# Frontend
FRONTEND_URL=http://localhost:3030

# Token Expiration
ACTIVATION_TOKEN_EXPIRATION_HOURS=24
PASSWORD_RESET_TOKEN_EXPIRATION_HOURS=1
```

## Development

### Running Tests

```bash
# Run all tests
cargo test

# Run specific test module
cargo test team_service_tests

# Run with output
cargo test -- --nocapture

# Run single test
cargo test test_team_member_roles
```

**Test Coverage**: 40+ unit and integration tests covering:
- Authentication flows and token generation
- License verification and expiration
- Permission checking and RBAC
- Team and organization management
- Error handling and validation
- Data validation and business logic

### Code Quality

```bash
# Format code
cargo fmt

# Run linter
cargo clippy

# Check for security issues
cargo audit

# Watch mode (auto-rebuild on changes)
cargo watch -x run
```

## Architecture

### Service Layer Pattern
Business logic is isolated in `services/` while handlers remain thin orchestrators. This enables:
- Easy testing without HTTP layer
- Reusable logic across multiple endpoints
- Clear separation of concerns

### Database-Backed RBAC
Permissions are checked via database queries rather than cached, enabling:
- Real-time permission changes
- Fine-grained permission management
- Audit trail of access control changes

### JWT for License Verification
Licenses are self-contained JWT tokens allowing:
- Offline verification without database queries
- Tamper-proof claims validation
- Scalable license distribution

### Transaction-Wrapped Operations
Multi-step operations use database transactions ensuring:
- Atomicity (all-or-nothing semantics)
- Data consistency
- Rollback on partial failure

## Security Practices

- ✅ Passwords hashed with **Argon2**
- ✅ Parameterized SQL queries (**SQLx**)
- ✅ JWT token expiration management
- ✅ CORS configured for cross-origin requests
- ✅ Email-based account verification
- ⚠️ Rate limiting recommended
- ⚠️ HTTPS required in production

## Performance Considerations

- Database connection pooling with SQLx
- JWT validation without DB queries
- Indexed queries on common filters (email, user_id)
- Async request handling with Tokio
- JSON logging for easy parsing

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines, code style, and contribution process.

## Resources

- **OpenAPI Spec**: Access at `/api-docs/openapi.json` when server is running
- **Swagger UI**: Interactive API explorer at `/swagger-ui/`
- **ReDoc**: Alternative documentation at `/redoc/`
- **Source Code**: [GitHub Repository](https://github.com/luoxinran28/allowance)

## License

MIT - See LICENSE file for details
