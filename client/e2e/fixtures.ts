import { test as base, Page, expect } from '@playwright/test';

/**
 * Custom fixtures for authenticated tests
 */

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login before running test
    await page.goto('/auth/login');
    
    // Fill and submit login form
    await page.fill('input[type="email"]', 'free@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    // Login as admin
    await page.goto('/auth/login');
    
    await page.fill('input[type="email"]', 'admin@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    await use(page);
  },

  leaderPage: async ({ page }, use) => {
    // Login as team leader
    await page.goto('/auth/login');
    
    await page.fill('input[type="email"]', 'leader1@allowance.test');
    await page.fill('input[type="password"]', 'Pass888999');
    await page.click('button:has-text("Sign in")');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    await use(page);
  },
});

export { expect };

/**
 * Helper: Generate unique email for testing
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.local`;
}

/**
 * Helper: Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  pattern: string | RegExp,
  timeout: number = 5000
) {
  return page.waitForResponse(
    response => {
      const url = response.url();
      return typeof pattern === 'string' 
        ? url.includes(pattern)
        : pattern.test(url);
    },
    { timeout }
  );
}

/**
 * Helper: Click and wait for navigation
 */
export async function clickAndWaitForNavigation(
  page: Page,
  selector: string,
  timeout: number = 10000
) {
  await Promise.all([
    page.waitForNavigation({ timeout }),
    page.click(selector),
  ]);
}
