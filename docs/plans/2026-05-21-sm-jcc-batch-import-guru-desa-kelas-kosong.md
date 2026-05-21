# Plan: Fix Batch Import Siswa — Kelompok Kosong untuk Guru Desa

**Issue:** sm-jcc
**GH Issue:** #75
**Branch:** `fix/sm-jcc-batch-import-guru-desa-kelas`
**Date:** 2026-05-21

---

## Context

**Problem:** Di halaman `/users/siswa`, fitur batch import siswa untuk guru desa berhasil membuat siswa tapi siswa tidak punya **kelompok** (dan kelas_id juga null meski kelas sudah dipilih di UI).

**Dropdown kelas sudah berjalan dengan benar** — user dapat memilih kelas. Bug ada di server-side saja.

### Bug — Server: kelompok_id null di createStudentsBatch

`actions.ts:891-898` — batch mengambil hierarchy dari profile guru, bukan dari kelas yang dipilih:

```typescript
const studentsToInsert = validStudents.map(s => ({
    name: s.name.trim(),
    gender: s.gender,
    class_id: classId,
    kelompok_id: profile.kelompok_id,   // <- null untuk guru desa!
    desa_id: profile.desa_id,
    daerah_id: profile.daerah_id
}))
```

Guru desa punya `desa_id` tapi tidak punya `kelompok_id` di profile. `kelompok_id` harusnya diambil dari **kelas yang dipilih** (kelas punya field `kelompok_id`).

**Kontras dengan `createStudent` (non-batch):** Pakai `buildStudentHierarchy(userProfile, kelompokId, kelompokData)` yang fetch kelompok dari DB jika `kelompokId` diberikan. Batch tidak pakai ini.

**Fix yang benar:** Fetch `kelompok_id` dari kelas yang dipilih, lalu pakai `buildStudentHierarchy` seperti `createStudent`.

---

## Files to Modify

1. `src/app/(admin)/users/siswa/actions/students/actions.ts` — lines 879-898 (createStudentsBatch)
2. `src/app/(admin)/users/siswa/components/batch-import/Step1Config.tsx` — lines 53-58 (auto-select refinement, lower priority)

---

## Task 2 — Fix auto-select logic

**File:** `src/app/(admin)/users/siswa/components/batch-import/Step1Config.tsx`
**Lines:** 53-58

**BEFORE:**
```typescript
useEffect(() => {
  if (userProfile?.role === 'teacher' && userProfile.classes?.[0] && !selectedClassId) {
    setSelectedClassId(userProfile.classes[0].id)
  }
}, [userProfile, selectedClassId, setSelectedClassId])
```

**AFTER:**
```typescript
useEffect(() => {
  if (userProfile?.role === 'teacher' && userProfile.classes?.length === 1 && !selectedClassId) {
    setSelectedClassId(userProfile.classes[0].id)
  }
}, [userProfile, selectedClassId, setSelectedClassId])
```

**Logic:** Hanya auto-select jika teacher kelompok dengan tepat 1 kelas. Guru desa (`classes.length === 0`) tidak auto-select (biarkan pilih manual). Guru kelompok dengan 2+ kelas juga tidak auto-select (biarkan pilih manual).

---

## Task 3 — Fix kelompok_id di createStudentsBatch

**File:** `src/app/(admin)/users/siswa/actions/students/actions.ts`
**Lines:** 879-898

Fetch `kelompok_id` dari kelas yang dipilih, lalu gunakan `buildStudentHierarchy` untuk resolve hierarchy lengkap (sama dengan cara `createStudent` non-batch).

**BEFORE:**
```typescript
const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, name')
    .eq('id', classId)
    .single()

if (classError || !classData) throw new Error('Kelas tidak ditemukan')

// ...

const studentsToInsert = validStudents.map(s => ({
    name: s.name.trim(),
    gender: s.gender,
    class_id: classId,
    kelompok_id: profile.kelompok_id,   // <- salah
    desa_id: profile.desa_id,
    daerah_id: profile.daerah_id
}))
```

**AFTER:**
```typescript
const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, name, kelompok_id')    // <- tambah kelompok_id
    .eq('id', classId)
    .single()

if (classError || !classData) throw new Error('Kelas tidak ditemukan')

// Resolve kelompok hierarchy dari kelas (untuk guru desa yang profile.kelompok_id = null)
let kelompokData: any = null
if (classData.kelompok_id) {
    const { data: kData } = await supabase
        .from('kelompok')
        .select(`
            id,
            desa_id,
            desa:desa_id(
                id,
                daerah_id,
                daerah:daerah_id(id)
            )
        `)
        .eq('id', classData.kelompok_id)
        .single()
    kelompokData = kData
}

const hierarchy = buildStudentHierarchy(
    { kelompok_id: profile.kelompok_id, desa_id: profile.desa_id, daerah_id: profile.daerah_id, role: profile.role },
    classData.kelompok_id || undefined,
    kelompokData || undefined
)

// ...

const studentsToInsert = validStudents.map(s => ({
    name: s.name.trim(),
    gender: s.gender,
    class_id: classId,
    kelompok_id: hierarchy.kelompok_id,   // <- benar: dari kelas
    desa_id: hierarchy.desa_id,
    daerah_id: hierarchy.daerah_id
}))
```

**Note:** `buildStudentHierarchy` sudah diimport di line 40 — tidak perlu tambah import baru.

---

## Verification

```bash
npm run type-check  # Must be clean
```

Manual test — batch import:
1. Login guru desa -> buka `/users/siswa` -> klik "Import Batch" -> Step 1 tampil dropdown kelas berisi kelas-kelas di desa guru
2. Pilih kelas -> isi nama siswa -> import -> siswa muncul di tabel dengan kelas **dan kelompok** yang benar
3. Cek database: siswa punya `kelompok_id` terisi (bukan null)
4. Regression: guru kelompok (1 kelas) -> batch -> kelas auto-selected, siswa terbuat dengan kelompok benar
5. Regression: superadmin -> batch -> semua kelas tersedia, siswa terbuat dengan kelompok benar

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini? — Tidak, fix mengikuti Hierarchical Teacher Pattern yang sudah ada di `docs/claude/architecture-patterns.md`
- [ ] Apakah ada tabel database baru? — Tidak
- [ ] Apakah ada route/page baru? — Tidak
- [ ] Apakah ada permission pattern baru? — Tidak
- [ ] Jika ada yang perlu diupdate -> Tidak perlu update docs
