const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404 - URL:', response.url());
    }
  });

  console.log('Starting test...');
  await page.goto('http://localhost:3030/auth/login');
  
  console.log('Initial page loaded');
  
  // Fill form
  await page.fill('input[type="email"]', 'free@allowance.test');
  await page.fill('input[type="password"]', 'Pass888999');
  
  // Click login
  console.log('Clicking login...');
  await page.click('button:has-text("Sign in")');
  
  // Wait for navigation
  console.log('Waiting for navigation...');
  try {
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    console.log('✅ Successfully navigated to dashboard!');
  } catch (e) {
    console.log('❌ Navigation timeout. Current URL:', page.url());
  }
  
  console.log('localStorage token:', await page.evaluate(() => localStorage.getItem('token') ? 'EXISTS' : 'MISSING'));
  console.log('localStorage user:', await page.evaluate(() => localStorage.getItem('user') ? 'EXISTS' : 'MISSING'));

  await browser.close();
})();
