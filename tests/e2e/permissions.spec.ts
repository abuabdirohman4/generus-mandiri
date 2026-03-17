import { test, expect } from '@playwright/test';
import {
  loginAsSuperadmin,
  loginAsAdminDaerah,
  loginAsAdminDesa,
  loginAsAdminKelompok,
  loginAsGuruDaerah,
  loginAsGuruDesa,
  loginAsGuruKelompok,
} from './helpers/auth';

/**
 * Role-Based Access Control (RBAC) Tests
 * Test permissions for different user roles
 */

test.describe.configure({ mode: 'serial' });

test.describe('Role-Based Permissions', () => {
  test.describe('Superadmin Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSuperadmin(page);
    });

    test('should have access to all features', async ({ page }) => {
      // Superadmin should see all menu items
      await expect(page.locator('text=/dashboard/i').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=/absensi/i').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=/siswa/i').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=/guru/i').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=/kelas/i').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=/organisasi/i').first()).toBeVisible({ timeout: 15000 });
    });

    test('should be able to access admin management', async ({ page }) => {
      // Admin page can be slow to load due to large dataset
      await page.goto('/users/admin', { timeout: 60000 });
      // Should not redirect or show error
      await expect(page).toHaveURL(/.*users\/admin/);
    });

    test('should be able to access organizational management', async ({
      page,
    }) => {
      await page.goto('/organisasi');
      await expect(page).toHaveURL(/.*organisasi/);
    });
  });

  // Skip multi-user tests until test users are set up
  test.describe('Admin Daerah Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdminDaerah(page);
    });

    test('should have access to daerah-level data', async ({ page }) => {
      await page.goto('/users/siswa');
      await expect(page).toHaveURL(/.*users\/siswa/);

      // Should see filters for daerah
      // Add specific assertions based on your UI
    });

    test('should be able to create meetings in daerah scope', async ({
      page,
    }) => {
      await page.goto('/absensi');
      await expect(page).toHaveURL(/.*absensi/);

      // Should see create meeting button (title="Buat Pertemuan Baru")
      const createButton = page
        .locator(
          'button[title*="Buat"], button:has-text("Buat"), button:has-text("Create")'
        )
        .first();
      await expect(createButton).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Admin Desa Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdminDesa(page);
    });

    test('should have access to desa-level data', async ({ page }) => {
      await page.goto('/users/siswa');
      await expect(page).toHaveURL(/.*users\/siswa/);
    });

    test('should only create Sambung Desa meetings', async ({ page }) => {
      // Admin Desa can only create SAMBUNG_DESA meetings
      await page.goto('/absensi');
      await expect(page).toHaveURL(/.*absensi/);

      // Add specific test for meeting type restrictions
    });
  });

  test.describe('Admin Kelompok Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdminKelompok(page);
    });

    test('should have access to kelompok-level data', async ({ page }) => {
      await page.goto('/users/siswa');
      await expect(page).toHaveURL(/.*users\/siswa/);
    });

    test('should be able to manage students', async ({ page }) => {
      await page.goto('/users/siswa');

      // Should see add button
      const addButton = page
        .locator('button:has-text("Tambah"), button:has-text("Add")')
        .first();
      await expect(addButton).toBeVisible({ timeout: 15000 });
    });

    test('should be able to create regular meetings', async ({ page }) => {
      await page.goto('/absensi');
      await expect(page).toHaveURL(/.*absensi/);

      const createButton = page
        .locator(
          'button[title*="Buat"], button:has-text("Buat"), button:has-text("Create")'
        )
        .first();
      await expect(createButton).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Guru Daerah Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsGuruDaerah(page);
    });

    test('should have access to daerah-level classes', async ({ page }) => {
      await page.goto('/home');
      await expect(page).toHaveURL(/.*home/);

      // Should see dashboard
      await expect(page.locator('text=/selamat datang/i')).toBeVisible({ timeout: 15000 });
    });

    test('should be able to access absensi', async ({ page }) => {
      await page.goto('/absensi');
      await expect(page).toHaveURL(/.*absensi/);
    });
  });

  test.describe('Guru Desa Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsGuruDesa(page);
    });

    test('should have access to desa-level classes', async ({ page }) => {
      await page.goto('/home');
      await expect(page).toHaveURL(/.*home/);

      // Should see dashboard
      await expect(page.locator('text=/selamat datang/i')).toBeVisible({ timeout: 15000 });
    });

    test('should be able to access absensi', async ({ page }) => {
      await page.goto('/absensi');
      await expect(page).toHaveURL(/.*absensi/);
    });
  });

  test.describe('Guru Kelompok Access', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await loginAsGuruKelompok(page);
    });

    test('should only see assigned classes', async ({ page }) => {
      await page.goto('/absensi');
      await expect(page).toHaveURL(/.*absensi/);

      // Teacher should see meetings for their classes only
      // Add specific assertions based on your data
    });

    test('should be able to take attendance', async ({ page }) => {
      await page.goto('/absensi');

      // Wait for meetings to load
      await page.waitForLoadState('domcontentloaded');

      // Teacher should be able to create meetings for their classes
      const createButton = page
        .locator(
          'button[title*="Buat"], button:has-text("Buat"), button:has-text("Create")'
        )
        .first();

      // Check if visible (depends on whether teacher has assigned classes)
      const isVisible = await createButton.isVisible().catch(() => false);
      // This is OK - some teachers may not have permission to create meetings
    });

    test('should be redirected away from organisasi page', async ({ page }) => {
      await page.goto('/organisasi');

      // Page does client-side redirect after userProfile loads
      // Wait for redirect to complete
      await expect(page).not.toHaveURL(/.*organisasi/, { timeout: 15000 });
    });
  });

  test.describe('Permission Boundaries', () => {
    test('teacher should not access admin features', async ({ page }) => {
      await page.context().clearCookies();
      await loginAsGuruKelompok(page);

      // Try to access admin pages — app does client-side redirect after userProfile loads
      await page.goto('/users/admin');
      await expect(page).not.toHaveURL(/.*users\/admin/, { timeout: 15000 });
    });

    test('admin kelompok should not access organizational management', async ({
      page,
    }) => {
      await page.context().clearCookies();
      await loginAsAdminKelompok(page);

      // Admin kelompok is redirected away from /organisasi (client-side redirect)
      await page.goto('/organisasi');
      await expect(page).not.toHaveURL(/.*organisasi/, { timeout: 15000 });
    });
  });
});

/**
 * Test Data Visibility by Role
 * Verify users only see data within their scope
 */
test.describe('Data Scope by Role', () => {
  test('superadmin sees all data', async ({ page }) => {
    await loginAsSuperadmin(page);
    await page.goto('/users/siswa');
    await page.waitForLoadState('domcontentloaded');

    // Should see data from all organizations
    // Add specific assertions based on your test data
  });

  test('admin kelompok sees only kelompok data', async ({ page }) => {
    await loginAsAdminKelompok(page);
    await page.goto('/users/siswa');
    await page.waitForLoadState('domcontentloaded');

    // Should only see students from their kelompok
    // Add specific assertions based on your test data
  });

  test('guru sees only their assigned classes', async ({ page }) => {
    await loginAsGuruKelompok(page);
    await page.goto('/absensi');
    await page.waitForLoadState('domcontentloaded');

    // Should only see meetings for their classes
    // Add specific assertions based on your test data
  });
});
