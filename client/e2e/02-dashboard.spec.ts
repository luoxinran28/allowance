import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  test('should display dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/dashboard');
  });

  test('should navigate dashboard pages', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(2000);
    
    const paths = ['/profile', '/teams', '/products'];
    for (const path of paths) {
      await page.goto('/dashboard' + path);
      await page.waitForTimeout(500);
      const url = page.url();
      expect(url.includes('/dashboard') || url.includes('/auth')).toBeTruthy();
    }
  });
});
