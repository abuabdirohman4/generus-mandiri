import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from './helpers/auth';

/**
 * Dashboard Tests
 * Test main dashboard functionality and navigation
 */

test.describe.configure({ mode: 'serial' });

test.describe('Dashboard', () => {
  // Login and ensure we start from /home before each test
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page);
    await page.goto('/home');
    await expect(page.locator('h3').first()).toBeVisible({ timeout: 15000 });
  });

  test('should display dashboard with quick actions', async ({ page }) => {
    // Check for quick action cards
    const quickActions = [
      'Absensi',
      'Siswa',
      'Kelas',
      'Laporan',
    ];

    for (const action of quickActions) {
      await expect(page.locator(`text=${action}`).first()).toBeVisible();
    }
  });

  test('should navigate to Absensi from quick action', async ({ page }) => {
    // Quick action cards use client-side router.push, click heading inside card
    await page.locator('h3:has-text("Absensi")').click();

    // Client-side navigation - URL changes without full reload
    await expect(page).toHaveURL(/.*absensi/, { timeout: 15000 });
  });

  test('should navigate to Siswa from quick action', async ({ page }) => {
    // Quick action cards use client-side router.push, click heading inside card
    await page.locator('h3:has-text("Siswa")').click();

    // Client-side navigation
    await expect(page).toHaveURL(/.*users\/siswa/, { timeout: 15000 });
  });

  test('should show user profile information', async ({ page }) => {
    // Should display user name or profile indicator
    await expect(page.locator('text=/superadmin|admin/i').first()).toBeVisible();
  });

  test('should have working sidebar navigation', async ({ page }) => {
    // Test sidebar navigation items by clicking links with specific URLs
    const navItems = [
      { href: '/absensi', url: /absensi/ },
      { href: '/users/siswa', url: /users\/siswa/ },
      { href: '/home', url: /home/ },
    ];

    for (const item of navItems) {
      // Click sidebar link by href
      const link = page.locator(`a[href="${item.href}"]`).first();
      await link.waitFor({ state: 'visible', timeout: 5000 });
      await link.click();

      // Client-side navigation
      await expect(page).toHaveURL(item.url, { timeout: 15000 });
    }
  });
});
