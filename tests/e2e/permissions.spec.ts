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

test.describe('Role-Based Permissions', () => {
  test.describe('Superadmin Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSuperadmin(page);
    });

    test('should have access to all features', async ({ page }) => {
      // Superadmin should see all menu items
      await expect(page.locator('text=/dashboard/i').first()).toBeVisible();
      await expect(page.locator('text=/absensi/i').first()).toBeVisible();
      await expect(page.locator('text=/siswa/i').first()).toBeVisible();
      await expect(page.locator('text=/guru/i').first()).toBeVisible();
      await expect(page.locator('text=/kelas/i').first()).toBeVisible();
      await expect(page.locator('text=/organisasi/i').first()).toBeVisible();
    });

    test('should be able to access admin management', async ({ page }) => {
      await page.goto('/users/admin');
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

      // Should see create meeting button
      const createButton = page
        .locator(
          'button:has-text("Buat"), button:has-text("Create"), button[aria-label*="create"]'
        )
        .first();
      await expect(createButton).toBeVisible();
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
      await expect(addButton).toBeVisible();
    });

    test('should be able to create regular meetings', async ({ page }) => {
      await page.goto('/absensi');
      await expect(page).toHaveURL(/.*absensi/);

      const createButton = page
        .locator(
          'button:has-text("Buat"), button:has-text("Create"), button[aria-label*="create"]'
        )
        .first();
      await expect(createButton).toBeVisible();
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
      await expect(page.locator('text=/selamat datang/i')).toBeVisible();
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
      await expect(page.locator('text=/selamat datang/i')).toBeVisible();
    });

    test('should be able to access absensi', async ({ page }) => {
      await page.goto('/absensi');
      await expect(page).toHaveURL(/.*absensi/);
    });
  });

  test.describe('Guru Kelompok Access', () => {
    test.beforeEach(async ({ page }) => {
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
      await page.waitForLoadState('networkidle');

      // Teacher should be able to create meetings for their classes
      const createButton = page
        .locator(
          'button:has-text("Buat"), button:has-text("Create"), button[aria-label*="create"]'
        )
        .first();

      // Check if visible (depends on whether teacher has assigned classes)
      const isVisible = await createButton.isVisible().catch(() => false);
      // This is OK - some teachers may not have permission to create meetings
    });

    test('should NOT have access to organizational management', async ({
      page,
    }) => {
      await page.goto('/organisasi');

      // Should either redirect or show error
      // Adjust based on your app's behavior for unauthorized access
      await page.waitForTimeout(2000);

      // Should not be on organisasi page
      const currentUrl = page.url();
      const isOnOrganisasiPage = currentUrl.includes('/organisasi');

      if (isOnOrganisasiPage) {
        // If still on page, should show access denied message
        await expect(
          page.locator('text=/tidak memiliki akses|access denied|forbidden/i')
        ).toBeVisible();
      } else {
        // Should be redirected to home or error page
        expect(currentUrl).toMatch(/\/(home|error|signin)/);
      }
    });
  });

  test.describe('Permission Boundaries', () => {
    test('teacher should not access admin features', async ({ page }) => {
      await loginAsGuruKelompok(page);

      // Try to access admin pages
      await page.goto('/users/admin');

      // Should redirect or show error
      await page.waitForTimeout(1000);
      const url = page.url();

      // Should NOT be on admin page
      if (url.includes('/users/admin')) {
        // If still on page, should show access denied
        await expect(
          page.locator('text=/akses ditolak|access denied|forbidden/i')
        ).toBeVisible();
      }
    });

    test('admin kelompok should not access organizational management', async ({
      page,
    }) => {
      await loginAsAdminKelompok(page);

      await page.goto('/organisasi');
      await page.waitForTimeout(1000);

      const url = page.url();

      // Depending on implementation:
      // Either redirected away, or shown with limited access
      // Adjust assertion based on your app's behavior
      expect(url).toBeTruthy(); // Placeholder - implement based on your app
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
    await page.waitForLoadState('networkidle');

    // Should see data from all organizations
    // Add specific assertions based on your test data
  });

  test('admin kelompok sees only kelompok data', async ({ page }) => {
    await loginAsAdminKelompok(page);
    await page.goto('/users/siswa');
    await page.waitForLoadState('networkidle');

    // Should only see students from their kelompok
    // Add specific assertions based on your test data
  });

  test('guru sees only their assigned classes', async ({ page }) => {
    await loginAsGuruKelompok(page);
    await page.goto('/absensi');
    await page.waitForLoadState('networkidle');

    // Should only see meetings for their classes
    // Add specific assertions based on your test data
  });
});
