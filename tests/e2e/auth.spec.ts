import { test, expect } from '@playwright/test';
import { getTestCredentials } from './helpers/auth';

/**
 * Authentication & Authorization Tests
 * Test login functionality and role-based access control
 */

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/');

    // Should redirect to /signin
    await expect(page).toHaveURL(/.*signin/);

    // Check for login form elements
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login as superadmin successfully', async ({ page }) => {
    const { username, password } = getTestCredentials();

    await page.goto('/signin');

    // Fill login form
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to /home
    await expect(page).toHaveURL(/.*home/, { timeout: 10000 });

    // Should see welcome message
    await expect(page.locator('text=/selamat datang/i')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/signin');

    // Fill with invalid credentials
    await page.fill('input[name="username"]', 'invaliduser');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/invalid|salah|gagal/i')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    const { username, password } = getTestCredentials();

    // Login first
    await page.goto('/signin');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*home/);

    // Find and click logout button
    await page.click('button:has-text("Keluar"), button:has-text("Logout")');

    // Should redirect to signin
    await expect(page).toHaveURL(/.*signin/, { timeout: 5000 });
  });
});
