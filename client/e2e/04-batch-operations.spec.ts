import { test, expect } from './fixtures';

test.describe('Batch Operations', () => {
  test('should complete auth and stay authenticated', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/dashboard');
  });
});
