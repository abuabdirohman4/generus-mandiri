# Plan: Hapus Legacy meeting_type_code (sm-g7i)

**Date**: 2026-05-12  
**Issue**: sm-g7i / GH-#41  
**Branch**: `chore/sm-g7i-hapus-legacy-meeting-type-code`  
**Priority**: P3  
**Type**: chore (cleanup)

---

## Context

Sistem Activity Type + Activity Level (sm-253) sudah fully migrated dan stable di production. Kolom `meeting_type_code` di tabel `meetings` dan file `src/lib/constants/meetingTypes.ts` adalah legacy dari sistem lama. Semua logika sudah digantikan oleh `activity_type_id` + `activity_level_id`.

Cleanup ini mencakup:
1. Hapus kolom `meeting_type_code` dari DB via migration
2. Hapus file `src/lib/constants/meetingTypes.ts` (MEETING_TYPES hardcode + `getAvailableMeetingTypesByRole()`)
3. Hapus semua referensi `meeting_type_code` dan `meetingTypeCode` dari kode
4. Hapus komentar `// hapus nanti` yang tersisa
5. Update `MeetingTypeBadge` agar hanya pakai `activity_type`

---

## Scope: Files Yang Terdampak

| File | Perubahan |
|------|-----------|
| `supabase/migrations/YYYYMMDDHHMMSS_remove_meeting_type_code.sql` | Buat migration baru |
| `src/lib/constants/meetingTypes.ts` | **DELETE** seluruh file |
| `src/types/meeting.ts` | Hapus `meeting_type_code`, `meetingTypeCode` fields |
| `src/types/dashboard.ts` | Hapus `meeting_type_code` field |
| `src/app/(admin)/presensi/actions/meetings/queries.ts` | Hapus `meeting_type_code` dari select & insert |
| `src/app/(admin)/presensi/actions/meetings/actions.ts` | Hapus `meeting_type_code` dari destructuring |
| `src/app/(admin)/presensi/hooks/useMeetings.ts` | Hapus `meeting_type_code` dari interface |
| `src/app/(admin)/presensi/hooks/useMeetingTypes.ts` | Refactor: hapus import MEETING_TYPES |
| `src/app/(admin)/presensi/components/CreateMeetingModal.tsx` | Hapus import MEETING_TYPES, hapus meetingTypeCode |
| `src/app/(admin)/presensi/components/MeetingList.tsx` | Hapus `meeting_type_code` checks |
| `src/app/(admin)/presensi/components/MeetingCards.tsx` | Hapus `meeting_type_code` checks |
| `src/app/(admin)/presensi/components/MeetingTypeBadge.tsx` | Refactor: gunakan `activity_type` only |
| `src/app/(admin)/presensi/[meetingId]/page.tsx` | Hapus `meeting_type_code` checks |
| `src/app/(admin)/dashboard/actions/overview/queries.ts` | Hapus `meeting_type_code` dari select |
| `src/app/(admin)/dashboard/components/TodayMeetings.tsx` | Hapus `meeting_type_code` fallback |
| `src/app/(admin)/users/siswa/actions/students/queries.ts` | Hapus `meeting_type_code` dari select |
| `src/app/(admin)/users/siswa/actions/students/actions.ts` | Hapus inline `meeting_type_code` type |
| `src/app/(admin)/presensi/actions/meetings/__tests__/queries.test.ts` | Update test fixtures |

---

## Task-by-Task Implementation

### ~~Task 1: DB Migration~~ ✅ SUDAH SELESAI

**Dikerjakan oleh Claude Code via MCP pada 2026-05-12.**

Yang sudah dijalankan:
1. **Backfill data** — 21 meetings yang belum punya `activity_type_id`:
   - Semua di-set `activity_type_id = Pengajian (0379597a-e098-4fc3-beef-62327a41a714)`
   - Semua di-set `activity_level_id = KELOMPOK (8d92b89a-c727-41da-9007-db3904a5eba2)`
   - 3 meetings dengan `kelompok_ids = NULL` di-populate dari class_ids mereka:
     - `955d8711` → `kelompok_ids = [Dayeuhkolot (72bfb6b4)]`
     - `13f80f6f`, `b4866977` → `kelompok_ids = [Barujati (777ba993)]`
2. **Drop kolom** — `ALTER TABLE meetings DROP COLUMN meeting_type_code`

Verifikasi konfirmasi:
- `meeting_type_code`: sudah tidak ada ✅
- 1866 meetings: semua punya `activity_type_id` dan `activity_level_id` ✅

**SKIP Task 1 — langsung ke Task 2.**

---

### Task 2: Update `src/types/meeting.ts`

**Hapus** field `meeting_type_code` dan `meetingTypeCode`:

```typescript
// SEBELUM (baris 9):
meeting_type_code?: string | null

// HAPUS baris tersebut — field tidak ada lagi di DB

// SEBELUM (baris 28):
meetingTypeCode?: string | null

// HAPUS baris tersebut — tidak dibutuhkan lagi
```

**File setelah edit** — `Meeting` interface:
```typescript
export interface Meeting {
  id: string
  title?: string
  date: string
  topic?: string
  description?: string
  class_ids: string[]
  kelompok_ids?: string[]
  activity_type_id?: string | null
  activity_level_id?: string | null
  activity_type?: { id: string; code: string; name: string } | null
  activity_level?: { id: string; code: string; name: string } | null
  student_snapshot?: string[]
  created_at: string
  updated_at?: string
}
```

**`CreateMeetingData` interface**:
```typescript
export interface CreateMeetingData {
  classIds: string[]
  kelompokIds?: string[]
  date: string
  title?: string
  topic?: string
  description?: string
  activityTypeId?: string | null
  activityLevelId?: string | null
  studentIds?: string[]
}
```

**TDD**:
```bash
# Verify: setelah edit, type-check harus pass
npm run type-check
# Expected: 0 errors (atau hanya error di file lain yang belum diupdate)
```

---

### Task 3: Update `src/types/dashboard.ts`

**Lokasi**: baris 58

```typescript
// SEBELUM:
meeting_type_code: string | null

// HAPUS field ini
```

**Verifikasi**:
```bash
grep -n "meeting_type_code" src/types/dashboard.ts
# Expected: no output
```

---

### Task 4: Hapus `src/lib/constants/meetingTypes.ts`

File ini berisi `MEETING_TYPES`, `getAvailableMeetingTypesByRole()`, `getMeetingTypeLabel()` — semua legacy.

**CATATAN PENTING**: Sebelum hapus, pastikan semua import ke file ini sudah diupdate di Task 5-6.

```bash
# Cek semua yang masih import dari sini
grep -rn "from '@/lib/constants/meetingTypes'" src/
# Expected setelah semua task selesai: no output
```

**Delete file**:
```bash
rm src/lib/constants/meetingTypes.ts
```

---

### Task 5: Refactor `src/app/(admin)/presensi/hooks/useMeetingTypes.ts`

File ini masih `import { getAvailableMeetingTypesByRole, MEETING_TYPES } from '@/lib/constants/meetingTypes'`.

**Periksa isi file dulu**:
```bash
cat src/app/(admin)/presensi/hooks/useMeetingTypes.ts
```

Hook ini mungkin seluruhnya sudah digantikan oleh `useActivityTypes` dari `src/hooks/useActivityTypes.ts`. Jika iya:
- Hapus seluruh file `useMeetingTypes.ts`
- Cek apakah ada yang masih import `useMeetingTypes`:
  ```bash
  grep -rn "useMeetingTypes" src/
  ```
- Jika ada, update import ke `useActivityTypes`

Jika hook masih dipakai dengan logika berbeda, hapus hanya bagian yang pakai `MEETING_TYPES` dan ganti dengan data dari `useActivityTypes`.

---

### Task 6: Refactor `src/app/(admin)/presensi/components/CreateMeetingModal.tsx`

**Baris 23**: `import { MEETING_TYPES } from '@/lib/constants/meetingTypes'`
- Hapus import ini

**Baris 96**: `PEMBINAAN: MEETING_TYPES.PEMBINAAN`
- Ini adalah fallback default. Setelah migrasi, fallback cukup `null` atau kosong — karena `useActivityTypes` akan load dari DB.
- Hapus atau replace dengan `null`

**Baris 465**: `setMeetingType(meeting.meeting_type_code || '')`
- Hapus baris ini (state `meetingType` dari meeting_type_code tidak relevan lagi)
- Jika ada state `meetingType` yang masih digunakan, verifikasi apakah perlu diganti dengan `activityTypeId`

**Verifikasi**:
```bash
grep -n "MEETING_TYPES\|meeting_type_code\|meetingTypeCode" "src/app/(admin)/presensi/components/CreateMeetingModal.tsx"
# Expected: no output
```

---

### Task 7: Update queries.ts — Presensi

**File**: `src/app/(admin)/presensi/actions/meetings/queries.ts`

**Hapus `meeting_type_code` dari SELECT** (baris 28 dan 85):
```typescript
// HAPUS baris:
meeting_type_code,
```

**Hapus dari INSERT** (baris 128):
```typescript
// SEBELUM:
meeting_type_code: data.meetingTypeCode,

// HAPUS baris ini
```

**Hapus dari UPDATE** (baris 157):
```typescript
// SEBELUM:
if (data.meetingTypeCode !== undefined) updateData.meeting_type_code = data.meetingTypeCode

// HAPUS baris ini
```

**TDD — update test**:
File `src/app/(admin)/presensi/actions/meetings/__tests__/queries.test.ts` baris 66:
```typescript
// SEBELUM:
meeting_type_code: 'regular',

// HAPUS field ini dari mock data
```

```bash
npm run test:run -- queries.test.ts
# Expected: all tests pass
```

---

### Task 8: Update `actions.ts` — Presensi

**File**: `src/app/(admin)/presensi/actions/meetings/actions.ts`

Hapus `meeting_type_code` dari destructuring di 4 lokasi (baris 567, 666, 1220, 1543):

```typescript
// Cari pattern seperti ini dan hapus baris meeting_type_code:
const {
  ...,
  meeting_type_code,  // ← HAPUS baris ini
  activity_type_id,
  ...
} = meeting
```

**Verifikasi**:
```bash
grep -n "meeting_type_code" "src/app/(admin)/presensi/actions/meetings/actions.ts"
# Expected: no output
```

---

### Task 9: Hapus dari components — MeetingList, MeetingCards, MeetingTypeBadge

**`MeetingList.tsx`**:
- Baris 252: `if (meeting.meeting_type_code === 'SAMBUNG_DESA')` — Ganti dengan check `activity_type?.code === 'SAMBUNG_DESA'` atau `activity_level?.code`
- Baris 408: `meeting_type_code?: string | null` — Hapus dari inline interface

**`MeetingCards.tsx`**:
- Baris 214: `if (meeting.meeting_type_code === 'SAMBUNG_DESA')` — Ganti dengan check `activity_type?.code === 'SAMBUNG_DESA'`
- Baris 410: `meeting_type_code?: string | null` — Hapus dari inline interface

**`MeetingTypeBadge.tsx`**:
```typescript
// SEBELUM:
import { MEETING_TYPES } from '@/lib/constants/meetingTypes'
const meetingType = Object.values(MEETING_TYPES).find(t => t.code === meetingTypeCode)

// SETELAH: Terima activity_type object langsung, atau tetap terima code string
// dan tampilkan code as-is (sudah human-readable dari DB)
```

Jika `MeetingTypeBadge` hanya menampilkan label dari code, dan sekarang `activity_type.name` sudah tersedia, cukup:
```typescript
// Tidak perlu lookup dari MEETING_TYPES — tampilkan activity_type.name langsung
```

Verifikasi component mana yang pass `meeting_type_code` vs `activity_type`:
```bash
grep -n "MeetingTypeBadge" src/ -r
```

---

### Task 10: Update presensi/[meetingId]/page.tsx

**Baris 420 dan 475**: 
```typescript
// SEBELUM:
(!meeting.activity_level_id && meeting.meeting_type_code === 'SAMBUNG_DESA')

// SETELAH: Ganti dengan check activity_type
(!meeting.activity_level_id && meeting.activity_type?.code === 'SAMBUNG_DESA')
```

---

### Task 11: Update dashboard queries dan TodayMeetings

**`dashboard/actions/overview/queries.ts` baris 124**:
```typescript
// HAPUS:
meeting_type_code,
```

**`dashboard/components/TodayMeetings.tsx` baris 54-56**:
```typescript
// SEBELUM:
{(meeting.activity_type?.name || meeting.meeting_type_code) && (
    {meeting.activity_type?.name || meeting.meeting_type_code}

// SETELAH: Hanya gunakan activity_type
{meeting.activity_type?.name && (
    {meeting.activity_type.name}
```

---

### Task 12: Update users/siswa actions

**`users/siswa/actions/students/queries.ts` baris 290**:
```typescript
// HAPUS:
meeting_type_code,
```

**`users/siswa/actions/students/actions.ts` baris 968**:
```typescript
// HAPUS inline type:
meeting_type_code?: string | null
```

**`hooks/useMeetings.ts` baris 21**:
```typescript
// HAPUS:
meeting_type_code?: string | null
```

---

### Task 13: Final verification

```bash
# 1. Tidak ada referensi tersisa
grep -rn "meeting_type_code\|MEETING_TYPES\|getAvailableMeetingTypesByRole\|getMeetingTypeLabel\|meetingTypes\|// hapus nanti" src/ --include="*.ts" --include="*.tsx"
# Expected: no output

# 2. Hapus file legacy
ls src/lib/constants/meetingTypes.ts
# Expected: file not found (sudah dihapus di Task 4)

# 3. Type check
npm run type-check
# Expected: 0 errors

# 4. Tests
npm run test:run
# Expected: all pass

# 5. Build
npm run build
# Expected: success
```

---

## Commit Message Template

```
chore(sm-g7i): hapus legacy meeting_type_code dan MEETING_TYPES hardcode

- Drop kolom meeting_type_code dari DB (migration)
- Hapus src/lib/constants/meetingTypes.ts (MEETING_TYPES, getAvailableMeetingTypesByRole)
- Bersihkan semua referensi meeting_type_code dari types, queries, actions, components
- Ganti fallback display ke activity_type?.name

closes #41

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini? → Tidak, ini adalah cleanup
- [ ] Apakah ada tabel database baru yang perlu ditambahkan ke Key Tables? → Tidak (malah hapus kolom)
- [ ] Apakah ada route/page baru yang perlu ditambahkan ke App Router Structure? → Tidak
- [ ] Apakah ada permission pattern baru yang perlu didokumentasikan? → Tidak
- [ ] Update `CLAUDE.md` atau `docs/claude/architecture-patterns.md` setelah selesai: Update bagian Activity Types System agar menyebut bahwa `meeting_type_code` sudah dihapus
