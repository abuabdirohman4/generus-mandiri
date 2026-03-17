import { test, expect } from '@playwright/test';
import { getTestCredentials } from './helpers/auth';

/**
 * Authentication & Authorization Tests
 * Test login functionality and role-based access control
 */

test.describe.configure({ mode: 'serial' });

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

    // Submit form and wait for navigation
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*home/, { timeout: 45000 });

    // Should see welcome message
    await expect(page.locator('text=/selamat datang/i')).toBeVisible({ timeout: 15000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/signin');

    // Fill with invalid credentials
    await page.fill('input[name="username"]', 'invaliduser');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit form and wait for server response
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');

    // Should show error message (page stays on /signin with error)
    await expect(page).toHaveURL(/.*signin/);
    await expect(page.locator('text=/invalid|salah|gagal/i')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    const { username, password } = getTestCredentials();

    // Login first
    await page.goto('/signin');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);

    // Submit and wait for navigation
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*home/, { timeout: 45000 });

    // Click on user profile dropdown (top right)
    await page.click('text=Super Admin');

    // Wait for dropdown menu and click logout
    const logoutButton = page.locator('text=/keluar|logout|sign out/i').first();
    await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
    await logoutButton.click();

    // Should redirect to signin
    await expect(page).toHaveURL(/.*signin/, { timeout: 5000 });
  });
});
