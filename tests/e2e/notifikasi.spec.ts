import { test, expect } from '@playwright/test'
import { loginAsSuperadmin, loginAsAdminDaerah, loginAsGuruKelompok } from './helpers/auth'

/**
 * Notifikasi (Notification) E2E Tests — sm-69c
 *
 * Covers:
 *   Suite 1: Basic page visibility and access control
 *   Suite 2: Kirim Notifikasi (broadcast form — happy path)
 *   Suite 3: Scope restrictions for admin_daerah role
 *
 * Out of scope: cross-role notification delivery (needs 2 browser contexts + timing).
 * That is covered by unit/integration tests.
 */

test.describe.configure({ mode: 'serial' })

// ---------------------------------------------------------------------------
// Suite 1: Halaman Notifikasi — basic page tests
// ---------------------------------------------------------------------------

test.describe('Halaman Notifikasi', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page)
    await page.goto('/notifikasi')
    await page.waitForLoadState('domcontentloaded')
  })

  test('should display notifikasi page when logged in', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Notifikasi', { timeout: 15000 })
  })

  test('should show Kirim Notifikasi button for superadmin', async ({ page }) => {
    await expect(
      page.locator('button:has-text("Kirim Notifikasi")')
    ).toBeVisible({ timeout: 15000 })
  })

  test('should show KirimBroadcastForm when Kirim Notifikasi clicked', async ({ page }) => {
    await page.locator('button:has-text("Kirim Notifikasi")').click()

    // The form should appear — textarea is the distinguishing element
    await expect(
      page.locator('textarea#notif-body')
    ).toBeVisible({ timeout: 15000 })
  })

  test('should NOT show Kirim Notifikasi button for guru', async ({ page }) => {
    await loginAsGuruKelompok(page)
    await page.goto('/notifikasi')
    await page.waitForLoadState('domcontentloaded')

    // Wait for page to settle before asserting absence
    await expect(page.locator('h1')).toHaveText('Notifikasi', { timeout: 15000 })
    await expect(
      page.locator('button:has-text("Kirim Notifikasi")')
    ).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Suite 2: Kirim notifikasi — happy path (superadmin, scope = Semua)
// ---------------------------------------------------------------------------

test.describe('Kirim Notifikasi (superadmin)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page)
    await page.goto('/notifikasi')
    await page.waitForLoadState('domcontentloaded')
  })

  test('should send notification to all users successfully', async ({ page }) => {
    // Open the form
    await page.locator('button:has-text("Kirim Notifikasi")').click()
    await expect(page.locator('textarea#notif-body')).toBeVisible({ timeout: 15000 })

    // Fill title
    const titleInput = page.locator('input#notif-title')
    await expect(titleInput).toBeVisible({ timeout: 10000 })
    await titleInput.fill(`Test Notifikasi E2E ${Date.now()}`)

    // Fill body
    await page.locator('textarea#notif-body').fill('Ini adalah test notifikasi dari E2E')

    // Scope defaults to "Semua" for superadmin — no change needed
    // The scope select has id="notif-scope"; default value is 'all'

    // Submit — the submit button text is "Kirim Notifikasi" inside the form
    await page.locator('form button[type="submit"]').click()

    // Expect success feedback message
    await expect(
      page.locator('text=/berhasil/i')
    ).toBeVisible({ timeout: 15000 })
  })
})

// ---------------------------------------------------------------------------
// Suite 3: Scope restriction — admin_daerah cannot target "Semua"
// ---------------------------------------------------------------------------

test.describe('Scope restriction (admin_daerah)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminDaerah(page)
    await page.goto('/notifikasi')
    await page.waitForLoadState('domcontentloaded')
  })

  test('should not show "Semua" scope option for admin daerah', async ({ page }) => {
    // Admin daerah should still see the Kirim Notifikasi button
    await expect(
      page.locator('button:has-text("Kirim Notifikasi")')
    ).toBeVisible({ timeout: 15000 })

    await page.locator('button:has-text("Kirim Notifikasi")').click()
    await expect(page.locator('textarea#notif-body')).toBeVisible({ timeout: 15000 })

    // The scope dropdown is rendered as a <select> by InputFilter.
    // For admin_daerah, SCOPE_OPTIONS_ADMIN_DAERAH is used — no 'all' option.
    const scopeSelect = page.locator('select#notif-scope')
    await expect(scopeSelect).toBeVisible({ timeout: 10000 })

    // 'all' value must NOT be present as an option
    await expect(scopeSelect.locator('option[value="all"]')).toHaveCount(0)

    // First option should be "Seluruh Daerah Saya" (value="daerah")
    const firstOption = scopeSelect.locator('option').first()
    await expect(firstOption).toHaveAttribute('value', 'daerah')
  })
})
