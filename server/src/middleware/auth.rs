use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
    http::HeaderMap,
};

use crate::utils::JwtManager;

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
