import { test, expect } from './fixtures';

/**
 * Permission-Based Access Control Tests
 * 
 * Tests the four-tier permission system:
 * - Free users: Basic read-only access
 * - Standard users: + Team member management
 * - Premium users: + Team/Organization creation and batch operations
 * - Allstar/Admin users: Full system access
 */

test.describe('Permission System - Free User', () => {
  test('free user should not see batch operations', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/dashboard');
    
    // Check sidebar - batch operations should not be visible
    const batchSection = await page.locator('text=Batch Operations').isVisible();
    expect(batchSection).toBe(false);
  });

  test('free user should not see admin panel', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    // Try to access admin panel directly
    await page.goto('/admin/users');
    
    // Should show access denied
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });

  test('free user can view their own licenses', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/dashboard/licenses/mine');
    
    // Should see the my licenses page
    const title = await page.locator('text=My Licenses').isVisible();
    expect(title).toBe(true);
  });

  test('free user cannot create team', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/dashboard/teams');
    
    // Create button should be disabled or locked
    const createButton = await page.locator('button:has-text("Create Team")');
    const isDisabled = await createButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('free user cannot create organization', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/dashboard/organizations');
    
    // Create button should be disabled or locked
    const createButton = await page.locator('button:has-text("Create Organization")');
    const isDisabled = await createButton.isDisabled();
    expect(isDisabled).toBe(true);
  });
});

test.describe('Permission System - Standard User', () => {
  test('standard user should not see batch operations', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('standard@allowance.test');
    
    await page.goto('/dashboard');
    
    // Check sidebar - batch operations should not be visible
    const batchSection = await page.locator('text=Batch Operations').isVisible();
    expect(batchSection).toBe(false);
  });

  test('standard user should not see admin panel', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('standard@allowance.test');
    
    // Try to access admin panel directly
    await page.goto('/admin/users');
    
    // Should show access denied
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });

  test('standard user cannot create team without organization', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('standard@allowance.test');
    
    await page.goto('/dashboard/teams');
    
    // Create button should be disabled
    const createButton = await page.locator('button:has-text("Create Team")');
    const isDisabled = await createButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('standard user can view license management', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('standard@allowance.test');
    
    await page.goto('/dashboard/licenses/mine');
    
    // Should see the my licenses page
    const title = await page.locator('text=My Licenses').isVisible();
    expect(title).toBe(true);
  });
});

test.describe('Permission System - Premium User', () => {
  test('premium user should see batch operations in sidebar', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/dashboard');
    
    // Check sidebar - batch operations SHOULD be visible
    const batchSection = await page.locator('text=Batch Operations').isVisible();
    expect(batchSection).toBe(true);
  });

  test('premium user should see premium features card', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/dashboard');
    
    // Should see Premium Features section
    const premiumCard = await page.locator('text=Premium Features').isVisible();
    expect(premiumCard).toBe(true);
  });

  test('premium user cannot access admin panel', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    // Try to access admin panel directly
    await page.goto('/admin/users');
    
    // Should show access denied
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });

  test('premium user can create team', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/dashboard/teams');
    
    // Create button should NOT be disabled
    const createButton = await page.locator('button:has-text("Create Team")').first();
    const isDisabled = await createButton.isDisabled();
    expect(isDisabled).toBe(false);
  });

  test('premium user can create organization', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/dashboard/organizations');
    
    // Create button should NOT be disabled
    const createButton = await page.locator('button:has-text("Create Organization")').first();
    const isDisabled = await createButton.isDisabled();
    expect(isDisabled).toBe(false);
  });

  test('premium user can access batch generate page', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/dashboard/batch/generate');
    
    // Should see the batch generate page
    const title = await page.locator('text=Generate').isVisible();
    expect(title).toBe(true);
  });

  test('premium user can access batch revoke page', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/dashboard/batch/revoke');
    
    // Should see the batch revoke page
    const title = await page.locator('text=Revoke').isVisible();
    expect(title).toBe(true);
  });

  test('premium user can access batch export page', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/dashboard/batch/export');
    
    // Should see the batch export page
    const title = await page.locator('text=Export').isVisible();
    expect(title).toBe(true);
  });
});

test.describe('Permission System - Admin User', () => {
  test('admin user should see all sidebar sections', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    
    // Should see all sections including admin
    const adminSection = await adminPage.locator('text=Administration').isVisible();
    expect(adminSection).toBe(true);
    
    const batchSection = await adminPage.locator('text=Batch Operations').isVisible();
    expect(batchSection).toBe(true);
  });

  test('admin user should see admin features card', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    
    // Should see Administrator Panel section
    const adminCard = await adminPage.locator('text=Administrator Panel').isVisible();
    expect(adminCard).toBe(true);
  });

  test('admin user can access admin users page', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    
    // Should see admin users page without access denied
    const title = await adminPage.locator('text=Users').isVisible();
    expect(title).toBe(true);
    
    // Should not see access denied message
    const accessDenied = await adminPage.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(false);
  });

  test('admin user can access admin products page', async ({ adminPage }) => {
    await adminPage.goto('/admin/products');
    
    // Should see admin products page without access denied
    const title = await adminPage.locator('text=Products').isVisible();
    expect(title).toBe(true);
    
    // Should not see access denied message
    const accessDenied = await adminPage.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(false);
  });

  test('admin user can access admin team-quotas page', async ({ adminPage }) => {
    await adminPage.goto('/admin/team-quotas');
    
    // Should see admin team quotas page without access denied
    const title = await adminPage.locator('text=Quotas').isVisible();
    expect(title).toBe(true);
    
    // Should not see access denied message
    const accessDenied = await adminPage.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(false);
  });
});

test.describe('Permission UI Elements', () => {
  test('dashboard should show tier-specific upgrade prompts', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/dashboard');
    
    // Should see upgrade prompt for free users
    const upgradePrompt = await page.locator('text=/Unlock Premium|Upgrade to Premium/').isVisible();
    expect(upgradePrompt).toBe(true);
  });

  test('locked features should show lock icon', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/dashboard/teams');
    
    // Create team button should show lock icon
    const lockIcon = await page.locator('button:has-text("Premium feature")').isVisible();
    expect(lockIcon).toBe(true);
  });

  test('sidebar should dynamically show/hide sections based on tier', async ({ authenticatedPage }) => {
    // Test with free user
    let page = await authenticatedPage('free@allowance.test');
    await page.goto('/dashboard');
    
    let batchOps = await page.locator('text=Batch Operations').isVisible();
    expect(batchOps).toBe(false);
    
    let adminSection = await page.locator('text=Administration').isVisible();
    expect(adminSection).toBe(false);
  });

  test('permission denied alerts should be visible on restricted pages', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/admin/users');
    
    // Should see access denied alert
    const alert = await page.locator('text=Access Denied').isVisible();
    expect(alert).toBe(true);
    
    const alertDescription = await page.locator('text=/don\'t have permission|requires.*tier/i').isVisible();
    expect(alertDescription).toBe(true);
  });
});
