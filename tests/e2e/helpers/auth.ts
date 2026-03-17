/**
 * Authentication helper functions for E2E tests
 * Uses environment variables to avoid hardcoded credentials
 */

import { Page } from '@playwright/test';

/**
 * User role type for testing
 */
export type TestUserRole =
  | 'superadmin'
  | 'admin_daerah'
  | 'admin_desa'
  | 'admin_kelompok'
  | 'guru_daerah'
  | 'guru_desa'
  | 'guru_kelompok';

/**
 * Get test credentials from environment variables
 * Throws error if credentials are not set
 */
export function getTestCredentials(role: TestUserRole = 'superadmin') {
  const credentialsMap: Record<
    TestUserRole,
    { usernameKey: string; passwordKey: string }
  > = {
    superadmin: {
      usernameKey: 'TEST_SUPERADMIN_USERNAME',
      passwordKey: 'TEST_SUPERADMIN_PASSWORD',
    },
    admin_daerah: {
      usernameKey: 'TEST_ADMIN_DAERAH_USERNAME',
      passwordKey: 'TEST_ADMIN_DAERAH_PASSWORD',
    },
    admin_desa: {
      usernameKey: 'TEST_ADMIN_DESA_USERNAME',
      passwordKey: 'TEST_ADMIN_DESA_PASSWORD',
    },
    admin_kelompok: {
      usernameKey: 'TEST_ADMIN_KELOMPOK_USERNAME',
      passwordKey: 'TEST_ADMIN_KELOMPOK_PASSWORD',
    },
    guru_daerah: {
      usernameKey: 'TEST_GURU_DAERAH_USERNAME',
      passwordKey: 'TEST_GURU_DAERAH_PASSWORD',
    },
    guru_desa: {
      usernameKey: 'TEST_GURU_DESA_USERNAME',
      passwordKey: 'TEST_GURU_DESA_PASSWORD',
    },
    guru_kelompok: {
      usernameKey: 'TEST_GURU_KELOMPOK_USERNAME',
      passwordKey: 'TEST_GURU_KELOMPOK_PASSWORD',
    },
  };

  const { usernameKey, passwordKey } = credentialsMap[role];
  const username = process.env[usernameKey];
  const password = process.env[passwordKey];

  if (!username || !password) {
    throw new Error(
      `Test credentials not found for role "${role}"!\n` +
        `Please add ${usernameKey} and ${passwordKey} to your .env.test file.\n` +
        `Copy .env.test.example to .env.test if you haven't already.`
    );
  }

  return {
    username,
    password,
    role,
  };
}

/**
 * Generic login helper function
 * Usage: await login(page, 'admin_kelompok');
 */
export async function login(page: Page, role: TestUserRole = 'superadmin') {
  const { username, password } = getTestCredentials(role);

  const attemptLogin = async () => {
    await page.goto('/signin');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*home/, { timeout: 45000 });
  };

  try {
    await attemptLogin();
  } catch {
    // Retry once - server may have been busy (ECONNRESET, warm-up)
    await page.waitForTimeout(2000);
    await attemptLogin();
  }
}

/**
 * Login as Superadmin (full access)
 * Usage: await loginAsSuperadmin(page);
 */
export async function loginAsSuperadmin(page: Page) {
  return login(page, 'superadmin');
}

/**
 * Login as Admin Daerah (regional admin)
 * Usage: await loginAsAdminDaerah(page);
 */
export async function loginAsAdminDaerah(page: Page) {
  return login(page, 'admin_daerah');
}

/**
 * Login as Admin Desa (village admin)
 * Usage: await loginAsAdminDesa(page);
 */
export async function loginAsAdminDesa(page: Page) {
  return login(page, 'admin_desa');
}

/**
 * Login as Admin Kelompok (group admin)
 * Usage: await loginAsAdminKelompok(page);
 */
export async function loginAsAdminKelompok(page: Page) {
  return login(page, 'admin_kelompok');
}

/**
 * Login as Guru Daerah (regional teacher)
 * Usage: await loginAsGuruDaerah(page);
 */
export async function loginAsGuruDaerah(page: Page) {
  return login(page, 'guru_daerah');
}

/**
 * Login as Guru Desa (village teacher)
 * Usage: await loginAsGuruDesa(page);
 */
export async function loginAsGuruDesa(page: Page) {
  return login(page, 'guru_desa');
}

/**
 * Login as Guru Kelompok (group teacher)
 * Usage: await loginAsGuruKelompok(page);
 */
export async function loginAsGuruKelompok(page: Page) {
  return login(page, 'guru_kelompok');
}

/**
 * Logout helper function
 * Usage: await logout(page);
 */
export async function logout(page: Page) {
  await page.click('button:has-text("Keluar"), button:has-text("Logout")');
  await page.waitForURL(/.*signin/, { timeout: 5000 });
}

/**
 * Check if user has specific role after login
 * Useful for verifying role-based access
 */
export async function verifyUserRole(page: Page, expectedRole: string) {
  // This can be implemented based on your UI
  // For example, check for role indicator in UI
  // Or check which menu items are visible

  // Example implementation (adjust based on your UI):
  // const roleIndicator = await page.locator('[data-testid="user-role"]').textContent();
  // return roleIndicator?.toLowerCase().includes(expectedRole.toLowerCase());

  return true; // Placeholder - implement based on your UI
}
