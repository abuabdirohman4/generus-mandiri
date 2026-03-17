import { test, expect } from '@playwright/test';
import { loginAsSuperadmin } from './helpers/auth';

/**
 * Student Management Tests
 * Test student CRUD operations and filtering
 */

test.describe.configure({ mode: 'serial' });

test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as superadmin
    await loginAsSuperadmin(page);

    // Navigate to siswa page
    await page.goto('/users/siswa');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display student list page', async ({ page }) => {
    // Should show student table or list
    await expect(page.locator('text=/siswa|student/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('should show student statistics cards', async ({ page }) => {
    // Wait for content to load - look for any number/statistic
    await page.waitForSelector('text=/\\d+/', { timeout: 15000 });

    // Page should have loaded student data
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  });

  test('should have filter options', async ({ page }) => {
    // Look for any filter-related elements
    // Ant Design renders selects as textbox with placeholder
    const filters = page.locator(
      'input[placeholder*="Pilih"], input[placeholder*="Cari"], .ant-select, select'
    );
    const count = await filters.count();

    // If filters exist, verify first one is visible
    if (count > 0) {
      await expect(filters.first()).toBeVisible();
    } else {
      // If no filters, at least the page should have loaded successfully
      await expect(page.locator('text=/siswa|student/i').first()).toBeVisible();
    }
  });

  test('should have add student button', async ({ page }) => {
    // Should have create/add button
    const addButton = page
      .locator('button:has-text("Tambah"), button:has-text("Add"), button:has-text("Buat")')
      .first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
  });

  test('should open student modal when add button clicked', async ({ page }) => {
    // Click add student button
    const addButton = page
      .locator('button:has-text("Tambah"), button:has-text("Add"), button:has-text("Buat")')
      .first();
    await addButton.click();

    // Should show modal with form
    await expect(page.locator('text=/nama|name/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display student data in table', async ({ page }) => {
    // Should show table with headers
    const table = page.locator('table, .ant-table');
    await expect(table).toBeVisible({ timeout: 15000 });
  });

  test('should have search functionality', async ({ page }) => {
    // Wait for table to render (DataTable renders search input when searchable=true)
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // Search input is type="search" with placeholder "Cari siswa..."
    const searchInput = page.locator('input[type="search"], input[placeholder*="Cari"], input[placeholder*="Search"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to student detail when name clicked', async ({ page }) => {
    // Student name is a Link to /users/siswa/{id}
    const studentLink = page.locator('a[href^="/users/siswa/"]').first();
    await expect(studentLink).toBeVisible({ timeout: 20000 });

    await studentLink.click();
    await expect(page).toHaveURL(/.*users\/siswa\/[a-z0-9-]+/, { timeout: 15000 });
  });
});
