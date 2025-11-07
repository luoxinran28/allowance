use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("User not found")]
    UserNotFound,

    #[error("User already exists")]
    UserAlreadyExists,

    #[error("Email already registered")]
    EmailAlreadyRegistered,

    #[error("Invalid token")]
    InvalidToken,

    #[error("Token expired")]
    TokenExpired,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Product not found")]
    ProductNotFound,

    #[error("License not found")]
    LicenseNotFound,

    #[error("License expired")]
    LicenseExpired,

    #[error("Daily limit exceeded")]
    DailyLimitExceeded,

    #[error("Permission denied")]
    PermissionDenied,

    #[error("Email service error: {0}")]
    EmailServiceError(String),

    #[error("Internal server error")]
    InternalServerError,
}

pub type AppResult<T> = Result<T, AppError>;
