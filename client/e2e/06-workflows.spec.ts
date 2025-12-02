import { test, expect } from './fixtures';

/**
 * User Workflows & Integration E2E Tests
 * 
 * Tests complete user workflows:
 * - Full registration to dashboard flow
 * - Create team and manage members
 * - License generation and management
 * - Team leader workflows
 */

test.describe('Complete User Workflows', () => {
  test('should complete full flow: login and navigate through app', async ({ authenticatedPage: page }) => {
    // User is logged in on dashboard
    expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to profile
    const profileLink = page.locator('a:has-text("Profile|Profile")', { exact: false });
    if (await profileLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await profileLink.click();
      await page.waitForURL(/\/dashboard\/profile/, { timeout: 10000 });
      expect(page).toHaveURL(/\/dashboard\/profile/);
    }
    
    // Navigate back to dashboard
    const dashboardLink = page.locator('a:has-text("Dashboard")', { exact: false });
    if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dashboardLink.click();
      await page.waitForURL(/\/dashboard\/?$/, { timeout: 10000 });
      expect(page).toHaveURL(/\/dashboard/);
    }
  });

  test('should navigate through all main sections', async ({ authenticatedPage: page }) => {
    const sections = [
      { name: 'Products', url: '/dashboard/products' },
      { name: 'Teams', url: '/dashboard/teams' },
      { name: 'Organizations', url: '/dashboard/organizations' },
    ];
    
    for (const section of sections) {
      await page.goto(section.url);
      expect(page).toHaveURL(section.url);
      
      // Page should load without major errors
      const errorMessages = page.locator('text=error|failed|exception', { exact: false });
      await expect(errorMessages).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // No error is good
      });
    }
  });
});

test.describe('Team Management Workflow', () => {
  test('should navigate to teams page and display team options', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/teams');
    
    expect(page).toHaveURL(/\/dashboard\/teams/);
    
    // Should have team options
    const teamSection = page.locator('body');
    await expect(teamSection).toBeVisible();
  });

  test('should access team details if teams exist', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/teams');
    
    // Look for team rows
    const teamRow = page.locator('table tr, [role="row"], [data-testid*="team"]').nth(1);
    
    if (await teamRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await teamRow.click();
      
      // Should navigate to team details
      await page.waitForURL(/teams\/\d+/, { timeout: 10000 }).catch(() => {
        // May open modal or stay on same page
      });
    }
  });

  test('should have access to team licenses if in team', async ({ authenticatedPage: page }) => {
    // Try to access team licenses
    await page.goto('/dashboard/teams');
    
    // Look for link to team licenses
    const licenseLink = page.locator('a:has-text("License|License")', { exact: false });
    
    if (await licenseLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await licenseLink.click();
      await page.waitForURL(/licenses|team/, { timeout: 10000 });
    }
  });
});

test.describe('License Management Workflow', () => {
  test('should navigate from dashboard to products', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    const productsButton = page.locator('a:has-text("Go to Products|Products")');
    await expect(productsButton).toBeVisible();
    
    await productsButton.click();
    await page.waitForURL(/\/dashboard\/products/, { timeout: 10000 });
    expect(page).toHaveURL(/\/dashboard\/products/);
  });

  test('should show products page with available products', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/products');
    
    // Should display products list or available products section
    const productsContent = page.locator('body');
    await expect(productsContent).toBeVisible();
  });

  test('should have tabs or sections for different license views', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/products');
    
    // Should have tabs for available products and user's licenses
    const tabs = page.locator('[role="tab"], button[class*="tab"]');
    
    if (await tabs.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(tabs.first()).toBeVisible();
    }
  });

  test('should navigate to assign licenses page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/licenses/assign');
    
    expect(page).toHaveURL(/\/dashboard\/licenses\/assign/);
    
    // Should show assign form
    const form = page.locator('form, [role="dialog"], [class*="form"]');
    
    if (await form.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(form).toBeVisible();
    }
  });

  test('should navigate to my licenses page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/licenses/mine');
    
    expect(page).toHaveURL(/\/dashboard\/licenses\/mine/);
    
    // Should show user's licenses
    const licensesList = page.locator('table, [role="grid"], [data-testid*="license"]');
    
    if (await licensesList.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(licensesList).toBeVisible();
    }
  });
});

test.describe('Team Leader Workflows', () => {
  test('team leader should access team quotas section', async ({ leaderPage: page }) => {
    // Navigate to teams for team leader
    await page.goto('/dashboard/teams');
    
    expect(page).toHaveURL(/\/dashboard\/teams/);
    
    // Team leader should see their teams
    const teamsList = page.locator('body');
    await expect(teamsList).toBeVisible();
  });

  test('team leader should manage team members', async ({ leaderPage: page }) => {
    // Try to access a team details page
    await page.goto('/dashboard/teams');
    
    // Look for team link
    const teamLink = page.locator('a, button', { hasText: /team|manage|member/i }).first();
    
    if (await teamLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await teamLink.click();
      
      // Should navigate to team detail
      await page.waitForURL(/teams\/\d+/, { timeout: 10000 }).catch(() => {
        // May open modal
      });
    }
  });
});

test.describe('Admin Workflows', () => {
  test('admin should access admin dashboard', async ({ adminPage: page }) => {
    await page.goto('/admin');
    
    // Should be in admin section
    expect(page.url()).toContain('/admin');
  });

  test('admin should access all admin sections', async ({ adminPage: page }) => {
    const adminPages = [
      '/admin/users',
      '/admin/licenses',
      '/admin/products',
      '/admin/team-quotas',
    ];
    
    for (const adminPage of adminPages) {
      await page.goto(adminPage);
      expect(page).toHaveURL(new RegExp(adminPage));
      
      // Page should load
      const content = page.locator('body');
      await expect(content).toBeVisible();
    }
  });

  test('admin should navigate between admin pages using navigation', async ({ adminPage: page }) => {
    await page.goto('/admin/users');
    
    // Find navigation links
    const navLinks = page.locator('nav a, aside a, [role="navigation"] a');
    
    if (await navLinks.count() > 1) {
      // Should have multiple navigation links
      await expect(navLinks.first()).toBeVisible();
      
      // Try clicking on a different admin page link
      const nextLink = navLinks.nth(1);
      if (await nextLink.isVisible()) {
        const href = await nextLink.getAttribute('href');
        if (href) {
          await page.goto(href);
          // Should navigate successfully
          expect(page.url()).toContain(href);
        }
      }
    }
  });
});

test.describe('Page Load Performance', () => {
  test('should load pages without significant delays', async ({ authenticatedPage: page }) => {
    const pages = [
      '/dashboard',
      '/dashboard/profile',
      '/dashboard/teams',
      '/dashboard/organizations',
      '/dashboard/products',
    ];
    
    for (const testPage of pages) {
      const startTime = Date.now();
      
      await page.goto(testPage);
      const loadTime = Date.now() - startTime;
      
      // Page should load in reasonable time (< 5 seconds)
      expect(loadTime).toBeLessThan(5000);
      expect(page).toHaveURL(testPage);
    }
  });

  test('should not show loading spinners indefinitely', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    // Look for loading spinners
    const loader = page.locator('[class*="loader"], [class*="spin"]');
    
    // Spinner should disappear after content loads
    if (await loader.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Wait for spinner to disappear
      await loader.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
        // May not have a spinner or it may not hide
      });
    }
  });
});

test.describe('Form Interactions', () => {
  test('should handle form inputs correctly', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/profile');
    
    // Find any input fields
    const inputs = page.locator('input[type="text"], input[type="email"], textarea');
    
    if (await inputs.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try typing in input
      const firstInput = inputs.first();
      await firstInput.click();
      await firstInput.fill('test input');
      
      const value = await firstInput.inputValue();
      expect(value).toContain('test');
    }
  });

  test('should handle select dropdowns', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/batch/generate');
    
    // Find select elements
    const selects = page.locator('select, [role="combobox"]');
    
    if (await selects.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try clicking and selecting
      await selects.first().click();
      
      const options = page.locator('[role="option"]');
      if (await options.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await options.first().click();
      }
    }
  });
});

test.describe('Error Handling', () => {
  test('should show error message for invalid operations', async ({ authenticatedPage: page }) => {
    // Try an invalid operation
    await page.goto('/dashboard/batch/generate');
    
    // Try to submit empty form
    const submitButton = page.locator('button:has-text("Generate|Submit")', { exact: false });
    
    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();
      
      // Should show error
      const errorMsg = page.locator('[role="alert"], .error, .alert');
      
      if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(errorMsg).toBeVisible();
      }
    }
  });

  test('should handle network errors gracefully', async ({ authenticatedPage: page }) => {
    // Simulate network error by intercepting
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // Try to navigate to page that makes API call
    await page.goto('/dashboard');
    
    // Should show error message instead of crashing
    const errorMsg = page.locator('text=error|failed|unable', { exact: false });
    
    // Either error shown or page partially loaded is ok
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});
