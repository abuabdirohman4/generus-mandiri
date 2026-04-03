# Design Doc: Fitur Naik Kelas (Grade Promotion)

**Tanggal:** 2026-04-03
**Status:** Approved
**Scope:** Batch grade promotion dengan promotion window toggle

---

## Context

Setiap tahun ajaran (Juni/Juli), siswa perlu naik kelas secara massal. Saat ini tidak ada fitur untuk ini — admin/guru harus pindahkan siswa satu per satu secara manual, yang rawan error dan makan waktu.

Fitur ini menambahkan:
1. **Promotion Window Toggle** — Superadmin/Admin Daerah aktifkan/nonaktifkan periode naik kelas
2. **Halaman `/naik-kelas`** — Wizard batch promotion dengan preview sebelum eksekusi
3. **Audit Trail** — Log immutable setiap kejadian naik kelas
4. **E2E Tests** — Perlindungan agar eksekusi tidak kacaukan data produksi

---

## Database Schema

### Tabel Baru: `app_settings`
```sql
CREATE TABLE app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Row untuk toggle naik kelas:
-- key = 'grade_promotion_enabled'
-- value = { "enabled": true, "enabled_by": "uuid", "enabled_at": "iso-date" }
```

### Tabel Baru: `grade_promotion_mappings`
```sql
CREATE TABLE grade_promotion_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_class_master_id uuid REFERENCES class_masters(id) ON DELETE CASCADE,
  to_class_master_id uuid REFERENCES class_masters(id) ON DELETE CASCADE,
  is_default boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_class_master_id)
);
```

### Tabel Baru: `grade_promotion_logs`
```sql
CREATE TABLE grade_promotion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid REFERENCES academic_years(id),
  from_class_id uuid REFERENCES classes(id),
  to_class_id uuid REFERENCES classes(id),
  student_id uuid REFERENCES students(id),
  promoted_by uuid REFERENCES profiles(id),
  promoted_at timestamptz DEFAULT now(),
  notes text
);
-- Immutable: no UPDATE/DELETE allowed via RLS
```

---

## Permission Matrix

| Role | Aktifkan Toggle | Konfigurasi Mapping | Jalankan Naik Kelas |
|---|---|---|---|
| Superadmin | ✅ | ✅ | ✅ (semua scope) |
| Admin Daerah | ✅ | ✅ | ✅ (scope daerah) |
| Admin Desa | ❌ | ❌ | ✅ (scope desa) |
| Admin Kelompok | ❌ | ❌ | ✅ (scope kelompok) |
| Guru | ❌ | ❌ | ✅ (kelas mereka saja) |

---

## Arsitektur Halaman

### `/naik-kelas` — Wizard 4 Step
1. **Pilih Kelas Asal** — dropdown kelas sesuai scope organisasi user
2. **Preview & Mapping** — list siswa + suggest kelas tujuan, bisa override per-siswa atau exclude
3. **Konfirmasi** — summary total siswa yang akan naik
4. **Hasil** — laporan sukses/gagal per siswa

### `/settings` — Tambahan
- Toggle "Mode Naik Kelas" (hanya Superadmin & Admin Daerah)
- Link ke halaman konfigurasi mapping

### `/settings/grade-promotion-mappings`
- CRUD untuk `grade_promotion_mappings`
- Tabel: dari class_master → ke class_master

### Sidebar
- Menu `/naik-kelas` muncul **hanya jika** `app_settings.grade_promotion_enabled = true`

---

## Alur Teknis Eksekusi

```
Server Action: executeGradePromotion(payload)

1. Validasi permission user terhadap scope kelas
2. Ambil active academic_year
3. Untuk setiap siswa yang dipilih:
   a. INSERT student_enrollments (academic_year_id, class_id=tujuan, status='active')
   b. UPDATE students.class_id = kelas_tujuan
   c. UPSERT student_classes (student_id, class_id=tujuan)
   d. INSERT grade_promotion_logs (audit trail)
4. revalidatePath('/naik-kelas')
5. Return { success: [...studentIds], failed: [...{ studentId, error }] }

Rollback: Tidak ada full rollback — return partial success.
Admin bisa retry siswa yang gagal.
```

### Suggest Kelas Tujuan Logic
```
suggestTargetClass(fromClass, kelompokId):
1. Ambil class_master dari kelas asal (via class_master_mappings)
2. Cari grade_promotion_mappings WHERE from_class_master_id = match
3. Jika ada → gunakan to_class_master_id dari mapping
4. Jika tidak ada → cari class_master dengan sort_order = sort_order_asal + 1
5. Filter kelas aktual dalam kelompok yang sama dengan class_master tersebut
6. Return kelas tujuan yang ditemukan (atau null jika tidak ada)
```

---

## File Structure

```
src/app/(admin)/naik-kelas/
  page.tsx                          # Wizard UI
  actions/
    promotion.ts                    # executeGradePromotion server action
    settings.ts                     # getPromotionEnabled, togglePromotionEnabled
    mappings.ts                     # CRUD grade_promotion_mappings
    suggestions.ts                  # suggestTargetClass logic
  components/
    PromotionWizard.tsx
    ClassSelector.tsx
    StudentPromotionTable.tsx
    ConfirmationStep.tsx
    ResultStep.tsx
  types.ts

src/app/(admin)/settings/
  grade-promotion-mappings/
    page.tsx
    actions/mappings.ts
    components/MappingTable.tsx

src/types/promotion.ts              # Type definitions
```

---

## Testing Strategy

### E2E Tests (Playwright) — wajib
| Skenario | File |
|---|---|
| Toggle aktif → menu muncul | `tests/e2e/naik-kelas/toggle.spec.ts` |
| Toggle nonaktif → halaman 403 | `tests/e2e/naik-kelas/toggle.spec.ts` |
| Permission: Admin Desa tidak bisa toggle | `tests/e2e/naik-kelas/permissions.spec.ts` |
| Wizard happy path | `tests/e2e/naik-kelas/promotion-flow.spec.ts` |
| Suggest kelas tujuan benar | `tests/e2e/naik-kelas/promotion-flow.spec.ts` |
| Override kelas tujuan per-siswa | `tests/e2e/naik-kelas/promotion-flow.spec.ts` |
| Exclude siswa | `tests/e2e/naik-kelas/promotion-flow.spec.ts` |
| Scope isolation (guru hanya lihat kelasnya) | `tests/e2e/naik-kelas/permissions.spec.ts` |
| Audit trail tersimpan di logs | `tests/e2e/naik-kelas/audit.spec.ts` |

### Unit Tests (Vitest)
- `suggestTargetClass()` — mapping logic semua skenario
- `validatePromotionPermission()` — permission checks per role
- `preparePromotionData()` — data transformation sebelum upsert

---

## Decisions & Rationale

| Keputusan | Alasan |
|---|---|
| Halaman dedicated `/naik-kelas` | Flow wizard terlalu panjang untuk disisipkan di halaman lain |
| Toggle manual (bukan date range) | Lebih fleksibel, superadmin punya kontrol penuh |
| Partial success (no rollback) | Rollback sulit di multi-step; partial result lebih actionable untuk admin |
| Histori enrollment tetap tersimpan | Data lama diperlukan untuk laporan per tahun ajaran |
| `app_settings` table (bukan env var) | Bisa diubah runtime oleh admin tanpa deploy ulang |
