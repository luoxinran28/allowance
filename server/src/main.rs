use allowance_server::*;

use axum::{
    extract::DefaultBodyLimit,
    http::{header, Method},
    routing::{get, post, delete, put},
    Router,
    Extension,
};
use std::sync::Arc;
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tracing_subscriber;
use utoipa_swagger_ui::SwaggerUi;

use config::Config;
use handlers::{auth::AuthHandler, payment::PaymentHandler};
use utils::JwtManager;
use services::StripeService;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Set panic hook to print to stderr
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("PANIC: {:?}", panic_info);
    }));

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing_subscriber::filter::LevelFilter::INFO.into()),
        )
        .with_writer(std::io::stderr)
        .init();

    // Load configuration
    let config = Config::from_env();
    eprintln!("Starting Allowance Server on {}:{}", config.server_host, config.server_port);
    eprintln!("RUST_BUILD_TIMESTAMP: 2025-11-18T04:20:00Z");  // Force rebuild
    tracing::info!("Starting Allowance Server on {}:{}", config.server_host, config.server_port);
    eprintln!("Config loaded successfully");

    // Initialize database
    eprintln!("Initializing database at: {}", &config.database_url);
    let pool = db::init_pool(&config.database_url)
        .await
        .expect("Failed to initialize database");
    eprintln!("Database initialized successfully");
    tracing::info!("Database initialized");

    // Initialize JWT manager
    let jwt = Arc::new(JwtManager::new(
        config.jwt_secret.clone(),
        config.jwt_expiration_hours,
        config.refresh_token_expiration_days,
    ));
    eprintln!("JWT manager initialized");

    // Initialize Stripe service
    let stripe = Arc::new(StripeService::new(
        config.stripe_api_key.clone(),
        config.stripe_test_mode,
    ));
    eprintln!("Stripe service initialized");

    // Initialize auth handler
    let auth_handler = Arc::new(AuthHandler {
        pool: Arc::new(pool.clone()),
        jwt: jwt.clone(),
    });

    // Initialize payment handler
    let payment_handler = Arc::new(PaymentHandler {
        pool: Arc::new(pool.clone()),
        jwt: jwt.clone(),
        stripe: stripe.clone(),
    });

    // Initialize license handler
    let license_handler = Arc::new(handlers::licenses::LicenseHandler {
        pool: Arc::new(pool.clone()),
    });

    // Initialize product handler
    let product_handler = Arc::new(handlers::product::ProductHandler {
        pool: Arc::new(pool.clone()),
    });

    // Setup routes
    let cors = CorsLayer::permissive()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            "X-Nonce".parse().unwrap(),
            "X-Timestamp".parse().unwrap(),
            "X-Sign".parse().unwrap(),
        ]);

    let openapi_doc = docs::get_openapi_doc();

    // Main router with auth handler state
    let auth_routes = Router::new()
        // API Documentation
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", openapi_doc.clone()))
        .route("/auth/register", post(handlers::auth::register))
        .route("/auth/login", post(handlers::auth::login))
        .route("/auth/activate", post(handlers::auth::activate))
        .route("/auth/request-password-reset", post(handlers::auth::request_password_reset))
        .route("/auth/reset-password", post(handlers::auth::reset_password))
        
        .route("/user/profile", get(handlers::user::get_profile).put(handlers::user::update_profile))
        .route("/user/licenses", get(handlers::user::get_licenses))
        .route("/user/associations", get(handlers::user::get_user_associations))
        .route("/team/create", post(handlers::team::create_team))
        .route("/team/list", get(handlers::team::list_teams))
        .route("/team/:team_id", get(handlers::team::get_team))
        .route("/team/:team_id/members", get(handlers::team::list_members).post(handlers::team::add_member))
        .route("/team/:team_id/members/:user_id", delete(handlers::team::remove_member).put(handlers::team::update_member_role))
        .route("/team/:team_id/members/:user_id/promote", post(handlers::team::promote_member_to_lead))
        .route("/team/:team_id/members/:user_id/demote", post(handlers::team::demote_lead_to_member))
        .route("/team/:team_id/licenses", get(handlers::team::get_team_licenses))
        .route("/team/:team_id/licenses/assign", post(handlers::team::assign_license_to_member))
        .route("/team/:team_id/licenses/:assignment_id/revoke", post(handlers::team::revoke_license_from_member))
        .route("/admin/users", get(handlers::admin::list_users))
        .route("/admin/users/:user_id", get(handlers::admin::get_user))
        .route("/admin/users/:user_id/role", post(handlers::admin::assign_role).delete(handlers::admin::remove_role))
        .route("/admin/team-quotas", get(handlers::team_quota::list_team_quotas).post(handlers::team_quota::allocate_quota))
        .route("/admin/team-quotas/:team_id/:product_upid", put(handlers::team_quota::update_quota))
        .route("/admin/team-quotas/:team_id", get(handlers::team_quota::get_team_quotas))
        .route("/admin/products", post(handlers::admin::create_product))
        .route("/admin/licenses", post(handlers::admin::create_license))
        .route("/admin/licenses/:license_id", put(handlers::admin::update_org_license))
        .route("/admin/org-licenses", get(handlers::admin::get_org_licenses))
        .route("/org/create", post(handlers::organization::create_organization))
        .route("/org", get(handlers::organization::list_organizations))
        .route("/org/search", get(handlers::organization::search_organizations))
        .route("/org/my", get(handlers::organization::get_user_organizations))
        .route("/org/:org_id", get(handlers::organization::get_organization).put(handlers::organization::update_organization).delete(handlers::organization::delete_organization))
        .route("/licenses/batch/generate", post(handlers::batch_licenses::generate_batch_licenses))
        .route("/licenses/batch/generate-org", post(handlers::batch_licenses::generate_batch_org_licenses))
        .route("/licenses/batch/revoke", post(handlers::batch_licenses::revoke_batch_licenses))
        .route("/licenses/batch/export", post(handlers::batch_licenses::export_batch_licenses))
        // .route("/webhooks/stripe", post(handlers::webhooks::handle_stripe_webhook))
        .with_state(auth_handler.clone());

    // Payment routes with payment handler state
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

    // License query routes with separate state
    let license_routes = Router::new()
        .route("/licenses/mine", get(handlers::licenses::get_user_licenses))
        .route("/licenses/summary", get(handlers::licenses::get_licenses_summary))
        .route("/licenses", get(handlers::licenses::list_licenses))
        .with_state(license_handler.clone());

    // Product routes with product handler state
    let product_routes = Router::new()
        .route("/products", get(handlers::product::list_products))
        .route("/products/:upid", get(handlers::product::get_product_by_upid))
        .with_state(product_handler.clone());

    let app = auth_routes
        .merge(payment_routes)
        .merge(license_routes)
        .merge(product_routes)
        .layer(Extension(jwt.clone()))
        .layer(DefaultBodyLimit::max(5_242_880)) // 5MB
        .layer(TraceLayer::new_for_http())
        .layer(cors.clone())
        .nest("/health", 
            Router::new()
                .route("/", get(handlers::health::health_check))
                .route("/ready", get(handlers::health::readiness_check))
                .route("/live", get(handlers::health::liveness_check))
                .route("/detailed", get(handlers::health::detailed_health_check))
                .with_state(pool.clone())
        );

    // Start server
    let bind_addr = format!("{}:{}", config.server_host, config.server_port);
    eprintln!("Binding to address: {}", &bind_addr);
    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await?;
    
    eprintln!("Server listening at {}", bind_addr);
    tracing::info!("Server listening at {}:{}", config.server_host, config.server_port);
    
    axum::serve(listener, app).await?;

    Ok(())
}
