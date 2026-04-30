# Plan: Fix Monitoring — semester filter di material_item_classes + DataFilter refactor

## Context

Kolom `semester` di tabel `material_monthly_targets` sudah digunakan sebagai sumber kebenaran
untuk relasi item–kelas–semester. Kolom yang sama di `material_item_classes` sudah **dihapus**
pada migrasi sebelumnya.

Akibatnya dua fungsi di `src/app/(admin)/monitoring/actions/monitoring.ts` crash karena masih
query `.eq('semester', semester)` ke tabel `material_item_classes`:

1. `getMaterialsByClassAndSemester` (line 221) — error fatal, halaman monitoring tidak bisa dibuka
2. `getMaterialsByCategory` (line 268-269) — error fatal saat filter kategori dipilih

Selain itu, filter org hierarchy yang sudah diimplementasi Gemini Flash menggunakan `InputFilter`
manual padahal `DataFilter` component sudah tersedia dengan semua logic cascade built-in.

---

## Dua Pekerjaan

### A. Fix bug — semester query di monitoring.ts (CRITICAL, harus dikerjakan dulu)

### B. Refactor — ganti InputFilter manual → DataFilter component (nice to have, bisa setelah A)

---

## Fix A — getMaterialsByClassAndSemester & getMaterialsByCategory

### Pendekatan

Ganti filter `.eq('semester', semester)` di `material_item_classes` dengan lookup ke
`material_monthly_targets`. Logic baru:

1. Ambil `active academic year id` menggunakan `getActiveAcademicYear()`
2. Query `material_monthly_targets` untuk mendapat `material_item_id` yang ter-assign ke
   `class_master_id IN (classMasterIds)` + `semester = semester` + `academic_year_id = activeYearId`
3. Fetch `material_items` dengan ID tersebut (plus join ke `material_types`, `material_categories`)
4. Deduplicate dan return

### Step A1 — getMaterialsByClassAndSemester

**File:** `src/app/(admin)/monitoring/actions/monitoring.ts`

Tambahkan import di baris paling atas:
```typescript
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
```

Ganti implementasi fungsi `getMaterialsByClassAndSemester` (line 189–232):

```typescript
export async function getMaterialsByClassAndSemester(
    classId: string,
    semester: number
): Promise<any[]> {
    const supabase = await createAdminClient();

    // Step 1: Get class_master_id(s) for this class
    const classMasterIds = await getClassMasterIds(classId);
    if (classMasterIds.length === 0) return [];

    // Step 2: Get active academic year
    const activeYear = await getActiveAcademicYear();
    if (!activeYear) return [];

    // Step 3: Get distinct material_item_ids from monthly_targets for this class+semester
    // Include rows with month IS NULL (semester-only assignment) and month IS NOT NULL
    const { data: targetRows, error: targetError } = await supabase
        .from('material_monthly_targets')
        .select('material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', activeYear.id)
        .eq('semester', semester);

    if (targetError) throw new Error(targetError.message);
    if (!targetRows || targetRows.length === 0) return [];

    const itemIds = Array.from(new Set(targetRows.map((r: any) => r.material_item_id)));

    // Step 4: Fetch material_items with their type and category
    const { data, error } = await supabase
        .from('material_items')
        .select(`
            id,
            name,
            description,
            material_type:material_types(
                id,
                name,
                material_category:material_categories(
                    id,
                    name
                )
            )
        `)
        .in('id', itemIds);

    if (error) throw new Error(error.message);
    return data || [];
}
```

### Step A2 — getMaterialsByCategory

Ganti implementasi fungsi `getMaterialsByCategory` (line 234–279):

```typescript
export async function getMaterialsByCategory(
    categoryId: string,
    classId: string,
    semester: number
): Promise<any[]> {
    const supabase = await createAdminClient();

    // Step 1: Get class_master_ids
    const classMasterIds = await getClassMasterIds(classId);
    if (classMasterIds.length === 0) return [];

    // Step 2: Get active academic year
    const activeYear = await getActiveAcademicYear();
    if (!activeYear) return [];

    // Step 3: Get distinct material_item_ids from monthly_targets for this class+semester
    const { data: targetRows, error: targetError } = await supabase
        .from('material_monthly_targets')
        .select('material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', activeYear.id)
        .eq('semester', semester);

    if (targetError) throw new Error(targetError.message);
    if (!targetRows || targetRows.length === 0) return [];

    const itemIds = Array.from(new Set(targetRows.map((r: any) => r.material_item_id)));

    // Step 4: Fetch material_items filtered by category
    const { data, error } = await supabase
        .from('material_items')
        .select(`
            *,
            material_type:material_types!inner(
                id,
                name,
                material_category_id,
                material_category:material_categories(
                    id,
                    name
                )
            )
        `)
        .in('id', itemIds)
        .eq('material_type.material_category_id', categoryId);

    if (error) throw new Error(error.message);

    // Deduplicate
    return Array.from(new Map((data || []).map((m: any) => [m.id, m])).values());
}
```

---

## Fix B — Refactor filter org di monitoring/page.tsx menggunakan DataFilter

> **Catatan:** Kerjakan ini hanya setelah Fix A selesai dan halaman bisa dibuka.

### Context

Gemini Flash sudah implementasi org filter dengan `InputFilter` manual + `shouldShowDaerahFilter`
dari `accessControl.ts`. Ini bekerja tapi tidak konsisten dengan pattern yang digunakan di seluruh
app (laporan, absensi, dll yang semua pakai `DataFilter`).

`DataFilter` (`src/components/shared/DataFilter.tsx`) sudah handle:
- Role-based visibility (daerah/desa/kelompok tampil/sembunyi otomatis berdasarkan role)
- Cascade logic (pilih daerah → desa tersaring, dst)
- Single source of truth

### Langkah refactor

**File:** `src/app/(admin)/monitoring/page.tsx`

**Step B1 — Ganti state org filter**

State yang ada (dari implementasi Gemini Flash):
```typescript
const [daerahList, setDaerahList] = useState<Daerah[]>([]);
const [desaList, setDesaList] = useState<Desa[]>([]);
const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
const [selectedDaerahId, setSelectedDaerahId] = useState<string | null>(null);
const [selectedDesaId, setSelectedDesaId] = useState<string | null>(null);
const [selectedKelompokId, setSelectedKelompokId] = useState<string | null>(null);
```

Pertahankan state list (`daerahList`, `desaList`, `kelompokList`) — masih dibutuhkan DataFilter.
Ganti state selection menjadi DataFilters object:

```typescript
import type { DataFilters } from '@/components/shared/DataFilter';
import DataFilter from '@/components/shared/DataFilter';

const [orgFilters, setOrgFilters] = useState<DataFilters>({
    daerah: [], desa: [], kelompok: [], kelas: []
});
```

**Step B2 — Derive selectedKelompokId dari orgFilters**

```typescript
// Filtered classes berdasarkan kelompok terpilih
const selectedKelompokId = orgFilters.kelompok?.[0] || null;
const filteredClasses = useMemo(() => {
    if (!selectedKelompokId) return classes;
    return classes.filter((cls: any) => cls.kelompok_id === selectedKelompokId);
}, [classes, selectedKelompokId]);
```

**Step B3 — Handler orgFilters**

```typescript
const handleOrgFilterChange = (newFilters: DataFilters) => {
    setOrgFilters(newFilters);
    // Reset class selection jika kelompok berubah
    if (newFilters.kelompok?.[0] !== orgFilters.kelompok?.[0]) {
        setSelectedClassId('');
        setSelectedStudentId('');
        setStudents([]);
        setMaterials([]);
    }
};
```

**Step B4 — Ganti JSX filter org**

Hapus blok conditional `{shouldShowDaerahFilter(userProfile) && ...}` manual dan ganti dengan:

```tsx
import DataFilter from '@/components/shared/DataFilter';

<DataFilter
    filters={orgFilters}
    onFilterChange={handleOrgFilterChange}
    userProfile={userProfile}
    daerahList={daerahList}
    desaList={desaList}
    kelompokList={kelompokList}
    classList={[]}
    showKelas={false}
    variant="page"
    compact
/>
```

Ganti source dropdown Kelas dari `classes` → `filteredClasses`.

**Step B5 — Cleanup imports**

Hapus imports yang tidak lagi digunakan setelah refactor:
- `shouldShowDaerahFilter`, `shouldShowDesaFilter`, `shouldShowKelompokFilter` dari `@/lib/accessControl`
- `filterDesaList`, `filterKelompokList`, `detectRole` dari `@/components/shared/dataFilterHelpers`
- (Pastikan dulu tidak ada penggunaan lain sebelum hapus)

---

## Critical Files

| File | Action |
|------|--------|
| `src/app/(admin)/monitoring/actions/monitoring.ts` | Fix A: ganti query semester di 2 fungsi |
| `src/app/(admin)/monitoring/page.tsx` | Fix B: refactor org filter ke DataFilter |

---

## Verification

```bash
npm run type-check

# Manual Fix A:
# 1. Buka /monitoring → pilih kelas → semester → verifikasi tidak ada error
# 2. Pilih kategori hafalan → verifikasi materials muncul

# Manual Fix B (setelah A):
# 3. Login superadmin → filter Daerah/Desa/Kelompok muncul dan cascade benar
# 4. Login admin_daerah → hanya Desa+Kelompok yang muncul
# 5. Login teacher biasa → tidak ada filter org
```
