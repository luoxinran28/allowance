const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('request', request => {
    if (request.url().includes('/auth/login')) {
      console.log('Login request:');
      console.log('  URL:', request.url());
      console.log('  Method:', request.method());
      console.log('  Headers:', JSON.stringify(request.postDataJSON() || request.allHeaders(), null, 2));
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/auth/login') && response.request().method() === 'POST') {
      console.log('\nLogin response:');
      console.log('  Status:', response.status());
      try {
        const text = await response.text();
        console.log('  Body:', text);
      } catch (e) {
        console.log('  (Could not read body)');
      }
    }
  });

  await page.goto('http://localhost:3030/auth/login');
  
  // Fill form
  await page.fill('input[type="email"]', 'free@allowance.test');
  await page.fill('input[type="password"]', 'Pass888999');
  
  console.log('\n=== Submitting login ===\n');
  
  // Click login
  await page.click('button:has-text("Sign in")');
  
  // Wait for response
  await page.waitForTimeout(3000);

  await browser.close();
})();
