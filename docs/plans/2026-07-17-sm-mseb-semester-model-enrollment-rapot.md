# Plan: Konsep Semester — Enrollment 1/Tahun + Rapot by-Data + Audit Kelas

**Issue:** sm-<TBD> / GH-#<TBD>
**Tanggal:** 2026-07-17
**Tipe:** feature (EPIC — dikerjakan bertahap per task, urutan wajib)
**Estimasi:** besar, ~10 file + migrasi data. Mode A (Antigravity), bertahap per task.

---

## Konteks & Keputusan (hasil diskusi panjang)

Sistem punya konsep **tahun ajaran** + **semester** yang tidak konsisten. Enrollment terikat semester (`unique student+year+semester`) → menghasilkan data campur: siswa kadang punya 2 baris (sem1+sem2), kadang 1, kadang cuma sem2. Ini bikin monitoring/rapot semester tidak reliable.

**Keputusan final (dikunci user):**

1. **Kelas siswa TETAP 1 tahun ajaran.** Kenaikan hanya antar tahun. Ganti kelas mid-year = jarang (koreksi) atau Pra Nikah naik (sering, tapi rapot tak terpengaruh).
2. **Rapot = by DATA (per bulan/semester), BUKAN by kelas.** Isi rapot semester = presensi (by tanggal) + materi (by semester) + nilai (nanti). Kelas hanya label header (pakai kelas terbaru).
3. **Model enrollment: 1 per siswa per tahun** (kelas = terbaru). Semester pindah dari enrollment ke data aktivitas.
4. **Semester default = auto dari bulan** (Jul–Des=1, Jan–Jun=2). User tetap bisa override.
5. **Audit trail semua perubahan kelas** (edit manual + naik) supaya mudah telusur kalau ada yang tanya "kok kelasnya beda".
6. **Rapikan data lama 2025/2026** jadi 1 enrollment/tahun.

**Trade-off yang diterima user:** rapot semester lama bisa tampil kelas terbaru di header (bukan kelas saat itu). Isi tetap akurat. Kalau nanti mengganggu → snapshot class_id di tabel rapot (optimasi kemudian, tidak sekarang).

---

## State data existing (dari investigasi MCP 2026-07-17)

Enrollment 2025/2026 semester 2 = 683 baris, terpecah:
- **128** duplikat (sem1+sem2 kelas SAMA) → hapus baris sem2 aman
- **146** kelas beda sem1 vs sem2 → ambil kelas sem2 (terbaru), buang sem1
- **409** cuma sem2 (siswa masuk mid-year saat sistem baru dipakai Mei 2026) → ubah semester 2→1, JANGAN hapus

Auto-carry backfill (sm-o08j) 471 siswa sudah dieksekusi. Weleri 1 siswa sudah dikoreksi.

---

## Tasks (urutan WAJIB — tiap task selesai + test PASS baru lanjut)

### Task 1 — Helper `getCurrentSemester` (foundation)

**File baru:** `src/lib/semester.ts`

```typescript
/**
 * Semester aktif diturunkan dari bulan:
 * Juli–Desember = 1, Januari–Juni = 2.
 * Dipakai sebagai DEFAULT filter (monitoring/laporan/materi/rapot).
 * BUKAN untuk membaca data historis — data lama pakai semester tersimpan.
 */
export function getCurrentSemester(d: Date = new Date()): 1 | 2 {
    const month = d.getMonth() + 1 // 1-12
    return month >= 7 ? 1 : 2
}
```

**Test (RED→GREEN):** `src/lib/__tests__/semester.test.ts`
- Juli (month 7) → 1
- Desember (12) → 1
- Januari (1) → 2
- Juni (6) → 2

### Task 2 — Ganti default semester hardcoded → getCurrentSemester

**Files:**
- `src/stores/laporanStore.ts:36` — `semester: 1` → `semester: getCurrentSemester()`
- Cek + ganti semua default `useState(1)` / `semester: 1` untuk FILTER (bukan data tersimpan) di: monitoring hooks, materi client, rapot client.

> HATI-HATI: hanya ganti DEFAULT FILTER. JANGAN sentuh tempat yang menyimpan `semester` ke DB (progress materi, rapot generate) — itu tetap ambil dari `getCurrentSemester()` saat CREATE, tapi tersimpan eksplisit.

**Test:** store default test — semester mengikuti bulan saat ini.

### Task 3 — Rapot lepas dari filter semester enrollment

**File:** `src/app/(admin)/rapot/actions/queries.ts` (fungsi `fetchStudentEnrollment`, baris ~320-333)

Buang `.eq('semester', semester)` — ambil enrollment by student + tahun (kelas tetap 1 tahun, tak perlu filter semester).

```typescript
export async function fetchStudentEnrollment(
    supabase: SupabaseClient,
    studentId: string,
    academicYearId: string
    // hapus param semester
) {
    return await supabase
        .from('student_enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .order('semester', { ascending: false }) // ambil terbaru kalau ada >1
        .limit(1)
        .maybeSingle()
}
```

Update semua pemanggil `fetchStudentEnrollment` (hapus argumen semester). Rapot semester tetap ambil DATA (presensi/materi) per semester — hanya penentuan KELAS yang lepas semester.

**Test:** `queries.test.ts` — enrollment diambil tanpa filter semester, ambil baris terbaru.

### Task 4 — Migrasi data lama 2025/2026 (via MCP, bukan kode)

**Dikerjakan langsung via MCP execute_sql saat task ini (bukan file migration).** Urutan:

**4a. Kategori 128 (duplikat kelas sama) — hapus baris sem2:**
```sql
DELETE FROM student_enrollments se2
USING student_enrollments se1
WHERE se2.academic_year_id = '<2025/2026 id>' AND se2.semester = 2
  AND se1.student_id = se2.student_id AND se1.academic_year_id = se2.academic_year_id
  AND se1.semester = 1 AND se1.class_id = se2.class_id;
```

**4b. Kategori 146 (kelas beda) — hapus baris sem1, biar sem2 (terbaru) tinggal:**
```sql
DELETE FROM student_enrollments se1
USING student_enrollments se2
WHERE se1.academic_year_id = '<id>' AND se1.semester = 1
  AND se2.student_id = se1.student_id AND se2.academic_year_id = se1.academic_year_id
  AND se2.semester = 2 AND se2.class_id <> se1.class_id;
```

**4c. Semua sisa sem2 → jadikan sem1 (model 1 baris/tahun):**
```sql
UPDATE student_enrollments
SET semester = 1
WHERE academic_year_id = '<id>' AND semester = 2;
```

> Setelah 4a & 4b, sem2 yang tersisa = 409 (cuma sem2) + 146 (yang sem1-nya sudah dihapus). 4c ubah semua jadi sem1. Hasil akhir: setiap siswa max 1 enrollment/tahun.
> VERIFIKASI setelah tiap langkah: cek tidak ada siswa dengan >1 enrollment di 2025/2026.
> DILAKUKAN via MCP dengan konfirmasi user per langkah (data historis — hati-hati).

### Task 5 — Audit trail perubahan kelas (edit manual)

**Gap:** edit kelas biasa (koreksi dalam kelompok sama) tidak tercatat. Naik kelas → `grade_promotion_logs`. Transfer antar-org → `transfer_history`/`transfer_requests`. Edit biasa → NIHIL.

**KEPUTUSAN (dikunci user):** buat **tabel baru `class_change_logs`** — grade_promotion_logs tetap murni untuk naik kelas.

**Skema tabel baru (via MCP apply_migration):**
```sql
CREATE TABLE class_change_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    from_class_id uuid REFERENCES classes(id),
    to_class_id uuid REFERENCES classes(id),
    change_type text NOT NULL DEFAULT 'manual_edit', -- 'manual_edit' | 'correction'
    reason text,
    changed_by uuid REFERENCES profiles(id),
    changed_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: read sesuai scope org, no UPDATE/DELETE (immutable audit)
CREATE INDEX idx_class_change_logs_student ON class_change_logs(student_id);
```

> Naik kelas → tetap `grade_promotion_logs`. Transfer antar-org → tetap `transfer_history`/`transfer_requests`. Edit kelas biasa (koreksi dalam kelompok sama) → `class_change_logs` (BARU). Tiga jalur audit terpisah, tidak tumpang tindih.

**File kode:** `src/app/(admin)/users/siswa/actions/management/actions.ts` + `queries.ts` — saat update kelas siswa (bukan promotion/transfer), insert ke `class_change_logs` (from = kelas lama, to = kelas baru, changed_by = current user).

**Test:** edit kelas → 1 baris `class_change_logs` tercatat (from, to, changed_by). Naik kelas & transfer TIDAK menulis ke tabel ini.

### Task 6 — Buang label semester di Riwayat Kelas

Sama seperti sm-o08j Task 6 (kalau belum dikerjakan): buang `· Sem {semester}` di `EnrollmentHistory.tsx`. Karena 1 enrollment/tahun, semester tak informatif di riwayat kelas.

---

## Verifikasi akhir

1. `npm run test:run` PASS
2. `npm run type-check` PASS
3. Data: tiap siswa max 1 enrollment/tahun (query cek)
4. Rapot semester 1 & 2 bisa di-generate (isi presensi+materi per semester, kelas header terbaru)
5. Monitoring/laporan default semester ikut bulan
6. Edit kelas siswa → tercatat di log

## CLAUDE.md Check
- [ ] Pattern baru? Ya — (a) semester auto-dari-bulan, (b) enrollment 1/tahun, (c) rapot by-data, (d) audit kelas. Update §Grade Promotion + tambah §Konsep Semester di `docs/claude/architecture-patterns.md`.
- [ ] Tabel DB baru? YA — `class_change_logs` (audit edit kelas manual, immutable). Tambah ke Key Tables CLAUDE.md.
- [ ] Route/page baru? Tidak.
- [ ] Business rule baru? Ya — "kelas tetap 1 tahun, rapot by-data, semester dari bulan". Update `docs/claude/business-rules.md`.

## Catatan eksekusi

Ini EPIC. Kerjakan **task 1→6 berurutan**, jangan paralel. Task 4 (migrasi data) & Task 5 (keputusan desain audit) WAJIB konfirmasi user sebelum eksekusi. Boleh dipecah jadi sub-sesi kalau terlalu besar.
