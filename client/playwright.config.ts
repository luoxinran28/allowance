import { defineConfig, devices } from '@playwright/test';

/**
 * Allowance Frontend E2E Tests Configuration
 * 
 * Tests run against the live frontend and backend services.
 * Ensure both services are running before executing tests:
 * - Frontend: http://localhost:3030
 * - Backend: http://localhost:4040
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests serially to avoid race conditions with shared state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'junit-results.xml' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3030',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Web server is already running (Docker or manual startup)
  // Uncomment below only if you want Playwright to start it
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3030',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
