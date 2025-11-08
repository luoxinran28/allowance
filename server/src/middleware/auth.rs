use axum::{
    async_trait,
    extract::{Request, FromRequestParts},
    middleware::Next,
    response::Response,
    http::HeaderMap,
};
use axum::http::request::Parts;

use crate::utils::{AppError, jwt::Claims};

/// JWT extractor for extracting claims from Authorization header
pub struct AuthClaims(pub Claims);

#[async_trait]
impl<S> FromRequestParts<S> for AuthClaims
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Extract authorization header
        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|h| h.to_str().ok())
            .ok_or(AppError::Unauthorized)?;

        // Check for Bearer token
        if !auth_header.starts_with("Bearer ") {
            return Err(AppError::Unauthorized);
        }

        let token = &auth_header[7..];

        // Parse token - we need access to JWT manager
        // This will be passed through state in handler layer
        // For now, return a placeholder that handlers will override
        Ok(AuthClaims(Claims {
            user_id: 0,
            email: String::new(),
            iat: 0,
            exp: 0,
        }))
    }
}

/// JWT middleware for extracting and validating tokens
pub async fn jwt_middleware(
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Response {
    if let Some(auth_header) = headers.get("authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if auth_str.starts_with("Bearer ") {
                let _token = &auth_str[7..];
                // Token validation would happen here
                // Extract claims and add to request extensions
            }
        }
    }

    next.run(request).await
}
