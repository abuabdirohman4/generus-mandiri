# E2E Testing Patterns & Lessons Learned

Dokumen ini berisi pola, aturan, dan lessons learned dari pengembangan E2E tests di project Generus Mandiri. **Baca ini sebelum menulis atau memodifikasi E2E tests.**

---

## 🏗️ Arsitektur Test

### File Structure
```
tests/
  e2e/
    auth.spec.ts          # Login/logout tests
    dashboard.spec.ts     # Dashboard & navigation tests
    attendance.spec.ts    # Absensi/meeting tests
    students.spec.ts      # Data siswa tests
    permissions.spec.ts   # Role-based access control tests
    helpers/
      auth.ts             # Login helpers per role
  global-setup.ts         # Buat test users & org (persistent)
  global-teardown.ts      # No-op (users persistent)
  QUICK_START.md
  MULTI_ROLE_TESTING.md
```

### Test Organization IDs (Hardcoded, Persistent)
```typescript
const TEST_DAERAH_ID   = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const TEST_DESA_ID     = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const TEST_KELOMPOK_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const TEST_CLASS_ID    = '11111111-aaaa-aaaa-aaaa-111111111111';
```

### Test Users (Persistent, Tidak Pernah Dihapus)
| Username | Role | Scope |
|---|---|---|
| `admin_daerah_test` | admin | daerah `eeee...` |
| `admin_desa_test` | admin | desa `ffff...` |
| `admin_kelompok_test` | admin | kelompok `dddd...` |
| `guru_daerah_test` | teacher | daerah `eeee...` |
| `guru_desa_test` | teacher | desa `ffff...` |
| `guru_kelompok_test` | teacher | kelompok `dddd...` |

Password format: `{username}_password` (e.g. `admin_daerah_password`)

---

## 🚨 Critical Rules

### 1. JANGAN gunakan `waitForLoadState('networkidle')`
Supabase cloud menyebabkan `networkidle` tidak pernah tercapai → test timeout.

```typescript
// ❌ JANGAN
await page.waitForLoadState('networkidle');

// ✅ GUNAKAN
await page.waitForLoadState('domcontentloaded');
// atau tunggu element spesifik
await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
```

### 2. Login flow harus sequential, BUKAN Promise.all
Race condition terjadi kalau waitForURL dan click dijalankan bersamaan.

```typescript
// ❌ JANGAN - race condition
await Promise.all([
  page.waitForURL(/home/),
  page.waitForLoadState('networkidle'),
  page.click('button[type="submit"]'),
]);

// ✅ GUNAKAN - sequential
await page.click('button[type="submit"]');
await page.waitForURL(/.*home/, { timeout: 45000 });
```

### 3. Selalu tambah timeout pada `toBeVisible()`
Default timeout (5000ms) terlalu pendek untuk Supabase cloud.

```typescript
// ❌ JANGAN
await expect(element).toBeVisible();

// ✅ GUNAKAN
await expect(element).toBeVisible({ timeout: 15000 });
```

### 4. JANGAN gunakan conditional `test.skip()` untuk data
Ini menyembunyikan masalah selector yang salah.

```typescript
// ❌ JANGAN - menyembunyikan masalah
const count = await element.count();
if (count === 0) test.skip();

// ✅ GUNAKAN - tunggu data load dengan timeout
await expect(element).toBeVisible({ timeout: 20000 });
```

### 5. Clear cookies sebelum login role berbeda
Mencegah session pollution antar describe block.

```typescript
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await loginAsGuruKelompok(page);
});
```

---

## 🎯 Selector Patterns

### Ant Design Components
Ant Design **tidak** menggunakan `<select>` atau `.ant-select` sebagai input aktual.
Filter/select dirender sebagai `<input role="textbox">` dengan placeholder.

```typescript
// ❌ JANGAN
page.locator('select, .ant-select')

// ✅ GUNAKAN
page.locator('input[placeholder="Pilih Daerah"]')
page.locator('input[placeholder*="Pilih"]')
```

### Meeting Cards di Absensi
Meeting dirender sebagai `<Link href="/absensi/{id}">`, bukan table row.

```typescript
// ❌ JANGAN
page.locator('[data-testid="meeting-item"], .meeting-card, tr[role="row"]')

// ✅ GUNAKAN
page.locator('a[href^="/absensi/"]').first()
```

### Student Table Rows
Custom DataTable menggunakan `<tr>` biasa, bukan `data-row-key` (Ant Design pattern).
Row **tidak punya onClick** — navigasi ke detail hanya via klik nama (Link) atau icon aksi.

```typescript
// ❌ JANGAN - klik row tidak trigger navigasi
page.locator('tr[data-row-key], .student-row')
page.locator('tbody tr').first()

// ✅ GUNAKAN - klik nama siswa (Link ke /users/siswa/{id})
page.locator('a[href^="/users/siswa/"]').first()
```

### Button di Halaman Absensi
Tombol "Buat Pertemuan Baru" menggunakan `title` attribute, bukan inner text.

```typescript
// ❌ JANGAN
page.locator('button:has-text("Buat")')

// ✅ GUNAKAN
page.locator('button[title*="Buat"], button:has-text("Buat")')
```

### Sidebar Navigation
Sidebar menggunakan `a[href="/path"]` untuk navigation links.

```typescript
// ✅ GUNAKAN
page.locator('a[href="/home"]')
page.locator('a[href="/absensi"]')
```

### Quick Action Cards di Dashboard
Cards adalah div dengan cursor pointer, bukan `<a>` tag. Target via h3 text.

```typescript
// ❌ JANGAN
page.locator('a:has-text("Absensi")')

// ✅ GUNAKAN
page.locator('h3:has-text("Absensi")')
```

---

## 🔒 Permission Testing Patterns

### Client-Side Redirect (PENTING)
Beberapa halaman menggunakan client-side redirect via `useEffect` setelah `userProfile` di-load.
Ini berarti halaman **sempat render skeleton** sebelum redirect terjadi.

Halaman yang punya client-side redirect:
- `/organisasi` → redirect teacher & admin kelompok ke `/home`
- `/users/admin` → redirect teacher & admin kelompok ke `/home`
- `/users/guru` → redirect teacher ke `/home`
- `/kelas` → redirect teacher ke `/home`

```typescript
// ❌ JANGAN - cek URL langsung setelah goto
await page.goto('/organisasi');
await page.waitForLoadState('domcontentloaded');
const url = page.url(); // Masih di /organisasi! Redirect belum selesai

// ✅ GUNAKAN - tunggu redirect selesai
await page.goto('/organisasi');
await expect(page).not.toHaveURL(/.*organisasi/, { timeout: 15000 });
```

### Verifikasi Akses Role
Pattern yang benar untuk test "tidak boleh akses":

```typescript
test('should be redirected away from restricted page', async ({ page }) => {
  await page.context().clearCookies();
  await loginAsGuruKelompok(page);

  await page.goto('/users/admin');
  // Tunggu client-side redirect selesai
  await expect(page).not.toHaveURL(/.*users\/admin/, { timeout: 15000 });
});
```

### Session Pollution Antar Tests
Dalam mode `serial`, cookie dari test sebelumnya bisa mempengaruhi test berikutnya.
Selalu `clearCookies()` di `beforeEach` untuk describe block yang login sebagai role berbeda.

---

## 🌐 Network & Connection Patterns

### Supabase Cloud Error (Bukan Test Failure)
Error berikut di WebServer log adalah **masalah jaringan sementara**, bukan bug kode:
```
getaddrinfo ENOTFOUND eahntxowlefjaizjoqys.supabase.co
502 Bad Gateway
SocketError: other side closed
```
Test tetap bisa pass kalau koneksi pulih sebelum timeout.

### Global Setup Hang
Jika Playwright hang di dotenv injection tanpa output "🔧 Setting up...", kemungkinan:
1. **Dev server tidak responding** → cek `curl localhost:3000`
2. **Proses zombie dari run sebelumnya** → restart komputer atau `kill $(lsof -ti:3000)`
3. **Webpack cache corruption** → hapus `node_modules/.cache` dan rebuild

---

## 📋 Global Setup Rules

### Email WAJIB di Profile Upsert
Login action membaca `email` dari tabel `profiles`. Kalau `email: null`, login gagal dengan "Email tidak ditemukan".

```typescript
// ✅ WAJIB ada email di profile upsert
await supabase.from('profiles').upsert({
  id: authUser.user.id,
  full_name: user.full_name,
  username: user.username,
  email: user.email,  // ← JANGAN LUPA INI
  role: user.role,
  daerah_id: user.daerah_id || null,
  desa_id: user.desa_id || null,
  kelompok_id: user.kelompok_id || null,
});
```

### Teacher Profile WAJIB punya `daerah_id`
Constraint `profiles_teacher_org_hierarchy_check` mensyaratkan `daerah_id IS NOT NULL` untuk teacher.

```typescript
// ✅ Semua teacher harus punya daerah_id
{
  role: 'teacher',
  daerah_id: TEST_DAERAH_ID,  // ← WAJIB
  desa_id: TEST_DESA_ID,      // optional
  kelompok_id: TEST_KELOMPOK_ID, // optional
}
```

### Meetings WAJIB punya `student_snapshot`
`getMeetingsWithStats` akan crash dengan `.length` error kalau `student_snapshot` null.
Pastikan seed meeting punya `student_snapshot` berisi array JSON student IDs.

---

## 🏃 Menjalankan Test

### Full Suite
```bash
npm run test:e2e
```

### File Spesifik
```bash
npx playwright test tests/e2e/permissions.spec.ts --reporter=line
```

### Test Spesifik (by name pattern)
```bash
npx playwright test --grep "Permission" --reporter=line
npx playwright test --grep "Guru Kelompok" --reporter=line
```

### Hasil Normal
- **41-44 passed** = OK
- **2-3 skipped** = OK (conditional skip karena data/UI)
- **0 failed** = Target

### Retry Count
`retries: 1` di config → test yang fail dijalankan ulang 1x.
Ini menyebabkan counter `[60/44]` pada output — normal.

---

## 🐛 Known Issues & Workarounds

### XAMPP `head` Override
PATH mengandung XAMPP `head` yang override system `head`. Gunakan absolute path atau avoid piping ke `head` di bash commands.

### Warp Terminal Backslash Warning
Warp menampilkan "Contains backslash-escaped whitespace" karena path project mengandung spasi (`Open Source`). **Selalu accept** prompt ini.

### `test.describe.skip()` vs `test.skip()`
- `test.describe.skip()` → skip seluruh describe block (gunakan ini untuk sementara disable)
- `test.skip()` → skip test individual (HINDARI untuk conditional skip berdasarkan data)
- Untuk re-enable: ganti `test.describe.skip(` dengan `test.describe(`

---

## ✅ Checklist Sebelum Menulis Test Baru

- [ ] Gunakan `domcontentloaded` bukan `networkidle`
- [ ] Semua `toBeVisible()` punya `{ timeout: 15000 }`
- [ ] Login flow sequential (bukan Promise.all)
- [ ] Selector tidak pakai `data-row-key`, `.ant-select`, atau `tr[role="row"]`
- [ ] Permission test pakai `expect(page).not.toHaveURL()` bukan cek URL manual
- [ ] `clearCookies()` di beforeEach untuk role switch
- [ ] Tidak ada conditional `test.skip()` berdasarkan data
