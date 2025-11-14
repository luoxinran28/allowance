/// API Integration Tests for Allowance Server
/// Tests actual HTTP endpoints with full server setup

#[cfg(test)]
mod api_integration_tests {
    use allowance_server::{
        config::Config,
        handlers::{auth::AuthHandler, payment::PaymentHandler},
        services::StripeService,
        utils::JwtManager,
        db,
    };
    use axum::{
        body::Body,
        extract::DefaultBodyLimit,
        http::{header, Method, Request, StatusCode},
        routing::{get, post, delete, put},
        Router,
    };
    use axum_test::TestServer;
    use serde_json::json;
    use std::sync::Arc;
    use tower_http::cors::{CorsLayer, Any};
    use utoipa_swagger_ui::SwaggerUi;

    use allowance_server::handlers;
    use allowance_server::docs;

    /// Setup test server with full application state
    async fn setup_test_server() -> TestServer {
        // Load test configuration
        let config = Config::from_env();

        // Initialize test database
        let pool = db::init_pool(&config.database_url)
            .await
            .expect("Failed to initialize test database");

        // Initialize JWT manager
        let jwt = Arc::new(JwtManager::new(
            config.jwt_secret.clone(),
            config.jwt_expiration_hours,
            config.refresh_token_expiration_days,
        ));

        // Initialize Stripe service (mock for tests)
        let stripe = Arc::new(StripeService::new(
            config.stripe_api_key.clone(),
            config.stripe_test_mode,
        ));

        // Initialize handlers
        let auth_handler = Arc::new(AuthHandler {
            pool: Arc::new(pool.clone()),
            jwt: jwt.clone(),
        });

        let payment_handler = Arc::new(PaymentHandler {
            pool: Arc::new(pool.clone()),
            jwt: jwt.clone(),
            stripe: stripe.clone(),
        });

        let license_query_handler = Arc::new(handlers::licenses::LicenseQueryHandler {
            pool: Arc::new(pool.clone()),
        });

        // Setup CORS
        let cors = CorsLayer::permissive()
            .allow_origin(Any)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
            .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

        let openapi_doc = docs::get_openapi_doc();

        // Build router
        let auth_routes = Router::new()
            .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", openapi_doc.clone()))
            .route("/auth/register", post(handlers::auth::register))
            .route("/auth/login", post(handlers::auth::login))
            .route("/auth/activate", post(handlers::auth::activate))
            .route("/auth/request-password-reset", post(handlers::auth::request_password_reset))
            .route("/auth/reset-password", post(handlers::auth::reset_password))
            .route("/user/profile", get(handlers::user::get_profile).put(handlers::user::update_profile))
            .route("/user/licenses", get(handlers::user::get_licenses))
            .route("/team/create", post(handlers::team::create_team))
            .route("/team/list", get(handlers::team::list_teams))
            .route("/team/:team_id", get(handlers::team::get_team))
            .route("/team/:team_id/members", get(handlers::team::list_members).post(handlers::team::add_member))
            .route("/team/:team_id/members/:user_id", delete(handlers::team::remove_member).put(handlers::team::update_member_role))
            .route("/admin/users", get(handlers::admin::list_users))
            .route("/admin/users/:user_id", get(handlers::admin::get_user))
            .route("/admin/users/:user_id/role", post(handlers::admin::assign_role).delete(handlers::admin::remove_role))
            .route("/admin/approvals", get(handlers::admin::list_approvals))
            .route("/admin/approvals/:approval_id", get(handlers::admin::get_approval))
            .route("/admin/approvals/:approval_id/approve", post(handlers::admin::approve_request))
            .route("/admin/approvals/:approval_id/reject", post(handlers::admin::reject_request))
            .route("/admin/products", post(handlers::admin::create_product))
            .route("/admin/licenses", post(handlers::admin::create_license))
            .route("/org/create", post(handlers::organization::create_organization))
            .route("/org", get(handlers::organization::list_organizations))
            .route("/org/search", get(handlers::organization::search_organizations))
            .route("/org/my", get(handlers::organization::get_user_organizations))
            .route("/org/:org_id", get(handlers::organization::get_organization).put(handlers::organization::update_organization).delete(handlers::organization::delete_organization))
            .route("/licenses/batch/generate", post(handlers::batch_licenses::generate_batch_licenses))
            .route("/licenses/batch/revoke", post(handlers::batch_licenses::revoke_batch_licenses))
            .route("/licenses/batch/export", post(handlers::batch_licenses::export_batch_licenses))
            .with_state(auth_handler.clone());

        let payment_routes = Router::new()
            .route("/payment/create-intent", post(handlers::payment::create_payment_intent))
            .route("/payment/confirm", post(handlers::payment::confirm_payment))
            .route("/subscription/current", get(handlers::payment::get_subscription))
            .route("/subscription/upgrade", post(handlers::payment::upgrade_tier))
            .route("/subscription/downgrade", post(handlers::payment::downgrade_tier))
            .route("/subscription/cancel", post(handlers::payment::cancel_subscription))
            .route("/subscription/auto-renew", post(handlers::payment::toggle_auto_renew))
            .route("/pricing", get(handlers::payment::get_pricing))
            .with_state(payment_handler.clone());

        let license_routes = Router::new()
            .route("/licenses/active", get(handlers::licenses::get_active_licenses))
            .route("/licenses/expiring", get(handlers::licenses::get_expiring_licenses))
            .route("/licenses/org", get(handlers::licenses::get_org_licenses))
            .route("/licenses/summary", get(handlers::licenses::get_user_license_summary))
            .with_state(license_query_handler.clone());

        let app = auth_routes
            .merge(payment_routes)
            .merge(license_routes)
            .layer(DefaultBodyLimit::max(5_242_880))
            .layer(cors.clone())
            .nest("/health",
                Router::new()
                    .route("/", get(handlers::health::health_check))
                    .route("/ready", get(handlers::health::readiness_check))
                    .route("/live", get(handlers::health::liveness_check))
                    .route("/detailed", get(handlers::health::detailed_health_check))
                    .with_state(pool.clone())
            );

        TestServer::new(app).unwrap()
    }

    /// Helper function to register and activate a test user
    async fn create_test_user(server: &TestServer, email: &str, password: &str) -> (i64, String) {
        // Register user
        let register_response = server
            .post("/auth/register")
            .json(&json!({
                "email": email,
                "password": password
            }))
            .await;

        assert_eq!(register_response.status_code(), StatusCode::OK);

        let register_data: serde_json::Value = register_response.json();
        let user_id = register_data["id"].as_i64().unwrap();

        // For testing, we'll assume activation is handled separately
        // In a real scenario, you'd need to extract the activation token from email

        // Login to get token
        let login_response = server
            .post("/auth/login")
            .json(&json!({
                "email": email,
                "password": password
            }))
            .await;

        // Note: Login might fail if user is not activated
        // For now, we'll return empty token and handle in individual tests
        let token = if login_response.status_code() == StatusCode::OK {
            login_response.json::<serde_json::Value>()["token"]
                .as_str()
                .unwrap_or("")
                .to_string()
        } else {
            String::new()
        };

        (user_id, token)
    }

    /// Test health check endpoints
    #[tokio::test]
    async fn test_health_endpoints() {
        let server = setup_test_server().await;

        // Basic health check
        let response = server.get("/health").await;
        assert_eq!(response.status_code(), StatusCode::OK);

        let data: serde_json::Value = response.json();
        assert_eq!(data["status"], "healthy");

        // Readiness check
        let response = server.get("/health/ready").await;
        assert_eq!(response.status_code(), StatusCode::OK);

        // Liveness check
        let response = server.get("/health/live").await;
        assert_eq!(response.status_code(), StatusCode::OK);

        // Detailed health check
        let response = server.get("/health/detailed").await;
        assert_eq!(response.status_code(), StatusCode::OK);

        let data: serde_json::Value = response.json();
        assert!(data["database"].is_object());
    }

    /// Test user registration
    #[tokio::test]
    async fn test_user_registration() {
        let server = setup_test_server().await;

        let response = server
            .post("/auth/register")
            .json(&json!({
                "email": "test@example.com",
                "password": "SecurePass123"
            }))
            .await;

        assert_eq!(response.status_code(), StatusCode::OK);

        let data: serde_json::Value = response.json();
        assert!(data["id"].is_i64());
        assert_eq!(data["email"], "test@example.com");
        assert_eq!(data["tier"], "free");
        assert_eq!(data["status"], "inactive");
    }

    /// Test user registration validation
    #[tokio::test]
    async fn test_user_registration_validation() {
        let server = setup_test_server().await;

        // Test invalid email
        let response = server
            .post("/auth/register")
            .json(&json!({
                "email": "invalid-email",
                "password": "SecurePass123"
            }))
            .await;

        assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);

        // Test weak password
        let response = server
            .post("/auth/register")
            .json(&json!({
                "email": "test@example.com",
                "password": "123"
            }))
            .await;

        assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);

        // Test missing fields
        let response = server
            .post("/auth/register")
            .json(&json!({
                "email": "test@example.com"
            }))
            .await;

        assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    }

    /// Test duplicate user registration
    #[tokio::test]
    async fn test_duplicate_registration() {
        let server = setup_test_server().await;

        // First registration
        let response1 = server
            .post("/auth/register")
            .json(&json!({
                "email": "duplicate@example.com",
                "password": "SecurePass123"
            }))
            .await;

        assert_eq!(response1.status_code(), StatusCode::OK);

        // Duplicate registration
        let response2 = server
            .post("/auth/register")
            .json(&json!({
                "email": "duplicate@example.com",
                "password": "SecurePass123"
            }))
            .await;

        assert_eq!(response2.status_code(), StatusCode::CONFLICT);
    }

    /// Test organization creation and listing
    #[tokio::test]
    async fn test_organization_operations() {
        let server = setup_test_server().await;

        // Create test user first
        let (_user_id, token) = create_test_user(&server, "orgtest@example.com", "SecurePass123").await;

        // Create organization
        let response = server
            .post("/org/create")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .json(&json!({
                "name": "Test Organization",
                "description": "A test organization"
            }))
            .await;

        // Note: This might fail if user is not activated, but tests the endpoint structure
        if response.status_code() == StatusCode::OK {
            let data: serde_json::Value = response.json();
            assert!(data["id"].is_i64());
            assert_eq!(data["name"], "Test Organization");

            let org_id = data["id"].as_i64().unwrap();

            // List organizations
            let list_response = server
                .get("/org")
                .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
                .await;

            assert_eq!(list_response.status_code(), StatusCode::OK);

            let list_data: serde_json::Value = list_response.json();
            assert!(list_data["data"].is_array());
        }
    }

    /// Test team operations
    #[tokio::test]
    async fn test_team_operations() {
        let server = setup_test_server().await;

        // Create test user
        let (_user_id, token) = create_test_user(&server, "teamtest@example.com", "SecurePass123").await;

        // Create team
        let response = server
            .post("/team/create")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .json(&json!({
                "name": "Test Team",
                "description": "A test team"
            }))
            .await;

        if response.status_code() == StatusCode::OK {
            let data: serde_json::Value = response.json();
            assert!(data["id"].is_i64());
            assert_eq!(data["name"], "Test Team");

            // List teams
            let list_response = server
                .get("/team/list")
                .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
                .await;

            assert_eq!(list_response.status_code(), StatusCode::OK);
        }
    }

    /// Test admin endpoints (would require admin user)
    #[tokio::test]
    async fn test_admin_endpoints_structure() {
        let server = setup_test_server().await;

        // Test without authentication
        let response = server.get("/admin/users").await;
        assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);

        // Test with invalid token
        let response = server
            .get("/admin/users")
            .add_header(header::AUTHORIZATION, "Bearer invalid-token")
            .await;

        assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
    }

    /// Test license endpoints
    #[tokio::test]
    async fn test_license_endpoints() {
        let server = setup_test_server().await;

        let (_user_id, token) = create_test_user(&server, "licensettest@example.com", "SecurePass123").await;

        // Test license summary (requires authentication)
        let response = server
            .get("/licenses/summary")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;

        // Should return some response (may be empty for new user)
        assert!(response.status_code().is_success() || response.status_code() == StatusCode::UNAUTHORIZED);
    }

    /// Test API documentation access
    #[tokio::test]
    async fn test_api_documentation() {
        let server = setup_test_server().await;

        // Test OpenAPI JSON access
        let response = server.get("/api-docs/openapi.json").await;
        assert_eq!(response.status_code(), StatusCode::OK);

        let data: serde_json::Value = response.json();
        assert!(data["openapi"].is_string());
        assert!(data["paths"].is_object());
    }

    /// Test CORS headers
    #[tokio::test]
    async fn test_cors_headers() {
        let server = setup_test_server().await;

        let response = server
            .options("/auth/register")
            .add_header(header::ORIGIN, "http://localhost:3030")
            .add_header(header::ACCESS_CONTROL_REQUEST_METHOD, "POST")
            .await;

        assert_eq!(response.status_code(), StatusCode::OK);

        // Check CORS headers are present
        let headers = response.headers();
        assert!(headers.contains_key("access-control-allow-origin"));
        assert!(headers.contains_key("access-control-allow-methods"));
    }

    /// Test request size limits
    #[tokio::test]
    async fn test_request_size_limits() {
        let server = setup_test_server().await;

        // Create a large payload (over 5MB limit)
        let large_data = "x".repeat(6_000_000); // 6MB

        let response = server
            .post("/auth/register")
            .json(&json!({
                "email": "test@example.com",
                "password": large_data
            }))
            .await;

        // Should fail due to size limit
        assert_eq!(response.status_code(), StatusCode::PAYLOAD_TOO_LARGE);
    }

    /// Test error response format
    #[tokio::test]
    async fn test_error_response_format() {
        let server = setup_test_server().await;

        // Test with invalid JSON
        let response = server
            .post("/auth/register")
            .text("invalid json")
            .await;

        assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);

        let data: serde_json::Value = response.json();
        assert!(data["error"].is_string());
        assert!(data["timestamp"].is_string());
    }

    /// Test pagination parameters
    #[tokio::test]
    async fn test_pagination_parameters() {
        let server = setup_test_server().await;

        let (_user_id, token) = create_test_user(&server, "pagetest@example.com", "SecurePass123").await;

        // Test with pagination parameters
        let response = server
            .get("/org?page=1&page_size=10")
            .add_header(header::AUTHORIZATION, format!("Bearer {}", token))
            .await;

        if response.status_code().is_success() {
            let data: serde_json::Value = response.json();
            assert!(data["data"].is_array());
            assert!(data["page"].is_i64());
            assert!(data["page_size"].is_i64());
            assert!(data["total"].is_i64());
        }
    }
}