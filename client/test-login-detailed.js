const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('response', response => {
    if (response.url().includes('/auth/login')) {
      console.log('Login response - Status:', response.status(), 'URL:', response.url());
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning' || msg.text().includes('Failed')) {
      console.log('PAGE LOG [' + msg.type() + ']:', msg.text());
    }
  });

  await page.goto('http://localhost:3030/auth/login');
  
  // Fill form
  await page.fill('input[type="email"]', 'free@allowance.test');
  await page.fill('input[type="password"]', 'Pass888999');
  
  console.log('\n=== Clicking login button ===');
  
  // Click login
  await page.click('button:has-text("Sign in")');
  
  // Wait for response
  await page.waitForTimeout(2000);
  
  console.log('\n=== After login ===');
  console.log('URL:', page.url());
  console.log('localStorage token:', await page.evaluate(() => localStorage.getItem('token') ? 'EXISTS' : 'MISSING'));
  console.log('localStorage user:', await page.evaluate(() => localStorage.getItem('user') ? 'EXISTS' : 'MISSING'));

  await browser.close();
})();
