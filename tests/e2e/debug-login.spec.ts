import { test, expect } from '@playwright/test';

/**
 * Debug test to understand login flow
 * Run with: npm run test:e2e:headed -- debug-login.spec.ts
 */

test.describe('Debug Login Flow', () => {
  test('should show what happens after login', async ({ page }) => {
    // Go to signin page
    await page.goto('/signin');
    console.log('1. On signin page:', page.url());

    // Fill credentials
    await page.fill('input[name="username"]', 'superadmin');
    await page.fill('input[name="password"]', 'super354');
    console.log('2. Filled credentials');

    // Click submit
    await page.click('button[type="submit"]');
    console.log('3. Clicked submit button');

    // Wait a bit and see where we are
    await page.waitForTimeout(5000);
    console.log('4. After 5s, URL is:', page.url());

    // Try to screenshot for debugging
    await page.screenshot({ path: 'test-results/debug-after-login.png' });

    // Check if there's any error message
    const errorVisible = await page.locator('text=/error|invalid|salah|gagal/i').isVisible().catch(() => false);
    console.log('5. Error message visible?', errorVisible);

    // Check what's on the page
    const pageTitle = await page.title();
    console.log('6. Page title:', pageTitle);

    // Log the URL pattern
    const currentUrl = page.url();
    console.log('7. Final URL:', currentUrl);
    console.log('8. Is on /home?', currentUrl.includes('/home'));
    console.log('9. Is on /signin?', currentUrl.includes('/signin'));
    console.log('10. Is on /dashboard?', currentUrl.includes('/dashboard'));
  });

  test('should manually wait and navigate', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[name="username"]', 'superadmin');
    await page.fill('input[name="password"]', 'super354');
    await page.click('button[type="submit"]');

    // Try waiting for specific elements instead of URL
    try {
      // Wait for dashboard/home content
      await page.waitForSelector('text=/selamat datang|welcome/i', { timeout: 10000 });
      console.log('✅ Found welcome text - login successful!');
      console.log('URL after successful login:', page.url());
    } catch (error) {
      console.log('❌ Login failed or timeout');
      console.log('Current URL:', page.url());

      // Check if we're still on signin
      const onSignin = page.url().includes('/signin');
      if (onSignin) {
        console.log('⚠️ Still on signin page - login probably failed');

        // Check for error messages
        const errorText = await page.locator('.ant-message, [role="alert"], .error').textContent().catch(() => 'No error found');
        console.log('Error message:', errorText);
      }
    }
  });
});
