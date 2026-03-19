# Rapot Core Bugs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Perbaiki 4 bug kritis pada halaman `/rapot` agar fitur input nilai, simpan laporan, dan export PDF dapat digunakan end-to-end.

**Architecture:** Perubahan terbatas pada 2 file: `StudentReportDetailClient.tsx` (komponen utama input rapot siswa) dan `actions/queries.ts` (layer database). Tidak ada perubahan skema database, tidak ada perubahan API.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Supabase, Tailwind CSS, @react-pdf/renderer

**Beads Issue:** `sm-rfa`

---

## Bug Summary

| # | Bug | File | Baris |
|---|-----|------|-------|
| 1 | `class_id` undefined saat upsert `student_reports` | `[studentId]/components/StudentReportDetailClient.tsx` | 235 |
| 2 | Tidak ada tombol untuk membuka PDF export modal | `[studentId]/components/StudentReportDetailClient.tsx` | 500–513 |
| 3 | `onConflict` string mengandung spasi tidak valid | `actions/queries.ts` | 85, 108, 147, 353 |
| 4 | `bg-gray-750` bukan class Tailwind yang valid | `[studentId]/components/StudentReportDetailClient.tsx` | 394, 408 |

---

## Task 1: Fix `class_id` undefined pada `student_reports` upsert

**Files:**
- Modify: `src/app/(admin)/rapot/[studentId]/components/StudentReportDetailClient.tsx`

**Context:**
`getStudentEnrollments` mengembalikan array enrollment. Tiap enrollment memiliki field `class_id` (kolom FK langsung) dan juga relasi `class: classes(*)`. `studentInfo` di-set dari `currentEnrollment.student` — bukan enrollment itu sendiri — sehingga `studentInfo?.class_id` selalu `undefined`. Harus simpan `class_id` dari enrollment secara terpisah.

**Step 1: Tambah state `enrollmentClassId`**

Cari blok state setelah `const [resolvedSections, setResolvedSections] = useState<any[]>([]);` (sekitar baris 61), tambahkan tepat di bawahnya:

```tsx
const [enrollmentClassId, setEnrollmentClassId] = useState<string | null>(null);
```

**Step 2: Simpan `class_id` saat loadData**

Di dalam fungsi `loadData`, setelah baris `setStudentInfo(currentEnrollment.student);` (sekitar baris 99), tambahkan:

```tsx
setEnrollmentClassId(currentEnrollment.class_id || null);
```

**Step 3: Pakai `enrollmentClassId` di handleSaveAll**

Ganti baris (sekitar baris 235):
```tsx
class_id: studentInfo?.class_id, // Might be needed if new record
```
Menjadi:
```tsx
class_id: enrollmentClassId,
```

**Step 4: Type-check**

```bash
npm run type-check
```
Expected: No new errors.

---

## Task 2: Tambah tombol PDF untuk membuka export modal

**Files:**
- Modify: `src/app/(admin)/rapot/[studentId]/components/StudentReportDetailClient.tsx`

**Context:**
`PDFExportModal` sudah ada di render tapi `showPDFModal` tidak pernah di-set `true`. Perlu tombol floating di UI. `FilePdfIcon` tersedia di `@/lib/icons`.

**Step 1: Tambah `FilePdfIcon` ke import**

Ganti baris import icon:
```tsx
import { FloppyDiskIcon } from '@/lib/icons';
```
Menjadi:
```tsx
import { FloppyDiskIcon, FilePdfIcon } from '@/lib/icons';
```

**Step 2: Tambah floating button PDF**

Ganti blok floating save button (sekitar baris 501–513):
```tsx
{/* Floating Save Button */}
<div className="fixed z-50 bottom-[80px] md:bottom-6 right-6">
    <button
        onClick={handleSaveAll}
        disabled={saving}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center disabled:opacity-70"
    >
        {saving ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
            <FloppyDiskIcon className="w-6 h-6" />
        )}
    </button>
</div>
```
Menjadi:
```tsx
{/* Floating Action Buttons */}
<div className="fixed z-50 bottom-[80px] md:bottom-6 right-6 flex flex-col gap-3">
    <button
        onClick={() => setShowPDFModal(true)}
        className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
        title="Export PDF"
    >
        <FilePdfIcon className="w-6 h-6" />
    </button>
    <button
        onClick={handleSaveAll}
        disabled={saving}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center disabled:opacity-70"
        title="Simpan"
    >
        {saving ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
            <FloppyDiskIcon className="w-6 h-6" />
        )}
    </button>
</div>
```

**Step 3: Type-check**

```bash
npm run type-check
```
Expected: No new errors.

---

## Task 3: Fix `onConflict` spasi tidak valid di `queries.ts`

**Files:**
- Modify: `src/app/(admin)/rapot/actions/queries.ts`

**Context:**
PostgreSQL `onConflict` tidak menerima spasi di antara nama kolom. Supabase JS client meneruskan string ini langsung ke postgres, sehingga query gagal dengan error syntax.

**Step 1: Fix baris 85**

Ganti:
```ts
onConflict: 'student_id, subject_id, academic_year_id, semester'
```
Menjadi:
```ts
onConflict: 'student_id,subject_id,academic_year_id,semester'
```

**Step 2: Fix baris 108**

Ganti (di fungsi `bulkUpsertStudentGrades`):
```ts
onConflict: 'student_id, subject_id, academic_year_id, semester'
```
Menjadi:
```ts
onConflict: 'student_id,subject_id,academic_year_id,semester'
```

**Step 3: Fix baris 147**

Ganti (di fungsi `upsertCharacterAssessment`):
```ts
onConflict: 'student_id, academic_year_id, semester, character_aspect'
```
Menjadi:
```ts
onConflict: 'student_id,academic_year_id,semester,character_aspect'
```

**Step 4: Fix baris 353**

Ganti (di fungsi `upsertStudentReport`):
```ts
onConflict: 'student_id, academic_year_id, semester'
```
Menjadi:
```ts
onConflict: 'student_id,academic_year_id,semester'
```

**Step 5: Type-check**

```bash
npm run type-check
```
Expected: No new errors.

---

## Task 4: Fix `bg-gray-750` Tailwind class tidak valid

**Files:**
- Modify: `src/app/(admin)/rapot/[studentId]/components/StudentReportDetailClient.tsx`

**Context:**
Tailwind tidak memiliki `gray-750`. Warna terdekat yang ada adalah `gray-700` (lebih gelap) atau `gray-800`. Karena dipakai untuk group header row (sedikit lebih gelap dari background normal), `gray-700` adalah pengganti yang tepat.

**Step 1: Ganti semua `bg-gray-750` dan `dark:bg-gray-750`**

Ada 2 lokasi (baris 394 dan 408):

Ganti `bg-gray-750` → `bg-gray-700`
Ganti `dark:bg-gray-750` → `dark:bg-gray-700`

Gunakan replace-all untuk efisiensi.

**Step 2: Type-check**

```bash
npm run type-check
```
Expected: No new errors.

---

## Task 5: Hapus komentar lama yang menyesatkan

**Files:**
- Modify: `src/app/(admin)/rapot/[studentId]/components/StudentReportDetailClient.tsx`

**Context:**
Komentar di baris 193–226 pada `handleSaveAll` berisi keraguan tentang `section_id` dan `class_id` yang sudah tidak relevan setelah bug 1 dan bug state management dianalisis. Komentar ini menyesatkan developer berikutnya.

**Step 1: Bersihkan komentar pada handleSaveAll**

Ganti blok komentar di sekitar baris 193–228:

```tsx
            const gradesToSave: any[] = [];
            Object.keys(grades).forEach(sectionId => {
                const sectionGrades = grades[sectionId];
                Object.keys(sectionGrades).forEach(materialItemId => {
                    const gradeData = sectionGrades[materialItemId];
                    // Also need to find section_item_id?
                    // We stored it in state? Yes, the state value has it if we populated from DB or UI.
                    // But if it's a NEW grade entered in UI, we need to know the section_item_id.
                    // The UI renders items. We can pass section_item_id when updating state.
                    if (gradeData) {
                        gradesToSave.push(gradeData);
                    }
                });
            });
```

Menjadi:

```tsx
            const gradesToSave: any[] = [];
            Object.keys(grades).forEach(sectionId => {
                const sectionGrades = grades[sectionId];
                Object.keys(sectionGrades).forEach(materialItemId => {
                    const gradeData = sectionGrades[materialItemId];
                    if (gradeData) {
                        gradesToSave.push(gradeData);
                    }
                });
            });
```

Dan ganti blok komentar di sekitar baris 221–228:

```tsx
            // Save Report Meta
            // We use standard generateReport to ensure record exists and update stats if needed
            // But we also need to update attendance/notes which generateReport might not take args for yet?
            // Let's assume we maintain `student_reports` table for meta.
            // Check `generateReport` action? It was imported but logic is standard.
            // For now, I'll direct update `student_reports` using supabase client for speed, as per previous logic.
            // But I should call generic upsert first?
            // Actually, just upserting `student_reports` is fine.
            const { error } = await supabase
```

Menjadi:

```tsx
            // Save report metadata (attendance, notes) to student_reports
            const { error } = await supabase
```

Dan ganti komentar di onConflict baris 240:
```tsx
                }, { onConflict: 'student_id,academic_year_id,semester' }); // Unique key? checking schema... usually (student_id, academic_year_id, semester)
```
Menjadi:
```tsx
                }, { onConflict: 'student_id,academic_year_id,semester' });
```

**Step 2: Type-check**

```bash
npm run type-check
```

---

## Task 6: Commit semua perubahan

**Step 1: Cek status**

```bash
git status
git diff
```

**Step 2: Stage files**

```bash
git add src/app/\(admin\)/rapot/\[studentId\]/components/StudentReportDetailClient.tsx
git add src/app/\(admin\)/rapot/actions/queries.ts
```

**Step 3: Commit**

```bash
git commit -m "fix(rapot): perbaiki core bugs agar fitur dapat digunakan end-to-end

- fix class_id undefined pada student_reports upsert (pakai enrollmentClassId)
- tambah floating button untuk membuka PDF export modal
- fix onConflict string dengan spasi tidak valid di queries.ts
- fix bg-gray-750 -> bg-gray-700 (class Tailwind tidak valid)
- hapus komentar lama yang menyesatkan

Refs: sm-rfa

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

**Step 4: Close beads issue**

```bash
bd close sm-rfa --reason="semua core bugs diperbaiki, fitur rapot dapat digunakan end-to-end"
bd sync
```

---

## Verification Plan

Setelah semua task selesai, verifikasi end-to-end:

1. **Grade save:** Buka `/rapot` → pilih kelas → pilih siswa → isi nilai → klik save (disk icon) → toast sukses → reload → nilai masih ada
2. **Attendance save:** Isi absensi & catatan → klik save → tidak ada error → data tersimpan
3. **PDF download:** Klik tombol hijau (PDF icon) → modal PDF terbuka → klik Export → PDF berhasil didownload dengan nama siswa
4. **Type-check clean:** `npm run type-check` — tidak ada error TypeScript baru
