use utoipa::{OpenApi, Modify};
use utoipa::openapi::security::{SecurityScheme, Http, HttpAuthScheme};
use serde::{Serialize, Deserialize};

/// API Documentation for Allowance Authorization Management System
#[derive(OpenApi)]
#[openapi(
    info(
        title = "Allowance Authorization API",
        version = "0.1.0",
        description = "A comprehensive authorization management system with RBAC, team management, and license verification",
        contact(
            name = "Development Team",
            url = "https://github.com/luoxinran28/allowance"
        ),
        license(
            name = "MIT",
            url = "https://github.com/luoxinran28/allowance/blob/main/LICENSE"
        ),
    ),
    servers(
        (url = "http://localhost:3000", description = "Local development server"),
        (url = "https://api.example.com", description = "Production server"),
    ),
    tags(
        (name = "authentication", description = "User authentication and account management"),
        (name = "user", description = "User profile and license management"),
        (name = "product", description = "Product and license information"),
        (name = "team", description = "Team and group management"),
        (name = "organization", description = "Organization management"),
        (name = "admin", description = "Administrative operations (admin only)"),
    ),
)]
pub struct ApiDoc;

/// JWT bearer token security scheme
pub struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = &mut openapi.components {
            components.add_security_scheme(
                "jwt",
                SecurityScheme::Http(Http::new(HttpAuthScheme::Bearer)),
            );
        }
    }
}

pub fn get_openapi_doc() -> utoipa::openapi::OpenApi {
    let mut doc = ApiDoc::openapi();
    SecurityAddon.modify(&mut doc);
    doc
}
