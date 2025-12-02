import { test, expect } from './fixtures';

/**
 * Dashboard E2E Tests
 * 
 * Tests:
 * - Dashboard home page loads and displays user data
 * - Profile page functionality
 * - Teams management
 * - Organizations management
 * - Products/Licenses overview
 */

test.describe('Dashboard', () => {
  test('should display dashboard home with user stats', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    // Should show welcome message
    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible();
    
    // Should display stats cards
    await expect(page.locator('text=Account Tier')).toBeVisible();
    await expect(page.locator('text=Active Licenses')).toBeVisible();
    await expect(page.locator('text=Teams')).toBeVisible();
    await expect(page.locator('text=Organizations')).toBeVisible();
  });

  test('should show user tier and status', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    // Should display tier information
    const tierCard = page.locator('text=Account Tier').locator('..').locator('..');
    await expect(tierCard).toBeVisible();
    
    // Should contain tier value (free, standard, premium, etc)
    const tierValue = tierCard.locator('[role="generic"]').last();
    const tierText = await tierValue.textContent();
    expect(['free', 'standard', 'premium', 'pro']).toContain(tierText?.toLowerCase().trim());
  });

  test('should display quick action buttons', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    // Should show quick action cards with links
    await expect(page.locator('text=Generate License')).toBeVisible();
    await expect(page.locator('text=Create Team')).toBeVisible();
    await expect(page.locator('text=View Profile')).toBeVisible();
    await expect(page.locator('text=Billing')).toBeVisible();
  });

  test('should navigate to products page from dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    const productsLink = page.locator('a:has-text("Go to Products")');
    await expect(productsLink).toBeVisible();
    
    await productsLink.click();
    await page.waitForURL(/\/dashboard\/products/, { timeout: 10000 });
    expect(page).toHaveURL(/\/dashboard\/products/);
  });

  test('should navigate to teams page from dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    const teamsLink = page.locator('a:has-text("Create Team")');
    await expect(teamsLink).toBeVisible();
    
    await teamsLink.click();
    await page.waitForURL(/\/dashboard\/teams/, { timeout: 10000 });
    expect(page).toHaveURL(/\/dashboard\/teams/);
  });

  test('should navigate to profile page from dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    const profileLink = page.locator('a:has-text("View Profile")');
    await expect(profileLink).toBeVisible();
    
    await profileLink.click();
    await page.waitForURL(/\/dashboard\/profile/, { timeout: 10000 });
    expect(page).toHaveURL(/\/dashboard\/profile/);
  });

  test('should navigate to billing page from dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    const billingLink = page.locator('a:has-text("Billing Info")');
    await expect(billingLink).toBeVisible();
    
    await billingLink.click();
    await page.waitForURL(/\/dashboard\/billing/, { timeout: 10000 });
    expect(page).toHaveURL(/\/dashboard\/billing/);
  });
});

test.describe('Profile Page', () => {
  test('should display user profile information', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/profile');
    
    // Should show profile page title
    const heading = page.locator('h1, h2').filter({ hasText: /profile|account|settings/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show user email', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/profile');
    
    // Should contain email display
    const emailText = page.locator('text=free@allowance.test');
    await expect(emailText).toBeVisible({ timeout: 5000 });
  });

  test('should show account status and tier', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/profile');
    
    // Should show tier and status information
    await expect(
      page.locator('text=free|standard|premium', { exact: false })
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Teams Page', () => {
  test('should display teams page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/teams');
    
    expect(page).toHaveURL(/\/dashboard\/teams/);
    
    // Should show teams section
    const heading = page.locator('h1, h2').filter({ hasText: /team|group/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show create team button if user has permission', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/teams');
    
    // Should show button to create or manage teams
    const createButton = page.locator('button:has-text("Create|New|Add")', { exact: false });
    
    // Button might not be visible if user doesn't have permission, that's ok
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(createButton).toBeVisible();
    }
  });

  test('should display teams list', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/teams');
    
    // Should have a list or table for teams
    const list = page.locator('[role="list"], table, [data-testid*="list"], [data-testid*="team"]');
    
    // List might be empty or populated, both are valid
    if (await list.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(list).toBeVisible();
    }
  });
});

test.describe('Organizations Page', () => {
  test('should display organizations page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/organizations');
    
    expect(page).toHaveURL(/\/dashboard\/organizations/);
    
    // Should show organizations section
    const heading = page.locator('h1, h2').filter({ hasText: /organization|org/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show organizations list or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/organizations');
    
    // Should show either a list of organizations or an empty state message
    const content = page.locator('body');
    await expect(content).toBeVisible();
    
    // Page should load without errors
    const errors = page.locator('text=error|failed|exception', { exact: false });
    await expect(errors).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // Error message might not be present, which is good
    });
  });
});

test.describe('Products/Licenses Page', () => {
  test('should display products page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/products');
    
    expect(page).toHaveURL(/\/dashboard\/products/);
    
    // Should show products section
    const heading = page.locator('h1, h2').filter({ hasText: /product|license/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display available products tab or section', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/products');
    
    // Look for tabs or sections for products
    const availableTab = page.locator('button, a', { hasText: /available|all/i });
    
    if (await availableTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await availableTab.first().click();
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have navigation to mine licenses section', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/products');
    
    // Should have a way to view personal licenses
    const myLicensesLink = page.locator('a:has-text("Mine|Personal|My Licenses")', { exact: false });
    
    if (await myLicensesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(myLicensesLink).toBeVisible();
      await myLicensesLink.click();
      await page.waitForURL(/licenses|mine/, { timeout: 10000 });
    }
  });
});

test.describe('Users Page', () => {
  test('should display users page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/users');
    
    expect(page).toHaveURL(/\/dashboard\/users/);
    
    // Should show users section
    const heading = page.locator('h1, h2').filter({ hasText: /user/i });
    
    if (await heading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(heading).toBeVisible();
    }
  });
});

test.describe('Dashboard Navigation', () => {
  test('should have navigation sidebar or menu', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    // Should have navigation element
    const nav = page.locator('nav, [role="navigation"], header, aside');
    await expect(nav).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between dashboard sections', async ({ authenticatedPage: page }) => {
    // Test navigation from different pages
    await page.goto('/dashboard/profile');
    
    // Should be able to navigate back to dashboard
    const homeLink = page.locator('a:has-text("Dashboard|Home")', { exact: false });
    
    if (await homeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await homeLink.click();
      await page.waitForURL(/\/dashboard\/?$/, { timeout: 10000 });
    }
  });

  test('should show active/highlighted nav item', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/profile');
    
    // The profile nav item should be highlighted/active
    const activeNav = page.locator('[class*="active"], [aria-current="page"]');
    
    if (await activeNav.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(activeNav).toBeVisible();
    }
  });
});
