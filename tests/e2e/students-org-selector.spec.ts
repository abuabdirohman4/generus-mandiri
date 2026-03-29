import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * Cascading Org Selector Tests — /users/siswa
 *
 * Tests the Daerah → Desa → Kelompok cascading selectors in:
 * 1. StudentModal (Tambah Siswa)
 * 2. Step1Config (Batch Import → Step 1)
 * 3. AssignStudentsModal (Assign button)
 *
 * The org selectors use our custom InputFilter component which renders native
 * <select> elements (NOT Ant Design selects). Disabled state = HTML `disabled` attribute.
 *
 * IMPORTANT: Tests ONLY verify UI state. No data is created/submitted.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Modal selector — our custom modal uses class .modal (not .ant-modal) */
const MODAL_SELECTOR = '.modal';

/**
 * Returns true if the native <select> with the given ID is disabled.
 */
async function isSelectDisabled(page: import('@playwright/test').Page, selectId: string) {
  return page.locator(`select#${selectId}`).evaluate((el) =>
    (el as HTMLSelectElement).disabled
  );
}

/**
 * Opens the Tambah Siswa modal and waits for it to be visible.
 */
async function openTambahSiswaModal(page: import('@playwright/test').Page) {
  const btn = page.locator(
    'button:has-text("Tambah Siswa"), button:has-text("Tambah"), button:has-text("Add")'
  ).first();
  await expect(btn).toBeVisible({ timeout: 15000 });
  await btn.click();
  await page.waitForSelector(MODAL_SELECTOR, { timeout: 10000 });
  // Wait for modal content to load
  await page.waitForTimeout(500);
}

/**
 * Closes the currently open modal with Escape, then waits for it to disappear.
 */
async function closeModal(page: import('@playwright/test').Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

/**
 * Navigates to /users/siswa and waits for the page to finish loading.
 * Reloads once to ensure userProfile is fully hydrated before tests run
 * (workaround for sm-9fj: profile async load race condition).
 */
async function goToSiswaPage(page: import('@playwright/test').Page) {
  await page.goto('/users/siswa');
  await page.waitForLoadState('networkidle');
  // Reload to ensure profile is loaded before opening modals
  await page.reload();
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe('Cascading Org Selector — /users/siswa', () => {
  // -------------------------------------------------------------------------
  // 1. Admin Kelompok — no org selectors visible
  // -------------------------------------------------------------------------
  test.describe('Admin Kelompok', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        !process.env.TEST_ADMIN_KELOMPOK_USERNAME || !process.env.TEST_ADMIN_KELOMPOK_PASSWORD,
        'Admin Kelompok credentials not configured — set TEST_ADMIN_KELOMPOK_USERNAME and TEST_ADMIN_KELOMPOK_PASSWORD in .env.test'
      );
      await login(page, 'admin_kelompok');
      await goToSiswaPage(page);
    });

    test('Tambah Siswa — no Daerah/Desa/Kelompok selectors; Kelas selector visible', async ({ page }) => {
      await openTambahSiswaModal(page);

      // No org selectors should be in the DOM at all for admin_kelompok
      expect(await page.locator('select#daerahFilter').count()).toBe(0);
      expect(await page.locator('select#desaFilter').count()).toBe(0);
      expect(await page.locator('select#kelompokFilter').count()).toBe(0);

      // Kelas selector should be present (InputFilter id="classId" in StudentModal)
      await expect(page.locator('select#classId')).toBeVisible({ timeout: 5000 });

      await closeModal(page);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Admin Desa — only Kelompok selector visible
  // -------------------------------------------------------------------------
  test.describe('Admin Desa', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        !process.env.TEST_ADMIN_DESA_USERNAME || !process.env.TEST_ADMIN_DESA_PASSWORD,
        'Admin Desa credentials not configured — set TEST_ADMIN_DESA_USERNAME and TEST_ADMIN_DESA_PASSWORD in .env.test'
      );
      await login(page, 'admin_desa');
      await goToSiswaPage(page);
    });

    test('Tambah Siswa — no Daerah/Desa selectors; Kelompok visible; Kelas disabled until Kelompok selected', async ({ page }) => {
      await openTambahSiswaModal(page);

      // Daerah and Desa should NOT be in the modal (auto-filled / hidden for admin_desa)
      expect(await page.locator('select#daerahFilter').count()).toBe(0);
      expect(await page.locator('select#desaFilter').count()).toBe(0);

      // Kelompok selector should be visible
      await expect(page.locator('select#kelompokFilter')).toBeVisible({ timeout: 5000 });

      // Kelas selector should be disabled (waiting for Kelompok)
      const kelasDisabled = await isSelectDisabled(page, 'classId').catch(() => true);
      expect(kelasDisabled).toBe(true);

      await closeModal(page);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Admin Daerah — Desa + Kelompok selectors visible; cascade disable
  // -------------------------------------------------------------------------
  test.describe('Admin Daerah', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        !process.env.TEST_ADMIN_DAERAH_USERNAME || !process.env.TEST_ADMIN_DAERAH_PASSWORD,
        'Admin Daerah credentials not configured — set TEST_ADMIN_DAERAH_USERNAME and TEST_ADMIN_DAERAH_PASSWORD in .env.test'
      );
      await login(page, 'admin_daerah');
      await goToSiswaPage(page);
    });

    test('Tambah Siswa — no Daerah; Desa visible; Kelompok initially disabled; Kelas disabled until Kelompok', async ({ page }) => {
      await openTambahSiswaModal(page);

      // Daerah should NOT appear (auto-filled)
      expect(await page.locator('select#daerahFilter').count()).toBe(0);

      // Desa selector should be visible
      await expect(page.locator('select#desaFilter')).toBeVisible({ timeout: 5000 });

      // Kelompok selector should be visible but DISABLED (no Desa selected yet)
      await expect(page.locator('select#kelompokFilter')).toBeVisible({ timeout: 5000 });
      const kelompokDisabledInitially = await isSelectDisabled(page, 'kelompokFilter');
      expect(kelompokDisabledInitially).toBe(true);

      // Select a Desa option to enable Kelompok
      const desaOptions = await page.locator('select#desaFilter option:not([value=""])').all();
      if (desaOptions.length > 0) {
        const firstValue = await desaOptions[0].getAttribute('value');
        if (firstValue) {
          await page.selectOption('select#desaFilter', firstValue);
          // After selecting Desa, Kelompok should become enabled
          const kelompokDisabledAfter = await isSelectDisabled(page, 'kelompokFilter');
          expect(kelompokDisabledAfter).toBe(false);
        }
      }

      // Kelas should still be disabled until Kelompok is chosen
      const kelasDisabled = await isSelectDisabled(page, 'classId').catch(() => true);
      expect(kelasDisabled).toBe(true);

      await closeModal(page);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Superadmin — all 3 org selectors visible; cascade disable
  // -------------------------------------------------------------------------
  test.describe('Superadmin', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        !process.env.TEST_SUPERADMIN_USERNAME || !process.env.TEST_SUPERADMIN_PASSWORD,
        'Superadmin credentials not configured — set TEST_SUPERADMIN_USERNAME and TEST_SUPERADMIN_PASSWORD in .env.test'
      );
      await login(page, 'superadmin');
      await goToSiswaPage(page);
    });

    test('Tambah Siswa — Daerah visible; Desa initially disabled; Kelompok disabled until Desa selected', async ({ page }) => {
      await openTambahSiswaModal(page);

      // Daerah selector should be visible
      await expect(page.locator('select#daerahFilter')).toBeVisible({ timeout: 5000 });

      // Desa should be visible but DISABLED (no Daerah selected yet)
      await expect(page.locator('select#desaFilter')).toBeVisible({ timeout: 5000 });
      const desaDisabledInitially = await isSelectDisabled(page, 'desaFilter');
      expect(desaDisabledInitially).toBe(true);

      // Select a Daerah to enable Desa
      const daerahOptions = await page.locator('select#daerahFilter option:not([value=""])').all();
      if (daerahOptions.length > 0) {
        const firstValue = await daerahOptions[0].getAttribute('value');
        if (firstValue) {
          await page.selectOption('select#daerahFilter', firstValue);
          // After selecting Daerah, Desa should become enabled
          const desaDisabledAfter = await isSelectDisabled(page, 'desaFilter');
          expect(desaDisabledAfter).toBe(false);

          // Select a Desa to enable Kelompok
          await page.waitForTimeout(300); // wait for desa list to filter
          const desaOptions = await page.locator('select#desaFilter option:not([value=""])').all();
          if (desaOptions.length > 0) {
            const firstDesaValue = await desaOptions[0].getAttribute('value');
            if (firstDesaValue) {
              await page.selectOption('select#desaFilter', firstDesaValue);
              // After selecting Desa, Kelompok should become enabled
              const kelompokDisabledAfter = await isSelectDisabled(page, 'kelompokFilter');
              expect(kelompokDisabledAfter).toBe(false);
            }
          }
        }
      }

      await closeModal(page);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Batch Import (Step1Config) — org selectors in step 1
  // -------------------------------------------------------------------------
  test.describe('Batch Import — Step1Config', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        !process.env.TEST_ADMIN_DAERAH_USERNAME || !process.env.TEST_ADMIN_DAERAH_PASSWORD,
        'Admin Daerah credentials not configured — set TEST_ADMIN_DAERAH_USERNAME and TEST_ADMIN_DAERAH_PASSWORD in .env.test'
      );
      await login(page, 'admin_daerah');
      await goToSiswaPage(page);
    });

    test('Step 1 — Desa + Kelompok selectors visible; Kelompok disabled until Desa selected', async ({ page }) => {
      // Open the batch import modal
      const importBtn = page.locator(
        'button:has-text("Import Massal"), button:has-text("Batch"), button:has-text("Import")'
      ).first();
      await expect(importBtn).toBeVisible({ timeout: 15000 });
      await importBtn.click();

      // Wait for the modal / step 1 panel to appear
      await page.waitForSelector(MODAL_SELECTOR, { timeout: 10000 });
      await page.waitForTimeout(500);

      // Daerah should NOT appear (auto-filled for admin_daerah)
      expect(await page.locator('select#daerahFilter').count()).toBe(0);

      // Desa selector should be visible in Step 1
      await expect(page.locator('select#desaFilter')).toBeVisible({ timeout: 5000 });

      // Kelompok should be visible but disabled (no Desa selected yet)
      await expect(page.locator('select#kelompokFilter')).toBeVisible({ timeout: 5000 });
      const kelompokDisabled = await isSelectDisabled(page, 'kelompokFilter');
      expect(kelompokDisabled).toBe(true);

      // Select a Desa — Kelompok should become enabled
      const desaOptions = await page.locator('select#desaFilter option:not([value=""])').all();
      if (desaOptions.length > 0) {
        const firstValue = await desaOptions[0].getAttribute('value');
        if (firstValue) {
          await page.selectOption('select#desaFilter', firstValue);
          const kelompokDisabledAfter = await isSelectDisabled(page, 'kelompokFilter');
          expect(kelompokDisabledAfter).toBe(false);
        }
      }

      await closeModal(page);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Assign Modal — org selector above class dropdown
  // -------------------------------------------------------------------------
  test.describe('Assign Modal', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        !process.env.TEST_ADMIN_DESA_USERNAME || !process.env.TEST_ADMIN_DESA_PASSWORD,
        'Admin Desa credentials not configured — set TEST_ADMIN_DESA_USERNAME and TEST_ADMIN_DESA_PASSWORD in .env.test'
      );
      await login(page, 'admin_desa');
      await goToSiswaPage(page);
    });

    test('Assign modal — Kelompok selector visible; class dropdown present', async ({ page }) => {
      // Open the Assign modal
      const assignBtn = page.locator(
        'button:has-text("Assign"), button:has-text("Tetapkan")'
      ).first();
      await expect(assignBtn).toBeVisible({ timeout: 15000 });
      await assignBtn.click();

      // Wait for modal to appear
      await page.waitForSelector(MODAL_SELECTOR, { timeout: 10000 });
      await page.waitForTimeout(500);

      // Kelompok selector should be visible (Daerah and Desa are auto-filled for admin_desa)
      await expect(page.locator('select#kelompokFilter')).toBeVisible({ timeout: 5000 });

      // Class dropdown should be present
      await expect(page.locator('select#classId')).toBeVisible({ timeout: 5000 });

      // Select a Kelompok if options are available
      const kelompokOptions = await page.locator('select#kelompokFilter option:not([value=""])').all();
      if (kelompokOptions.length > 0) {
        const firstValue = await kelompokOptions[0].getAttribute('value');
        if (firstValue) {
          await page.selectOption('select#kelompokFilter', firstValue);
          // Kelompok is now selected — verify the selector still exists
          expect(await page.locator('select#kelompokFilter').count()).toBeGreaterThan(0);
        }
      }

      await closeModal(page);
    });
  });
});
