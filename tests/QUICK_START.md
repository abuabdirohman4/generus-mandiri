# 🚀 Quick Start: Testing Guide

## ✅ Setup Complete!

Playwright E2E testing sudah terinstall dan siap digunakan!

**Total Tests**: 22 test cases di 4 files

## 🔒 IMPORTANT: Setup Credentials First!

### Before running tests, copy the environment file:

```bash
cp .env.test.example .env.test
```

Then edit `.env.test` with your test credentials.

**⚠️ NEVER commit `.env.test` to Git!** (Already in .gitignore)

For security details, read: **[tests/SECURITY.md](SECURITY.md)**

---

## 📋 How to Run Tests

### 1️⃣ Start Development Server

**Terminal 1** - Jalankan server dulu:
```bash
npm run dev
```

Tunggu sampai muncul:
```
✓ Ready in 3.5s
○ Local:        http://localhost:3000
```

### 2️⃣ Run Tests

**Terminal 2** - Pilih salah satu cara:

**Option A: UI Mode** (Recommended for beginners 🌟)
```bash
npm run test:e2e:ui
```
- Interactive UI untuk run & debug tests
- Lihat test execution real-time
- Inspect elements
- Time travel debugging

**Option B: Headless Mode** (Fast, untuk CI/CD)
```bash
npm run test:e2e
```
- Run semua tests tanpa browser UI
- Fast execution
- Good for automation

**Option C: Headed Mode** (See browser in action)
```bash
npm run test:e2e:headed
```
- Lihat browser beraksi
- Useful untuk understand test flow

**Option D: Debug Mode** (Step-by-step)
```bash
npm run test:e2e:debug
```
- Debugging dengan Playwright Inspector
- Step through tests line by line

### 3️⃣ View Test Report

Setelah test selesai:
```bash
npm run test:e2e:report
```

Opens HTML report dengan:
- Test results summary
- Screenshots on failure
- Video recordings
- Trace files

## 📊 Test Coverage Saat Ini

✅ **Authentication** (4 tests)
- Login page display
- Successful login
- Invalid credentials error
- Logout

✅ **Dashboard** (5 tests)
- Quick actions display
- Navigation from quick actions
- Sidebar navigation
- User profile

✅ **Attendance** (5 tests)
- Page display
- Create meeting button
- Meeting modal
- Filters
- Navigation to detail

✅ **Students** (8 tests)
- List display
- Statistics
- Filters & search
- Add student modal
- Table display
- Detail navigation

## 🎯 Running Specific Tests

**Run single file:**
```bash
npx playwright test auth.spec.ts
```

**Run single test:**
```bash
npx playwright test -g "should login as superadmin"
```

**Run tests matching pattern:**
```bash
npx playwright test -g "should display"
```

## 🛠️ Troubleshooting

### ❌ Error: "Navigation timeout"

**Problem**: Server tidak running atau port berbeda

**Solution**:
```bash
# Stop all node processes
pkill node

# Start dev server
npm run dev

# Wait until "Ready", then run tests
npm run test:e2e:ui
```

### ❌ Error: "Browser not installed"

**Solution**:
```bash
npx playwright install chromium
```

### ❌ Tests failing because of data

**CRITICAL**: Jangan test ke production!

**Solutions**:
1. Use dummy data di localhost
2. Use separate test database
3. Use staging environment

## 📚 Next Steps

### Add More Tests

1. Copy existing test file sebagai template
2. Modify untuk feature baru
3. Run & verify
4. Commit!

Example:
```bash
cp tests/e2e/students.spec.ts tests/e2e/teachers.spec.ts
# Edit teachers.spec.ts
npm run test:e2e:ui
```

### Learn More

- **E2E Testing Guide**: `tests/e2e/README.md`
- **Playwright Docs**: https://playwright.dev
- **Best Practices**: `docs/claude/testing-guidelines.md`

## 🎨 Pro Tips

1. **Always use UI mode saat development**
   ```bash
   npm run test:e2e:ui
   ```

2. **Use `.only` untuk focus single test**
   ```typescript
   test.only('should login', async ({ page }) => { ... })
   ```

3. **Use `.skip` untuk skip broken tests temporarily**
   ```typescript
   test.skip('todo: fix this test', async ({ page }) => { ... })
   ```

4. **Check test results folder**
   - `test-results/` - Screenshots & videos
   - `playwright-report/` - HTML report

5. **Use data-testid untuk stable selectors**
   ```typescript
   // In component
   <button data-testid="add-student">Tambah</button>

   // In test
   await page.click('[data-testid="add-student"]');
   ```

## 🚨 Important Reminders

### ⚠️ NEVER Test on Production Database

- ❌ Don't run tests against https://generus.abuabdirohman.com
- ✅ Always test on localhost:3000 with dummy data
- ✅ Use separate test database if needed

### ⚠️ Clean Up Test Data

If you create data during tests:
- Delete it in `afterEach()` hook
- Or use database transactions
- Or reset database before test run

### ⚠️ Test Independence

Each test should:
- Work standalone
- Not depend on other tests
- Clean up after itself

## 🎓 Learning Path

1. **Day 1**: Run existing tests dengan UI mode
2. **Day 2**: Understand test structure & selectors
3. **Day 3**: Write your first test
4. **Day 4**: Add tests untuk critical features
5. **Day 5**: Setup CI/CD automation (future)

---

**Happy Testing! 🎭**

Kalau ada pertanyaan, check `tests/e2e/README.md` atau dokumentasi Playwright.
