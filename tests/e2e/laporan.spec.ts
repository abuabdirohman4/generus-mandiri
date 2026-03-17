import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from './helpers/auth';

/**
 * Laporan (Report) E2E Tests
 *
 * Includes regression test for sm-hov:
 * "Bug: Data table laporan hilang pertemuan saat multi-class filter"
 *
 * Test data (test org):
 *   - [TEST] Kelas 1 (11111111-aaaa-...)
 *   - [TEST] Kelas 2 (11111111-bbbb-...)
 *   - Meeting 1: Pertemuan Rutin 1 → class_ids = [Kelas 1, Kelas 2]
 *   - Meeting 2: Pertemuan Rutin 2 → class_ids = [Kelas 1]
 *
 * Expected:
 *   - Filter Kelas 1 saja    → 2 meetings (Meeting 1 + Meeting 2)
 *   - Filter Kelas 2 saja    → 1 meeting  (Meeting 1)
 *   - Filter Kelas 1 + 2     → 2 meetings (Meeting 1 + Meeting 2, no duplicates)
 */

test.describe.configure({ mode: 'serial' });

test.describe('Laporan Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page);
    await page.goto('/laporan');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display laporan page', async ({ page }) => {
    await expect(page).toHaveURL(/.*laporan/);
    await expect(page.locator('text=/laporan/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('should show filter options', async ({ page }) => {
    // Filter section should be visible
    await expect(
      page.locator('input[placeholder*="Pilih"], input[placeholder*="pilih"]').first()
    ).toBeVisible({ timeout: 15000 });
  });
});

/**
 * Regression: sm-hov
 * Bug: Data table laporan hilang pertemuan saat multi-class filter
 *
 * Steps to reproduce:
 * 1. Filter kelompok ke [TEST] Kelompok Test
 * 2. Filter dengan 1 kelas → catat jumlah meetings di DataTable
 * 3. Filter dengan 2 kelas → jumlah meetings harus >= single class
 */
test.describe('sm-hov: Multi-class filter regression', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page);
    await page.goto('/laporan');
    await page.waitForLoadState('domcontentloaded');
  });

  test('[sm-hov] single class filter shows correct meeting count', async ({ page }) => {
    // Select test kelompok filter first
    const kelompokFilter = page.locator('input[placeholder*="Kelompok"]').first();
    await expect(kelompokFilter).toBeVisible({ timeout: 15000 });
    await kelompokFilter.click();
    await page.locator('text=[TEST] Kelompok Test').first().click();
    await page.keyboard.press('Escape');

    // Select Kelas 1 only
    const kelasFilter = page.locator('input[placeholder*="Kelas"]').first();
    await expect(kelasFilter).toBeVisible({ timeout: 10000 });
    await kelasFilter.click();
    await page.locator('text=[TEST] Kelas 1').first().click();
    await page.keyboard.press('Escape');

    // Wait for data table to load
    await page.waitForLoadState('domcontentloaded');

    // DataTable should show meetings — at least 1 row in tbody
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 20000 });
    const singleClassCount = await rows.count();

    // Store count for comparison (Kelas 1 has 2 meetings: Meeting 1 + Meeting 2)
    expect(singleClassCount).toBeGreaterThanOrEqual(1);
    console.log(`Single class (Kelas 1) meeting count: ${singleClassCount}`);
  });

  test('[sm-hov] multi-class filter shows >= single class meeting count (regression)', async ({ page }) => {
    // Select test kelompok
    const kelompokFilter = page.locator('input[placeholder*="Kelompok"]').first();
    await expect(kelompokFilter).toBeVisible({ timeout: 15000 });
    await kelompokFilter.click();
    await page.locator('text=[TEST] Kelompok Test').first().click();
    await page.keyboard.press('Escape');

    // --- Step 1: Filter with Kelas 1 only ---
    const kelasFilter = page.locator('input[placeholder*="Kelas"]').first();
    await expect(kelasFilter).toBeVisible({ timeout: 10000 });
    await kelasFilter.click();
    await page.locator('text=[TEST] Kelas 1').first().click();
    await page.keyboard.press('Escape');

    await page.waitForLoadState('domcontentloaded');
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 20000 });
    const singleClassCount = await rows.count();
    console.log(`Single class count: ${singleClassCount}`);

    // --- Step 2: Add Kelas 2 to filter (multi-class) ---
    await kelasFilter.click();
    await page.locator('text=[TEST] Kelas 2').first().click();
    await page.keyboard.press('Escape');

    await page.waitForLoadState('domcontentloaded');
    await expect(rows.first()).toBeVisible({ timeout: 20000 });
    const multiClassCount = await rows.count();
    console.log(`Multi-class count: ${multiClassCount}`);

    // BUG sm-hov: multi-class count was LESS than single class count
    // Expected: multi-class >= single-class (more classes = more or equal meetings)
    expect(multiClassCount).toBeGreaterThanOrEqual(singleClassCount);
  });
});
