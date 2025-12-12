import { test, expect } from './fixtures';

test.describe('Basic Admin Tests', () => {
  test('should access login page', async ({ page }) => {
    await page.goto('/auth/login');

    // Check if login form is visible
    await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should login manually', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[type="email"]', 'admin@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button[type="submit"]');

    // Wait and check if we navigated away from login
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/auth/login');
  });
});