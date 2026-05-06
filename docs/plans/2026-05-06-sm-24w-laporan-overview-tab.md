# Plan: sm-24w — Tambah Tab "Overview" di Halaman Laporan

## Context

Sebelumnya satu user hanya pegang satu kelas, sehingga fitur laporan cukup untuk satu kelas. Kini mayoritas user (guru + admin) pegang banyak kelas. Dashboard sudah ada fitur multi-kelas, tapi nama menu "Dashboard" tidak deskriptif sehingga user sulit menemukannya.

**Solusi**: Tambah tab "Overview" di halaman Laporan yang berisi fungsionalitas Dashboard (monitoring & perbandingan lintas kelas), sehingga semua user bisa menemukannya secara natural melalui menu Laporan yang sudah familiar.

**Prinsip utama**:
- Reuse komponen dan store Dashboard — jangan duplikasi
- Dashboard page di `/dashboard` tetap berjalan (tidak diubah)
- Tab order: Presensi | Materi | **Overview** (Overview paling kanan, karena merupakan agregasi dari keduanya)

---

## Files Affected

| File | Action | Keterangan |
|------|--------|-----------|
| `src/stores/laporanStore.ts` | Edit | Extend `LaporanTab` type |
| `src/lib/accessControl.ts` | Edit | Tambah `canAccessOverview()` |
| `src/lib/accessControlServer.ts` | Edit | Mirror `canAccessOverview()` |
| `src/app/(admin)/laporan/components/LaporanTabHeader.tsx` | Edit | Dynamic `tabs` prop |
| `src/app/(admin)/laporan/components/OverviewTab.tsx` | Create | Komponen baru |
| `src/app/(admin)/laporan/page.tsx` | Edit | Wire tab baru |

---

## Task 1 — Extend `LaporanTab` type

**File**: `src/stores/laporanStore.ts`

**Before (line 3)**:
```typescript
export type LaporanTab = 'presensi' | 'materi'
```

**After**:
```typescript
export type LaporanTab = 'presensi' | 'materi' | 'overview'
```

Tidak ada perubahan lain — `setActiveTab` sudah generic.

**TDD**: Tipe union change, skip test (pure type definition).

---

## Task 2 — Tambah `canAccessOverview()` di accessControl

**File**: `src/lib/accessControl.ts`

Tambah setelah fungsi `canAccessMonitoring` (line ~96):

```typescript
export function canAccessOverview(profile: UserProfile | null): boolean {
  if (!profile) return false
  return profile.role === 'superadmin' || profile.role === 'admin' || profile.role === 'teacher'
}
```

**File**: `src/lib/accessControlServer.ts`

Tambah setelah `canAccessFeature` / akhir file:

```typescript
export function canAccessOverview(profile: UserProfile | null): boolean {
  if (!profile) return false
  return profile.role === 'superadmin' || profile.role === 'admin' || profile.role === 'teacher'
}
```

**TDD**: Permission function — WAJIB test.

**Test file**: `src/lib/__tests__/accessControl.test.ts` (atau tambahkan ke file test yang sudah ada)

```typescript
describe('canAccessOverview', () => {
  it('returns true for superadmin', () => {
    expect(canAccessOverview({ role: 'superadmin' } as UserProfile)).toBe(true)
  })
  it('returns true for admin', () => {
    expect(canAccessOverview({ role: 'admin' } as UserProfile)).toBe(true)
  })
  it('returns true for teacher', () => {
    expect(canAccessOverview({ role: 'teacher' } as UserProfile)).toBe(true)
  })
  it('returns false for null profile', () => {
    expect(canAccessOverview(null)).toBe(false)
  })
  it('returns false for student role', () => {
    expect(canAccessOverview({ role: 'student' } as UserProfile)).toBe(false)
  })
})
```

Run: `npm run test:run` — verifikasi PASS sebelum lanjut.

---

## Task 3 — Update `LaporanTabHeader` ke dynamic tabs

**File**: `src/app/(admin)/laporan/components/LaporanTabHeader.tsx`

**Full replacement**:

```typescript
'use client'

import type { LaporanTab } from '@/stores/laporanStore'

interface TabConfig {
  id: LaporanTab
  label: string
}

interface LaporanTabHeaderProps {
  activeTab: LaporanTab
  onTabChange: (tab: LaporanTab) => void
  tabs: TabConfig[]
}

export default function LaporanTabHeader({ activeTab, onTabChange, tabs }: LaporanTabHeaderProps) {
  return (
    <div className="flex gap-0 mb-4 border-b border-gray-200 dark:border-gray-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab.id
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

**Perubahan dari versi lama**:
- Hapus local `type LaporanTab` (sekarang import dari store)
- Tambah `TabConfig` interface dan `tabs` prop
- Ganti hardcoded `['presensi', 'materi']` dengan `tabs.map(...)`
- Label dari `tab.label` (bukan auto-capitalize dari id)

**TDD**: Presentational component, skip test.

---

## Task 4 — Buat `OverviewTab.tsx`

**File baru**: `src/app/(admin)/laporan/components/OverviewTab.tsx`

Ekstrak JSX + hooks dari `dashboard/page.tsx` menjadi komponen tersendiri. Semua import pakai absolute path ke dashboard folder — tidak ada file yang dipindah.

```typescript
'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
import { useDashboard } from '@/hooks/useDashboard'
import DashboardSkeleton from '@/components/ui/skeleton/DashboardSkeleton'
import StatCard from '@/app/(admin)/dashboard/components/StatCard'
import PeriodTabs, { type PeriodType } from '@/app/(admin)/dashboard/components/PeriodTabs'
import ClassMonitoringTable from '@/app/(admin)/dashboard/components/ClassMonitoringTable'
import DataFilter from '@/components/shared/DataFilter'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useClasses } from '@/hooks/useClasses'
import { useUserProfile } from '@/stores/userProfileStore'
import { getClassMonitoring } from '@/app/(admin)/dashboard/actions'
import { useDashboardStore } from '@/app/(admin)/dashboard/stores/dashboardStore'

dayjs.locale('id')

export default function OverviewTab() {
  const { filters, setFilters, setFilter } = useDashboardStore()
  const selectedPeriod = filters.period
  const customDateRange = filters.customDateRange
  const classViewMode = filters.classViewMode

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  )

  const { profile: userProfile } = useUserProfile()
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok } = useKelompok()
  const { classes } = useClasses()

  const dashboardFilters = useMemo(() => ({
    daerahId: filters.daerah,
    desaId: filters.desa,
    kelompokId: filters.kelompok,
    classId: filters.kelas,
    gender: filters.gender
  }), [filters.daerah, filters.desa, filters.kelompok, filters.kelas, filters.gender])

  const { stats, isLoading: statsLoading, error: statsError } = useDashboard(dashboardFilters)

  const monitoringFetcher = async () => {
    return await getClassMonitoring({
      period: selectedPeriod,
      startDate: customDateRange?.start,
      endDate: customDateRange?.end,
      daerahId: filters.daerah,
      desaId: filters.desa,
      kelompokId: filters.kelompok,
      classId: filters.kelas,
      gender: filters.gender,
      classViewMode,
      specificDate: selectedDate,
      weekOffset: selectedWeekOffset,
      monthString: selectedMonth
    })
  }

  const monitoringCacheKey = useMemo(() => {
    const key = {
      period: filters.period,
      dateRange: filters.customDateRange,
      daerah: filters.daerah.sort().join(','),
      desa: filters.desa.sort().join(','),
      kelompok: filters.kelompok.sort().join(','),
      kelas: filters.kelas.sort().join(','),
      gender: filters.gender || '',
      viewMode: filters.classViewMode,
      comparisonLevel: filters.comparisonLevel,
      selectedDate,
      selectedWeekOffset,
      selectedMonth
    }
    return JSON.stringify(key)
  }, [filters, selectedDate, selectedWeekOffset, selectedMonth])

  const { data: monitoringData, isLoading: monitoringLoading } = useSWR(
    ['class-monitoring-overview', monitoringCacheKey],
    monitoringFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000, keepPreviousData: true }
  )

  const handleFilterChange = (newFilters: any) => {
    setFilters({
      daerah: newFilters.daerah || [],
      desa: newFilters.desa || [],
      kelompok: newFilters.kelompok || [],
      kelas: newFilters.kelas || [],
      gender: newFilters.gender
    })
  }
  const handlePeriodChange = (period: PeriodType) => setFilter('period', period)
  const handleCustomDateChange = (start: string, end: string) => setFilter('customDateRange', { start, end })
  const handleViewModeChange = (mode: 'separated' | 'combined') => setFilter('classViewMode', mode)
  const handleComparisonLevelChange = (level: 'class' | 'kelompok' | 'desa' | 'daerah') => setFilter('comparisonLevel', level)

  const attendanceMetrics = useMemo(() => {
    if (!monitoringData || monitoringData.length === 0) {
      return { simpleAverage: 0, weightedAverage: 0, totalPresent: 0, totalPotential: 0, entityCount: 0 }
    }
    const comparisonLevel = filters.comparisonLevel
    const grouped = monitoringData.reduce((acc, cls) => {
      let entityKey: string | undefined
      if (comparisonLevel === 'class') entityKey = cls.class_name
      else if (comparisonLevel === 'kelompok') entityKey = cls.kelompok_name
      else if (comparisonLevel === 'desa') entityKey = cls.desa_name
      else entityKey = cls.daerah_name
      if (!entityKey) return acc
      if (!acc[entityKey]) {
        acc[entityKey] = { totalPresent: 0, totalPotential: 0, attendanceRate: 0, meetingIds: new Set<string>() }
      }
      if (cls.meeting_ids && cls.meeting_ids.length > 0) {
        cls.meeting_ids.forEach((id: string) => acc[entityKey!].meetingIds.add(id))
      }
      const potential = (cls.student_count || 0) * cls.meeting_count
      const present = (cls.attendance_rate / 100) * potential
      acc[entityKey].totalPresent += present
      acc[entityKey].totalPotential += potential
      return acc
    }, {} as Record<string, { totalPresent: number; totalPotential: number; attendanceRate: number; meetingIds: Set<string> }>)

    Object.keys(grouped).forEach(key => {
      const entity = grouped[key]
      entity.attendanceRate = entity.totalPotential > 0
        ? Math.round((entity.totalPresent / entity.totalPotential) * 100) : 0
    })
    const entities = Object.values(grouped)
    const entityCount = entities.length
    const simpleAverage = entityCount > 0
      ? Math.round(entities.reduce((sum, e) => sum + e.attendanceRate, 0) / entityCount) : 0
    const totalPresent = entities.reduce((sum, e) => sum + e.totalPresent, 0)
    const totalPotential = entities.reduce((sum, e) => sum + e.totalPotential, 0)
    const weightedAverage = totalPotential > 0
      ? Math.round((totalPresent / totalPotential) * 100) : 0
    return { simpleAverage, weightedAverage, totalPresent: Math.round(totalPresent), totalPotential: Math.round(totalPotential), entityCount }
  }, [monitoringData, filters.comparisonLevel])

  const entityLabel = useMemo(() => {
    const level = filters.comparisonLevel
    if (level === 'class') return 'Kelas'
    if (level === 'kelompok') return 'Kelompok'
    if (level === 'desa') return 'Desa'
    return 'Daerah'
  }, [filters.comparisonLevel])

  const attendanceLabel = useMemo(() => {
    if (selectedPeriod === 'today') {
      const isToday = dayjs(selectedDate).isSame(dayjs(), 'day')
      const isYesterday = dayjs(selectedDate).isSame(dayjs().subtract(1, 'day'), 'day')
      if (isToday) return 'Kehadiran Hari Ini'
      if (isYesterday) return 'Kehadiran Kemarin'
      return `Kehadiran ${dayjs(selectedDate).format('D MMMM')}`
    }
    if (selectedPeriod === 'week') {
      if (selectedWeekOffset === 0) return 'Kehadiran Minggu Ini'
      if (selectedWeekOffset === 1) return 'Kehadiran Minggu Lalu'
      const startOfWeek = dayjs().subtract(selectedWeekOffset, 'week').startOf('week').add(1, 'day')
      const endOfWeek = dayjs().subtract(selectedWeekOffset, 'week').endOf('week').add(1, 'day')
      return `Minggu (${startOfWeek.format('D MMM')} - ${endOfWeek.format('D MMM')})`
    }
    if (selectedPeriod === 'month') {
      if (dayjs(selectedMonth).isSame(dayjs(), 'month')) return 'Kehadiran Bulan Ini'
      return `Kehadiran ${dayjs(selectedMonth).format('MMMM YYYY')}`
    }
    if (selectedPeriod === 'custom' && customDateRange) {
      return `Kehadiran (${dayjs(customDateRange.start).format('D MMM')} - ${dayjs(customDateRange.end).format('D MMM')})`
    }
    return 'Kehadiran Periode Ini'
  }, [selectedPeriod, selectedDate, selectedWeekOffset, selectedMonth, customDateRange])

  const attendanceTooltip = useMemo(() => {
    if (!attendanceMetrics || attendanceMetrics.entityCount === 0) return ''
    const { simpleAverage, weightedAverage, totalPresent, totalPotential, entityCount } = attendanceMetrics
    return `Rata-rata ${entityCount} ${entityLabel.toLowerCase()}: ${simpleAverage}%\n\nTotal siswa hadir: ${weightedAverage}% (${totalPresent.toLocaleString('id-ID')} dari ${totalPotential.toLocaleString('id-ID')} kehadiran)`
  }, [attendanceMetrics, entityLabel])

  if (statsLoading && !stats) return <DashboardSkeleton />

  if (statsError) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold">Error loading overview</div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{statsError}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm dark:border-gray-700">
        <DataFilter
          filters={{ daerah: filters.daerah, desa: filters.desa, kelompok: filters.kelompok, kelas: filters.kelas, gender: filters.gender }}
          onFilterChange={handleFilterChange}
          userProfile={userProfile}
          daerahList={daerah || []}
          desaList={desa || []}
          kelompokList={kelompok || []}
          classList={classes || []}
          showKelas={true}
          showMeetingType={false}
          showGender={true}
          cascadeFilters={true}
          classViewMode={filters.classViewMode}
          onClassViewModeChange={handleViewModeChange}
          showComparisonLevel={true}
          comparisonLevel={filters.comparisonLevel}
          onComparisonLevelChange={handleComparisonLevelChange}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard title="Total Siswa" value={stats?.siswa || 0} icon="👨‍🎓" color="blue" />
        <StatCard title="Total Kelas" value={stats?.kelas || 0} icon="📚" color="purple" />
        <StatCard
          title={attendanceLabel}
          value={
            monitoringLoading
              ? <span className="inline-block h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              : `${attendanceMetrics.simpleAverage}%`
          }
          icon="✅"
          className="col-span-2 md:col-span-1"
          color="emerald"
          tooltip={attendanceTooltip}
        />
      </div>

      <PeriodTabs
        selected={selectedPeriod}
        onChange={handlePeriodChange}
        customDateRange={customDateRange}
        onCustomDateChange={handleCustomDateChange}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedWeekOffset={selectedWeekOffset}
        onWeekOffsetChange={setSelectedWeekOffset}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      <div className="mb-6">
        <ClassMonitoringTable
          data={monitoringData || []}
          isLoading={monitoringLoading}
          period={selectedPeriod}
          customDateRange={customDateRange}
          classViewMode={classViewMode}
        />
      </div>
    </div>
  )
}
```

**Catatan penting**:
- SWR key pakai `'class-monitoring-overview'` (bukan `'class-monitoring'`) untuk isolasi dari cache Dashboard
- `ClassMonitoringTable` membaca `useDashboardStore()` secara internal → shared store dengan `/dashboard` adalah perilaku yang diinginkan (filter persist antar surface)
- Tidak ada outer `bg-gray-50` wrapper — laporan page sudah menyediakannya

**TDD**: Presentational/orchestration component, skip unit test. Verifikasi via manual testing.

---

## Task 5 — Update `laporan/page.tsx`

**File**: `src/app/(admin)/laporan/page.tsx`

**a) Tambah imports** (setelah import yang sudah ada):
```typescript
import OverviewTab from './components/OverviewTab'
import { canAccessOverview } from '@/lib/accessControl'
```

**b) Tambah `hasOverviewAccess`** (di samping `hasMateriAccess`, sekitar line 63):
```typescript
const hasOverviewAccess = useMemo(() => {
  if (!userProfile) return false
  return canAccessOverview(userProfile)
}, [userProfile])
```

**c) Update tab reset guard** (sekitar line 69):
```typescript
useEffect(() => {
  if (!hasMateriAccess && laporanTab === 'materi') {
    setLaporanTab('presensi')
  }
  if (!hasOverviewAccess && laporanTab === 'overview') {
    setLaporanTab('presensi')
  }
}, [hasMateriAccess, hasOverviewAccess, laporanTab, setLaporanTab])
```

**d) Tambah `visibleTabs`** (setelah `hasOverviewAccess`):
```typescript
const visibleTabs = useMemo(() => {
  const tabs = [{ id: 'presensi' as const, label: 'Presensi' }]
  if (hasMateriAccess) tabs.push({ id: 'materi' as const, label: 'Materi' })
  if (hasOverviewAccess) tabs.push({ id: 'overview' as const, label: 'Overview' })
  return tabs
}, [hasMateriAccess, hasOverviewAccess])
```

**e) Ganti conditional render tab header** (sekitar line 194):
```tsx
{/* Before: {hasMateriAccess && <LaporanTabHeader activeTab={laporanTab} onTabChange={setLaporanTab} />} */}
{visibleTabs.length > 1 && (
  <LaporanTabHeader
    activeTab={laporanTab}
    onTabChange={setLaporanTab}
    tabs={visibleTabs}
  />
)}
```

**f) Tambah Overview tab content** (setelah blok `laporanTab === 'materi'`, sekitar line 304):
```tsx
{laporanTab === 'overview' && hasOverviewAccess && (
  <OverviewTab />
)}
```

---

## Yang TIDAK Diubah

| File | Alasan |
|------|--------|
| `dashboard/page.tsx` | Tetap berjalan, tidak disentuh |
| `dashboard/components/*` | Diimport langsung dari lokasi aslinya |
| `dashboard/stores/dashboardStore.ts` | Direuse as-is |
| `dashboard/actions/*` | Sudah support teacher via `getTeacherAllowedClassIds()` |
| `AppSidebar.tsx` | Menu "Laporan" sudah tidak `adminOnly` |
| `BottomNavigation.tsx` | Tidak ada link Dashboard di mobile nav |

---

## Urutan Eksekusi

```
Task 1: Edit src/stores/laporanStore.ts
Task 2: Edit src/lib/accessControl.ts + accessControlServer.ts + write tests → npm run test:run (PASS)
Task 3: Edit src/app/(admin)/laporan/components/LaporanTabHeader.tsx
Task 4: Create src/app/(admin)/laporan/components/OverviewTab.tsx
Task 5: Edit src/app/(admin)/laporan/page.tsx
Final:  npm run type-check → harus PASS
```

---

## Verifikasi Manual

1. Login sebagai **guru biasa** → buka `/laporan` → tab "Overview" muncul di kanan
2. Login sebagai **admin** → buka `/laporan` → 3 tab: Presensi | Materi | Overview
3. Klik tab Overview → konten monitoring tampil (DataFilter, StatCards, PeriodTabs, ClassMonitoringTable)
4. Buka `/dashboard` langsung → tetap berfungsi normal (tidak ada regresi)
5. Filter di Overview tab → buka `/dashboard` → filter tersimpan (shared store)
6. `npm run type-check` → PASS

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini?
  - **Ya**: `canAccessOverview()` — permission function baru untuk semua teacher+admin. Perlu update `docs/claude/architecture-patterns.md` jika ada pattern permission baru.
- [ ] Apakah ada tabel database baru? → Tidak
- [ ] Apakah ada route/page baru? → Tidak (hanya tab baru di `/laporan`)
- [ ] Apakah ada permission pattern baru? → **Ya**: `canAccessOverview` — perlu didokumentasikan di access control section
- [ ] Update `CLAUDE.md` jika perlu setelah implementasi selesai

---

## Commit Message Template

```
feat(laporan): tambah tab Overview dengan fitur monitoring multi-kelas

- Tambah canAccessOverview() untuk semua teacher+admin
- Tambah dynamic tabs prop di LaporanTabHeader
- Tambah OverviewTab component (reuse dashboard komponen)
- Update laporan page untuk wire tab baru

Closes #XX
fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
