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
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing_subscriber::filter::LevelFilter::INFO.into()),
        )
        .init();

    // Load configuration
    let config = Config::from_env();
    tracing::info!("Starting Allowance Server on {}:{}", config.server_host, config.server_port);

    // Initialize database
    let pool = db::init_pool(&config.database_url)
        .await
        .expect("Failed to initialize database");
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
        .route("/health", get(health_check))
        .layer(DefaultBodyLimit::max(5_242_880)) // 5MB
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(auth_handler);

    // Start server
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", config.server_host, config.server_port))
        .await?;
    
    tracing::info!("Server listening at {}:{}", config.server_host, config.server_port);
    
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> &'static str {
    "OK"
}
