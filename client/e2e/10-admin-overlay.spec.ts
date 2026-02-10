import { test, expect } from './fixtures';

test.describe('Admin Pages - Overlay Mode', () => {
  test.describe('User Management - Overlay', () => {
    test('should navigate to admin users page', async ({ page }) => {
      // Login manually
      await page.goto('/auth/login');
      console.log('Navigated to login page');

      await page.fill('input[type="email"]', 'admin@allowance.test');
      await page.fill('input[type="password"]', 'Pass88899');
      await page.click('button[type="submit"]');
      console.log('Submitted login form');

      // Wait for successful login - check for redirect to user/profile (new route)
      await page.waitForURL('/user/profile', { timeout: 10000 });
      console.log('Login successful, redirected to /user/profile');

      // Navigate to users page (new route)
      await page.goto('/admin/users');
      console.log('Navigated to admin users page');

      await page.waitForTimeout(2000);

      // Check if we're on the admin users page
      await expect(page).toHaveURL('/admin/users');
      console.log('Successfully navigated to admin users page');
    });

    test('should open overlay when clicking user row', async ({ page }) => {
      // Login manually
      await page.goto('/auth/login');
      await page.fill('input[type="email"]', 'admin@allowance.test');
      await page.fill('input[type="password"]', 'Pass88899');
      await page.click('button[type="submit"]');

      // Wait for successful login - check for redirect (new route)
      await page.waitForURL('/user/profile', { timeout: 10000 });

      // Navigate to users page (new route)
      await page.goto('/admin/users');
      await page.waitForTimeout(2000);

      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });

      // Click first user row
      await page.click('table tbody tr:first-child');
      
      // Wait for URL to change with selected_id parameter
      await page.waitForURL(/selected_id=\d+/, { timeout: 5000 });
      await page.waitForTimeout(500);

      // Check if overlay is visible
      const overlay = page.locator('[role="dialog"]');
      await expect(overlay).toBeVisible({ timeout: 5000 });

      // Check overlay content shows user details
      await expect(page.locator('text=User Details')).toBeVisible();
      await expect(page.locator('text=Tier')).toBeVisible();
    });

    test('should close overlay on close button click', async ({ page }) => {
      // Login manually
      await page.goto('/auth/login');
      await page.fill('input[type="email"]', 'admin@allowance.test');
      await page.fill('input[type="password"]', 'Pass88899');
      await page.click('button[type="submit"]');

      // Wait for successful login (new route)
      await page.waitForURL('/user/profile', { timeout: 10000 });

      // Navigate to users page (new route)
      await page.goto('/admin/users');
      await page.waitForTimeout(2000);

      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });

      // Open overlay by clicking first user row
      await page.click('table tbody tr:first-child');
      
      // Wait for URL to change with selected_id parameter
      await page.waitForURL(/selected_id=\d+/, { timeout: 5000 });
      await page.waitForTimeout(500);

      // Wait for overlay to be visible
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Click close button (X icon)
      await page.click('button[aria-label="Close"]');
      
      // Wait for URL to go back
      await page.waitForTimeout(500);

      // Check if overlay is closed
      const overlay = page.locator('[role="dialog"]');
      await expect(overlay).not.toBeVisible();
    });
  });
});
