# Plan: Fix Monitoring Filter UI — DataFilter → InputFilter

## Context

Halaman monitoring (`/monitoring`) sudah punya logic org filter yang benar (cascade Daerah→Desa→Kelompok→Kelas, visibility per role). Tapi ada 3 masalah UI:

1. `DataFilter` menggunakan `position: absolute` untuk dropdown → terpotong oleh container `overflow: hidden`
2. UI tidak konsisten: DataFilter (multi-select chips) + InputFilter + raw `<select>` dalam satu baris
3. Filter bulan masih pakai raw `<select>` bukan `InputFilter`

Solusi: ganti semua filter di monitoring ke `InputFilter` yang konsisten.

**File tunggal:** `src/app/(admin)/monitoring/page.tsx`

---

## Step 1 — Ganti state orgFilters → state terpisah

Hapus:
```typescript
const [orgFilters, setOrgFilters] = useState<DataFilters>({...})
```

Ganti dengan:
```typescript
const [selectedDaerahId, setSelectedDaerahId] = useState<string>('');
const [selectedDesaId, setSelectedDesaId] = useState<string>('');
const [selectedKelompokId, setSelectedKelompokId] = useState<string>('');
```

---

## Step 2 — Update cascade logic (useMemo)

```typescript
const filteredDesaList = useMemo(() => {
    if (!selectedDaerahId) return desaList;
    return desaList.filter(d => d.daerah_id === selectedDaerahId);
}, [desaList, selectedDaerahId]);

const filteredKelompokList = useMemo(() => {
    if (!selectedDesaId) {
        if (selectedDaerahId) {
            const desaIdsInDaerah = desaList
                .filter(d => d.daerah_id === selectedDaerahId)
                .map(d => d.id);
            return kelompokList.filter(k => desaIdsInDaerah.includes(k.desa_id));
        }
        return kelompokList;
    }
    return kelompokList.filter(k => k.desa_id === selectedDesaId);
}, [kelompokList, desaList, selectedDaerahId, selectedDesaId]);

const filteredClasses = useMemo(() => {
    if (!selectedKelompokId) return classes;
    return classes.filter((cls: any) => cls.kelompok_id === selectedKelompokId);
}, [classes, selectedKelompokId]);
```

Hapus baris: `const selectedKelompokId = orgFilters.kelompok?.[0] || null;`

---

## Step 3 — Handler functions

```typescript
const handleDaerahChange = (daerahId: string) => {
    setSelectedDaerahId(daerahId);
    setSelectedDesaId('');
    setSelectedKelompokId('');
    setSelectedClassId('');
    setSelectedStudentId('');
    setStudents([]);
    setMaterials([]);
};

const handleDesaChange = (desaId: string) => {
    setSelectedDesaId(desaId);
    setSelectedKelompokId('');
    setSelectedClassId('');
    setSelectedStudentId('');
    setStudents([]);
    setMaterials([]);
};

const handleKelompokChange = (kelompokId: string) => {
    setSelectedKelompokId(kelompokId);
    setSelectedClassId('');
    setSelectedStudentId('');
    setStudents([]);
    setMaterials([]);
};
```

Hapus `handleOrgFilterChange` — tidak lagi digunakan.

---

## Step 4 — Ganti JSX: hapus DataFilter, ganti dengan InputFilter

Tambahkan import jika belum ada:
```typescript
import { shouldShowDaerahFilter, shouldShowDesaFilter, shouldShowKelompokFilter } from '@/lib/accessControl';
```

Hapus blok `<DataFilter ... />` (sekitar baris 590-601).

Ganti dengan:
```tsx
{shouldShowDaerahFilter(userProfile) && daerahList.length > 1 && (
    <InputFilter
        id="daerah-filter"
        label="Daerah"
        value={selectedDaerahId}
        onChange={handleDaerahChange}
        options={daerahList.map(d => ({ value: d.id, label: d.name }))}
        allOptionLabel="Semua Daerah"
        variant="modal"
        compact
    />
)}

{shouldShowDesaFilter(userProfile) && filteredDesaList.length > 1 && (
    <InputFilter
        id="desa-filter"
        label="Desa"
        value={selectedDesaId}
        onChange={handleDesaChange}
        options={filteredDesaList.map(d => ({ value: d.id, label: d.name }))}
        allOptionLabel="Semua Desa"
        variant="modal"
        compact
        disabled={shouldShowDaerahFilter(userProfile) && !selectedDaerahId}
    />
)}

{shouldShowKelompokFilter(userProfile) && filteredKelompokList.length > 1 && (
    <InputFilter
        id="kelompok-filter"
        label="Kelompok"
        value={selectedKelompokId}
        onChange={handleKelompokChange}
        options={filteredKelompokList.map(k => ({ value: k.id, label: k.name }))}
        allOptionLabel="Semua Kelompok"
        variant="modal"
        compact
        disabled={shouldShowDesaFilter(userProfile) && !selectedDesaId}
    />
)}
```

---

## Step 5 — Ganti filter bulan dari raw `<select>` → InputFilter

Cari blok raw `<select>` untuk bulan (sekitar baris 645-662):
```tsx
// Hapus ini:
{selectedClassId && (
    <div>
        <label className="block text-sm font-medium...">Bulan</label>
        <select value={selectedMonth ?? ''} onChange={...} className="...">
            ...
        </select>
    </div>
)}
```

Ganti dengan:
```tsx
{selectedClassId && (
    <InputFilter
        id="month-filter"
        label="Bulan"
        value={selectedMonth?.toString() ?? ''}
        onChange={(val) => setSelectedMonth(val ? Number(val) : null)}
        options={getSemesterMonths(selectedSemester as Semester).map(m => ({
            value: m.toString(),
            label: getMonthName(m as Month)
        }))}
        allOptionLabel="Semua Bulan"
        variant="modal"
        compact
        disabled={!selectedClassId}
    />
)}
```

Pastikan `Month` sudah diimport dari `@/app/(admin)/materi/types`.

---

## Step 6 — Cleanup imports

Hapus imports yang tidak lagi digunakan:
- `DataFilter` dan `DataFilters` dari `@/components/shared/DataFilter`
- `filterDesaList`, `filterKelompokList`, `detectRole` dari `@/components/shared/dataFilterHelpers`

---

## Verification

```bash
npm run type-check
```

Manual:
1. Login superadmin → semua filter (Daerah, Desa, Kelompok, Kelas, Bulan) pakai `InputFilter` konsisten, dropdown tidak terpotong
2. Pilih Daerah → Desa tersaring, Kelompok ter-reset
3. Login teacher biasa → filter org tidak muncul
4. Pilih kelas → filter Bulan muncul
