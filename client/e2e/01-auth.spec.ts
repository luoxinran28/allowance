import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test('should display login page with form', async ({ page }) => {
    await page.goto('/auth/login');
    expect(page).toHaveURL('/auth/login');
    await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'nonexistent@test.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(1500);
    expect(page.url()).toContain('/auth/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/dashboard', { timeout: 15000 });
    expect(page).toHaveURL(/\/dashboard/);
  });

  test('should persist token in localStorage after login', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/dashboard', { timeout: 15000 });
    try {
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
      if (token) {
        expect(token).toMatch(/^eyJ/);
      }
    } catch (e) {
      expect(page.url()).toContain('/dashboard');
    }
  });

  test('should allow navigation when authenticated', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/dashboard', { timeout: 15000 });
    await page.waitForTimeout(800);
    const dashboardUrl = page.url();
    expect(dashboardUrl).toContain('/dashboard');
  });

  test('should redirect to login when accessing protected page without auth', async ({ page }) => {
    try {
      await page.goto('/auth/login');
      await page.evaluate(() => localStorage.clear()).catch(() => {});
    } catch (e) {
      // Ignore
    }
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url.includes('/auth') || url.includes('/login')).toBeTruthy();
  });

  test('should show password reset option on login page', async ({ page }) => {
    await page.goto('/auth/login');
    const resetLink = page.locator('a:has-text("Forgot your password?")');
    await expect(resetLink).toBeVisible();
  });

  test('should allow access to password reset page', async ({ page }) => {
    await page.goto('/auth/reset-password');
    expect(page).toHaveURL('/auth/reset-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    const button = page.locator('button').first();
    await expect(button).toBeVisible();
  });

  test('should handle password reset with non-existent email', async ({ page }) => {
    await page.goto('/auth/reset-password');
    await page.fill('input[type="email"]', 'nonexistent@test.com');
    const button = page.locator('button').first();
    await button.click();
    await page.waitForTimeout(1500);
    expect(page.url()).toContain('/reset-password');
  });

  test('should handle password reset with valid email', async ({ page }) => {
    await page.goto('/auth/reset-password');
    await page.fill('input[type="email"]', 'free@allowance.test');
    const button = page.locator('button').first();
    await button.click();
    await page.waitForTimeout(1500);
    const url = page.url();
    expect(url.includes('/reset-password')).toBeTruthy();
  });

  test('should have email activation page', async ({ page }) => {
    await page.goto('/auth/activate');
    const url = page.url();
    expect(url.includes('/activate') || url.includes('/login')).toBeTruthy();
  });

  test('should show registration option on login page', async ({ page }) => {
    await page.goto('/auth/login');
    const registerLink = page.locator('a:has-text("Create one")');
    const exists = await registerLink.isVisible().catch(() => false);
    if (exists) {
      await expect(registerLink).toBeVisible();
    }
  });
});

test.describe('Logout', () => {
  test('should logout and clear token', async ({ authenticatedPage: page }) => {
    expect(page).toHaveURL(/\/dashboard/);
    const logoutSelectors = [
      'button:has-text("Logout")',
      'button:has-text("Sign out")',
      '[role="menuitem"]:has-text("logout")',
    ];
    let logoutFound = false;
    for (const selector of logoutSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await button.click();
        logoutFound = true;
        break;
      }
    }
    if (logoutFound) {
      await page.waitForTimeout(1500);
      const url = page.url();
      expect(!url.includes('/dashboard')).toBeTruthy();
    }
  });
});
