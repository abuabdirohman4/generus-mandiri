# Plan — sm-ejs — Naik Kelas: Deadline + Bypass Pra Nikah (ganti toggle ON/OFF)

**Issue:** sm-ejs (re-scope total) · GH #111
**Date:** 2026-06-25

---

## Context

Sekarang fitur naik kelas dikontrol **toggle ON/OFF** global (`app_settings.grade_promotion_enabled = {enabled: boolean}`). Admin daerah/superadmin nyalakan saat periode (Juni/Juli), matikan lagi. Menu `/naik-kelas` di sidebar muncul/hilang ikut toggle; page redirect ke `/home` kalau OFF.

**Masalah:** toggle on/off kasar — kalau OFF, semua guru kelompok kehilangan akses, padahal kelas **Pra Nikah** sering perlu tetap bisa naik kapan saja (siswa nikah di luar periode). Dan toggle manual gampang lupa dimatikan.

**Diganti jadi sistem batas waktu (deadline):**
- Admin daerah/superadmin set `end_date` (batas akhir window naik kelas).
- **Guru kelompok**: window aktif (`now <= end_date`) -> bisa pilih semua kelas-nya. Window tutup (lewat / belum diset) -> **hanya kelas Pra Nikah** yang bisa dipilih (bypass).
- **Guru desa, guru daerah, admin daerah/desa, superadmin**: **selalu full akses** (VIP bypass, tidak terpengaruh deadline).
- Menu `/naik-kelas` **selalu muncul** di sidebar; page tidak pernah redirect. Gate pindah ke isi dropdown sumber kelas.

> Re-scope ini **membatalkan** scope sm-ejs lama "modal cta_required unskippable". Modal-blocking dibuang dari plan ini.

---

## Keputusan kunci (data-driven)

### 1. Deteksi "Pra Nikah" = helper terpusat parse nama, BUKAN kolom kategori
DB aktual: Pra Nikah 1-4 punya `category_group = 'muda_mudi'` (sama SMP/SMA) -- **tidak ada slot `pra_nikah`**. Mengubah ke kategori baru berisiko nyenggol dashboard filter / DataFilter / rapot yang mengandalkan union `'caberawit'|'muda_mudi'|'orang_tua'` (tersebar di `dashboard.ts`, `DataFilter.tsx`, `OverviewTab.tsx`, dll).
Codebase **sudah** pakai pola nama: `materi/.../queries.ts` `EXCLUDED_CLASS_NAMES = ['Pra Remaja','Remaja','Pra Nikah']`, dan `classHelpers.isTeacherClass` (`name.includes('pengajar')`). Precedent jelas.
-> Tambah helper terpusat `isPraNikahClass()` di `src/lib/utils/classHelpers.ts` (1 tempat ubah, TDD-able). **Bukan** inline `.includes` ala draft Antigravity.

### 2. Role yang dibatasi vs bypass
| Role | Helper | Window tutup |
|---|---|---|
| Guru kelompok | `isTeacherKelompok` | **Hanya Pra Nikah** |
| Guru desa | `isTeacherDesa` | Full (bypass) |
| Guru daerah | `isTeacherDaerah` | Full (bypass) |
| Admin daerah/desa, superadmin | `isAdminDaerah`/`isAdminDesa`/`isSuperAdmin` | Full (bypass) |

Helper semua sudah ada di `src/lib/accessControl.ts`. Window **aktif** -> semua role full akses.

### 3. Migrasi shape app_settings (backward-compatible, TANPA DDL)
Value lama: `{enabled, enabled_by, enabled_at}`. Value baru: tambah `end_date: string | null`.
`isActive` dihitung server-side: **`end_date` ada & `now <= end_date`** -> aktif. Kalau `end_date` tidak ada (row legacy) -> fallback ke `enabled === true`. Tidak perlu migrasi DB; row existing tetap valid (di-treat via fallback). Saat admin set deadline pertama kali, `end_date` terisi dan jadi sumber kebenaran.

### 4. Komparasi tanggal server-side (Jakarta TZ)
Pakai pola existing `dashboard/actions/overview/logic.ts`: `new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))`. Bandingkan tanggal (date-only, akhir hari `end_date` inklusif). Jangan andalkan clock client.

---

## Files & Changes

### A. Types — `src/types/promotion.ts`
- Extend `PromotionEnabledValue`: tambah `end_date: string | null`. Pertahankan `enabled`/`enabled_by`/`enabled_at` (legacy + audit).
- Tambah type return baru untuk status, mis. `PromotionWindowStatus { isActive: boolean; endDate: string | null }`.

### B. Helper Pra Nikah — `src/lib/utils/classHelpers.ts` (TDD)
- Tambah `isPraNikahClass(classData: ClassData): boolean` -> `name.toLowerCase().includes('pra nikah')`. Pola sama `isTeacherClass`.
- **RED**: tambah test di `__tests__/classHelpers.test.ts` (true: "Pra Nikah 1/2/3/4", case-insensitive; false: "Kelas 1", "SMP 1", no name). **GREEN** implement.
- Catatan: source options pakai `class_masters.name` (bukan `ClassData` mapping). Buat fungsi pure terpisah `isPraNikahName(name: string)` yang dipakai `isPraNikahClass` & filter source options. TDD `isPraNikahName`.

### C. Settings actions — `src/app/(admin)/naik-kelas/actions/settings/actions.ts`
- **`getPromotionEnabled()`** -> kembalikan window status: hitung `isActive` dari `end_date` (fallback `enabled`). Return `{ success, data: { enabled: isActive, endDate }, message }` (jaga field `enabled` agar konsumen lama tetap jalan = `isActive`).
- Ganti **`togglePromotionEnabled(enabled)`** -> **`updatePromotionEndDate(endDate: string | null)`**. Authz tetap `isSuperAdmin || isAdminDaerah`. Simpan `value = { enabled: endDate!=null, end_date: endDate, enabled_by: profile.id, enabled_at: now }` via `upsertPromotionEnabled` (queries.ts tak berubah). `revalidatePath('/settings/grade-promotion')` + `'/naik-kelas'`.
- Cek grep `togglePromotionEnabled` dulu; kalau hanya dipakai PromotionToggleClient, ganti langsung. Kalau ada konsumen lain, sisakan wrapper deprecated.

### D. Source options logic — `src/app/(admin)/naik-kelas/actions/classes/actions.ts`
- Di **`getPromotionSourceOptions()`**: setelah ambil profile + master list, hitung window `isActive` via `getPromotionEnabled()`.
- Aturan filter:
  - `isTeacherKelompok(profile)` **dan** window tutup -> filter source hanya `isPraNikahName(master.name)` (atau class name utk jalur regular teacher).
  - Selain itu -> jalur existing (full).
- Jalur regular-teacher (kelas sendiri) & jalur admin/hierarki (semua master) tetap; tambahkan filter Pra Nikah hanya untuk cabang guru-kelompok saat window tutup.
- **TDD**: extract logika filter jadi pure fn (mis. `filterSourcesByWindow(sources, { isTeacherKelompok, isActive })`) di `classes/logic.ts` + test matrix (guru kelompok x aktif/tutup, guru desa, admin). Action tipis panggil pure fn.

### E. Page guard — `src/app/(admin)/naik-kelas/page.tsx`
- **Hapus** `redirect('/home')` saat tidak aktif. Page selalu render `PromotionClient`. Gate sudah di dropdown (D).

### F. Sidebar — `src/components/layouts/AppSidebar.tsx`
- **Hapus** `requirePromotionEnabled: true` dari nav item "Naik Kelas" (line ~97-102) -> menu selalu muncul.
- Hapus cabang filter `if (item.requirePromotionEnabled && !promotionEnabled) return false` (line ~376) jika `requirePromotionEnabled` tak dipakai item lain.
- (Opsional) pindah posisi menu "Naik Kelas" ke atas "Pengaturan" -- kosmetik, low priority.
- `usePromotionEnabled` hook bisa tetap ada (dipakai PromotionClient untuk display); tak lagi gate sidebar.

### G. Settings UI — `src/app/(admin)/settings/grade-promotion/`
- **`page.tsx`**: kirim `initialEndDate: string | null` (dari `res.data?.endDate`) ke client (ganti `initialEnabled`).
- **`PromotionToggleClient.tsx`** -> ganti toggle jadi date picker. Pakai komponen date existing (Flatpickr / `components/form` -- **WAJIB cek komponen existing, jangan raw `<input type=date>`** per CLAUDE.md). Tombol simpan panggil `updatePromotionEndDate(endDate)`. Tombol "Tutup Akses" = `updatePromotionEndDate(null)`. Toast + `mutate` hook `usePromotionEnabled`. Rename komponen -> `PromotionDeadlineClient` (opsional).

---

## Reuse (jangan bikin baru)
- Role helpers: `isTeacherKelompok`, `isTeacherDesa`, `isTeacherDaerah`, `isAdminDaerah`, `isSuperAdmin` (`src/lib/accessControl.ts`).
- `getCurrentUserProfile()` (`accessControlServer.ts`).
- `fetchPromotionEnabled` / `upsertPromotionEnabled` (`settings/queries.ts`) -- tak berubah, hanya isi `value`.
- Pola tanggal Jakarta TZ: `dashboard/actions/overview/logic.ts`; helper `toDateStr` (`laporan/actions/reports/logic.ts`).
- Pola nama kelas: `classHelpers.isTeacherClass`, `EXCLUDED_CLASS_NAMES`.
- `ServerActionResult<T>` (`@/types/common`).

---

## Tasks (TDD untuk logic)

1. **Helper Pra Nikah (TDD)** -- `isPraNikahName` + `isPraNikahClass` di `classHelpers.ts` + test. RED->GREEN.
2. **Types** -- extend `PromotionEnabledValue` (+`end_date`), tambah `PromotionWindowStatus`.
3. **Settings actions** -- `getPromotionEnabled` (hitung isActive+endDate, fallback legacy), `updatePromotionEndDate`. Date compare Jakarta TZ.
4. **Source filter logic (TDD)** -- pure fn `filterSourcesByWindow` di `classes/logic.ts` + test matrix role x window. Wire ke `getPromotionSourceOptions`.
5. **Page guard** -- hapus redirect di `naik-kelas/page.tsx`.
6. **Sidebar** -- hapus `requirePromotionEnabled` gate untuk item naik-kelas.
7. **Settings UI** -- date picker (komponen existing) + `updatePromotionEndDate`, ganti props page.
8. `npm run type-check` 0 error.

---

## Verification (manual)
1. Superadmin -> Settings > Mode Naik Kelas: set deadline = besok. Simpan.
2. Login **guru kelompok** -> menu Naik Kelas muncul (selalu). Dropdown sumber -> semua kelas-nya (Paud..Pra Nikah).
3. Superadmin -> set deadline = kemarin (atau "Tutup Akses").
4. Login **guru kelompok** -> dropdown sumber -> **hanya Pra Nikah**. Kelas lain hilang. Page tidak redirect.
5. Login **guru desa / guru daerah** dgn deadline lewat -> dropdown tetap full (VIP bypass).
6. Login **admin daerah** deadline lewat -> full (bypass).
7. Row legacy (tanpa `end_date`, `enabled:false`) -> guru kelompok hanya Pra Nikah. `enabled:true` legacy -> full.
8. `npm run test:run` (helper + filter logic) hijau. `npm run type-check` 0 error.

---

## Out of scope
- Modal cta_required unskippable (scope sm-ejs lama) -- DIBUANG.
- Kolom kategori DB baru / migrasi DDL -- TIDAK dilakukan (pakai helper nama + fallback value).
- Tracking per-kelompok "sudah naik" -- tidak perlu.

## CLAUDE.md Check
- [ ] Pattern baru: "deadline window untuk fitur via app_settings + bypass per-role + Pra Nikah exempt" -> dokumentasikan singkat (business-rules.md / architecture-patterns.md) setelah implementasi.
- [ ] Tidak ada tabel/route/permission baru -> Key Tables / App Router tak berubah.
- [ ] `requirePromotionEnabled` flag jadi usang -> catat jika dihapus penuh dari AppSidebar nav typing.

## Beads
- sm-ejs re-scope (bukan close): `bd update` description+notes ke scope deadline. Plan lama (modal & pending) ditandai superseded.

## Commit message template
```
feat(frontend): replace naik-kelas toggle with deadline window + pra-nikah bypass

- Change grade_promotion_enabled to store end_date (deadline) alongside legacy enabled
- Compute window isActive server-side (Jakarta TZ), fallback to legacy enabled flag
- Teacher kelompok past deadline: only Pra Nikah classes selectable; others bypass
- Teacher desa/daerah + admins: always full access (VIP bypass)
- Sidebar Naik Kelas menu always visible; page no longer redirects
- Add isPraNikahName/isPraNikahClass helper + window filter logic (TDD)
- Settings UI: deadline date picker replaces ON/OFF toggle

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
