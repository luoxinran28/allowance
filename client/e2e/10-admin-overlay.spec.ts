import { test, expect } from './fixtures';

test.describe('Admin Pages - Overlay Mode', () => {
  test.describe('User Management - Overlay', () => {
    test('should navigate to admin users page', async ({ page }) => {
      // Login manually
      await page.goto('/auth/login');
      console.log('Navigated to login page');

      await page.fill('input[type="email"]', 'admin@allowance.test');
      await page.fill('input[type="password"]', 'Pass888999');
      await page.click('button[type="submit"]');
      console.log('Submitted login form');

      // Wait for successful login - check for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 });
      console.log('Login successful, redirected to dashboard');

      // Navigate to users page
      await page.goto('/admin/users');
      console.log('Navigated to admin users page');

      await page.waitForTimeout(2000);

      // Check if we're on the admin users page
      await expect(page).toHaveURL('/admin/users');
      console.log('Successfully navigated to admin users page');
    });

    test('should open overlay when clicking user action button', async ({ page }) => {
      // Login manually
      await page.goto('/auth/login');
      await page.fill('input[type="email"]', 'admin@allowance.test');
      await page.fill('input[type="password"]', 'Pass888999');
      await page.click('button[type="submit"]');

      // Wait for successful login - check for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // Navigate to users page
      await page.goto('/admin/users');
      await page.waitForTimeout(2000);

      // Wait for table and buttons to load
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForSelector('button[title="Assign role"]', { timeout: 10000 });

      // Click first role assignment button
      await page.click('button[title="Assign role"]');
      await page.waitForTimeout(1000);

      // Check if overlay is visible
      const overlay = page.locator('[role="dialog"]');
      await expect(overlay).toBeVisible({ timeout: 5000 });

      // Check overlay content
      await expect(page.locator('text=User Details')).toBeVisible();
      await expect(page.locator('text=Select Role')).toBeVisible();
    });

    test('should close overlay on close button click', async ({ page }) => {
      // Login manually
      await page.goto('/auth/login');
      await page.fill('input[type="email"]', 'admin@allowance.test');
      await page.fill('input[type="password"]', 'Pass888999');
      await page.click('button[type="submit"]');

      // Wait for successful login - check for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // Navigate to users page
      await page.goto('/admin/users');
      await page.waitForTimeout(2000);

      // Wait for buttons to load
      await page.waitForSelector('button[title="Assign role"]', { timeout: 10000 });

      // Open overlay
      await page.click('button[title="Assign role"]');
      await page.waitForTimeout(1000);

      // Wait for overlay to be visible
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Click close button (X icon)
      await page.click('button[aria-label="Close"]');
      await page.waitForTimeout(500);

      // Check if overlay is closed
      const overlay = page.locator('[role="dialog"]');
      await expect(overlay).not.toBeVisible();
    });
  });
});