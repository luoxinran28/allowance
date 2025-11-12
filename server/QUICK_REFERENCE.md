# Quick Reference Card

## Local Development Checklist

### First Time Setup
```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Clone repository
git clone https://github.com/luoxinran28/allowance.git
cd allowance/server

# 3. Setup environment
cp .env.example .env
# Edit .env with your local database URL

# 4. Initialize database
sqlx database create
sqlx migrate run

# 5. Start developing
cargo watch -x run
```

### Daily Development Commands

```bash
# Start development server (auto-rebuild on file changes)
cargo watch -x run

# Run all tests
cargo test

# Run specific test
cargo test test_name

# Format code
cargo fmt

# Run linter
cargo clippy

# Check without building
cargo check

# Build optimized binary
cargo build --release
```

### API Testing Locally

```bash
# Access interactive API documentation
http://localhost:4040/swagger-ui/

# Alternative documentation viewer
http://localhost:4040/redoc/

# Health check
curl http://localhost:4040/health

# Example: Register a user
curl -X POST http://localhost:4040/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"SecurePass123"
  }'
```

## Common Development Patterns

### Service Implementation
```rust
impl MyService {
    pub async fn do_something(pool: &PgPool, input: &str) -> AppResult<Output> {
        // Validate input
        validate_input(input)?;
        
        // Query database
        let data = sqlx::query_as::<_, Data>("SELECT ... WHERE id = $1")
            .bind(input)
            .fetch_one(pool)
            .await?;
        
        // Business logic
        let result = transform(data)?;
        
        Ok(result)
    }
}
```

### Handler Implementation
```rust
pub async fn my_endpoint(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<MyRequest>,
) -> AppResult<Json<MyResponse>> {
    let result = MyService::do_something(&state.pool, &req.field).await?;
    Ok(Json(MyResponse::from(result)))
}
```

### Writing Tests
```rust
#[tokio::test]
async fn test_my_feature() {
    // Arrange: Setup
    let expected = "expected_value";
    
    // Act: Execute
    let result = function_under_test(input).await.unwrap();
    
    // Assert: Verify
    assert_eq!(result, expected);
}
```

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Build fails | `cargo clean && cargo build` |
| Tests fail | `RUST_BACKTRACE=1 cargo test -- --nocapture` |
| Database error | `sqlx database drop -y && sqlx database create && sqlx migrate run` |
| Linker error (Windows) | `cargo clean && cargo build` |
| Compilation stuck | `touch src/lib.rs` (on macOS/Linux) or `copy src\lib.rs src\lib.rs` (Windows) |

## File Locations Quick Map

```
src/
├── models/user.rs              → User data structures
├── services/auth_service.rs    → Authentication logic
├── handlers/auth.rs            → Auth endpoints (/auth/*)
├── middleware/auth.rs          → JWT validation
├── utils/errors.rs             → Error types
└── docs/mod.rs                 → OpenAPI documentation

tests/
└── integration_tests.rs         → Test suite (40+ tests)

database/migrations/            → SQL migrations
README.md                        → Project overview
CONTRIBUTING.md                 → Development guidelines
API_DOCUMENTATION.md            → API usage guide
```

## Git Workflow Quick Start

```bash
# Create feature branch
git checkout -b feature/description

# Make changes, then commit
git add .
git commit -m "feat: add new feature"

# Keep branch updated
git fetch origin
git rebase origin/main

# Push and create PR
git push origin feature/description
```

## Code Review Checklist

Before submitting PR:
- [ ] `cargo fmt` - formatted?
- [ ] `cargo clippy` - no warnings?
- [ ] `cargo test` - all pass?
- [ ] Comments added for complex logic?
- [ ] Tests added for new features?
- [ ] README updated if needed?
- [ ] Commit messages clear?

## Documentation Access

| Resource | Purpose | Access |
|----------|---------|--------|
| Swagger UI | Interactive API testing | http://localhost:4040/swagger-ui/ |
| ReDoc | Searchable API documentation | http://localhost:4040/redoc/ |
| OpenAPI JSON | Raw specification | http://localhost:4040/api-docs/openapi.json |
| README.md | Project overview | `server/README.md` |
| API_DOCUMENTATION.md | API usage examples | `server/API_DOCUMENTATION.md` |
| CONTRIBUTING.md | Development guidelines | `server/CONTRIBUTING.md` |

## Useful VS Code Extensions

```json
{
  "rust-analyzer",
  "Even Better TOML",
  "Better Comments",
  "GitLens",
  "Thunder Client" // or REST Client
}
```

## Database Schema Quick Reference

### Key Tables
- `users` - User accounts
- `roles` - RBAC roles (free_user, standard_employee, team_leader, admin)
- `permissions` - Available permissions
- `user_roles` - User to role assignments
- `role_permissions` - Role to permission assignments
- `teams` - Team entities
- `team_members` - Team membership
- `organizations` - Organization entities
- `products` - Product definitions
- `licenses` - User licenses

## JWT Token Structure

### Payload
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "iat": 1699424400,
  "exp": 1699510800
}
```

### Usage
```bash
# Include in all authenticated requests
curl -H "Authorization: Bearer {token}" http://localhost:3000/user/profile
```

## Environment Variables Reference

```bash
SERVER_HOST=127.0.0.1           # Server bind address
SERVER_PORT=4040                # Server port
DATABASE_URL=postgres://user:pass@localhost/db
JWT_SECRET=min-32-character-secret
JWT_EXPIRATION_HOURS=24
REFRESH_TOKEN_EXPIRATION_DAYS=7
SMTP_HOST=smtp.gmail.com
EMAIL_FROM=noreply@allowance.com
FRONTEND_URL=http://localhost:3030
```

## Performance Monitoring

```bash
# Check query performance
# Enable logging in Rust code:
use tracing::info;
info!("Time taken: {:?}", start.elapsed());

# Check database connections
SELECT count(*) FROM pg_stat_activity;

# Monitor memory usage
# Use cargo check-limit or monitor tools
```

## Security Checklist

- [ ] Never hardcode secrets
- [ ] Use parameterized queries always
- [ ] Validate all inputs
- [ ] Hash passwords with Argon2
- [ ] Set appropriate token expiration
- [ ] Use HTTPS in production
- [ ] Don't expose sensitive info in logs
- [ ] Review security practices before PR

## Common Commands Reference

```bash
# Setup
cargo init               # Create new project
cargo new --lib lib     # Create library

# Building
cargo build             # Debug build
cargo build --release   # Optimized build
cargo check             # Type check only

# Running
cargo run               # Run binary
cargo watch -x run      # Auto-rebuild

# Testing
cargo test              # Run all tests
cargo test --lib        # Unit tests only
cargo test --test *     # Integration tests only

# Quality
cargo fmt               # Format code
cargo clippy            # Lint
cargo audit             # Security check
cargo doc --open        # Generate docs

# Database
sqlx migrate run        # Run migrations
sqlx migrate add name   # Create migration
sqlx prepare --check    # Verify queries
```

## Useful Resources

- **Rust Book**: https://doc.rust-lang.org/book/
- **Axum Docs**: https://docs.rs/axum/
- **SQLx Docs**: https://docs.rs/sqlx/
- **Tokio Docs**: https://tokio.rs/
- **GitHub Issues**: Check for solutions
- **Stack Overflow**: Tag: [rust]

## Need Help?

1. Check `README.md` and `CONTRIBUTING.md`
2. Review `API_DOCUMENTATION.md` for API examples
3. Look at test examples in `tests/integration_tests.rs`
4. Search GitHub issues
5. Ask in GitHub discussions
6. Check Rust community resources

---

**Keep this handy while developing! 🚀**
