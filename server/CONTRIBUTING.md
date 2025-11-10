# Contributing to Allowance Authorization System

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the Allowance backend project.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions. We're committed to providing a welcoming environment for all contributors.

## Getting Started

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/luoxinran28/allowance.git
cd allowance/server

# Create .env file
cp .env.example .env

# Install Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Create database and run migrations
sqlx migrate run

# Start development server with auto-reload
cargo watch -x run
```

### Verify Your Setup

```bash
# Run tests
cargo test

# Format check
cargo fmt --check

# Lint check
cargo clippy
```

## Development Workflow

### 1. Create a Branch

```bash
# Create a feature branch from main
git checkout -b feature/your-feature-name
# or for bugfixes
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` - New features or functionality
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `test/` - Test additions or improvements
- `refactor/` - Code refactoring without behavior changes

### 2. Make Your Changes

Follow the coding standards and patterns described below.

### 3. Write Tests

All new functionality must include tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_feature_name() {
        // Arrange
        let input = setup_test_data();

        // Act
        let result = function_under_test(input).await;

        // Assert
        assert_eq!(result.expected_field, expected_value);
    }
}
```

### 4. Run Quality Checks

```bash
# Format code
cargo fmt

# Run clippy linter
cargo clippy

# Run all tests
cargo test

# Check for security issues
cargo audit
```

### 5. Commit Your Changes

Write clear, descriptive commit messages:

```bash
# Good commit messages
git commit -m "feat: add team member role validation"
git commit -m "fix: handle expired JWT tokens gracefully"
git commit -m "test: add unit tests for RBAC service"

# Avoid
git commit -m "fix bug"
git commit -m "WIP: stuff"
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:
- Clear title describing the change
- Description explaining **why** the change was made
- Reference to related issues (if applicable)
- Confirmation that tests pass

## Code Style & Standards

### Naming Conventions

```rust
// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRIES: usize = 3;
const DEFAULT_TIMEOUT_SECONDS: u64 = 30;

// Functions and variables: snake_case
fn validate_email_format(email: &str) -> bool { }
let user_id = 123i64;

// Structs, enums, traits: PascalCase
struct UserResponse { }
enum UserStatus { }
trait AuthService { }

// Modules: snake_case
mod auth_service;
mod rbac_service;
```

### Code Organization

**Within a file:**
1. Imports
2. Type definitions (structs, enums, traits)
3. Implementations
4. Tests

```rust
use std::sync::Arc;
use sqlx::PgPool;

#[derive(Debug, Clone)]
pub struct User {
    pub id: i64,
    pub email: String,
}

impl User {
    pub fn new(id: i64, email: String) -> Self {
        Self { id, email }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    // tests...
}
```

### Error Handling

Use the project's error types (`AppError`, `AppResult`) consistently:

```rust
use crate::utils::{AppError, AppResult};

// Good: Propagate errors with ?
pub async fn register(email: &str, password: &str) -> AppResult<User> {
    validate_email(email)?;
    validate_password(password)?;
    // ... create user
    Ok(user)
}

// Good: Use context for unclear errors
sqlx::query("SELECT * FROM users")
    .fetch_one(&pool)
    .await
    .map_err(|_| AppError::UserNotFound)?;

// Avoid: Panicking or unwrapping
let user = users.get(0).unwrap(); // ❌
```

### Documentation

Add doc comments to public items:

```rust
/// Validates email format according to RFC 5322
/// 
/// # Arguments
/// * `email` - The email string to validate
///
/// # Returns
/// `true` if email format is valid, `false` otherwise
///
/// # Example
/// ```
/// assert!(validate_email("user@example.com"));
/// assert!(!validate_email("invalid-email"));
/// ```
pub fn validate_email(email: &str) -> bool {
    // implementation
}
```

## Architecture Patterns

### Service Layer (Business Logic)

Services contain business logic and are tested independently:

```rust
// ✅ Good: Business logic in service
impl AuthService {
    pub async fn register(pool: &PgPool, email: &str, password: &str) -> AppResult<User> {
        // Validate inputs
        validate_email(email)?;
        validate_password(password)?;

        // Check if user exists
        let existing = User::find_by_email(pool, email).await.ok();
        if existing.is_some() {
            return Err(AppError::UserAlreadyExists);
        }

        // Create user
        let user = User::create(pool, email, password).await?;
        Ok(user)
    }
}
```

### Handler Layer (Thin Orchestration)

Handlers delegate to services and handle HTTP concerns:

```rust
// ✅ Good: Thin handler delegating to service
pub async fn register(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<(StatusCode, Json<UserResponse>)> {
    let user = AuthService::register(&state.pool, &req.email, &req.password).await?;
    Ok((StatusCode::CREATED, Json(UserResponse::from(user))))
}

// ❌ Avoid: Business logic in handler
pub async fn register(State(state): State<Arc<AuthHandler>>, Json(req): Json<RegisterRequest>) -> AppResult<Json<UserResponse>> {
    // Don't do validation, database queries, etc. here
    let existing = sqlx::query("SELECT * FROM users WHERE email = ?").fetch_optional(&pool).await?;
    // ... more business logic
}
```

### Database Queries

Always use parameterized queries with SQLx:

```rust
// ✅ Good: Parameterized query
sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1 AND status = $2")
    .bind(email)
    .bind(status)
    .fetch_one(&pool)
    .await?

// ❌ Avoid: String formatting (SQL injection risk)
let query = format!("SELECT * FROM users WHERE email = '{}'", email);
sqlx::query_as(query).fetch_one(&pool).await?
```

### Async Operations

Use transactions for multi-step operations:

```rust
// ✅ Good: Atomic operation with transaction
pub async fn activate_user(pool: &PgPool, token: &str) -> AppResult<User> {
    let mut tx = pool.begin().await?;
    
    // Verify token
    let email_token = sqlx::query_as::<_, EmailToken>(
        "SELECT * FROM email_tokens WHERE token = $1"
    ).bind(token).fetch_one(&mut *tx).await?;
    
    // Update user status
    let user = sqlx::query_as::<_, User>(
        "UPDATE users SET status = 'active' WHERE id = $1 RETURNING *"
    ).bind(email_token.user_id).fetch_one(&mut *tx).await?;
    
    // Mark token as used
    sqlx::query("UPDATE email_tokens SET used_at = NOW() WHERE id = $1")
        .bind(email_token.id)
        .execute(&mut *tx).await?;
    
    tx.commit().await?;
    Ok(user)
}
```

## Testing Guidelines

### Unit Tests

Test business logic in isolation:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_logic() {
        // Test validation without async/database
        assert!(validate_email_format("user@example.com"));
        assert!(!validate_email_format("invalid"));
    }
}
```

### Integration Tests

Test complete flows with database:

```rust
#[tokio::test]
async fn test_user_registration_flow() {
    // Setup
    let pool = create_test_db().await;
    
    // Register
    let user = AuthService::register(&pool, "test@example.com", "SecurePass123").await.unwrap();
    
    // Verify
    assert_eq!(user.status, "inactive");
    assert!(user.id > 0);
}
```

### Test Coverage

New features must include tests with these coverage areas:
- ✅ Happy path (normal operation)
- ✅ Error cases (invalid input, missing data)
- ✅ Edge cases (empty strings, boundary values)
- ✅ Validation logic

Run tests with:
```bash
# All tests
cargo test

# Specific module
cargo test auth_service_tests

# With output
cargo test -- --nocapture --test-threads=1
```

## Common Issues & Solutions

### Build Failures

```bash
# Clear build cache if stuck
cargo clean
cargo build

# Update dependencies
cargo update
```

### Database Issues

```bash
# Reset database
sqlx database drop -y
sqlx database create
sqlx migrate run

# Check migrations
sqlx migrate list
```

### Test Failures

```bash
# Run single test with output
cargo test test_name -- --nocapture --test-threads=1

# Run with backtrace
RUST_BACKTRACE=1 cargo test
```

### Linker Errors on Windows

```bash
# Clean rebuild
cargo clean
cargo build
```

## Pull Request Process

1. **Ensure tests pass**: `cargo test`
2. **Format code**: `cargo fmt`
3. **Run linter**: `cargo clippy`
4. **Write clear commit messages**
5. **Create PR with description**
6. **Respond to code review feedback**
7. **Merge after approval**

### PR Checklist

- [ ] Tests added/updated for new functionality
- [ ] All tests passing (`cargo test`)
- [ ] Code formatted (`cargo fmt`)
- [ ] No lint warnings (`cargo clippy`)
- [ ] Documentation updated (if applicable)
- [ ] Commit messages are clear and descriptive
- [ ] Related issues are referenced

## Documentation Updates

### README Changes

Update `README.md` if you're adding:
- New endpoints
- New environment variables
- Major feature changes
- Architecture decisions

### Code Comments

Add comments for:
- Complex business logic
- Non-obvious performance optimizations
- Important security considerations
- TODO items with context

## Performance Considerations

When implementing features, consider:

- **Database queries**: Use indexes, limit result sets, use parameterized queries
- **JWT verification**: Avoid unnecessary database lookups
- **Async operations**: Use proper async/await patterns
- **Error handling**: Minimize allocations in error paths
- **Caching**: Consider appropriate caching strategies

## Security Practices

### Required for All Contributions

- ✅ Use parameterized SQL queries
- ✅ Validate all inputs
- ✅ Hash passwords with Argon2
- ✅ Set appropriate token expiration times
- ✅ Use HTTPS in production
- ✅ Add security-related tests

### Never

- ❌ Store passwords in plain text
- ❌ Use string formatting for SQL queries
- ❌ Expose sensitive information in logs
- ❌ Trust client-side validation alone
- ❌ Hardcode secrets in code

## Getting Help

### Resources

- **Documentation**: See `README.md` and code doc comments
- **API Docs**: Available at `/swagger-ui/` when running locally
- **Issues**: Check GitHub issues for common problems
- **Discussions**: Start a GitHub discussion for questions

### Asking Questions

When asking for help:
1. Check existing documentation and issues first
2. Provide context (what you're trying to do)
3. Include error messages or stacktraces
4. Share minimal reproduction steps

## Recognition

Contributors will be recognized in:
- Project README
- GitHub contributors page
- Release notes (for major contributions)

## License

By contributing to this project, you agree that your contributions will be licensed under the same MIT License as the project.

---

Thank you for contributing to Allowance! Your efforts help make this project better for everyone.
