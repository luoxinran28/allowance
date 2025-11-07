# Allowance Authorization Management System

Complete implementation of a user registration, authorization, and RBAC management system.

## 📋 Quick Start

### Option 1: Docker Setup (Recommended)

The easiest way to get started is using Docker, which handles all dependencies automatically.

```bash
# Clone and navigate to the project
cd allowance

# Run the setup script
./docker-run.sh

# Or manually with docker-compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
```

**What Docker sets up:**
- PostgreSQL database with automatic migrations
- Rust backend server on port 3000
- Next.js frontend on port 3001
- All services communicate properly
- Health checks ensure services start in the correct order

#### Docker Services

- **postgres**: PostgreSQL 15 database
  - Database: `allowance`
  - User: `postgres`
  - Password: `password`
  - Port: `5432`

- **server**: Rust/Axum backend
  - Port: `3000`
  - Health check: `http://localhost:3000/health`
  - Auto-migrates database on startup

- **client**: Next.js frontend
  - Port: `3001`
  - Built for production with standalone output

#### Docker Commands

```bash
# Start services
docker-compose up --build

# Start in background
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart specific service
docker-compose restart server

# View running containers
docker ps

# Access database directly
docker exec -it allowance-postgres psql -U postgres -d allowance
```

#### Development with Docker

For development with hot reload, uncomment the volumes in `docker-compose.override.yml`:

```yaml
# In docker-compose.override.yml
services:
  server:
    volumes:
      - ./server:/app
    command: cargo watch -x run

  client:
    volumes:
      - ./client:/app
      - /app/node_modules
    command: npm run dev
```

### Option 2: Local Development Setup

If you prefer to run services individually:

#### Database Setup

```bash
# Create database
createdb allowance

# Run migrations
psql allowance < database/migrations/001_initial_schema.sql
psql allowance < database/migrations/002_add_license_table.sql
```

#### Backend Setup (Rust/Axum)

```bash
cd server

# Create .env file from example
cp .env.example .env

# Update .env with your configuration:
# - DATABASE_URL: Your PostgreSQL connection string
# - JWT_SECRET: 32+ character secret (generate: openssl rand -hex 32)
# - SMTP credentials for email sending

# Build and run
cargo build
cargo run

# Server runs on http://localhost:3000
```

#### Frontend Setup (NextJS)

```bash
cd client

# Install dependencies
npm install

# Create .env.local from example
cp .env.example .env.local

# Run development server
npm run dev

# Frontend runs on http://localhost:3001
```

## 🏗️ Architecture Overview

### Technology Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + Zustand
- **Backend**: Rust + Axum framework
- **Database**: PostgreSQL with complex RBAC schema
- **Authentication**: JWT (access + refresh tokens)
- **License/Authorization**: JWT-based offline verification
- **Email**: SMTP integration for activation/password reset

### Core Features Implemented

#### 1. User Management
- ✅ User registration with email validation
- ✅ Free tier activation via email tokens
- ✅ Password reset flow
- ✅ User profile management
- ✅ Multiple roles per user (free_user, standard_employee, team_leader, admin)

#### 2. RBAC System
- ✅ Role-based access control with fine-grained permissions
- ✅ 4 predefined roles with specific permissions
- ✅ 14 permission types across 5 resource areas
- ✅ Database-backed permission checking
- ✅ Support for multiple roles per user

#### 3. Product Authorization
- ✅ Product versioning (basic, pro, enterprise)
- ✅ Tier-based access control
- ✅ Usage limits (daily, monthly)
- ✅ License generation with JWT format
- ✅ Product listing and details retrieval
- ✅ Offline license verification capability

#### 4. Organization & Teams
- ✅ Organization (company/institution) structure
- ✅ Groups (departments) within organizations
- ✅ Team membership management
- ✅ Role-based team permissions (member, leader, admin)

#### 5. Approval Workflow
- ✅ Approval request system
- ✅ Status tracking (pending, approved, rejected)
- ✅ Request expiration
- ✅ Audit trail support

## 🔐 Security Features

### Implemented
- ✅ Argon2 password hashing
- ✅ JWT token-based authentication
- ✅ Stateless session management
- ✅ SQL injection prevention (parameterized queries)
- ✅ Email token expiration
- ✅ Rate limiting hooks (middleware ready)

### To Add in Production
- [ ] HTTPS enforcement
- [ ] CORS configuration per environment
- [ ] Rate limiting middleware
- [ ] Request validation/sanitization
- [ ] Audit logging enhancement
- [ ] Secrets management (AWS Secrets Manager, HashiCorp Vault)

## 📊 Database Schema Highlights

### Core Tables
- `users` - User accounts (uid, email, tier, status)
- `roles` - 4 predefined roles
- `permissions` - 14 permission types
- `user_roles` - Many-to-many user-role mapping
- `role_permissions` - Role-permission mapping
- `organizations` - Top-level orgs
- `groups` - Department/team containers
- `products` - Product catalog
- `product_versions` - Version variants (basic/pro/enterprise)
- `user_licenses` - User product authorization
- `email_tokens` - Activation/password reset tokens
- `approval_requests` - Workflow requests
- `audit_logs` - Operation logging

### Key Indexes
- Email, UID, tier, status (users)
- User ID, role ID (for permission checking)
- Product ID, version (for license lookup)
- Token, expiration (for email flow)

## 🔄 Authentication Flow

### Registration → Activation

```
1. User enters email and password
2. Backend validates and hashes password
3. User created with status='inactive'
4. Email activation token generated (24hr expiry)
5. Activation email sent
6. User clicks email link
7. Token validated and user status='active'
8. User assigned 'free_user' role
9. Redirect to login
```

### Login → JWT Session

```
1. User submits email/password
2. Credentials verified
3. JWT access token generated (24hr)
4. Refresh token generated (7 day)
5. Tokens returned to client
6. Stored in localStorage (client-side)
7. Subsequent requests include Bearer token
```

## 📜 License/Authorization Code Generation

### Offline-Verifiable License

```json
{
  "user_id": 123,
  "product_id": "form-001",
  "version_name": "pro",
  "tier": "standard",
  "expires_at": 1735689600,
  "daily_limit": 100,
  "monthly_limit": 10000,
  "iat": 1703153600,
  "exp": 1735689600
}
```

**Signed as JWT** → Can be verified offline without DB queries:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjN9...
```

### Verification on Product

```typescript
// In product client code
const isValid = verifyLicenseOffline(licenseToken);
if (isValid) {
  // Features enabled based on license claims
  enableFeature('ai_mode');  // Only if tier >= premium
}
```

## 🧪 Testing the System

### 1. Database Verification

```bash
# Connect to database
psql allowance

# Check tables
\dt
SELECT * FROM roles;
SELECT * FROM permissions;
SELECT * FROM products;
```

### 2. Backend API Testing

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'

# Generate license
curl -X POST http://localhost:3000/product/license/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"form-001","version_name":"pro","days_valid":30}'
```

### 3. Frontend Testing

```bash
# Login flow
1. Visit http://localhost:3001/auth/login
2. Enter test email and password
3. Follow activation email link
4. Dashboard shows user info

# License verification
1. Dashboard/products page
2. Generate license button
3. Copy license token
4. Test offline verification with client SDK
```

### 4. RBAC Testing

```bash
# As admin, check user permissions
SELECT p.code, p.name FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON rp.role_id = r.id
WHERE r.code = 'team_leader';

# Expected: 9 permissions for team_leader role
```

## 📁 Project Structure Summary

```
allowance/
├── database/
│   ├── README.md                      # Schema documentation
│   └── migrations/                    # SQL migration files
│       ├── 001_initial_schema.sql
│       └── 002_add_license_table.sql
│
├── server/                            # Rust/Axum backend
│   ├── src/
│   │   ├── models/                   # Data models
│   │   ├── services/                 # Business logic (auth, rbac, license, product)
│   │   ├── handlers/                 # HTTP handlers
│   │   ├── middleware/               # JWT, RBAC middleware
│   │   ├── utils/                    # JWT, crypto, email, license utils
│   │   ├── db/                       # Database initialization
│   │   ├── config.rs                 # Configuration
│   │   └── main.rs                   # Entry point
│   ├── Cargo.toml                    # Rust dependencies
│   ├── .env.example                  # Configuration template
│   └── README.md                     # Backend documentation
│
└── client/                            # Next.js frontend
    ├── app/
    │   ├── auth/                     # Authentication pages
    │   ├── dashboard/                # User dashboard
    │   ├── admin/                    # Admin panel (scaffold)
    │   └── layout.tsx                # Root layout
    ├── components/                   # React components
    ├── lib/
    │   ├── api-client.ts             # HTTP client
    │   ├── license.ts                # License verification
    │   ├── types.ts                  # TypeScript interfaces
    │   ├── auth-store.ts             # Zustand auth state
    │   └── hooks/                    # useAuth, usePermission
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── .env.example
    └── README.md                     # Frontend documentation
```

## 🚀 Next Steps

### Phase 2: Enhanced Features
1. [ ] Complete API endpoints for team management
2. [ ] Admin dashboard implementation
3. [ ] Email service integration
4. [ ] Approval workflow UI
5. [ ] User permission UI display

### Phase 2: Enhanced Features
1. [x] **Product endpoints** - Product listing, retrieval, and license generation
   - `GET /product/list` - Lists all available products
   - `GET /product/:product_id` - Retrieves product details
   - `POST /product/license/generate` - Generates JWT-based product license
   - Permission-based access control integrated

2. [x] **User endpoints** - Profile and license management
   - `GET /user/profile` - Retrieves user information
   - `GET /user/licenses` - Lists user's active licenses
   - `PUT /user/profile` - Updates user profile (placeholder)

3. [ ] **JWT token extraction middleware** - Extract user from request context
4. [ ] **Team management endpoints** - Team CRUD and membership operations
5. [ ] **Admin dashboard implementation** - User management, approval workflows
6. [ ] **Email service integration** - Activation emails, password reset
7. [ ] **Approval workflow UI** - Frontend for approval management
8. [ ] **User permission display** - Show permissions based on roles

### Phase 3: Integration
1. [ ] Payment system integration (mock first)
2. [ ] Upgrade/downgrade flow
3. [ ] License renewal logic
4. [ ] Batch license generation

### Phase 4: Production
1. [ ] Comprehensive unit/integration tests
2. [ ] Performance optimization
3. [ ] Docker containerization
4. [ ] Deployment guides (AWS ECS)
5. [ ] Monitoring and logging setup

## 📝 Configuration Checklist

### Backend (.env)
- [ ] DATABASE_URL configured
- [ ] JWT_SECRET set to 32+ random characters
- [ ] SMTP_HOST, SMTP_USER, SMTP_PASSWORD configured
- [ ] FRONTEND_URL matches client domain

### Frontend (.env.local)
- [ ] NEXT_PUBLIC_API_URL points to backend
- [ ] NEXT_PUBLIC_FRONTEND_URL matches deployment URL

### Database
- [ ] PostgreSQL running
- [ ] Database 'allowance' created
- [ ] Migrations applied successfully

## 💡 Key Implementation Notes

### Why JWT for Licenses?
- ✅ Offline verification without DB queries
- ✅ Self-contained authorization info
- ✅ Standard format understood by products
- ✅ Expiration built-in
- ✅ Tamper-proof via signatures

### RBAC Design
- 4 roles: free_user, standard_employee, team_leader, admin
- 14 permissions covering: user, product, team, org, admin resources
- Support for scoped permissions (team_id, org_id in future)
- Extensible for new roles/permissions without schema changes

### Multi-Role Support
- Users can have multiple roles simultaneously
- Example: Employee in Group A, Leader in Group B
- Permissions = union of all assigned roles' permissions
- Scoped permissions enable fine-grained access control

## 🤝 Contributing

When adding new features:
1. Update database schema with new migration file
2. Add new models in `server/src/models/`
3. Create service layer for business logic
4. Add HTTP handlers
5. Update frontend components
6. Document in relevant README.md

## 📞 Support

For issues or questions:
- Check database migrations are applied
- Verify .env files are configured correctly
- Review logs: `RUST_LOG=debug cargo run`
- Check browser console for frontend errors
