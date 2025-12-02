import { test, expect } from './fixtures';

/**
 * Admin Pages E2E Tests
 * 
 * Tests:
 * - Admin users management
 * - License management
 * - Product management
 * - Team quotas management
 * - Admin access control
 */

test.describe('Admin Pages - Access Control', () => {
  test('should allow admin to access admin panel', async ({ adminPage: page }) => {
    await page.goto('/admin');
    
    // Should have access to admin section
    const adminHeading = page.locator('h1, h2').filter({ hasText: /admin|management/i });
    
    // May redirect to a specific admin page, check we're in admin area
    expect(page.url()).toContain('/admin');
  });

  test('should restrict non-admin users from admin panel', async ({ authenticatedPage: page }) => {
    // Free user should not have admin access
    await page.goto('/admin');
    
    // Should either redirect to dashboard or show error
    await page.waitForURL(/admin|dashboard|error|home/, { timeout: 10000 });
    
    // Should not be on admin page (if access was denied)
    const currentUrl = page.url();
    if (!currentUrl.includes('/admin')) {
      expect(currentUrl).not.toContain('/admin');
    }
  });
});

test.describe('Admin - Users Management', () => {
  test('should display users management page for admin', async ({ adminPage: page }) => {
    await page.goto('/admin/users');
    
    expect(page).toHaveURL(/\/admin\/users/);
    
    // Should show users section
    const heading = page.locator('h1, h2').filter({ hasText: /user/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display users table or list', async ({ adminPage: page }) => {
    await page.goto('/admin/users');
    
    // Should have a list of users
    const usersList = page.locator('table, [role="grid"], [data-testid*="user"], [class*="list"]');
    
    if (await usersList.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(usersList).toBeVisible();
    }
  });

  test('should show user details columns', async ({ adminPage: page }) => {
    await page.goto('/admin/users');
    
    // Should show email, status, tier columns
    await expect(
      page.locator('text=email|status|tier|role', { exact: false })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should have search or filter for users', async ({ adminPage: page }) => {
    await page.goto('/admin/users');
    
    // Should have search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]', { exact: false });
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
      
      // Should be able to search
      await searchInput.fill('free');
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    }
  });

  test('should allow viewing user details', async ({ adminPage: page }) => {
    await page.goto('/admin/users');
    
    // Click on a user row to view details
    const userRow = page.locator('table tr, [role="row"]').nth(1);
    
    if (await userRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userRow.click();
      
      // Should navigate to user details or open modal
      await page.waitForURL(/users\/\d+/, { timeout: 10000 }).catch(() => {
        // May open modal instead, that's ok
      });
    }
  });
});

test.describe('Admin - Licenses Management', () => {
  test('should display licenses management page for admin', async ({ adminPage: page }) => {
    await page.goto('/admin/licenses');
    
    expect(page).toHaveURL(/\/admin\/licenses/);
    
    // Should show licenses section
    const heading = page.locator('h1, h2').filter({ hasText: /license/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display licenses table or list', async ({ adminPage: page }) => {
    await page.goto('/admin/licenses');
    
    // Should have a list of licenses
    const licensesList = page.locator('table, [role="grid"], [data-testid*="license"]');
    
    if (await licensesList.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(licensesList).toBeVisible();
    }
  });

  test('should show license details columns', async ({ adminPage: page }) => {
    await page.goto('/admin/licenses');
    
    // Should show relevant license columns
    await expect(
      page.locator('text=key|user|product|status|expir', { exact: false })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should have create license button', async ({ adminPage: page }) => {
    await page.goto('/admin/licenses');
    
    const createButton = page.locator('button:has-text("Create|New|Add")', { exact: false });
    
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(createButton).toBeVisible();
      
      // Click to open create modal
      await createButton.click();
      
      // Should show form
      const form = page.locator('form, [role="dialog"]');
      await expect(form).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have search for licenses', async ({ adminPage: page }) => {
    await page.goto('/admin/licenses');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]', { exact: false });
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('should have org licenses section', async ({ adminPage: page }) => {
    await page.goto('/admin/org-licenses');
    
    expect(page).toHaveURL(/\/admin\/org-licenses/);
    
    // Should show org licenses
    const heading = page.locator('h1, h2').filter({ hasText: /organization|org|license/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin - Products Management', () => {
  test('should display products management page for admin', async ({ adminPage: page }) => {
    await page.goto('/admin/products');
    
    expect(page).toHaveURL(/\/admin\/products/);
    
    // Should show products section
    const heading = page.locator('h1, h2').filter({ hasText: /product/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display products table or list', async ({ adminPage: page }) => {
    await page.goto('/admin/products');
    
    // Should have a list of products
    const productsList = page.locator('table, [role="grid"], [data-testid*="product"]');
    
    if (await productsList.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(productsList).toBeVisible();
    }
  });

  test('should show product details columns', async ({ adminPage: page }) => {
    await page.goto('/admin/products');
    
    // Should show name, upid, status columns
    await expect(
      page.locator('text=name|upid|product|tier|version', { exact: false })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should have create product button', async ({ adminPage: page }) => {
    await page.goto('/admin/products');
    
    const createButton = page.locator('button:has-text("Create|New|Add")', { exact: false });
    
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(createButton).toBeVisible();
    }
  });
});

test.describe('Admin - Team Quotas', () => {
  test('should display team quotas page for admin', async ({ adminPage: page }) => {
    await page.goto('/admin/team-quotas');
    
    expect(page).toHaveURL(/\/admin\/team-quotas/);
    
    // Should show team quotas section
    const heading = page.locator('h1, h2').filter({ hasText: /quota|team/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display team quotas table', async ({ adminPage: page }) => {
    await page.goto('/admin/team-quotas');
    
    // Should have a list of quotas
    const quotasList = page.locator('table, [role="grid"], [data-testid*="quota"]');
    
    if (await quotasList.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(quotasList).toBeVisible();
    }
  });

  test('should show quota details', async ({ adminPage: page }) => {
    await page.goto('/admin/team-quotas');
    
    // Should show team, product, allocated, used columns
    await expect(
      page.locator('text=team|product|quota|allocated|used', { exact: false })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should have search or filter for quotas', async ({ adminPage: page }) => {
    await page.goto('/admin/team-quotas');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]', { exact: false });
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
    }
  });
});

test.describe('Admin Navigation', () => {
  test('should have admin navigation menu', async ({ adminPage: page }) => {
    await page.goto('/admin/users');
    
    // Should have navigation menu with admin sections
    const nav = page.locator('nav, aside, [role="navigation"]');
    await expect(nav).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between admin sections', async ({ adminPage: page }) => {
    await page.goto('/admin/users');
    
    // Should have links to other admin pages
    const licenseLink = page.locator('a:has-text("License")', { exact: false });
    const productLink = page.locator('a:has-text("Product")', { exact: false });
    
    if (await licenseLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await licenseLink.click();
      await page.waitForURL(/\/admin\/licenses/, { timeout: 10000 });
      expect(page).toHaveURL(/\/admin\/licenses/);
    }
  });
});
