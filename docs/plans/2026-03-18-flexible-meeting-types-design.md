# Design: Flexible Tipe Sambung & Tipe Kegiatan

**Date:** 2026-03-18
**Beads Issues:** sm-2yq (Tipe Sambung), sm-aiq (Tipe Kegiatan), sm-idm (Phase 2 cleanup)
**Status:** Approved — ready for implementation

---

## Context

Aplikasi saat ini memiliki 6 tipe pertemuan yang hardcoded di `src/lib/constants/meetingTypes.ts`:
- ASAD, PEMBINAAN, SAMBUNG_KELOMPOK, SAMBUNG_DESA, SAMBUNG_DAERAH, SAMBUNG_PUSAT

Assignment ke guru menggunakan logika kompleks berbasis role + kategori kelas di `getAvailableMeetingTypesByRole()`.

**Problem:** Tidak fleksibel — menambah/mengubah tipe pertemuan membutuhkan code change dan deployment.

**Solution:** Pindah ke DB-driven types dengan UI management yang bisa dikelola superadmin, menggunakan flow "pilih tipe → assign ke banyak guru" (bukan teacher-first seperti sekarang).

---

## Scope

Dua sistem tipe baru:
1. **Tipe Sambung** — menggantikan tipe pertemuan existing, same role-based logic tapi configurable via UI
2. **Tipe Kegiatan** — konsep baru (Pengajian, ASAD, Asrama), field terpisah di form yang sama

Keduanya muncul di `CreateMeetingModal.tsx` sebagai dua field yang berbeda.

---

## Breaking Change Assessment

**Phase 1 adalah NON-BREAKING:**
- `meetings.meeting_type_code` tidak diubah — kode string identical dengan `code` di tabel baru
- `src/lib/constants/meetingTypes.ts` tetap ada sebagai fallback
- Guru tanpa assignment rows → fallback ke logika lama otomatis
- `showActivityType` baru di JSONB → backward safe

**Phase 2 (sm-idm) akan breaking** — dilakukan hanya setelah semua guru sudah ter-assign via UI baru.

---

## Database Schema

### Tabel Baru

```sql
CREATE TABLE sambung_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,        -- e.g. 'SAMBUNG_KELOMPOK'
  label      text NOT NULL,               -- e.g. 'Sambung Kelompok'
  color      text NOT NULL DEFAULT '#6B7280',
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE activity_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,        -- e.g. 'PENGAJIAN'
  label      text NOT NULL,
  color      text NOT NULL DEFAULT '#6B7280',
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE teacher_sambung_type_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sambung_type_id uuid NOT NULL REFERENCES sambung_types(id) ON DELETE CASCADE,
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, sambung_type_id)
);

CREATE TABLE teacher_activity_type_assignments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type_id uuid NOT NULL REFERENCES activity_types(id) ON DELETE CASCADE,
  assigned_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, activity_type_id)
);

-- Kolom baru di meetings
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS activity_type_code text;
```

### RLS Policies

- `sambung_types` / `activity_types`: read = semua authenticated, write = superadmin only
- `teacher_*_assignments`: read = superadmin OR own teacher_id, write = superadmin only

### Seed Data

**sambung_types** (migrate 6 existing codes — tidak perlu ubah data meetings):
| code | label | color |
|------|-------|-------|
| ASAD | ASAD | #3B82F6 |
| PEMBINAAN | Pembinaan | #10B981 |
| SAMBUNG_KELOMPOK | Sambung Kelompok | #F59E0B |
| SAMBUNG_DESA | Sambung Desa | #8B5CF6 |
| SAMBUNG_DAERAH | Sambung Daerah | #EC4899 |
| SAMBUNG_PUSAT | Sambung Pusat | #EF4444 |

**activity_types** (3 initial):
| code | label | color |
|------|-------|-------|
| PENGAJIAN | Pengajian | #6366F1 |
| ASAD_KGT | ASAD | #F97316 |
| ASRAMA | Asrama | #14B8A6 |

---

## Architecture

### Folder Structure Baru

```
src/types/meetingTypeConfig.ts                          ← SambungType, ActivityType interfaces

src/app/(admin)/settings/types/
  page.tsx                                               ← Hub (superadmin only)
  sambung/
    page.tsx                                             ← CRUD + bulk assign
    components/
      SambungTypeCard.tsx
      SambungTypeForm.tsx
      BulkAssignSambungModal.tsx
  kegiatan/
    page.tsx
    components/
      ActivityTypeCard.tsx
      ActivityTypeForm.tsx
      BulkAssignActivityModal.tsx
  actions/
    sambung/{queries,logic,actions}.ts
    kegiatan/{queries,logic,actions}.ts

src/app/(admin)/absensi/hooks/
  useSambungTypes.ts                                     ← DB-driven, fallback ke hardcode
  useActivityTypes.ts                                    ← DB-driven, no fallback
```

### Data Flow: useSambungTypes

```
Teacher → query teacher_sambung_type_assignments JOIN sambung_types
        → fallback: jika 0 rows → getAvailableMeetingTypesByRole() (lama)

Admin/Superadmin → query all sambung_types WHERE is_active = true
```

### Bulk Assignment Flow (UI)

```
/settings/types/sambung
  [Tipe Card] [Atur Guru] →
    BulkAssignSambungModal:
      - Fetch semua guru
      - Fetch current assignments untuk type ini
      - MultiSelectCheckbox
      - Save: DELETE all existing + INSERT selected (replace strategy)
```

---

## Implementation Steps

| Step | File | Action |
|------|------|--------|
| 1 | Supabase (via MCP) | DB migration + RLS + seed |
| 2 | `src/types/meetingTypeConfig.ts` | Create SambungType, ActivityType |
| 3 | `src/types/meeting.ts` | Add activity_type_code |
| 4 | `src/app/(admin)/users/guru/actions/types.ts` | Add showActivityType |
| 5 | `src/lib/swr.ts` | Add sambungTypeKeys, activityTypeKeys |
| 6 | `src/app/(admin)/settings/types/actions/` | Server actions CRUD + bulk assign |
| 7 | `src/app/(admin)/absensi/hooks/useSambungTypes.ts` | New hook |
| 8 | `src/app/(admin)/absensi/hooks/useActivityTypes.ts` | New hook |
| 9 | `src/app/(admin)/settings/types/` | Management UI pages |
| 10 | `src/app/(admin)/settings/page.tsx` | Add card |
| 11 | `src/app/(admin)/absensi/components/CreateMeetingModal.tsx` | Add Tipe Kegiatan + useSambungTypes |
| 12 | `src/app/(admin)/absensi/actions/meetings/queries.ts` | Add activity_type_code |
| 13 | `src/app/(admin)/users/guru/components/SettingsModal.tsx` | Add showActivityType field |
| 14 | `src/app/(admin)/absensi/components/MeetingTypeBadge.tsx` | DB-first + fallback |
| 15 | Tests | TDD for logic + actions |

---

## Phase 2 Cleanup (sm-idm — setelah Phase 1 stabil)

1. Delete `src/lib/constants/meetingTypes.ts`
2. Delete `getAvailableMeetingTypesByRole()` dan semua referensinya
3. Update `DataFilter.tsx` — ganti MEETING_TYPES dengan useSambungTypes()
4. Update `MeetingList.tsx`, `TodayMeetings.tsx` — label dari DB
5. Update `MeetingTypeBadge.tsx` — hapus fallback hardcode
6. Delete atau replace `useMeetingTypes.ts`

---

## Verification Checklist

- [ ] DB: `SELECT * FROM sambung_types` → 6 rows
- [ ] DB: `SELECT * FROM activity_types` → 3 rows
- [ ] UI: Superadmin bisa CRUD tipe di `/settings/types`
- [ ] UI: Bulk assign → guru ter-assign muncul di list
- [ ] UI: Guru yang di-assign → hanya tipe assigned tampil di CreateMeetingModal
- [ ] UI: Guru tanpa assignment → fallback ke logika lama (tidak breaking)
- [ ] UI: Tipe Kegiatan muncul sebagai field terpisah
- [ ] Existing meetings: badge dan label tetap tampil benar
- [ ] `npm run test:run` → pass
- [ ] `npm run type-check` → no errors
