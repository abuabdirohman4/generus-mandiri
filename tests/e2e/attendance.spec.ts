import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from './helpers/auth';

/**
 * Attendance Management Tests
 * Test meeting creation and attendance recording
 */

test.describe('Attendance Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as superadmin
    await loginAsSuperadmin(page);

    // Navigate to absensi page
    await page.goto('/absensi');
  });

  test('should display absensi page', async ({ page }) => {
    // Should show meeting list or empty state
    await expect(page.locator('text=/meeting|pertemuan|absensi/i').first()).toBeVisible();
  });

  test('should show create meeting button', async ({ page }) => {
    // Should have create meeting button (usually a FAB or button)
    const createButton = page.locator('button:has-text("Buat"), button:has-text("Create"), button[aria-label*="create"], button[aria-label*="tambah"]').first();
    await expect(createButton).toBeVisible();
  });

  test('should open create meeting modal', async ({ page }) => {
    // Click create meeting button
    const createButton = page.locator('button:has-text("Buat"), button:has-text("Create"), button[aria-label*="create"], button[aria-label*="tambah"]').first();
    await createButton.click();

    // Should show modal with form fields
    await expect(page.locator('text=/tanggal|date/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('should display meeting filters', async ({ page }) => {
    // Should have filter options
    const filters = page.locator('select, .ant-select, input[type="date"]');
    await expect(filters.first()).toBeVisible();
  });

  test('should navigate to meeting detail when clicked', async ({ page }) => {
    // Wait for meetings to load
    await page.waitForLoadState('networkidle');

    // Try to find a meeting card/row
    const meetingItem = page.locator('[data-testid="meeting-item"], .meeting-card, tr[role="row"]').first();

    // If meetings exist, click and navigate to detail
    const count = await meetingItem.count();
    if (count > 0) {
      await meetingItem.click();

      // Should navigate to meeting detail page
      await expect(page).toHaveURL(/.*absensi\/[a-z0-9-]+/);

      // Should show student list or attendance form
      await expect(page.locator('text=/siswa|student|hadir|present/i').first()).toBeVisible();
    } else {
      // No meetings yet - this is OK, skip test
      test.skip();
    }
  });
});
