# E2E Testing dengan Playwright

## 📖 Overview

End-to-end tests untuk Generus Mandiri menggunakan Playwright. Tests ini mensimulasikan user interactions yang real untuk memastikan aplikasi berfungsi dengan baik dari perspektif user.

## 🚀 Quick Start

### 1. Install Dependencies (Sudah Dilakukan)

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### 2. Jalankan Development Server

**PENTING**: Pastikan server development berjalan sebelum run tests!

```bash
npm run dev
```

Tunggu sampai server running di http://localhost:3000

### 3. Run Tests

**Headless mode** (default, tanpa browser UI):
```bash
npm run test:e2e
```

**UI mode** (interactive, recommended untuk development):
```bash
npm run test:e2e:ui
```

**Headed mode** (lihat browser beraksi):
```bash
npm run test:e2e:headed
```

**Debug mode** (step-by-step debugging):
```bash
npm run test:e2e:debug
```

**Lihat test report**:
```bash
npm run test:e2e:report
```

## 📁 Test Files

```
tests/e2e/
├── auth.spec.ts        # Login, logout, authentication tests
├── dashboard.spec.ts   # Dashboard & navigation tests
├── attendance.spec.ts  # Meeting creation & attendance recording
└── students.spec.ts    # Student CRUD & filtering tests
```

## 📝 Test Coverage

### ✅ Sudah Tested:

1. **Authentication** (`auth.spec.ts`)
   - Login page display
   - Successful login (superadmin)
   - Invalid credentials error
   - Logout functionality

2. **Dashboard** (`dashboard.spec.ts`)
   - Quick action cards display
   - Navigation from quick actions
   - Sidebar navigation
   - User profile display

3. **Attendance Management** (`attendance.spec.ts`)
   - Absensi page display
   - Create meeting button
   - Meeting filters
   - Meeting detail navigation

4. **Student Management** (`students.spec.ts`)
   - Student list display
   - Statistics cards
   - Filters & search
   - Add student modal
   - Student detail navigation

### 🚧 TODO (Belum Ada Tests):

- Class management (kelas)
- Teacher management (guru)
- Admin management
- Report generation (laporan)
- Report cards (rapot)
- Learning materials (materi)
- Organizational management (organisasi)

## 🎯 Best Practices

### 1. **Gunakan Data Dummy untuk Testing**

**JANGAN test ke production database!** Selalu test di:
- Localhost dengan dummy data
- Database terpisah untuk testing
- Preview/staging environment

### 2. **Test Independence**

Setiap test harus bisa berjalan sendiri (independent). Jangan bergantung pada order execution atau state dari test lain.

```typescript
// ✅ GOOD - Login di beforeEach using helper
import { loginAsSuperadmin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsSuperadmin(page);
});

// ❌ BAD - Expect login sudah done dari test sebelumnya
test('should do something', async ({ page }) => {
  // Assumes already logged in from previous test
  await page.goto('/dashboard');
});
```

### 3. **Use Test IDs untuk Stability**

Prefer `data-testid` attributes daripada selector yang fragile:

```typescript
// ✅ GOOD - Stable selector
await page.click('[data-testid="add-student-button"]');

// ⚠️ OK - Text-based, language dependent
await page.click('button:has-text("Tambah Siswa")');

// ❌ BAD - Fragile, depends on styling
await page.click('.bg-blue-500.px-4.py-2');
```

### 4. **Wait for Network Idle**

Tunggu data loading sebelum assert:

```typescript
await page.waitForLoadState('networkidle');
const count = await page.locator('.student-row').count();
expect(count).toBeGreaterThan(0);
```

### 5. **Screenshot & Video on Failure**

Sudah configured di `playwright.config.ts`:
- Screenshot: Auto-capture on failure
- Video: Retained on failure
- Trace: Captured on first retry

Lihat hasil di `test-results/` dan `playwright-report/`

## 🛠️ Troubleshooting

### Tests Gagal dengan "Navigation timeout"

**Solusi**: Pastikan dev server sudah running di port 3000
```bash
# Terminal 1
npm run dev

# Terminal 2 (after server ready)
npm run test:e2e
```

### Tests Gagal karena Element Tidak Found

**Debug dengan UI mode**:
```bash
npm run test:e2e:ui
```

Atau debug mode untuk step-by-step:
```bash
npm run test:e2e:debug
```

### Browser Tidak Terinstall

Jalankan:
```bash
npx playwright install chromium
```

## 📊 CI/CD Integration (Future)

Untuk GitHub Actions atau CI/CD:

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 🎓 Learning Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Best Practices**: https://playwright.dev/docs/best-practices
- **Selectors Guide**: https://playwright.dev/docs/selectors
- **Testing Library**: https://testing-library.com/docs/queries/about

## 🤝 Contributing

Saat menambah fitur baru, **SELALU tambahkan E2E tests**!

1. Buat file test baru di `tests/e2e/`
2. Follow naming convention: `feature-name.spec.ts`
3. Test critical user flows
4. Run tests sebelum commit
5. Update README ini jika ada pattern baru
