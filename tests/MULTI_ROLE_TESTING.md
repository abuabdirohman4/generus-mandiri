# 🎭 Multi-Role Testing Guide

## Overview

Aplikasi Generus Mandiri memiliki berbagai role dengan permission yang berbeda-beda. Testing harus memastikan setiap role hanya bisa mengakses fitur sesuai permission mereka.

---

## 📋 Available Test Roles

### 1. **Superadmin** (`superadmin`)
- **Access**: Full access ke semua fitur
- **Scope**: Semua organisasi
- **Can Do**: Semua operasi (CRUD semua data, manage organisasi, manage users)

### 2. **Admin Daerah** (`admin_daerah`)
- **Access**: Admin-level features
- **Scope**: Semua kelompok dalam daerah yang assigned
- **Can Do**: Manage students/teachers/classes dalam daerah, create meetings, view reports

### 3. **Admin Desa** (`admin_desa`)
- **Access**: Limited admin features
- **Scope**: Semua kelompok dalam desa yang assigned
- **Can Do**: View data desa-level, create SAMBUNG_DESA meetings only

### 4. **Admin Kelompok** (`admin_kelompok`)
- **Access**: Admin-level features
- **Scope**: Satu kelompok saja
- **Can Do**: Manage students/teachers/classes dalam kelompok, create meetings, view reports

### 5. **Guru Daerah** (`guru_daerah`)
- **Access**: Teacher features
- **Scope**: Semua classes dalam daerah yang assigned
- **Can Do**: Take attendance, view students, create meetings untuk classes mereka

### 6. **Guru Desa** (`guru_desa`)
- **Access**: Teacher features
- **Scope**: Classes dalam desa yang assigned
- **Can Do**: Take attendance, view students, create meetings untuk classes mereka

### 7. **Guru Kelompok** (`guru_kelompok`)
- **Access**: Teacher features
- **Scope**: Assigned classes only
- **Can Do**: Take attendance, view assigned students, create meetings untuk assigned classes

---

## 🔧 Setup Test Users

### Step 1: Create Test Users in Database

Anda perlu create test users untuk setiap role. **PENTING**: Gunakan database terpisah untuk testing!

```sql
-- Example: Create test admin kelompok
-- Replace placeholders with your actual test data
INSERT INTO auth.users (id, email, encrypted_password)
VALUES (
  '<test-user-uuid>',
  '<test_email@example.com>',
  crypt('<your_test_password>', gen_salt('bf'))
);

INSERT INTO profiles (id, full_name, role, kelompok_id)
VALUES (
  '<test-user-uuid>',  -- Same UUID as above
  '<Test User Full Name>',
  'admin',
  '<kelompok-uuid>'
);

-- Repeat for other roles with different UUIDs and emails...
```

### Step 2: Configure .env.test

Copy template dan fill dengan credentials:

```bash
cp .env.test.example .env.test
```

Edit `.env.test`:
```bash
# Use your actual test credentials here
# DO NOT use production credentials!
# DO NOT commit this file to git!

TEST_SUPERADMIN_USERNAME=<your_test_superadmin_username>
TEST_SUPERADMIN_PASSWORD=<your_test_superadmin_password>

TEST_ADMIN_DAERAH_USERNAME=<your_test_admin_daerah_username>
TEST_ADMIN_DAERAH_PASSWORD=<your_test_admin_daerah_password>

# ... dan seterusnya untuk semua roles
```

---

## 📝 Writing Role-Based Tests

### Example 1: Test dengan Single Role

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdminKelompok } from './helpers/auth';

test.describe('Admin Kelompok Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminKelompok(page);
  });

  test('should be able to manage students', async ({ page }) => {
    await page.goto('/users/siswa');

    // Should see add student button
    await expect(
      page.locator('button:has-text("Tambah Siswa")')
    ).toBeVisible();
  });

  test('should NOT access organizational management', async ({ page }) => {
    await page.goto('/organisasi');

    // Should be redirected or show error
    await expect(page).not.toHaveURL(/.*organisasi/);
  });
});
```

### Example 2: Test dengan Multiple Roles

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

const roles = ['admin_kelompok', 'guru_kelompok'] as const;

roles.forEach((role) => {
  test.describe(`${role} - Dashboard Access`, () => {
    test(`${role} can access dashboard`, async ({ page }) => {
      await login(page, role);

      await page.goto('/home');
      await expect(page).toHaveURL(/.*home/);
      await expect(page.locator('text=/selamat datang/i')).toBeVisible();
    });
  });
});
```

### Example 3: Permission Boundary Tests

```typescript
test('teachers should NOT access admin features', async ({ page }) => {
  const teacherRoles = ['guru_daerah', 'guru_desa', 'guru_kelompok'];

  for (const role of teacherRoles) {
    await login(page, role);

    // Try to access admin page
    await page.goto('/users/admin');

    // Should not be allowed
    const url = page.url();
    expect(url).not.toContain('/users/admin');
  }
});
```

---

## 🎯 Helper Functions Reference

### Basic Login
```typescript
import { login } from './helpers/auth';

// Login dengan specific role
await login(page, 'admin_kelompok');
await login(page, 'guru_desa');
```

### Role-Specific Helpers
```typescript
import {
  loginAsSuperadmin,
  loginAsAdminDaerah,
  loginAsAdminDesa,
  loginAsAdminKelompok,
  loginAsGuruDaerah,
  loginAsGuruDesa,
  loginAsGuruKelompok,
} from './helpers/auth';

// More explicit and readable
await loginAsSuperadmin(page);
await loginAsAdminKelompok(page);
await loginAsGuruDesa(page);
```

### Get Credentials Only
```typescript
import { getTestCredentials } from './helpers/auth';

const { username, password, role } = getTestCredentials('admin_kelompok');

// Use credentials manually if needed
await page.fill('input[name="username"]', username);
await page.fill('input[name="password"]', password);
```

---

## 📊 Test Coverage Matrix

Gunakan matrix ini untuk ensure semua role tested:

| Feature | Superadmin | Admin Daerah | Admin Desa | Admin Kelompok | Guru Daerah | Guru Desa | Guru Kelompok |
|---------|:----------:|:------------:|:----------:|:--------------:|:-----------:|:---------:|:-------------:|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Students** | ✅ All | ✅ Daerah | ✅ Desa | ✅ Kelompok | ✅ Classes | ✅ Classes | ✅ Classes |
| **Manage Students** | ✅ All | ✅ Daerah | ✅ Desa | ✅ Kelompok | ❌ | ❌ | ❌ |
| **Manage Teachers** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Admins** | ✅ | ✅ Scope | ✅ Scope | ❌ | ❌ | ❌ | ❌ |
| **Manage Classes** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Meetings** | ✅ All | ✅ All | ⚠️ Sambung Only | ✅ Regular | ✅ Classes | ✅ Classes | ✅ Classes |
| **Take Attendance** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **View Reports** | ✅ All | ✅ Daerah | ✅ Desa | ✅ Kelompok | ✅ Classes | ✅ Classes | ✅ Classes |
| **Manage Rapot** | ✅ | ✅ | ✅ | ✅ | ⚙️ Limited | ⚙️ Limited | ⚙️ Limited |
| **Manage Organisasi** | ✅ | ✅ Scope | ✅ Scope | ✅ Scope | ❌ | ❌ | ❌ |

**Legend:**
- ✅ = Full access
- ⚙️ = Limited/Configurable access
- ⚠️ = Restricted access
- ❌ = No access

---

## 🚀 Running Role-Based Tests

### Run all permission tests
```bash
npm run test:e2e -- permissions.spec.ts
```

### Run specific role tests
```bash
# Test only superadmin
npm run test:e2e -- permissions.spec.ts -g "Superadmin"

# Test only teachers
npm run test:e2e -- permissions.spec.ts -g "Guru"

# Test only admins
npm run test:e2e -- permissions.spec.ts -g "Admin.*Access"
```

### Run with UI mode (recommended for debugging)
```bash
npm run test:e2e:ui -- permissions.spec.ts
```

---

## ⚠️ Important Notes

### 1. **Use Test Database Only**
```bash
# ❌ WRONG - Testing against production
TEST_BASE_URL=https://generus.abuabdirohman.com

# ✅ CORRECT - Testing against localhost
TEST_BASE_URL=http://localhost:3000
```

### 2. **Separate Test Users**
- Jangan gunakan user production untuk testing
- Create dedicated test users dengan prefix `test_` atau `_test`
- Use different passwords dari production

### 3. **Clean Test Data**
```typescript
test.afterEach(async ({ page }) => {
  // Clean up data created during test
  // Or use database transactions
});
```

### 4. **Test Data Consistency**
Ensure test users punya data yang consistent:
- Admin Kelompok → assigned to specific kelompok
- Guru → assigned to specific classes
- Students → enrolled in those classes

---

## 📚 Examples

### Full Example: Test Admin Kelompok Permissions

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdminKelompok, logout } from './helpers/auth';

test.describe('Admin Kelompok Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdminKelompok(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('can access dashboard', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/.*home/);
  });

  test('can manage students in kelompok', async ({ page }) => {
    await page.goto('/users/siswa');

    // Should see students
    await expect(page.locator('table, .student-list')).toBeVisible();

    // Should have add button
    await expect(
      page.locator('button:has-text("Tambah")')
    ).toBeVisible();
  });

  test('can create regular meetings', async ({ page }) => {
    await page.goto('/absensi');

    // Should see create button
    const createBtn = page.locator('button[aria-label*="buat"]');
    await expect(createBtn).toBeVisible();
  });

  test('cannot access organizational management', async ({ page }) => {
    await page.goto('/organisasi');

    // Should be redirected or denied
    await page.waitForTimeout(2000);

    const url = page.url();
    const onOrgPage = url.includes('/organisasi');

    if (onOrgPage) {
      // If on page, should show limited access or error
      await expect(
        page.locator('text=/terbatas|limited|denied/i')
      ).toBeVisible();
    } else {
      // Redirected to home or error page
      expect(url).toMatch(/\/(home|error)/);
    }
  });

  test('cannot access admin management', async ({ page }) => {
    await page.goto('/users/admin');

    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/users/admin');
  });

  test('only sees data in assigned kelompok', async ({ page }) => {
    await page.goto('/users/siswa');
    await page.waitForLoadState('networkidle');

    // Check filter or data scope
    // This depends on your UI implementation
    // Example: verify kelompok filter is pre-selected
  });
});
```

---

## 🎓 Best Practices

1. **Test Permission Boundaries**
   - Always test what user CAN do
   - Always test what user CANNOT do

2. **Use Descriptive Test Names**
   ```typescript
   // ✅ GOOD
   test('admin kelompok cannot access daerah-level org management', ...)

   // ❌ BAD
   test('test org page', ...)
   ```

3. **Group Related Tests**
   ```typescript
   test.describe('Guru Kelompok - Student Management', () => {
     // All guru kelompok student-related tests
   });
   ```

4. **Keep Tests Independent**
   - Each test should work standalone
   - Don't depend on test execution order
   - Clean up after each test

5. **Use Matrix for Comprehensive Coverage**
   - Test each role × each feature
   - Automate with loops when appropriate

---

**Happy Testing! 🎭**

For more info, check:
- [QUICK_START.md](QUICK_START.md)
- [SECURITY.md](SECURITY.md)
- [tests/e2e/permissions.spec.ts](e2e/permissions.spec.ts)
