# Allowance Server

Rust + Axum backend for the allowance authorization management system.

## Project Structure

```
src/
├── models/                    # Data models
│   ├── user.rs               # User, UserStatus, UserTier
│   ├── rbac.rs               # Role, Permission, RolePermission
│   ├── organization.rs       # Organization, Group, UserGroup
│   ├── product.rs            # Product, ProductVersion, License
│   └── approval.rs           # ApprovalRequest
│
├── services/                  # Business logic layer
│   ├── auth_service.rs       # Authentication & registration
│   ├── user_service.rs       # User management
│   ├── rbac_service.rs       # Permission checking
│   ├── product_service.rs    # Product authorization
│   ├── license_service.rs    # License generation & verification
│   ├── team_service.rs       # Team/Group management
│   ├── approval_service.rs   # Approval workflows
│   └── email_service.rs      # Email sending
│
├── handlers/                  # HTTP handlers
│   ├── auth.rs               # /auth/* endpoints
│   ├── user.rs               # /user/* endpoints
│   ├── admin.rs              # /admin/* endpoints
│   ├── product.rs            # /product/* endpoints
│   └── team.rs               # /team/* endpoints
│
├── middleware/                # Express middleware
│   ├── auth.rs               # JWT validation
│   ├── rbac.rs               # Permission checking
│   └── logging.rs            # Request logging
│
├── utils/                     # Utilities
│   ├── jwt.rs                # JWT generation/verification
│   ├── crypto.rs             # Password hashing, UUID generation
│   ├── license.rs            # License token encoding/decoding
│   ├── email.rs              # Email configuration
│   └── errors.rs             # Error types and handling
│
├── db/                        # Database
│   ├── mod.rs                # Connection pool configuration
│   └── queries.rs            # Common database queries
│
├── config.rs                 # Configuration management
├── main.rs                   # Application entry point
└── lib.rs                    # Library root
```

## Setup & Development

### Prerequisites
- Rust 1.70+
- PostgreSQL 14+
- `.env` file with configuration (see `.env.example`)

### Install

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Build the project
cargo build

# Run migrations
sqlx migrate run

# Run the server
cargo run
```

### Development

```bash
# Watch mode (auto-rebuild on changes)
cargo watch -x run

# Run tests
cargo test

# Format code
cargo fmt

# Lint code
cargo clippy
```

## Environment Variables

```env
# Server
SERVER_HOST=127.0.0.1
SERVER_PORT=3000

# Database
DATABASE_URL=postgres://user:password@localhost:5432/allowance

# JWT
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRATION_HOURS=24
REFRESH_TOKEN_EXPIRATION_DAYS=7

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=luoxinran28@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@allowance.com

# Frontend
FRONTEND_URL=http://localhost:3001

# Activation Token
ACTIVATION_TOKEN_EXPIRATION_HOURS=24
PASSWORD_RESET_TOKEN_EXPIRATION_HOURS=1
```

## Key APIs

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/activate` - Activate account with email token
- `POST /auth/request-password-reset` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/refresh` - Refresh JWT token

### User
- `GET /user/profile` - Get current user profile
- `PUT /user/profile` - Update user profile
- `GET /user/licenses` - Get user's product licenses
- `POST /user/organization/search` - Search organizations to join
- `POST /user/organization/apply` - Apply to join organization

### Product
- `GET /product/list` - List available products ✅
- `GET /product/:product_id` - Get product details ✅
- `POST /product/license/generate` - Generate license for product ✅
- `POST /product/license/verify` - Verify license (offline JWT validation)

### Team
- `POST /team/create` - Create new team
- `GET /team/list` - List user's teams
- `POST /team/:id/members` - Add member to team
- `GET /team/:id/members` - List team members

### Admin
- `GET /admin/users` - List all users
- `POST /admin/users/:id/role` - Assign role to user
- `GET /admin/approvals` - List pending approvals
- `POST /admin/approvals/:id/approve` - Approve request
- `POST /admin/approvals/:id/reject` - Reject request

## Architecture Notes

### RBAC Implementation
- Uses database-backed role/permission system
- Supports multiple roles per user
- Each role can have permissions scoped to specific resources

### License/Authorization Code
- JWT format for offline verification capability
- Payload: `{user_id, tier, products[], expires_at, daily_limit}`
- Signed with server's private key

### Email Flow
- Async email sending using background tasks
- Activation tokens with expiration
- Simple retry mechanism for failed sends

## Testing

See `tests/` directory for integration tests covering:
- User registration & activation
- License generation & verification
- Permission checking
- Team management workflows

## Implementation Status

### Completed ✅
- Authentication endpoints (register, login, activate, password reset)
- Product endpoints (list, get, license generation)
- User profile endpoints (get profile, get licenses)
- JWT token generation and verification
- Database schema with RBAC support
- Error handling with proper HTTP responses
- State management for handler sharing

### In Progress 🔄
- JWT token extraction from request context
- Profile update implementation
- Permission middleware for protected endpoints

### Planned 📋
- Team management endpoints
- Admin endpoints
- Organization/approval workflows
- Frontend dashboard pages
- Permission-based access control
- Docker deployment configuration

## Performance Considerations

- Database connection pooling (SQLx)
- JWT validation without DB queries
- Indexed database queries for common filters
- Lightweight JSON logging

## Security Notes

- Passwords hashed with Argon2
- HTTPS recommended in production
- Rate limiting (recommended to add)
- SQL injection prevention via parameterized queries
- CSRF protection (implement in frontend)
