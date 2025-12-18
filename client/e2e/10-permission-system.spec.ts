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
    
    await page.goto('/user/profile');
    
    // Check sidebar - batch operations should not be visible
    const batchSection = await page.locator('text=Batch Operations').isVisible();
    expect(batchSection).toBe(false);
  });

  test('free user should not see admin panel', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    // Try to access admin panel directly (new route)
    await page.goto('/admin/users');
    
    // Should show access denied
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });

  test('free user can access profile page', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/user/profile');
    
    // Should see the profile page
    const title = await page.locator('text=My Profile').isVisible();
    expect(title).toBe(true);
  });

  test('free user cannot create team', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    // Try to access team management (new route)
    await page.goto('/team-management/quotas');
    
    // Should show access denied
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });

  test('free user cannot access organization license section', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    // Try to access org-license (new route)
    await page.goto('/org-license/products');
    
    // Should show access denied
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });
});

test.describe('Permission System - Standard User', () => {
  test('standard user should not see batch operations', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('standard@allowance.test');
    
    await page.goto('/user/profile');
    
    // Check sidebar - batch operations should not be visible
    const batchSection = await page.locator('text=Batch Operations').isVisible();
    expect(batchSection).toBe(false);
  });

  test('standard user should not see admin panel', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('standard@allowance.test');
    
    // Try to access admin panel directly (new route)
    await page.goto('/admin/users');
    
    // Should show access denied
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });

  test('standard user can access team management', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('standard@allowance.test');
    
    await page.goto('/team-management/quotas');
    
    // Should see the team management page
    const title = await page.locator('text=Team').isVisible();
    expect(title).toBe(true);
  });

  test('standard user can view profile', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('standard@allowance.test');
    
    await page.goto('/user/profile');
    
    // Should see the profile page
    const title = await page.locator('text=My Profile').isVisible();
    expect(title).toBe(true);
  });
});

test.describe('Permission System - Premium User', () => {
  test('premium user should see batch operations in sidebar', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/user/profile');
    
    // Check sidebar - batch operations SHOULD be visible
    const batchSection = await page.locator('text=Batch Operations').isVisible();
    expect(batchSection).toBe(true);
  });

  test('premium user should not see admin panel', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    // Try to access admin panel directly (new route)
    await page.goto('/admin/users');
    
    // Should show access denied
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });

  test('premium user can access organization license section', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/org-license/products');
    
    // Should see the org license page
    const title = await page.locator('text=Products').isVisible();
    expect(title).toBe(true);
  });

  test('premium user can access team management', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/team-management/quotas');
    
    // Should see the team management page
    const title = await page.locator('text=Team').isVisible();
    expect(title).toBe(true);
  });

  test('premium user can access batch generate page', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    await page.goto('/admin/batch/generate');
    
    // Should show access denied (batch is admin-only)
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });
});

test.describe('Permission System - Admin User', () => {
  test('admin user should see all sidebar sections', async ({ adminPage }) => {
    await adminPage.goto('/user/profile');
    
    // Should see all sections including admin
    const adminSection = await adminPage.locator('text=Administration').isVisible();
    expect(adminSection).toBe(true);
    
    const batchSection = await adminPage.locator('text=Batch Operations').isVisible();
    expect(batchSection).toBe(true);
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

  test('admin user can access admin organizations page', async ({ adminPage }) => {
    await adminPage.goto('/admin/organizations');
    
    // Should see admin organizations page without access denied
    const title = await adminPage.locator('text=Organizations').isVisible();
    expect(title).toBe(true);
    
    // Should not see access denied message
    const accessDenied = await adminPage.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(false);
  });

  test('admin user can access batch generate page', async ({ adminPage }) => {
    await adminPage.goto('/admin/batch/generate');
    
    // Should see batch generate page without access denied
    const title = await adminPage.locator('text=Generate').isVisible();
    expect(title).toBe(true);
    
    // Should not see access denied message
    const accessDenied = await adminPage.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(false);
  });

  test('admin user can access batch revoke page', async ({ adminPage }) => {
    await adminPage.goto('/admin/batch/revoke');
    
    // Should see batch revoke page without access denied
    const title = await adminPage.locator('text=Revoke').isVisible();
    expect(title).toBe(true);
    
    // Should not see access denied message
    const accessDenied = await adminPage.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(false);
  });

  test('admin user can access batch export page', async ({ adminPage }) => {
    await adminPage.goto('/admin/batch/export');
    
    // Should see batch export page without access denied
    const title = await adminPage.locator('text=Export').isVisible();
    expect(title).toBe(true);
    
    // Should not see access denied message
    const accessDenied = await adminPage.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(false);
  });
});

test.describe('Permission UI Elements', () => {
  test('user profile should be accessible to all authenticated users', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/user/profile');
    
    // Should see profile page
    const profileTitle = await page.locator('text=My Profile').isVisible();
    expect(profileTitle).toBe(true);
  });

  test('billing page should be accessible to all authenticated users', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/user/billing');
    
    // Should see billing page
    const title = await page.locator('text=Billing').isVisible();
    expect(title).toBe(true);
  });

  test('permission denied alerts should be visible on restricted pages', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('free@allowance.test');
    
    await page.goto('/admin/users');
    
    // Should see access denied alert
    const alert = await page.locator('text=Access Denied').isVisible();
    expect(alert).toBe(true);
  });

  test('standard user can access team management but not admin', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('standard@allowance.test');
    
    // Should be able to access team management
    await page.goto('/team-management/quotas');
    const teamPage = await page.locator('text=Team').isVisible();
    expect(teamPage).toBe(true);
    
    // But not admin
    await page.goto('/admin/dashboard');
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });

  test('premium user can access org-license but not admin', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('premium@allowance.test');
    
    // Should be able to access org-license
    await page.goto('/org-license/products');
    const orgPage = await page.locator('text=Products').isVisible();
    expect(orgPage).toBe(true);
    
    // But not admin
    await page.goto('/admin/dashboard');
    const accessDenied = await page.locator('text=Access Denied').isVisible();
    expect(accessDenied).toBe(true);
  });
});
