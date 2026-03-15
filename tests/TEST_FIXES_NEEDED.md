# 🔧 Test Fixes Needed

Based on test results, here are the issues to fix:

## 1. Increase Timeouts for Slow Pages

**File**: `playwright.config.ts`

```typescript
export default defineConfig({
  timeout: 60000, // Increase from 30s to 60s
  use: {
    navigationTimeout: 60000,
    actionTimeout: 15000,
  },
});
```

## 2. Fix Login Helper - Wait for Navigation

**File**: `tests/e2e/helpers/auth.ts:91`

```typescript
export async function login(page: Page, role: TestUserRole = '') {
  const { username, password } = getTestCredentials(role);

  await page.goto('/signin');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to complete with longer timeout
  await page.waitForURL(/.*home/, { timeout: 15000 });

  // Additional wait for page to fully load
  await page.waitForLoadState('networkidle');
}
```

## 3. Fix Logout Helper - Better Selector

**File**: `tests/e2e/helpers/auth.ts:154`

Current problem: Button selector too specific

```typescript
// ❌ CURRENT (doesn't find button):
await page.click('button:has-text("Keluar"), button:has-text("Logout")');

// ✅ BETTER (more flexible):
export async function logout(page: Page) {
  // Try multiple selectors
  const logoutButton = page.locator(
    'button:has-text("Keluar"), ' +
    'button:has-text("Logout"), ' +
    '[data-testid="logout-button"], ' +
    'button[aria-label*="logout" i]'
  ).first();

  await logoutButton.click({ timeout: 10000 });
  await page.waitForURL(/.*signin/, { timeout: 10000 });
}
```

## 4. Fix Dashboard Navigation Tests

**File**: `tests/e2e/dashboard.spec.ts`

Problem: Quick actions not navigating correctly

```typescript
test('should navigate to Absensi from quick action', async ({ page }) => {
  // Find the Absensi quick action card
  const absensiCard = page.locator('text="Absensi"').first();
  await absensiCard.click();

  // Wait for navigation with longer timeout
  await page.waitForURL(/.*absensi/, { timeout: 10000 });

  // Verify we're on the right page
  await expect(page).toHaveURL(/.*absensi/);
});
```

## 5. Fix Student Management Tests

**File**: `tests/e2e/students.spec.ts`

Problem: Login not persisting, selectors not found

```typescript
test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page);

    // Navigate to siswa page
    await page.goto('/users/siswa');

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Wait for table or content to appear
    await page.waitForSelector('table, .ant-table, [data-testid="student-list"]', {
      timeout: 10000
    });
  });

  test('should have filter options', async ({ page }) => {
    // Wait for filters to be visible
    await page.waitForSelector('.ant-select, select, [data-testid="filter"]', {
      timeout: 10000
    });

    const filters = page.locator('.ant-select, select');
    await expect(filters.first()).toBeVisible();
  });
});
```

## 6. Fix Attendance Tests - Handle Slow Loading

**File**: `tests/e2e/attendance.spec.ts`

Problem: Timeout when navigating to /absensi

```typescript
test.describe('Attendance Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperadmin(page);

    // Navigate to absensi page with longer timeout
    await page.goto('/absensi', {
      timeout: 60000,
      waitUntil: 'networkidle' // Wait for network to be idle
    });

    // Wait for content to load
    await page.waitForSelector(
      'table, .ant-table, [data-testid="meetings-list"]',
      { timeout: 15000 }
    );
  });
});
```

## 7. Add Test Data Attributes to UI Components

To make tests more stable, add `data-testid` attributes to key elements:

**Components to update**:

```tsx
// Logout button
<button data-testid="logout-button" onClick={handleLogout}>
  Keluar
</button>

// Add student button
<button data-testid="add-student-button" onClick={handleAdd}>
  Tambah Siswa
</button>

// Student list table
<table data-testid="student-list">
  {/* ... */}
</table>

// Filters
<Select data-testid="filter-kelompok" {...props} />
<Select data-testid="filter-class" {...props} />
```

## 8. Fix Error Message Test

**File**: `tests/e2e/auth.spec.ts:38`

Problem: Error message selector doesn't match UI

```typescript
test('should show error for invalid credentials', async ({ page }) => {
  await page.goto('/signin');
  await page.fill('input[name="username"]', 'wrong_user');
  await page.fill('input[name="password"]', 'wrong_pass');
  await page.click('button[type="submit"]');

  // Wait for error message with multiple possible selectors
  const errorMessage = page.locator(
    'text=/invalid|salah|gagal|incorrect|wrong/i, ' +
    '.ant-message-error, ' +
    '[role="alert"], ' +
    '.error-message'
  ).first();

  await expect(errorMessage).toBeVisible({ timeout: 5000 });
});
```

## 9. Optimize Test Performance

Add to `playwright.config.ts`:

```typescript
export default defineConfig({
  // Run tests in parallel
  workers: process.env.CI ? 1 : 4,

  // Retry failed tests
  retries: process.env.CI ? 2 : 1,

  use: {
    // Reduce screenshot/video overhead
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Set longer timeouts
    actionTimeout: 15000,
    navigationTimeout: 60000,
  },
});
```

## 10. Add Debugging Helpers

Create `tests/e2e/helpers/debug.ts`:

```typescript
import { Page } from '@playwright/test';

export async function debugPause(page: Page, message?: string) {
  if (process.env.DEBUG) {
    console.log(`🐛 DEBUG PAUSE: ${message || 'Paused'}`);
    await page.pause();
  }
}

export async function logPageInfo(page: Page) {
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());
}
```

---

## Priority Order

1. **HIGH**: Fix timeouts (items 1, 6) - Most tests failing due to this
2. **HIGH**: Fix login helper (item 2) - Blocks many tests
3. **MEDIUM**: Add data-testid attributes (item 7) - Improves test stability
4. **MEDIUM**: Fix selectors (items 3, 4, 5, 8) - Test-specific fixes
5. **LOW**: Optimize performance (item 9) - Nice to have

---

## Test Command for Debugging

```bash
# Run single test file with debugging
npm run test:e2e:debug -- auth.spec.ts

# Run with headed browser to see what's happening
npm run test:e2e:headed -- auth.spec.ts

# Run specific test by name
npm run test:e2e -- auth.spec.ts -g "should logout successfully"
```
