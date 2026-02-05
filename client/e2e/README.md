# Frontend E2E Tests

This directory contains comprehensive end-to-end (E2E) tests for the Allowance frontend using Playwright.

## Overview

The test suite covers all major user workflows and pages:

- **01-auth.spec.ts** - Authentication flows (login, register, password reset, logout)
- **02-dashboard.spec.ts** - Dashboard and user pages (home, profile, teams, organizations, products)
- **03-admin.spec.ts** - Admin panel pages (users, licenses, products, team quotas)
- **04-batch-operations.spec.ts** - Batch license operations (generate, export, revoke)
- **05-billing.spec.ts** - Billing pages (subscription, upgrade, downgrade, checkout)
- **06-workflows.spec.ts** - Complete user workflows and integration tests

## Prerequisites

1. **Running Services** - Ensure both backend and frontend are running:
   ```bash
   # Backend (Rust/Axum on port 4040)
   cd server && cargo run

   # Frontend (Next.js on port 3030) - in another terminal
   cd client && npm run dev
   ```

2. **Test Data** - Seed data with test users should be loaded:
   ```bash
   bash setup_db_v3.sh
   ```

   Test credentials (all use password: `Pass888999`):
   - Admin: `admin@allowance.test`
   - Team Leader: `leader1@allowance.test`
   - Free User: `free@allowance.test`

## Installation

Playwright is already installed in `devDependencies`. To reinstall browsers:

```bash
npx playwright install
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run with UI (visual mode)
```bash
npm run test:e2e:ui
```

### Run in debug mode
```bash
npm run test:e2e:debug
```

### Run with visible browser
```bash
npm run test:e2e:headed
```

### Run tests for specific browser
```bash
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Run specific test file
```bash
npx playwright test e2e/01-auth.spec.ts
```

### Run tests matching pattern
```bash
npx playwright test -g "login"
```

## Test Structure

### Fixtures (`fixtures.ts`)

Custom Playwright fixtures for common workflows:

```typescript
// Authenticated user fixture (free user)
test('should do something', async ({ authenticatedPage: page }) => {
  // User is already logged in as free@allowance.test
  await page.goto('/dashboard');
});

// Admin fixture
test('should be admin', async ({ adminPage: page }) => {
  // User is logged in as admin@allowance.test
});

// Team leader fixture
test('should be leader', async ({ leaderPage: page }) => {
  // User is logged in as leader1@allowance.test
});
```

### Helper Functions

```typescript
// Generate unique email for testing
generateTestEmail(); // Returns: test-{timestamp}-{random}@test.local

// Wait for API response
await waitForApiResponse(page, '/api/endpoint', 5000);

// Click and wait for navigation
await clickAndWaitForNavigation(page, 'button', 10000);
```

## Test Reports

After running tests, reports are generated in:

- **HTML Report**: `playwright-report/index.html`
- **JUnit Report**: `junit-results.xml` (for CI/CD)
- **JSON Report**: `test-results.json`

View HTML report:
```bash
npx playwright show-report
```

## CI/CD Integration

The tests are configured to run in CI with:
- Retries on failure (2 retries)
- Single worker (to avoid race conditions)
- Screenshots on failure
- Video recordings on failure

GitHub Actions workflow (`.github/workflows/e2e-tests.yml`):
```yaml
- name: Run E2E tests
  run: npm run test:e2e
```

## Writing New Tests

### Basic test structure
```typescript
import { test, expect } from './fixtures';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/page');
    await expect(page.locator('text=content')).toBeVisible();
  });
});
```

### Using authenticated fixtures
```typescript
test('should work when logged in', async ({ authenticatedPage: page }) => {
  // User is already logged in
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

### Common assertions
```typescript
// URL checks
expect(page).toHaveURL('/dashboard');
expect(page).toHaveURL(/dashboard/);

// Element visibility
await expect(page.locator('text=Hello')).toBeVisible();

// Element contains text
await expect(page.locator('button')).toContainText('Click me');

// Element count
await expect(page.locator('table tr')).toHaveCount(5);

// Input value
await expect(page.locator('input')).toHaveValue('test@example.com');
```

### Waiting for conditions
```typescript
// Wait for navigation
await page.waitForURL('/dashboard', { timeout: 10000 });

// Wait for element
await page.locator('text=Loading').waitFor({ state: 'hidden' });

// Wait for API response
await page.waitForResponse(r => r.url().includes('/api/users'));

// Wait for load state
await page.waitForLoadState('networkidle');
```

### Common patterns
```typescript
// Fill and submit form
await page.fill('input[type="email"]', 'test@example.com');
await page.fill('input[type="password"]', 'password123');
await page.click('button:has-text("Login")');

// Navigate via link
await page.click('a:has-text("Dashboard")');

// Select from dropdown
await page.selectOption('select[name="product"]', 'product-1');

// Verify error message
await expect(page.locator('[role="alert"]')).toContainText('error');

// Take screenshot
await page.screenshot({ path: 'screenshot.png' });
```

## Debugging Tests

### Debug mode
```bash
npm run test:e2e:debug
```

In debug mode, use:
- Step through tests one by one
- Inspect elements with browser devtools
- Pause execution with `page.pause()`

### Show trace
```bash
npx playwright show-trace trace.zip
```

### Inspect element selectors
```typescript
// Use page.inspect() in headed mode to find selectors
await page.pause(); // Pauses and opens inspector
```

### Print debug info
```typescript
console.log(await page.locator('selector').textContent());
```

## Test Coverage

Current test suite covers:

### Authentication (13 tests)
- ✅ Login form display and validation
- ✅ Invalid credentials error
- ✅ Successful login with token persistence
- ✅ Protected page access control
- ✅ Password reset flow
- ✅ Email activation
- ✅ Logout functionality

### Dashboard (15 tests)
- ✅ Dashboard home page and stats
- ✅ Profile page
- ✅ Teams management
- ✅ Organizations management
- ✅ Products and licenses
- ✅ Navigation and routing

### Admin Panel (14 tests)
- ✅ Admin access control
- ✅ Users management (list, search, details)
- ✅ Licenses management (list, create, search)
- ✅ Products management
- ✅ Team quotas management
- ✅ Admin navigation

### Batch Operations (10 tests)
- ✅ License generation form
- ✅ License export functionality
- ✅ License revocation with confirmation
- ✅ Batch operation navigation

### Billing (10 tests)
- ✅ Billing overview page
- ✅ Upgrade flow and plan selection
- ✅ Downgrade flow with confirmation
- ✅ Checkout page
- ✅ Payment success page
- ✅ Billing navigation

### Workflows & Integration (18 tests)
- ✅ Complete user workflows
- ✅ Team management workflows
- ✅ License management workflows
- ✅ Team leader workflows
- ✅ Admin workflows
- ✅ Page load performance
- ✅ Form interactions
- ✅ Error handling

**Total: 80+ test cases covering all major user journeys**

## Troubleshooting

### Tests fail with "cannot find element"
- Check that the page actually renders that element
- Look at screenshots in `playwright-report/`
- Use `headed` mode to see what's happening

### Tests timeout on navigation
- Increase timeout in test: `await page.waitForURL(url, { timeout: 20000 })`
- Check backend is running and responding
- Look at network tab in headed mode

### Element is not clickable
- Try `force: true` on click: `await element.click({ force: true })`
- Wait for element to be visible first: `await element.waitFor({ state: 'visible' })`

### Authentication fails
- Verify test credentials exist in database
- Check token is properly stored in localStorage
- Look at network requests in debug mode

### Performance tests timeout
- May be due to slow machine or slow network
- Increase timeouts for performance tests
- Run tests on better hardware for accurate metrics

## Environment Variables

Tested with defaults. To override:

```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4040
NEXT_PUBLIC_API_SECRET=your-secret

# Playwright config
CI=true  # Enables stricter testing mode
```

## Best Practices

1. **Use fixtures** - Always use `authenticatedPage` or `adminPage` fixtures for authenticated tests
2. **Explicit waits** - Don't rely on sleep; use `waitFor` helpers
3. **Locator specificity** - Use specific locators instead of generic ones
4. **Error handling** - Check for errors gracefully with `.catch(() => {})`
5. **Test isolation** - Each test should be independent and runnable alone
6. **Clear assertions** - Use descriptive assertion messages
7. **Avoid flakiness** - Wait for conditions instead of timing out

## Contributing

When adding new pages or features:

1. Create test file in `e2e/` directory
2. Use descriptive test names (e.g., `should display login form with all fields`)
3. Group related tests in `test.describe()` blocks
4. Include setup/teardown if needed
5. Document complex test logic
6. Keep tests maintainable and focused

## Performance Targets

- Page load: < 5 seconds
- Form submission: < 3 seconds
- Navigation: < 3 seconds
- API calls: < 2 seconds

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Backend API Documentation](../server/README.md)
- [Project Architecture](../.github/copilot-instructions.md)

## Support

For issues with tests:
1. Check the Playwright report (`.html` file)
2. Review test logs and screenshots
3. Run in debug mode for detailed inspection
4. Check backend is running and test data is loaded
5. Verify network connectivity between frontend and backend

---

**Last Updated**: December 2, 2025  
**Test Framework**: Playwright 1.57+  
**Node.js**: 18+  
**Status**: ✅ Production Ready
