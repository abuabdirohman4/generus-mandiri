# Plan: Fix 3 Bug Wizard Naik Kelas + Guard Double-Promotion

**Tanggal:** 2026-07-13
**Konteks:** Ditemukan saat remediasi data naik-kelas Bandung Selatan 2 (Warlob). 3 bug kode + 1 fitur UI. Data live sudah diremediasi manual (student_classes ganda 38 siswa, 6 log hantu, koreksi Paud Warlob). Ini fix **kode** biar tak terulang.

---

## Bug #1 — student_classes menumpuk (append, bukan replace)

**File:** `src/app/(admin)/naik-kelas/actions/promotion/queries.ts` + `actions.ts`

**Gejala:** siswa hasil naik-kelas punya >1 baris `student_classes` (kelas lama + baru) → kolom "Kelas" di halaman siswa tampil "–" (join ambiguous). 38 siswa terdampak di produksi.

**Akar:** `executeGradePromotion` panggil `deleteStudentClass(student, from_class_id)` — hapus HANYA baris `from_class_id`. Kalau baris `student_classes` siswa ≠ from_class_id yang dikirim (mis. data lama, atau promosi berulang), baris lama tak terhapus → numpuk. Tabel `student_classes` = (student_id, class_id), UNIQUE(student_id, class_id), **tanpa academic_year** → by design harus 1 baris = kelas aktif tunggal.

**Fix:** ganti `deleteStudentClass` jadi hapus SEMUA baris kelas siswa KECUALI tujuan (replace total).

```ts
// queries.ts — ganti signature/impl
export async function replaceStudentClass(supabase, studentId, toClassId) {
    // hapus semua baris student_classes siswa yang BUKAN kelas tujuan
    await supabase.from('student_classes').delete()
        .eq('student_id', studentId).neq('class_id', toClassId)
    // pastikan baris tujuan ada
    return await supabase.from('student_classes')
        .upsert({ student_id: studentId, class_id: toClassId },
                { onConflict: 'student_id,class_id', ignoreDuplicates: true })
}
```

Di `actions.ts` ganti pasangan `deleteStudentClass(from) + upsertStudentClass(to)` → `replaceStudentClass(to_class_id)`.

**Test:** unit — siswa dgn 2 baris sc lama → setelah promosi tinggal 1 (= to_class). Siswa dgn baris sc ≠ from_class_id → tetap kehapus.

---

## Bug #2 — Double promotion (siswa yang baru naik muncul lagi sebagai kandidat)

**File:** `src/app/(admin)/naik-kelas/actions/classes/actions.ts` (`getStudentsToPromote`) + komponen wizard preview.

**Gejala:** Paud→Kelas1, lalu buka wizard sumber Kelas 1 → anak yg baru naik muncul lagi → ikut naik ke Kelas 2 (naik 2 tingkat 1 tahun ajaran). Terbukti 6 korban (Warlob 1: Kelas6→SMP1→SMP2).

**Akar:** listing kandidat (`getStudentsToPromote` / `fetchStudentsInClasses`) TIDAK cek `grade_promotion_logs` tahun tujuan. Siswa yang sudah punya log promosi tahun itu tetap muncul & default tercentang.

**Fix (backend):** di `getStudentsToPromote`, join `grade_promotion_logs` utk `academic_year_id` tujuan. Tandai tiap row `already_promoted: boolean` (ada log promosi tahun ini sbg student_id). JANGAN sembunyikan — tetap tampil, hanya flag.

- Tambah field `already_promoted` ke `PromotionStudentRow` (`src/types/promotion.ts`).
- Query: `select student_id from grade_promotion_logs where academic_year_id = <tujuan> and student_id in (...)` → Set.

**Fix (frontend):** komponen preview wizard (step 2):
- Default checkbox: `checked = !already_promoted` (**auto-uncheck** yang sudah naik).
- Badge orange teks **"Sudah naik kelas tahun ini"**:
  - Desktop: di samping nama, dalam baris nama.
  - Mobile: row terpisah di bawah teks "Kelas X → Kelas Y".
  - Warna: orange (amber). Pakai komponen badge/span existing + class tailwind `text-amber-600 bg-amber-50` (cek pola badge lain dulu).
- Checkbox tetap **enabled** (user boleh centang manual kalau memang perlu — kasus khusus).

**Test:** unit — row dgn already_promoted=true → default unchecked. E2E opsional.

---

## Bug #3 — Guru lintas-kelompok cuma lihat 1 kelompok di wizard

**File:** `src/app/(admin)/naik-kelas/actions/classes/actions.ts` (`getPromotionSourceOptions` + `getStudentsToPromote`).

**Gejala:** Guru Paud punya `teacher_classes` = Paud Warlob 1 (kelompok 3333) + Paud Warlob 2 (kelompok 8181f21c). Halaman siswa tampil 2 kelompok (benar). Wizard naik-kelas cuma tampil Warlob 1.

**Akar:** untuk guru biasa, scope kelas dibatasi `resolveKelompokIdsInScope(getDataFilter(profile))` → balik `[profile.kelompok_id]` = 1 kelompok saja (Warlob 1). Kelas di kelompok lain (Warlob 2) tak masuk `classes` → hilang saat `.filter(teacherClassIds)`.

**Fix:** untuk **guru biasa**, kelompok scope = kelompok dari kelas yang dia AJAR (`teacher_classes`), BUKAN kelompok profil.

```ts
// guru biasa: resolve kelompokIds dari teacherClassIds, bukan getDataFilter
const teacherClassIds = await fetchTeacherClassIds(supabase, profile.id)
// query classes utk teacherClassIds → ambil distinct kelompok_id mereka
// lalu fetchClassesWithMasterInKelompok(kelompokIdsFromTeacherClasses)
```

Alternatif lebih langsung: fetch classes (+master) berdasar `teacherClassIds` langsung (helper baru `fetchClassesWithMasterByIds`), tak lewat gerbang kelompok. Terapkan di KEDUA fungsi (`getPromotionSourceOptions` DAN `getStudentsToPromote`) — keduanya pakai pola kelompok yang sama.

**Test:** unit — guru dgn teacher_classes di 2 kelompok → source options berisi kelas dari kedua kelompok.

---

## Urutan & Roles

- Roles: Claude Code = plan+issue+review · Antigravity/Sonnet = TDD+implementasi · User = git.
- Eksekusi: **Sonnet** (eksekusi terdefinisi dari spek ini). Bukan Fable — bukan long-horizon/risiko tinggi.
- Kategori output: **A (Antigravity)** — ≥3 file, >100 baris (3 bug lintas backend+frontend+test+types).

## File tersentuh (perkiraan)
- `naik-kelas/actions/promotion/queries.ts` (bug1)
- `naik-kelas/actions/promotion/actions.ts` (bug1)
- `naik-kelas/actions/classes/actions.ts` (bug2, bug3)
- `naik-kelas/actions/classes/queries.ts` (bug3 helper)
- `naik-kelas/components/*` preview wizard (bug2 UI)
- `src/types/promotion.ts` (bug2 field)
- test files masing-masing

## Verifikasi akhir (post-fix, via query MCP)
- 0 siswa >1 baris student_classes setelah promosi.
- 0 siswa >1 log grade_promotion_logs per academic_year.
- Guru multi-kelompok lihat semua kelasnya di wizard.
