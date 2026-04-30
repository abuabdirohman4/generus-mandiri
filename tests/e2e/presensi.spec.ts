import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from './helpers/auth';

/**
 * Presence Management Tests
 * Test meeting creation and attendance recording
 */

test.describe.configure({ mode: 'serial' });

test.describe('Presence Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as superadmin
    await loginAsSuperadmin(page);

    // Navigate to presensi page
    await page.goto('/presensi');
  });

  test('should display presensi page', async ({ page }) => {
    // Should show meeting list or empty state
    await expect(page.locator('text=/meeting|pertemuan|presensi/i').first()).toBeVisible();
  });

  test('should show create meeting button', async ({ page }) => {
    // Verify we're actually on presensi page (not redirected to signin)
    await expect(page).toHaveURL(/.*presensi/, { timeout: 5000 });

    // Should have create meeting button - wait generously for Supabase data to load
    const createButton = page.getByRole('button', { name: 'Buat Pertemuan Baru' });
    await expect(createButton).toBeVisible({ timeout: 30000 });
  });

  test('should open create meeting modal', async ({ page }) => {
    // Verify we're on presensi page
    await expect(page).toHaveURL(/.*presensi/);

    // Wait for button to appear (Supabase data load) then click
    const createButton = page.getByRole('button', { name: 'Buat Pertemuan Baru' });
    await expect(createButton).toBeVisible({ timeout: 30000 });
    await createButton.click();

    // Should show modal with form fields
    await expect(page.locator('text=/tanggal|date/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display meeting filters', async ({ page }) => {
    // Wait for page content to load, then check filters
    // Filters are Ant Design custom selects rendered as textboxes with placeholders
    const filters = page.locator('input[placeholder="Pilih Daerah"], input[placeholder="Pilih Kelas"], input[placeholder="Pilih Tipe"]');
    await expect(filters.first()).toBeVisible({ timeout: 30000 });
  });

  test('should navigate to meeting detail when clicked', async ({ page }) => {
    // Wait for meeting cards to load (rendered as <Link href="/presensi/{id}">)
    const meetingItem = page.locator('a[href^="/presensi/"]').first();
    await expect(meetingItem).toBeVisible({ timeout: 20000 });

    await meetingItem.click();

    // Should navigate to meeting detail page
    await expect(page).toHaveURL(/.*presensi\/[a-z0-9-]+/, { timeout: 15000 });

    // Should show student list or attendance form
    await expect(page.locator('text=/siswa|student|hadir|present/i').first()).toBeVisible({ timeout: 15000 });
  });
});
