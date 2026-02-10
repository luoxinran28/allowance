import { test, expect } from './fixtures';

test.describe('Workflows', () => {
  test('should complete auth workflow', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass88899');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/dashboard');
  });

  test('should support multiple tiers', async ({ page }) => {
    const users = [
      'free@allowance.test',
      'leader1@allowance.test',
      'admin@allowance.test',
    ];
    
    for (const email of users) {
      await page.goto('/auth/login');
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', 'Pass88899');
      await page.click('button:has-text("Sign in")');
      await page.waitForTimeout(2000);
      expect(!page.url().includes('/auth/login')).toBeTruthy();
      try {
        await page.evaluate(() => localStorage.clear());
      } catch (e) {}
    }
  });
});
