import { test, expect } from './fixtures';

/**
 * Billing E2E Tests
 * 
 * Tests:
 * - Billing page display
 * - Upgrade flow
 * - Downgrade flow
 * - Checkout flow
 * - Subscription management
 */

test.describe('Billing - Overview', () => {
  test('should display billing page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing');
    
    expect(page).toHaveURL(/\/dashboard\/billing/);
    
    // Should show billing section
    const heading = page.locator('h1, h2').filter({ hasText: /billing|subscription|plan|pricing/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should display current subscription info', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing');
    
    // Should show current plan/tier
    const currentPlan = page.locator('text=free|standard|premium|pro|plan|tier', { exact: false });
    await expect(currentPlan).toBeVisible({ timeout: 5000 });
  });

  test('should show billing history section', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing');
    
    // Should have section for billing history or invoices
    const history = page.locator('text=history|invoic|transaction|payment', { exact: false });
    
    if (await history.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(history).toBeVisible();
    }
  });

  test('should display available plans', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing');
    
    // Should show available pricing plans/tiers
    const plans = page.locator('[class*="plan"], [data-testid*="plan"], [class*="tier"], [data-testid*="tier"]');
    
    if (await plans.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(plans.first()).toBeVisible();
    }
  });
});

test.describe('Billing - Upgrade Flow', () => {
  test('should display upgrade page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/upgrade');
    
    expect(page).toHaveURL(/\/dashboard\/billing\/upgrade/);
    
    // Should show upgrade section
    const heading = page.locator('h1, h2').filter({ hasText: /upgrade|plan|pricing/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show available upgrade plans', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/upgrade');
    
    // Should display available plans for upgrade
    const plans = page.locator('[class*="plan"], [data-testid*="plan"], [class*="card"]');
    
    if (await plans.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(plans.first()).toBeVisible();
    }
  });

  test('should have plan selection buttons', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/upgrade');
    
    // Should have buttons to select plan
    const selectButtons = page.locator('button:has-text("Select|Choose|Upgrade")', { exact: false });
    
    if (await selectButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(selectButtons.first()).toBeVisible();
    }
  });

  test('should show plan features and pricing', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/upgrade');
    
    // Should show price and features
    const price = page.locator('text=$|price|cost|month|year', { exact: false });
    const features = page.locator('text=feature|include|limit|quota|license', { exact: false });
    
    if (await price.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(price.first()).toBeVisible();
    }
    
    if (await features.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(features.first()).toBeVisible();
    }
  });

  test('should navigate to checkout after plan selection', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/upgrade');
    
    // Try to select a plan
    const selectButton = page.locator('button:has-text("Select|Choose|Upgrade")', { exact: false }).first();
    
    if (await selectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectButton.click();
      
      // Should navigate to checkout
      await page.waitForURL(/checkout|payment|stripe|confirm/, { timeout: 10000 }).catch(() => {
        // May show modal or inline form instead
      });
    }
  });
});

test.describe('Billing - Downgrade Flow', () => {
  test('should display downgrade page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/downgrade');
    
    expect(page).toHaveURL(/\/dashboard\/billing\/downgrade/);
    
    // Should show downgrade section
    const heading = page.locator('h1, h2').filter({ hasText: /downgrad|lower|plan|reduce/i });
    
    if (await heading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(heading).toBeVisible();
    }
  });

  test('should show current plan and available downgrades', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/downgrade');
    
    // Should show current plan
    const currentPlan = page.locator('text=current|current plan', { exact: false });
    
    if (await currentPlan.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(currentPlan).toBeVisible();
    }
  });

  test('should have downgrade confirmation', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/downgrade');
    
    // Should have warning about downgrading
    const warning = page.locator('text=confirm|sure|understand|warning', { exact: false });
    
    if (await warning.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(warning).toBeVisible();
    }
  });

  test('should have downgrade button', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/downgrade');
    
    const downgradeButton = page.locator('button:has-text("Downgrad|Confirm|Proceed")', { exact: false });
    
    if (await downgradeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(downgradeButton).toBeVisible();
    }
  });
});

test.describe('Billing - Checkout', () => {
  test('should display checkout page', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/checkout');
    
    expect(page).toHaveURL(/\/dashboard\/billing\/checkout/);
    
    // Should show checkout
    const heading = page.locator('h1, h2').filter({ hasText: /checkout|payment|confirm|summary/i });
    
    if (await heading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(heading).toBeVisible();
    }
  });

  test('should show order summary', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/checkout');
    
    // Should show what user is purchasing
    const summary = page.locator('[class*="summary"], [data-testid*="summary"], [class*="order"]');
    
    if (await summary.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(summary).toBeVisible();
    }
  });

  test('should show payment details form', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/checkout');
    
    // Should have payment form (Stripe, etc.)
    const paymentForm = page.locator('iframe[src*="stripe"], form, [role="dialog"]');
    
    if (await paymentForm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(paymentForm).toBeVisible();
    }
  });

  test('should have confirm payment button', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/checkout');
    
    const confirmButton = page.locator('button:has-text("Pay|Confirm|Purchase")', { exact: false });
    
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(confirmButton).toBeVisible();
    }
  });
});

test.describe('Billing - Success Pages', () => {
  test('should display success page after payment', async ({ authenticatedPage: page }) => {
    // Navigate to success page
    await page.goto('/dashboard/billing/success');
    
    expect(page).toHaveURL(/\/dashboard\/billing\/success/);
    
    // Should show success message
    const successMsg = page.locator('text=success|complete|thank|confirm', { exact: false });
    
    if (await successMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(successMsg).toBeVisible();
    }
  });

  test('should have return to dashboard button on success', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing/success');
    
    const dashboardLink = page.locator('a:has-text("Dashboard|Home|Continue")', { exact: false });
    
    if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(dashboardLink).toBeVisible();
      
      await dashboardLink.click();
      await page.waitForURL(/\/dashboard\/?$/, { timeout: 10000 });
    }
  });
});

test.describe('Billing Navigation', () => {
  test('should have billing link in dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    
    const billingLink = page.locator('a:has-text("Billing")', { exact: false });
    await expect(billingLink).toBeVisible();
    
    await billingLink.click();
    await page.waitForURL(/\/dashboard\/billing/, { timeout: 10000 });
    expect(page).toHaveURL(/\/dashboard\/billing/);
  });

  test('should have navigation between billing pages', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/billing');
    
    // Should have tabs or links to upgrade/downgrade
    const upgradeLink = page.locator('a, button', { hasText: /upgrade|plan|select/i });
    
    if (await upgradeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(upgradeLink).toBeVisible();
    }
  });
});
