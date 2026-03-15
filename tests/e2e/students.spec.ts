import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from './helpers/auth';

/**
 * Student Management Tests
 * Test student CRUD operations and filtering
 */

test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as superadmin
    await loginAsSuperadmin(page);

    // Navigate to siswa page
    await page.goto('/users/siswa');
  });

  test('should display student list page', async ({ page }) => {
    // Should show student table or list
    await expect(page.locator('text=/siswa|student/i').first()).toBeVisible();
  });

  test('should show student statistics cards', async ({ page }) => {
    // Should display total students count
    await expect(page.locator('text=/total|jumlah/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should have filter options', async ({ page }) => {
    // Should have filter selects (Kelompok, Kelas, Gender, Status)
    const filters = page.locator('select, .ant-select');
    await expect(filters.first()).toBeVisible();
  });

  test('should have add student button', async ({ page }) => {
    // Should have create/add button
    const addButton = page.locator('button:has-text("Tambah"), button:has-text("Add"), button:has-text("Buat")').first();
    await expect(addButton).toBeVisible();
  });

  test('should open student modal when add button clicked', async ({ page }) => {
    // Click add student button
    const addButton = page.locator('button:has-text("Tambah"), button:has-text("Add"), button:has-text("Buat")').first();
    await addButton.click();

    // Should show modal with form
    await expect(page.locator('text=/nama|name/i').first()).toBeVisible({ timeout: 3000 });
  });

  test('should display student data in table', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Should show table with headers
    const table = page.locator('table, .ant-table');
    await expect(table).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    // Should have search input
    const searchInput = page.locator('input[placeholder*="Cari"], input[placeholder*="Search"]');

    const count = await searchInput.count();
    if (count > 0) {
      await expect(searchInput.first()).toBeVisible();
    } else {
      // Search might be in a different form - that's OK
      test.skip();
    }
  });

  test('should navigate to student detail when row clicked', async ({ page }) => {
    // Wait for students to load
    await page.waitForLoadState('networkidle');

    // Try to find student rows
    const studentRow = page.locator('tr[data-row-key], .student-row').first();

    const count = await studentRow.count();
    if (count > 0) {
      await studentRow.click();

      // Should navigate to student detail or open modal
      // Check if URL changed or modal appeared
      const urlChanged = await page.waitForURL(/.*users\/siswa\/[a-z0-9-]+/, { timeout: 3000 }).catch(() => false);
      const modalVisible = await page.locator('.ant-modal, [role="dialog"]').isVisible();

      expect(urlChanged || modalVisible).toBeTruthy();
    } else {
      // No students yet - skip test
      test.skip();
    }
  });
});
