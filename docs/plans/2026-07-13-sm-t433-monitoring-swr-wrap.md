# Plan: sm-t433 Fix C — Bungkus data-fetching Monitoring dengan SWR

> **Issue:** sm-t433 (P1, in_progress) · **Epic:** sm-469y (egress fase 2)
> **Mode eksekusi:** Jalur A (Antigravity/Sonnet dari plan ini) · **File utama:** `src/app/(admin)/monitoring/page.tsx` (1331 baris)
> **Status Fix A+B:** SUDAH commit (trim `material_items(*)` + chunk `.in()` di `actions/monitoring.ts`). Plan ini KHUSUS Fix C.

## Tujuan & batas

Ganti 8 `useEffect` + raw server-action call di `page.tsx` jadi SWR hook — supaya:
- Ganti kelas/semester yang sama tidak refetch (cache dedup `dedupingInterval`).
- Buka/tutup halaman tidak refetch dari nol.
- `keepPreviousData` biar ganti kelas tidak blank-flash.

**JANGAN sentuh logika bisnis** (perhitungan predikat, passing score, kalkulasi persentase, filter kategori). HANYA bungkus lapisan data-fetching. Predikat A-C sedang di-hold (nunggu konfirmasi kurikulum) — **JANGAN ubah `getPredikat`/`getDeskripsiPredikat` di plan ini**.

## Peta kondisi sekarang (hasil audit — WAJIB paham sebelum ubah)

### 8 useEffect di page.tsx

| # | Baris | Trigger (deps) | Aksi | Rencana SWR |
|---|-------|----------------|------|-------------|
| 1 | 114 | `[]` (mount) | `loadInitialData()` — set tahun ajaran aktif + fetch org/kategori/kelas paralel | **SWR** (data referensi stabil) |
| 2 | 119 | `[selectedStudentId]` | auto-collapse filter mobile | **TETAP** (UI murni, no fetch) |
| 3 | 126 | `[selectedYearId, selectedSemester, selectedClassId]` | `loadClassData()` — fetch students + progress + materials | **SWR** (inti — paling rawan) |
| 4 | 133 | `[students]` | auto-select siswa pertama | **TETAP** (UI, derive dari data SWR) |
| 5 | 143 | `[selectedStudentId, selectedClassId, selectedMonth, selectedYearId, selectedSemester]` | `getMonthlyTargetProgress()` → set progress bulanan siswa | **SWR** |
| 6 | 177 | `[selectedStudentId, selectedYearId]` | `getCrossClassHistory()` → riwayat lintas kelas | **SWR** |
| 7 | 199 | `[selectedClassId, selectedMonth, selectedYearId, selectedSemester, progressMap]` | `getClassMonthlyTargetSummary()` → % target per siswa | **SWR** ⚠️ (deps `progressMap` — lihat catatan) |

> Effect #2 dan #4 murni UI — biarkan sebagai useEffect biasa, jangan dipaksa SWR.

### State yang TERLIBAT fetch (dari server) vs murni lokal/UI

**Server-data (kandidat pindah ke SWR `data`):**
- `academicYears`, `daerahList`, `desaList`, `kelompokList`, `hafalanCategories`, `classes` (dari `loadInitialData`)
- `students`, `materials` (dari `loadClassData`)
- `monthlyTargetProgress`, `monthlyTargetItemIds` (effect #5)
- `crossClassHistory` (effect #6)
- `monthlyPercentages` (effect #7)

**Lokal/UI (TETAP `useState`):**
- Semua `selected*` (filter: `selectedYearId/Semester/ClassId/CategoryId/StudentId/Month/DaerahId/DesaId/KelompokId`)
- `sidebarOpen`, `isFilterCollapsed`, `saving`
- **`progressMap`** ← **KRITIS, lihat bagian bawah**

## ⚠️ Titik-titik rawan (kenapa Fix C berisiko, dan cara mitigasi)

### RAWAN #1 — `progressMap` adalah DRAFT edit, BUKAN cache murni

`progressMap` di-*seed* dari server (`getClassProgress` → baris 367-372) TAPI juga dimutasi lokal saat user ketik nilai (`handleProgressChange` → `setProgressMap` baris 494). Save (`handleSave`) baca `progressMap` lokal → `bulkUpdateProgress`.

**Bahaya:** kalau `progressMap` diganti jadi turunan langsung SWR `data`, edit user hilang tiap kali SWR revalidate (overwrite draft dengan data server). Ini bug klasik "ketikan hilang".

**Mitigasi (WAJIB pola ini):**
- SWR pegang **server progress** (read-only) dengan key `classProgress(classId, yearId, semester)`.
- `progressMap` (draft `useState`) **tetap ada**, di-*seed* dari SWR data via `useEffect([swrProgressData])` HANYA saat data server berubah (mis. ganti kelas) — bukan tiap render.
- Setelah `handleSave` sukses → `mutate(classProgressKey)` untuk sinkron ulang server → seed ulang draft.
- **Pastikan seeding tidak menimpa draft yang belum disimpan.** Aman kalau seeding hanya jalan saat SWR key berubah (kelas/semester/tahun ganti). Boleh pakai flag `isDirty` atau bandingkan key sebelumnya. Sonnet: JANGAN seed `progressMap` di dependency yang ikut berubah tiap ketik.

### RAWAN #2 — Kasus `selectedClassId === 'ALL'` loop N kelas

`loadClassData` untuk `'ALL'` me-*loop* semua `classes` dan panggil `getClassProgress` + `getMaterialsByClassAndSemester` per kelas (baris 307-350), lalu merge ke satu Map. SWR key tunggal tidak bisa membungkus loop dinamis dengan bersih.

**Mitigasi (pilih salah satu, rekomendasi A):**
- **(A, rekomendasi)** Buat 1 SWR key `classProgressAll(yearId, semester, classIdsJoined)` yang fetcher-nya melakukan loop+merge di dalam fetcher (pindahkan logika loop dari `loadClassData` ke fetcher function). Satu key, satu cache entry, dedup jalan.
- **(B)** Biarkan kasus `'ALL'` tetap pakai path lama (non-SWR), hanya kasus single-class yang di-SWR-kan. Lebih aman tapi `'ALL'` tidak dapat manfaat cache. Boleh sebagai langkah pertama kalau (A) bikin ragu.
- Idealnya buat server action baru `getAllClassesProgress(yearId, semester)` yang loop+merge di server (1 round-trip logis) — TAPI ini ubah actions, di luar scope Fix C murni. **Skip dulu**, pakai (A) client-side.

### RAWAN #3 — Effect #7 depend pada `progressMap`

`getClassMonthlyTargetSummary` (effect #7) punya `progressMap` di deps → tiap ketik nilai, effect ini re-fire. Itu boros (refetch % target tiap keystroke).

**Mitigasi:** SWR key effect #7 = `(classId, month, yearId, semester)` TANPA `progressMap`. Revalidasi % target hanya via `mutate()` setelah `handleSave` sukses (bukan tiap ketik). Ini **sekaligus perbaikan egress** — buang refetch-per-keystroke yang sekarang ada.

### RAWAN #4 — Urutan init: `selectedYearId` di-set async lalu jadi trigger effect lain

`loadInitialData` set `selectedYearId` (baris 228). Effect #3/#5/#6/#7 depend padanya. Dengan SWR, `selectedYearId` tetap `useState` (filter), jadi urutan aman SELAMA SWR key pakai conditional fetching: key = `null` kalau `selectedYearId` kosong (SWR skip fetch saat key null). Pola: `useSWR(selectedYearId && selectedClassId ? keyFn(...) : null, fetcher)`.

## Rencana implementasi (bertahap — commit per tahap, JANGAN sekaligus)

### Tahap 0 — Tambah SWR keys di `src/lib/swr.ts`
```typescript
export const monitoringKeys = {
  all: ['monitoring'] as const,
  initial: () => [...monitoringKeys.all, 'initial'] as const,
  classProgress: (classId: string, yearId: string, semester: number) =>
    [...monitoringKeys.all, 'class-progress', classId, yearId, semester] as const,
  classProgressAll: (yearId: string, semester: number, classIds: string) =>
    [...monitoringKeys.all, 'class-progress-all', yearId, semester, classIds] as const,
  materials: (classId: string, semester: number) =>
    [...monitoringKeys.all, 'materials', classId, semester] as const,
  monthlyTarget: (classId: string, yearId: string, semester: number, month: number, studentId: string) =>
    [...monitoringKeys.all, 'monthly-target', classId, yearId, semester, month, studentId] as const,
  crossClass: (studentId: string, yearId: string) =>
    [...monitoringKeys.all, 'cross-class', studentId, yearId] as const,
  monthlySummary: (classId: string, yearId: string, semester: number, month: number) =>
    [...monitoringKeys.all, 'monthly-summary', classId, yearId, semester, month] as const,
};
```
Daftarkan di `dataKeys`. Commit sendiri (aman, additive).

### Tahap 1 — Buat hook file `src/app/(admin)/monitoring/hooks/useMonitoring.ts`
Satu file, hook per konsern. Semua pakai config: `revalidateOnFocus: false`, `dedupingInterval: 2*60*1000` (ikut `swrConfig`), `keepPreviousData: true`. Conditional key (null saat filter belum lengkap).
- `useMonitoringInitial()` → bungkus `loadInitialData` (pecah jadi fetcher). ⚠️ Hati-hati: `loadInitialData` juga set `selectedYearId` + auto-select org dari `userProfile`. Efek samping set-state itu **tetap di komponen** (useEffect derive dari data SWR), fetcher HANYA fetch.
- `useClassProgress(classId, yearId, semester)` — single class.
- `useClassProgressAll(classIds, yearId, semester)` — loop+merge (RAWAN #2 opsi A).
- `useMaterials(classId, semester)`.
- `useMonthlyTargetProgress(...)`, `useCrossClassHistory(...)`, `useClassMonthlySummary(...)`.

### Tahap 2 — Migrasikan effect #1 (initial) ke `useMonitoringInitial`
Ganti effect mount. Data referensi (org/kategori/kelas/tahun) dari SWR. `useEffect` kecil untuk derive set-state (`selectedYearId`, auto-select org) dari SWR data — jalan sekali saat data pertama datang. **Test manual:** filter tampil benar, tahun aktif ke-set, kelas ke-load.

### Tahap 3 — Migrasikan effect #3 (loadClassData) — PALING RAWAN
- Single class: `useClassProgress` + `useMaterials`.
- `'ALL'`: `useClassProgressAll`.
- Seed `progressMap` dari SWR progress data via useEffect yang HANYA fire saat key/data server berubah (RAWAN #1). **Test manual super teliti:** ketik nilai → tidak hilang saat idle/refocus; ganti kelas → draft ke-reset ke data kelas baru; save → toast sukses + data persist.

### Tahap 4 — Migrasikan effect #5, #6, #7
- #7 buang `progressMap` dari deps (RAWAN #3), revalidate via `mutate()` di `handleSave`.
- **Test manual:** % target update setelah save (bukan tiap ketik); riwayat lintas kelas muncul saat pilih siswa.

### Tahap 5 — Wire `mutate()` ke `handleSave`
Setelah `bulkUpdateProgress` sukses → `mutate(classProgressKey)` + `mutate(monthlySummaryKey)` + `mutate(monthlyTargetKey)`. Bukan refetch semua manual.

## Test (WAJIB — TDD di mana bisa)

- **E2E/smoke (paling penting untuk file besar ini):**
  - Buka `/monitoring`, pilih kelas berisi siswa → daftar siswa + materi muncul.
  - Ketik nilai siswa → tunggu 3 detik / klik luar → **nilai tidak hilang** (regresi RAWAN #1).
  - Save → toast "berhasil", reload → nilai persist.
  - Ganti kelas → draft ke-reset, tidak carry-over nilai kelas lama.
  - Ganti balik ke kelas pertama dalam <2 menit → **tidak refetch** (cek Network tab: 0 request classProgress) = cache jalan.
  - Kasus `'ALL'` (Pilih Semua) → semua siswa lintas kelas muncul.
- **Unit (kalau feasible):** fetcher `useClassProgressAll` merge benar (2 kelas → union siswa, no dup).

## Acceptance
- [ ] Ganti kelas yang sama dalam window dedup → tidak refetch (Network 0 request).
- [ ] Ketik nilai → draft tidak hilang saat SWR revalidate (RAWAN #1 tertutup).
- [ ] Save → grid update via `mutate`, bukan reload semua.
- [ ] Effect #7 tidak lagi refetch tiap keystroke (RAWAN #3).
- [ ] Kasus `'ALL'` tetap jalan.
- [ ] Predikat/passing-score/kalkulasi TIDAK berubah.
- [ ] `npm run test:run` + `type-check` hijau.

## JANGAN
- Jangan ubah `getPredikat`/`getDeskripsiPredikat`/passing score (predikat A-C nunggu kurikulum, isu terpisah).
- Jangan ubah `actions/monitoring.ts` (Fix A+B sudah final; kecuali kalau opsi RAWAN #2-C dipilih — itu keputusan terpisah).
- Jangan hapus admin scope guard.
- Jangan seed `progressMap` di dependency yang berubah tiap ketik → ketikan hilang.
- Jangan migrasi 8 effect sekaligus — bertahap, test per tahap.

## Kandidat pembagian
- Tahap 0-1 (keys + hook file): mekanis, Sonnet aman.
- Tahap 3 (progressMap draft-vs-cache): paling rawan — kalau Sonnet ragu, balik ke Opus untuk keputusan seeding.
