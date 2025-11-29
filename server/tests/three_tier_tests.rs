use allowance_server::services::{
    organization_service::OrganizationService,
    product_service::ProductService,
    team_service::TeamService,
    team_quota_service::TeamQuotaService,
    user_group_service::UserGroupService,
    auth_service::AuthService,
};
use allowance_server::utils::AppResult;
use sqlx::PgPool;

async fn setup_test_db() -> PgPool {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:password@localhost:5432/allowance".to_string());
    
    PgPool::connect(&database_url).await.unwrap()
}

#[tokio::test]
async fn test_three_tier_license_allocation() -> AppResult<()> {
    let pool = setup_test_db().await;

    // 1. Create organization
    let org = OrganizationService::create_organization(
        &pool,
        1,
        "Test Organization",
        Some("Test org for three-tier test"),
    ).await?;

    // 2. Create product
    let product = ProductService::create_product_admin(
        &pool,
        "Test Product",
        "t1",
        Some("Test product"),
        1,
    ).await?;

    // 3. Allocate licenses to organization (UPSERT test)
    let org_license = ProductService::generate_org_licenses(
        &pool,
        product.id,
        org.id,
        100,
        365,
        1,
    ).await?;

    assert_eq!(org_license.total_count, 100);
    assert_eq!(org_license.available_count, 100);

    // Test UPSERT - allocate more licenses
    let org_license_updated = ProductService::generate_org_licenses(
        &pool,
        product.id,
        org.id,
        50,
        365,
        1,
    ).await?;

    assert_eq!(org_license_updated.total_count, 150);
    assert_eq!(org_license_updated.available_count, 150);

    // 4. Create team with org validation
    let team = TeamService::create_team(
        &pool,
        1,
        org.id,
        "Test Team",
        Some("Test team"),
    ).await?;

    // 5. Allocate quota to team
    let team_quota = TeamQuotaService::allocate_quota(
        &pool,
        team.id,
        product.id,
        &product.upid,
        50,
    ).await?;

    assert_eq!(team_quota.allocated_count, 50);
    assert_eq!(team_quota.used_count, 0);

    // 6. Test quota consumption with pessimistic locking
    let mut tx = pool.begin().await?;
    TeamQuotaService::consume_quota(&mut *tx, team.id, product.id).await?;
    tx.commit().await?;

    let updated_quota = sqlx::query_as::<_, (i32, i32)>(
        "SELECT allocated_count, used_count FROM team_product_quotas WHERE team_id = $1 AND product_id = $2"
    )
    .bind(team.id)
    .bind(product.id)
    .fetch_one(&pool)
    .await?;

    assert_eq!(updated_quota.0, 50); // allocated
    assert_eq!(updated_quota.1, 1);  // used

    // 7. Test quota release
    let mut tx = pool.begin().await?;
    TeamQuotaService::release_quota(&mut *tx, team.id, product.id).await?;
    tx.commit().await?;

    let released_quota = sqlx::query_as::<_, (i32, i32)>(
        "SELECT allocated_count, used_count FROM team_product_quotas WHERE team_id = $1 AND product_id = $2"
    )
    .bind(team.id)
    .bind(product.id)
    .fetch_one(&pool)
    .await?;

    assert_eq!(released_quota.0, 50);
    assert_eq!(released_quota.1, 0); // Back to 0

    // Cleanup
    sqlx::query("DELETE FROM team_product_quotas WHERE team_id = $1")
        .bind(team.id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM groups WHERE id = $1")
        .bind(team.id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM org_product_licenses WHERE organization_id = $1")
        .bind(org.id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM products WHERE id = $1")
        .bind(product.id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM organizations WHERE id = $1")
        .bind(org.id)
        .execute(&pool)
        .await?;

    Ok(())
}

#[tokio::test]
async fn test_team_creation_requires_valid_org() -> AppResult<()> {
    let pool = setup_test_db().await;

    // Try to create team with non-existent org_id
    let result = TeamService::create_team(
        &pool,
        1,
        99999,
        "Invalid Team",
        None,
    ).await;

    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("not found"));

    Ok(())
}

#[tokio::test]
async fn test_quota_constraint_validation() -> AppResult<()> {
    let pool = setup_test_db().await;

    // Create org, product, team
    let org = OrganizationService::create_organization(
        &pool,
        1,
        "Quota Test Org",
        None,
    ).await?;

    let product = ProductService::create_product_admin(
        &pool,
        "Quota Test Product",
        "qt2",
        None,
        1,
    ).await?;

    let team = TeamService::create_team(
        &pool,
        1,
        org.id,
        "Quota Test Team",
        None,
    ).await?;

    let _quota = TeamQuotaService::allocate_quota(
        &pool,
        team.id,
        product.id,
        &product.upid,
        10,
    ).await?;

    // Try to consume quota 11 times (should fail on 11th)
    for i in 0..10 {
        let mut tx = pool.begin().await?;
        let result = TeamQuotaService::consume_quota(&mut *tx, team.id, product.id).await;
        tx.commit().await?;
        assert!(result.is_ok(), "Consumption {} should succeed", i + 1);
    }

    // 11th consumption should fail
    let mut tx = pool.begin().await?;
    let result = TeamQuotaService::consume_quota(&mut *tx, team.id, product.id).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Quota exceeded"));

    // Cleanup
    sqlx::query("DELETE FROM team_product_quotas WHERE team_id = $1")
        .bind(team.id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM groups WHERE id = $1")
        .bind(team.id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM products WHERE id = $1")
        .bind(product.id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM organizations WHERE id = $1")
        .bind(org.id)
        .execute(&pool)
        .await?;

    Ok(())
}

#[tokio::test]
async fn test_org_license_upsert_idempotency() -> AppResult<()> {
    let pool = setup_test_db().await;

    let org = OrganizationService::create_organization(
        &pool,
        1,
        "UPSERT Test Org",
        None,
    ).await?;

    let product = ProductService::create_product_admin(
        &pool,
        "UPSERT Test Product",
        "u1",
        None,
        1,
    ).await?;

    // First allocation
    let license1 = ProductService::generate_org_licenses(
        &pool,
        product.id,
        org.id,
        100,
        365,
        1,
    ).await?;

    // Second allocation (UPSERT should add to existing)
    let license2 = ProductService::generate_org_licenses(
        &pool,
        product.id,
        org.id,
        50,
        365,
        1,
    ).await?;

    assert_eq!(license1.id, license2.id); // Same record
    assert_eq!(license2.total_count, 150); // 100 + 50
    assert_eq!(license2.available_count, 150);

    // Cleanup
    sqlx::query("DELETE FROM org_product_licenses WHERE id = $1")
        .bind(license1.id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM products WHERE id = $1")
        .bind(product.id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM organizations WHERE id = $1")
        .bind(org.id)
        .execute(&pool)
        .await?;

    Ok(())
}
