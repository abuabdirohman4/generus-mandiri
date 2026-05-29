# Plan: Unique Days Meeting Count Mode di Laporan OverviewTab

**Date**: 2026-05-29  
**Beads ID**: sm-al0  
**GH Issue**: #77 — https://github.com/abuabdirohman4/generus-mandiri/issues/77  
**Branch**: `feat/sm-al0-laporan-unique-days-mode`

---

## Context

Di laporan OverviewTab, kolom "Pertemuan" di ClassMonitoringTable menghitung jumlah **record meeting** di database. Untuk kelompok normal (1 guru) ini akurat — 1 hari = 1 meeting record. Tapi untuk kelompok multi-teacher seperti Warlob 1 & 2, tiap kelas punya record meeting sendiri, jadi 1 hari bisa = 5-6 records.

User ingin mode toggle: **"Hari Unik"** = hitung `COUNT(DISTINCT date)` per kelas/kelompok, bukan jumlah record. Ini memberikan perbandingan yang adil antar kelompok.

Fitur ini hanya ditampilkan untuk **user tingkat daerah ke atas** (superadmin + admin daerah + guru daerah), karena mereka yang punya kebutuhan lintas-kelompok.

---

## Scope: Who Can See This Toggle

```typescript
// Kondisi yang bisa lihat toggle:
const isDaerahLevel = 
  profile.role === 'superadmin' ||
  (profile.role === 'admin' && !!profile.daerah_id && !profile.desa_id) ||
  (profile.role === 'teacher' && !!profile.daerah_id && !profile.desa_id)
```

Gunakan helper yang sudah ada dari `@/lib/userUtils`:
- `isSuperAdmin(profile)` → true untuk superadmin
- `isAdminDaerah(profile)` → true untuk admin yang hanya punya daerah_id (bukan desa/kelompok)
- `isTeacherDaerah(profile)` → ada di `accessControl.ts`, tapi tidak di-export via `userUtils`

Cek apakah perlu tambah export `isTeacherDaerah` ke `userUtils.ts`.

---

## Data Flow

```
User toggle ON (uniqueDaysMode)
  → dashboardStore.filters.uniqueDaysMode = true
  → OverviewTab passes ke monitoringFetcher + cacheKey
  → getClassMonitoring({ uniqueDaysMode: true })
  → logic.ts: buildClassResult() pakai COUNT(DISTINCT date) instead of meetingsWithLogs.size
```

### Perubahan di `buildClassResult` (logic.ts)

**Current** (raw count):
```typescript
meeting_count: meetingsWithLogs.size,  // count of unique meeting IDs with logs
```

**New** (unique days mode):
```typescript
// Pass meetingMap untuk ambil date per meeting ID
const uniqueDays = new Set(
  Array.from(meetingsWithLogs).map(meetingId => meetingMap.get(meetingId)?.date?.split('T')[0])
    .filter(Boolean)
)
meeting_count: uniqueDaysMode ? uniqueDays.size : meetingsWithLogs.size,
```

Untuk `combinedAggregateResult` juga perlu update serupa.

---

## Files to Modify

| File | Perubahan |
|------|-----------|
| `src/app/(admin)/dashboard/stores/dashboardStore.ts` | Tambah `uniqueDaysMode: boolean` ke DashboardFilters |
| `src/types/dashboard.ts` | Tambah `uniqueDaysMode?: boolean` ke ClassMonitoringFilters |
| `src/app/(admin)/dashboard/actions/monitoring/logic.ts` | Update `buildClassResult` + `combinedAggregateResult` untuk support uniqueDaysMode |
| `src/app/(admin)/laporan/components/OverviewTab.tsx` | Pass `uniqueDaysMode` ke fetcher + cacheKey, render toggle UI |
| `src/lib/userUtils.ts` | Export `isTeacherDaerah` jika belum ada |

**Total**: 5 files, ~80-100 lines

---

## Tasks

### Task 1: Export `isTeacherDaerah` via userUtils

**File**: `src/lib/userUtils.ts`

Cek line ~20-35 area re-exports. Tambah `isTeacherDaerah` ke list re-exports:

```typescript
export {
  isSuperAdmin,
  isAdminDaerah,
  isAdminDesa,
  isAdminKelompok,
  isTeacher,
  isTeacherDaerah,   // ← tambah ini
  isAdmin,
  // ...
}
```

Verifikasi: `grep "isTeacherDaerah" src/lib/accessControl.ts` — pastikan fungsi ini ada.

---

### Task 2: Update Types

**File**: `src/app/(admin)/dashboard/stores/dashboardStore.ts`

Tambah ke `DashboardFilters` interface (setelah `categoryGroup`):
```typescript
uniqueDaysMode?: boolean
```

Tambah ke `defaultFilters`:
```typescript
uniqueDaysMode: false,
```

Tambah ke `partialize`:
```typescript
uniqueDaysMode: state.filters.uniqueDaysMode,
```

**File**: `src/types/dashboard.ts`

Tambah ke `ClassMonitoringFilters`:
```typescript
uniqueDaysMode?: boolean
```

---

### Task 3: Update Logic Layer

**File**: `src/app/(admin)/dashboard/actions/monitoring/logic.ts`

Update `buildClassResult` signature dan implementasi:

```typescript
export function buildClassResult(
    cls: any,
    meetingsByClass: Map<string, Set<string>>,
    enrollmentsByClass: Map<string, Set<string>>,
    attendanceLogs: AttendanceLog[],
    meetingMap: Map<string, Meeting>,
    uniqueDaysMode?: boolean   // ← tambah param
): ClassMonitoringData {
    // ... existing code ...
    
    const meetingsWithLogs = new Set(filteredLogs.map(log => log.meeting_id))
    
    // Hitung meeting_count berdasarkan mode
    let meetingCount: number
    if (uniqueDaysMode) {
        const uniqueDays = new Set(
            Array.from(meetingsWithLogs)
                .map(id => {
                    const date = meetingMap.get(id)?.date
                    return date ? String(date).split('T')[0] : null
                })
                .filter((d): d is string => d !== null)
        )
        meetingCount = uniqueDays.size
    } else {
        meetingCount = meetingsWithLogs.size
    }
    
    return {
        // ...
        meeting_count: meetingCount,
        // ...
    }
}
```

Update `combinedAggregateResult` juga:

```typescript
export function combinedAggregateResult(
    className: string,
    data: { ... },
    filteredLogs: AttendanceLog[],
    meetingMap?: Map<string, Meeting>,   // ← tambah param optional
    uniqueDaysMode?: boolean             // ← tambah param optional
): ClassMonitoringData {
    const meetingsWithLogs = new Set(filteredLogs.map(log => log.meeting_id))
    
    let meetingCount: number
    if (uniqueDaysMode && meetingMap) {
        const uniqueDays = new Set(
            Array.from(meetingsWithLogs)
                .map(id => {
                    const date = meetingMap.get(id)?.date
                    return date ? String(date).split('T')[0] : null
                })
                .filter((d): d is string => d !== null)
        )
        meetingCount = uniqueDays.size
    } else {
        meetingCount = meetingsWithLogs.size
    }
    
    return {
        // ...
        meeting_count: meetingCount,
        // ...
    }
}
```

**TDD**: Tulis test di `logic.test.ts` (jika ada) atau buat baru:

```typescript
// __tests__/logic.test.ts
describe('buildClassResult uniqueDaysMode', () => {
  it('counts raw meetings when uniqueDaysMode=false', () => {
    // Setup: 3 meetings on 3 different days
    // Expected: meeting_count = 3
  })
  
  it('counts unique days when uniqueDaysMode=true', () => {
    // Setup: 5 meetings but only 2 unique dates
    // Expected: meeting_count = 2
  })
})
```

---

### Task 4: Update Server Action

**File**: `src/app/(admin)/dashboard/actions/monitoring/actions.ts`

Di `getClassMonitoring`, pass `uniqueDaysMode` ke `buildClassResult`:

```typescript
let result: ClassMonitoringData[] = classes.map((cls: any) =>
    buildClassResult(cls, meetingsByClass, enrollmentsByClass, attendanceLogs, meetingMap, filters.uniqueDaysMode)
)
```

Dan ke `combinedAggregateResult`:

```typescript
return combinedAggregateResult(className, { ...data, totalStudents: allEnrolledStudents.size }, filteredLogs, meetingMap, filters.uniqueDaysMode)
```

---

### Task 5: UI Toggle di OverviewTab

**File**: `src/app/(admin)/laporan/components/OverviewTab.tsx`

1. Import helper:
```typescript
import { isSuperAdmin, isAdminDaerah, isTeacherDaerah } from '@/lib/userUtils'
```

2. Compute isDaerahLevel:
```typescript
const isDaerahLevel = useMemo(() => {
  if (!userProfile) return false
  return isSuperAdmin(userProfile) || isAdminDaerah(userProfile) || isTeacherDaerah(userProfile)
}, [userProfile])
```

3. Ambil dari store:
```typescript
const uniqueDaysMode = filters.uniqueDaysMode ?? false
const handleUniqueDaysModeChange = (val: boolean) => setFilter('uniqueDaysMode', val)
```

4. Pass ke monitoringFetcher:
```typescript
const monitoringFetcher = async () => {
  const result = await getClassMonitoring({
    // ...existing...
    uniqueDaysMode,
  })
  // ...
}
```

5. Tambah ke cacheKey:
```typescript
uniqueDaysMode: debouncedFiltersForKey.uniqueDaysMode ?? false,
```

6. Render toggle (hanya jika `isDaerahLevel`):
```tsx
{isDaerahLevel && (
  <div className="flex items-center gap-2 mt-2">
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400">
      <input
        type="checkbox"
        checked={uniqueDaysMode}
        onChange={(e) => handleUniqueDaysModeChange(e.target.checked)}
        className="rounded"
      />
      Hitung per hari unik
    </label>
    {uniqueDaysMode && (
      <span className="text-xs text-blue-500">
        (Pertemuan = hari unik ada kelas, bukan jumlah record)
      </span>
    )}
  </div>
)}
```

Letakkan setelah `LaporanTimeFilter` block (sebelum closing `</div>` card filter).

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini?
- [ ] Apakah ada tabel database baru yang perlu ditambahkan ke Key Tables?
- [ ] Apakah ada route/page baru yang perlu ditambahkan ke App Router Structure?
- [ ] Apakah ada permission pattern baru yang perlu didokumentasikan?
- [ ] Jika ada yang perlu diupdate → update `CLAUDE.md` atau file di `docs/claude/` setelah implementasi selesai

---

## Commit Message Template

```
feat(laporan): add unique days meeting count mode for daerah level

- Add uniqueDaysMode toggle to DashboardFilters store
- Update buildClassResult/combinedAggregateResult to support COUNT(DISTINCT date)
- Show toggle only for superadmin/admin daerah/guru daerah
- Pass uniqueDaysMode through server action and SWR cache key

fixes #77

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
