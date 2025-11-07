mod config;
mod models;
mod services;
mod handlers;
mod middleware;
mod utils;
mod db;

use axum::{
    extract::DefaultBodyLimit,
    http::{header, Method},
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tracing_subscriber;

use config::Config;
use handlers::auth::AuthHandler;
use utils::JwtManager;

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
    tracing::info!("Starting Allowance Server on {}:{}", config.server_host, config.server_port);

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

    // Initialize auth handler
    let auth_handler = Arc::new(AuthHandler {
        pool: Arc::new(pool),
        jwt,
    });

    // Setup routes
    let cors = CorsLayer::permissive()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let app = Router::new()
        .route("/auth/register", post(handlers::auth::register))
        .route("/auth/login", post(handlers::auth::login))
        .route("/auth/activate", post(handlers::auth::activate))
        .route("/auth/request-password-reset", post(handlers::auth::request_password_reset))
        .route("/auth/reset-password", post(handlers::auth::reset_password))
        .route("/product/list", get(handlers::product::list_products))
        .route("/product/:product_id", get(handlers::product::get_product))
        .route("/product/license/generate", post(handlers::product::generate_license))
        .route("/user/profile", get(handlers::user::get_profile).put(handlers::user::update_profile))
        .route("/user/licenses", get(handlers::user::get_licenses))
        .route("/health", get(health_check))
        .layer(DefaultBodyLimit::max(5_242_880)) // 5MB
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(auth_handler.clone());

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

async fn health_check() -> &'static str {
    "OK"
}
