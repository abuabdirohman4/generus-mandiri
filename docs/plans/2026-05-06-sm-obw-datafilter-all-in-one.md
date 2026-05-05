# Plan: [sm-obw] Refactor DataFilter All-in-One

## Context

`DataFilter.tsx` saat ini hanya menangani org filters (daerah/desa/kelompok/kelas) dan activity filters. `AcademicYearSelector` dipakai terpisah di banyak halaman (materi, monitoring, rapot, laporan materi), begitu pula filter kategori materi dan bulan. Inkonsistensi ini menyebabkan UI behavior berbeda antar halaman dan sulit dikelola.

**Status**: BACKLOG — Prioritas P4. Jangan dikerjakan bersamaan dengan fitur lain yang menyentuh filter.

---

## Scope

### Halaman yang perlu diaudit sebelum implementasi

| Halaman | Filter yang dipakai | Notes |
|---------|---------------------|-------|
| `/monitoring` | `AcademicYearSelector` custom + InputFilter org | Filter org custom, bukan DataFilter |
| `/materi` | `AcademicYearSelector` + InputFilter kategori/bulan | Filter tersendiri |
| `/rapot` | `AcademicYearSelector` + InputFilter | Filter tersendiri |
| `/laporan` (presensi) | `DataFilter` + bulan/tahun + tipe kegiatan | Sudah pakai DataFilter |
| `/laporan` (materi) | `MateriFilterSection` custom | Belum pakai DataFilter |
| `/dashboard` | `DataFilter` + `AcademicYearSelector` materi | Mixed |

### Props baru yang perlu ditambahkan ke DataFilter

```typescript
interface DataFilterProps {
    // EXISTING...
    
    // NEW: Academic Year
    showAcademicYear?: boolean
    selectedYearId?: string
    onYearChange?: (yearId: string) => void
    showSemester?: boolean
    selectedSemester?: 1 | 2
    onSemesterChange?: (semester: 1 | 2) => void
    
    // NEW: Materi filters
    showMateriCategory?: boolean
    materiCategoryOptions?: { value: string; label: string }[]
    selectedMateriCategory?: string
    onMateriCategoryChange?: (categoryId: string) => void
    
    showMateriMonth?: boolean
    selectedMateriMonth?: number | undefined
    onMateriMonthChange?: (month: number | undefined) => void
    
    // NEW: Materi view mode
    showMateriViewMode?: boolean
    materiViewMode?: 'per_materi' | 'per_siswa'
    onMateriViewModeChange?: (mode: 'per_materi' | 'per_siswa') => void
}
```

### Internal Refactor

DataFilter perlu dipecah jadi sub-components untuk maintainability:

```
DataFilter.tsx (orchestrator)
├── OrgFilterSection.tsx      — daerah/desa/kelompok/kelas
├── DateFilterSection.tsx     — bulan, tahun, tahun ajaran, semester
├── ActivityFilterSection.tsx — tipe kegiatan, tingkat kegiatan
└── MateriFilterSection.tsx   — kategori, bulan materi, view mode
```

---

## Pre-work Required (sebelum implementasi)

1. **Audit semua halaman** yang pakai DataFilter dan AcademicYearSelector
2. **Desain API props** yang backward-compatible (semua existing props tetap bekerja tanpa perubahan)
3. **Buat migration guide** untuk setiap halaman
4. **Test plan** per halaman untuk regresi

---

## Estimasi

- **Files diubah**: ~15+ files
- **Effort**: 2-3 sesi penuh
- **Risk**: HIGH — breaking change ke semua halaman filter

---

## Decision Log

- **2026-05-06**: Diputuskan DEFER — kerjakan setelah sm-10z, sm-34q, sm-n0r selesai dan stabil
- **Alasan**: Scope terlalu besar untuk dikerjakan paralel dengan fitur utama. Inkonsistensi saat ini masih tolerable.

---

## Commit Message Template (saat nanti dikerjakan)

```
refactor(shared): consolidate DataFilter with AcademicYearSelector and materi-specific filters

closes #56
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
