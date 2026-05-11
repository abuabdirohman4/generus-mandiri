# Plan: Fix Tab Materi — Nested Join Broken (category_name kosong)

## Context

Tab Materi di halaman detail siswa (`/users/siswa/[studentId]/materi`) hanya menampilkan data kategori "Hafalan" meskipun filter di-set ke "Semua Kategori". Data untuk kategori lain ada di database (terkonfirmasi via halaman monitoring).

Root cause: `getStudentMateriProgress` di `actions/materi.ts` menggunakan plain LEFT JOIN untuk `material_types` dan `material_categories`. Ketika join tidak resolve (karena `!inner` tidak digunakan), `material_types` = null → `category_name` = `'—'` untuk kebanyakan items. Pola yang benar (digunakan di `materiQueries.ts` yang bekerja) adalah `material_types!inner(material_categories!inner(id, name))`.

---

## Files yang Dimodifikasi

| File | Action |
|------|--------|
| `src/app/(admin)/users/siswa/[studentId]/actions/materi.ts` | Fix join pattern: tambah `!inner`, gunakan alias |

---

## TASK 1 — Fix Nested Join di `materi.ts`

### File: `src/app/(admin)/users/siswa/[studentId]/actions/materi.ts`

**SEBELUM (line 44-55):**
```ts
const { data: itemsData } = await supabase
    .from('material_items')
    .select(`
        id,
        name,
        material_types (
            id,
            name,
            material_categories ( id, name )
        )
    `)
    .in('id', materialItemIds)
```

**SESUDAH — ikuti pola `materiQueries.ts` yang bekerja:**
```ts
const { data: itemsData } = await supabase
    .from('material_items')
    .select(`
        id,
        name,
        material_types!inner (
            id,
            name,
            material_categories!inner ( id, name )
        )
    `)
    .in('id', materialItemIds)
```

Property access di line 64 tetap sama (tidak berubah):
```ts
const type = item.material_types as any
itemMap.set(item.id, {
    name: item.name,
    typeName: type?.name ?? '—',
    categoryName: type?.material_categories?.name ?? '—',
})
```

**Kenapa `!inner` fix masalah ini**: `!inner` menggunakan INNER JOIN. Items yang tidak punya `material_type` valid akan dikeluarkan dari result — ini aman karena semua `material_items` yang ada di `student_material_progress` seharusnya punya `material_type`. Tanpa `!inner` (LEFT JOIN), items tetap di-return tapi dengan `material_types = null`.

### Jalankan test
`npm run test:run` → PASS. `npm run type-check` → bersih.

---

## Verification

- [ ] Buka tab Materi di detail siswa
- [ ] Semua kategori muncul (Hafalan, Baca-Tulis, Keilmuan, dll) saat filter "Semua Kategori"
- [ ] Filter per kategori bekerja — pilih "Keilmuan" → hanya tampil Keilmuan
- [ ] `npm run test:run` → pass
- [ ] `npm run type-check` → bersih

---

## Commit Message Template

```
fix(siswa): perbaiki nested join material_types → category_name tampil benar

- materi.ts: ganti plain join → !inner join untuk material_types dan material_categories
- Fix: tab Materi sebelumnya hanya tampil Hafalan karena category_name = '—' untuk kategori lain

fixes #69

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check
- [ ] Tidak ada pattern/arsitektur baru
- [ ] Pattern `!inner` join untuk PostgREST already documented di CLAUDE.md (Class Sort Order section)
- [ ] Tidak ada tabel/route baru
