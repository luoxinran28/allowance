import { test as base, Page, expect } from '@playwright/test';

/**
 * Custom fixtures for authenticated tests
 */

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Return a function that can login any user
    const loginAs = async (email: string): Promise<Page> => {
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Login attempt ${attempts}/${maxAttempts} for ${email}`);
          
          await page.goto('/auth/login');
          
          // Clear any existing auth state before login
          await page.evaluate(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          });
          
          // Wait a bit to ensure localStorage is cleared
          await page.waitForTimeout(200);
          
          // Fill and submit login form
          await page.fill('input[type="email"]', email);
          await page.fill('input[type="password"]', 'Pass888999');
          await page.click('button:has-text("Sign in")');
          
          // Wait for navigation to dashboard (wait for redirect to complete)
          try {
            await page.waitForURL('**/dashboard', { timeout: 10000, waitUntil: 'load' });
          } catch (e) {
            if (attempts < maxAttempts) {
              console.log(`Dashboard navigation timeout, retrying...`);
              await page.waitForTimeout(500);
              continue; // Retry
            }
            throw new Error('Login failed: Dashboard navigation timeout');
          }
          
          // Give page time to settle and verify we're truly authenticated
          await page.waitForTimeout(1000);
          
          // Verify we're not back on login page
          const finalUrl = page.url();
          if (finalUrl.includes('/auth/login')) {
            if (attempts < maxAttempts) {
              console.log(`Still on login page after navigation, retrying...`);
              await page.waitForTimeout(500);
              continue; // Retry
            }
            throw new Error(`Login failed: Still on login page after navigation. URL: ${finalUrl}`);
          }
          
          console.log('Successfully logged in as', email, 'Final URL:', finalUrl);
          return page; // Success
        } catch (err) {
          if (attempts >= maxAttempts) {
            console.error('Fixture authentication failed after', maxAttempts, 'attempts:', err);
            throw err;
          }
        }
      }
      
      return page;
    };
    
    await use(loginAs);
  },

  adminPage: async ({ page }, use) => {
    // Login as admin
    try {
      await page.goto('/auth/login');

      await page.fill('input[type="email"]', 'admin@allowance.test');
      await page.fill('input[type="password"]', 'Pass888999');
      await page.click('button:has-text("Sign in")');

      // Wait for login to complete - check for redirect or success
      await page.waitForTimeout(3000);

      // Check if we're not on login page anymore
      const currentUrl = page.url();
      if (currentUrl.includes('/auth/login')) {
        throw new Error('Login failed - still on login page');
      }

    } catch (err) {
      console.error('Admin fixture authentication failed:', err);
      throw err;
    }

    await use(page);
  },

  leaderPage: async ({ page }, use) => {
    // Login as team leader
    try {
      await page.goto('/auth/login');
      
      await page.fill('input[type="email"]', 'leader1@allowance.test');
      await page.fill('input[type="password"]', 'Pass888999');
      await page.click('button:has-text("Sign in")');
      
      // Wait for navigation to dashboard
      try {
        await page.waitForURL('/dashboard', { timeout: 15000 });
      } catch (e) {
        console.error('Dashboard navigation timeout for leader', e);
      }
      
      await page.waitForTimeout(500);
    } catch (err) {
      console.error('Leader fixture authentication failed:', err);
    }
    
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
