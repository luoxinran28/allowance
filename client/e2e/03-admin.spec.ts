import { test, expect } from './fixtures';

test.describe('Admin Pages', () => {
  test('should allow admin access', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(3000);
    expect(page.url().includes('/dashboard')).toBeTruthy();
  });

  test('should access admin panel', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(3000);
    
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    expect(!page.url().includes('/auth/login')).toBeTruthy();
  });
});
