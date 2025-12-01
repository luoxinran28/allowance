// Three-Tier Architecture Basic Tests
// Focus: Basic functionality validation only, no edge cases

use allowance_server::services::{
    organization_service::OrganizationService,
    product_service::ProductService,
    team_service::TeamService,
    team_quota_service::TeamQuotaService,
};
use allowance_server::utils::AppResult;
use sqlx::PgPool;

async fn setup_test_db() -> PgPool {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:password@localhost:5432/allowance".to_string());
    
    PgPool::connect(&database_url).await.unwrap()
}

// Helper: Create test user (needed for foreign keys)
async fn create_test_user(pool: &PgPool, unique_id: u32) -> AppResult<i64> {
    let uid = format!("U{:015X}", unique_id);
    let email = format!("test{}@example.com", unique_id);
    let result = sqlx::query!(
        "INSERT INTO users (uid, email, password_hash, tier, status) VALUES ($1, $2, $3, 'free', 'active') RETURNING id",
        uid,
        email,
        "$argon2id$v=19$m=4096,t=3,p=1$fakesalt$fakehash"
    )
    .fetch_one(pool)
    .await?;
    Ok(result.id)
}

// Helper: Create test org with unique ID
async fn create_test_org(pool: &PgPool, user_id: i64, unique_id: u32) -> AppResult<i64> {
    let org = OrganizationService::create_organization(
        pool,
        user_id,
        &format!("TestOrg{}", unique_id),
        None,
    ).await?;
    Ok(org.id)
}

// Helper: Create test product with unique ID
async fn create_test_product(pool: &PgPool, user_id: i64, unique_id: u32) -> AppResult<(i64, String)> {
    let product = ProductService::create_product_admin(
        pool,
        &format!("TestProduct{}", unique_id),
        &format!("{}", unique_id), // Short slug for UPID constraint
        None,
        user_id,
    ).await?;
    Ok((product.id, product.upid))
}

// Helper: Create test team
async fn create_test_team(pool: &PgPool, user_id: i64, org_id: i64, unique_id: u32) -> AppResult<i64> {
    let team = TeamService::create_team(
        pool,
        user_id,
        org_id,
        &format!("TestTeam{}", unique_id),
        None,
    ).await?;
    Ok(team.id)
}

/// Test 1: Basic org license allocation (UPSERT functionality)
#[tokio::test]
async fn test_org_license_allocation() -> AppResult<()> {
    let pool = setup_test_db().await;
    use rand::Rng;
    let uid = rand::thread_rng().gen_range(10000..99999);

    let user_id = create_test_user(&pool, uid).await?;
    let org_id = create_test_org(&pool, user_id, uid).await?;
    let (product_id, _upid) = create_test_product(&pool, user_id, uid).await?;

    // Initial allocation
    let license = ProductService::generate_org_licenses(&pool, product_id, org_id, 100, 365, user_id).await?;
    assert_eq!(license.total_count, 100);

    // UPSERT: Add more licenses
    let updated = ProductService::generate_org_licenses(&pool, product_id, org_id, 50, 365, user_id).await?;
    assert_eq!(updated.total_count, 150);
    assert_eq!(updated.id, license.id); // Same record

    // Cleanup
    sqlx::query("DELETE FROM org_product_licenses WHERE id = $1").bind(license.id).execute(&pool).await?;
    sqlx::query("DELETE FROM products WHERE id = $1").bind(product_id).execute(&pool).await?;
    sqlx::query("DELETE FROM organizations WHERE id = $1").bind(org_id).execute(&pool).await?;
    sqlx::query("DELETE FROM users WHERE id = $1").bind(user_id).execute(&pool).await?;

    Ok(())
}

/// Test 2: Team quota allocation
#[tokio::test]
async fn test_team_quota_allocation() -> AppResult<()> {
    let pool = setup_test_db().await;
    use rand::Rng;
    let uid = rand::thread_rng().gen_range(10000..99999);

    let user_id = create_test_user(&pool, uid).await?;
    let org_id = create_test_org(&pool, user_id, uid).await?;
    let (product_id, upid) = create_test_product(&pool, user_id, uid).await?;
    let team_id = create_test_team(&pool, user_id, org_id, uid).await?;

    // Allocate quota to team
    let quota = TeamQuotaService::allocate_quota(&pool, team_id, product_id, &upid, 10).await?;
    assert_eq!(quota.allocated_count, 10);
    assert_eq!(quota.used_count, 0);

    // Cleanup
    sqlx::query("DELETE FROM team_product_quotas WHERE id = $1").bind(quota.id).execute(&pool).await?;
    sqlx::query("DELETE FROM groups WHERE id = $1").bind(team_id).execute(&pool).await?;
    sqlx::query("DELETE FROM products WHERE id = $1").bind(product_id).execute(&pool).await?;
    sqlx::query("DELETE FROM organizations WHERE id = $1").bind(org_id).execute(&pool).await?;
    sqlx::query("DELETE FROM users WHERE id = $1").bind(user_id).execute(&pool).await?;

    Ok(())
}

/// Test 3: Quota consumption and release
#[tokio::test]
async fn test_quota_consume_release() -> AppResult<()> {
    let pool = setup_test_db().await;
    use rand::Rng;
    let uid = rand::thread_rng().gen_range(10000..99999);

    let user_id = create_test_user(&pool, uid).await?;
    let org_id = create_test_org(&pool, user_id, uid).await?;
    let (product_id, upid) = create_test_product(&pool, user_id, uid).await?;
    let team_id = create_test_team(&pool, user_id, org_id, uid).await?;

    TeamQuotaService::allocate_quota(&pool, team_id, product_id, &upid, 5).await?;

    // Consume quota
    let mut tx = pool.begin().await?;
    TeamQuotaService::consume_quota(&mut *tx, team_id, product_id).await?;
    tx.commit().await?;

    let used = sqlx::query_scalar::<_, i32>(
        "SELECT used_count FROM team_product_quotas WHERE team_id = $1 AND product_id = $2"
    )
    .bind(team_id)
    .bind(product_id)
    .fetch_one(&pool)
    .await?;
    assert_eq!(used, 1);

    // Release quota
    let mut tx = pool.begin().await?;
    TeamQuotaService::release_quota(&mut *tx, team_id, product_id).await?;
    tx.commit().await?;

    let released = sqlx::query_scalar::<_, i32>(
        "SELECT used_count FROM team_product_quotas WHERE team_id = $1 AND product_id = $2"
    )
    .bind(team_id)
    .bind(product_id)
    .fetch_one(&pool)
    .await?;
    assert_eq!(released, 0);

    // Cleanup
    sqlx::query("DELETE FROM team_product_quotas WHERE team_id = $1").bind(team_id).execute(&pool).await?;
    sqlx::query("DELETE FROM groups WHERE id = $1").bind(team_id).execute(&pool).await?;
    sqlx::query("DELETE FROM products WHERE id = $1").bind(product_id).execute(&pool).await?;
    sqlx::query("DELETE FROM organizations WHERE id = $1").bind(org_id).execute(&pool).await?;
    sqlx::query("DELETE FROM users WHERE id = $1").bind(user_id).execute(&pool).await?;

    Ok(())
}
