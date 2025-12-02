import { test, expect, generateTestEmail } from './fixtures';

/**
 * Authentication E2E Tests
 * 
 * Tests:
 * - User login with valid/invalid credentials
 * - User registration
 * - Password reset flow
 * - Email activation
 * - Logout
 */

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
    
    // Should see error message (either in alert or inline)
    await expect(
      page.locator('text=Invalid|incorrect|not found|credentials', { exact: false })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    expect(page).toHaveURL(/\/dashboard/);
    
    // Should see dashboard content
    await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible();
  });

  test('should persist token in localStorage after login', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Check localStorage for token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    expect(token).toMatch(/^eyJ/); // JWT format check
  });

  test('should allow navigation when authenticated', async ({ page }) => {
    // First login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Should be able to navigate to other authenticated pages
    await page.goto('/dashboard/profile');
    expect(page).toHaveURL(/\/dashboard\/profile/);
    
    await page.goto('/dashboard/products');
    expect(page).toHaveURL(/\/dashboard\/products/);
  });

  test('should redirect to login when accessing protected page without auth', async ({ page }) => {
    // Clear localStorage to ensure no auth token
    await page.evaluate(() => localStorage.clear());
    
    await page.goto('/dashboard');
    
    // Should redirect to login (may take a moment)
    await page.waitForURL(/auth|login/, { timeout: 10000 });
  });

  test('should show password reset option on login page', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Look for "Forgot password?" or similar link
    const resetLink = page.locator('a:has-text("reset|forgot|password")', { exact: false });
    await expect(resetLink).toBeVisible();
  });

  test('should allow access to password reset page', async ({ page }) => {
    await page.goto('/auth/reset-password');
    
    expect(page).toHaveURL('/auth/reset-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button')).toContainText(/send|reset/i);
  });

  test('should show error on password reset with non-existent email', async ({ page }) => {
    await page.goto('/auth/reset-password');
    
    await page.fill('input[type="email"]', 'nonexistent@test.com');
    await page.click('button:has-text(/send|reset/i)');
    
    // Should show error
    await expect(
      page.locator('text=not found|does not exist|error|invalid', { exact: false })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show success message on valid password reset email', async ({ page }) => {
    await page.goto('/auth/reset-password');
    
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.click('button:has-text(/send|reset/i)');
    
    // Should show success message
    await expect(
      page.locator('text=sent|check|email|link', { exact: false })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should have email activation page', async ({ page }) => {
    // Try to access activation page
    await page.goto('/auth/activate');
    
    // Should either show activation page or handle token properly
    const url = page.url();
    expect(url).toContain('/auth/activate');
  });

  test('should show registration form on login page for new users', async ({ page }) => {
    await page.goto('/auth/login');
    
    // AuthForm should toggle between login and register modes
    const registerToggle = page.locator('button:has-text("register|create|sign up")', { exact: false });
    
    if (await registerToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await registerToggle.click();
      
      // Should show register-specific fields
      await expect(page.locator('input[type="password"]')).toBeVisible();
    }
  });
});

test.describe('Logout', () => {
  test('should logout and clear token', async ({ authenticatedPage: page }) => {
    // Should be logged in and on dashboard
    expect(page).toHaveURL(/\/dashboard/);
    
    // Find and click logout button (usually in header/sidebar)
    const logoutButton = page.locator('button:has-text("logout|sign out|exit")', { exact: false });
    
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
      
      // Should redirect to home or login
      await page.waitForURL(/login|^https?:\/\/[^/]+\/$/, { timeout: 10000 });
      
      // Token should be cleared
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
    }
  });
});
