const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('error', err => console.log('PAGE ERROR:', err));

  await page.goto('http://localhost:3030/auth/login');
  
  // Fill form
  await page.fill('input[type="email"]', 'free@allowance.test');
  await page.fill('input[type="password"]', 'Pass888999');
  
  // Log before clicking
  console.log('Before login - localStorage:', await page.evaluate(() => localStorage.getItem('token')));
  
  // Click login
  await page.click('button:has-text("Sign in")');
  
  // Wait a bit
  await page.waitForTimeout(1000);
  
  console.log('After 1s - URL:', page.url());
  console.log('After 1s - localStorage token:', await page.evaluate(() => localStorage.getItem('token')));
  console.log('After 1s - localStorage user:', await page.evaluate(() => localStorage.getItem('user')));
  
  await page.waitForTimeout(2000);
  console.log('After 3s total - URL:', page.url());
  console.log('After 3s total - localStorage token:', await page.evaluate(() => localStorage.getItem('token')));

  await browser.close();
})();
