import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from './helpers/auth';

/**
 * Dashboard Tests
 * Test main dashboard functionality and navigation
 */

test.describe('Dashboard', () => {
  // Run login before each test
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page);
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
    // Click Absensi quick action
    await page.click('text=Absensi');

    // Should navigate to absensi page
    await expect(page).toHaveURL(/.*absensi/);
  });

  test('should navigate to Siswa from quick action', async ({ page }) => {
    // Click Siswa quick action
    await page.click('text=Siswa');

    // Should navigate to siswa page
    await expect(page).toHaveURL(/.*users\/siswa/);
  });

  test('should show user profile information', async ({ page }) => {
    // Should display user name or profile indicator
    await expect(page.locator('text=/superadmin|admin/i').first()).toBeVisible();
  });

  test('should have working sidebar navigation', async ({ page }) => {
    // Test sidebar navigation items
    const navItems = [
      { text: 'Dashboard', url: /dashboard|home/ },
      { text: 'Absensi', url: /absensi/ },
      { text: 'Siswa', url: /siswa/ },
    ];

    for (const item of navItems) {
      // Click sidebar item
      const link = page.locator(`a:has-text("${item.text}")`).first();
      await link.click();

      // Check URL
      await expect(page).toHaveURL(item.url);
    }
  });
});
