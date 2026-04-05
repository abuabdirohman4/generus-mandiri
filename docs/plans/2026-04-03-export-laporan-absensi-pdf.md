# Plan: Export Laporan Absensi ke PDF

**GitHub Issue:** https://github.com/abuabdirohman4/generus-mandiri/issues/19 (GH-#19)
**Beads Issue:** sm-ix1
**Date:** 2026-04-03
**Priority:** P2

---

## Context & Goals

Tambahkan fitur export laporan absensi ke PDF di halaman `/laporan`. User (admin/guru) bisa mengunduh laporan kehadiran siswa yang sedang ditampilkan sebagai file PDF — termasuk semua data yang sudah difilter (periode, kelas, kelompok, gender, dll).

**Existing Pattern Reference:**
- `src/app/(admin)/rapot/components/PDFReportDocument.tsx` — contoh penggunaan `@react-pdf/renderer`
- `src/app/(admin)/rapot/components/pdfUtils.ts` — contoh `pdf().toBlob()` + download
- `src/app/(admin)/rapot/components/PDFExportModal.tsx` — contoh modal export dengan opsi kertas/orientasi

**Data yang tersedia di halaman laporan:**
- `tableData` — array record per siswa (`student_name`, `class_name`, `total_days`, `hadir`, `izin`, `sakit`, `alpha`, `attendance_rate`)
- `summaryStats` — ringkasan kehadiran (`attendanceRate`, `totalMeetings`, `dateRange`)
- `userProfile` — role user (tentukan kolom org yang ditampilkan)
- `filters` — filter aktif (periode, kelas, dll)

---

## Architecture Decisions

1. **PDF Document** dibuat sebagai client component (`@react-pdf/renderer` harus client-side)
2. **Modal Export** menggunakan pola yang sama dengan `PDFExportModal.tsx` di rapot
3. **Logic transformasi data** ke format PDF disimpan di `pdfLogic.ts` (pure function, testable)
4. **Tidak perlu server action baru** — data sudah tersedia di client via `useLaporanPage` hook
5. **Tombol Export** ditambahkan di section header `DataTable` component

---

## File Structure

```
src/app/(admin)/laporan/
├── components/
│   ├── DataTable.tsx                    ← MODIFIED: tambah tombol export PDF
│   ├── AttendancePDFDocument.tsx        ← NEW: PDF document component
│   ├── AttendancePDFExportModal.tsx     ← NEW: modal opsi export
│   └── index.ts                         ← MODIFIED: tambah export komponen baru
├── utils/
│   └── pdfLogic.ts                      ← NEW: pure functions transformasi data PDF
├── utils/__tests__/
│   └── pdfLogic.test.ts                 ← NEW: unit tests untuk pdfLogic
└── page.tsx                             ← MODIFIED: pass tableData & summaryStats ke DataTable
```

---

## Tasks

### Task 1: TDD — pdfLogic.ts (Pure Functions)

**File:** `src/app/(admin)/laporan/utils/pdfLogic.ts`
**Test file:** `src/app/(admin)/laporan/utils/__tests__/pdfLogic.test.ts`

**Step 1A: Tulis test dulu (RED)**

Buat file `src/app/(admin)/laporan/utils/__tests__/pdfLogic.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  buildPDFTitle,
  buildPDFSubtitle,
  buildPDFOrgColumns,
  formatAttendanceRate,
  buildPDFSummaryRows,
} from '../pdfLogic'

describe('buildPDFTitle', () => {
  it('returns correct title for general mode', () => {
    const result = buildPDFTitle({ viewMode: 'general', month: 3, year: 2026 })
    expect(result).toBe('Laporan Absensi - Maret 2026')
  })

  it('returns correct title for daily period', () => {
    const result = buildPDFTitle({ viewMode: 'detailed', period: 'daily', startDate: '2026-03-01', endDate: '2026-03-31' })
    expect(result).toContain('Laporan Absensi')
    expect(result).toContain('Harian')
  })

  it('returns correct title for monthly period', () => {
    const result = buildPDFTitle({ viewMode: 'detailed', period: 'monthly', monthYear: 2026, startMonth: 1, endMonth: 3 })
    expect(result).toContain('Januari')
    expect(result).toContain('Maret 2026')
  })
})

describe('buildPDFSubtitle', () => {
  it('returns empty string when no filters active', () => {
    const result = buildPDFSubtitle({ organisasi: { daerah: [], desa: [], kelompok: [], kelas: [] }, gender: '' })
    expect(result).toBe('')
  })

  it('includes gender label when gender is set', () => {
    const result = buildPDFSubtitle({ organisasi: { daerah: [], desa: [], kelompok: [], kelas: [] }, gender: 'L' })
    expect(result).toContain('Laki-laki')
  })
})

describe('buildPDFOrgColumns', () => {
  it('returns daerah, desa, kelompok columns for superadmin', () => {
    const cols = buildPDFOrgColumns({ role: 'superadmin' } as any)
    expect(cols).toContain('daerah_name')
    expect(cols).toContain('desa_name')
    expect(cols).toContain('kelompok_name')
  })

  it('returns only kelompok column for admin kelompok', () => {
    const cols = buildPDFOrgColumns({ role: 'admin', kelompok_id: 'k1', desa_id: null, daerah_id: null } as any)
    expect(cols).not.toContain('daerah_name')
    expect(cols).not.toContain('desa_name')
    expect(cols).toContain('kelompok_name')
  })

  it('returns empty array for regular teacher', () => {
    const cols = buildPDFOrgColumns({ role: 'teacher', kelompok_id: 'k1', desa_id: null, daerah_id: null, classes: [{ id: 'c1' }] } as any)
    expect(cols).toEqual([])
  })
})

describe('formatAttendanceRate', () => {
  it('formats rate as percentage string', () => {
    expect(formatAttendanceRate('85%')).toBe('85%')
    expect(formatAttendanceRate(85)).toBe('85%')
  })
})

describe('buildPDFSummaryRows', () => {
  it('returns rows with all summary stats', () => {
    const rows = buildPDFSummaryRows({
      total: 100,
      hadir: 80,
      izin: 10,
      sakit: 5,
      alpha: 5,
      attendanceRate: 80,
      totalMeetings: 10,
      periodLabel: 'Bulanan',
      dateRange: { start: '2026-01-01', end: '2026-01-31' }
    })
    expect(rows).toHaveLength(5)
    expect(rows[0]).toEqual({ label: 'Total Kehadiran', value: '80 / 100 (80%)' })
    expect(rows[1]).toEqual({ label: 'Hadir', value: '80' })
    expect(rows[2]).toEqual({ label: 'Izin', value: '10' })
    expect(rows[3]).toEqual({ label: 'Sakit', value: '5' })
    expect(rows[4]).toEqual({ label: 'Alpha', value: '5' })
  })
})
```

Run test → harus FAIL (RED):
```bash
npm run test:run -- src/app/\(admin\)/laporan/utils/__tests__/pdfLogic.test.ts
```
Expected output: `FAIL` (file belum ada)

**Step 1B: Implementasi (GREEN)**

Buat `src/app/(admin)/laporan/utils/pdfLogic.ts`:

```typescript
/**
 * pdfLogic.ts — Pure functions for Attendance PDF generation
 * NO side effects, no imports from @react-pdf/renderer here (keep pure)
 */

import type { UserProfile } from '@/stores/userProfileStore'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

/**
 * Build the main title string for the PDF
 */
export function buildPDFTitle(filters: {
  viewMode: 'general' | 'detailed'
  month?: number
  year?: number
  period?: string
  startDate?: string | null
  endDate?: string | null
  monthYear?: number
  startMonth?: number
  endMonth?: number
  startYear?: number
  endYear?: number
  weekYear?: number
  weekMonth?: number
  startWeekNumber?: number
  endWeekNumber?: number
}): string {
  const base = 'Laporan Absensi'

  if (filters.viewMode === 'general') {
    const month = filters.month ? MONTH_NAMES[filters.month - 1] : ''
    return `${base} - ${month} ${filters.year}`
  }

  switch (filters.period) {
    case 'daily': {
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        const end = new Date(filters.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        return `${base} Harian — ${start} s/d ${end}`
      }
      return `${base} Harian`
    }
    case 'weekly': {
      if (filters.weekYear && filters.weekMonth && filters.startWeekNumber && filters.endWeekNumber) {
        const month = MONTH_NAMES[filters.weekMonth - 1]
        return `${base} Mingguan — Minggu ${filters.startWeekNumber}–${filters.endWeekNumber}, ${month} ${filters.weekYear}`
      }
      return `${base} Mingguan`
    }
    case 'monthly': {
      if (filters.monthYear && filters.startMonth && filters.endMonth) {
        const startM = MONTH_NAMES[filters.startMonth - 1]
        const endM = MONTH_NAMES[filters.endMonth - 1]
        if (filters.startMonth === filters.endMonth) {
          return `${base} — ${startM} ${filters.monthYear}`
        }
        return `${base} Bulanan — ${startM} s/d ${endM} ${filters.monthYear}`
      }
      return `${base} Bulanan`
    }
    case 'yearly': {
      if (filters.startYear && filters.endYear) {
        return `${base} Tahunan — ${filters.startYear}–${filters.endYear}`
      }
      return `${base} Tahunan`
    }
    default:
      return base
  }
}

/**
 * Build subtitle/filter info string for PDF header
 */
export function buildPDFSubtitle(filters: {
  organisasi?: { daerah: string[]; desa: string[]; kelompok: string[]; kelas: string[] }
  gender?: string
}): string {
  const parts: string[] = []

  if (filters.gender === 'L') parts.push('Laki-laki')
  else if (filters.gender === 'P') parts.push('Perempuan')

  return parts.join(' | ')
}

/**
 * Determine which organizational columns to show in PDF table
 * Returns array of column keys
 */
export function buildPDFOrgColumns(userProfile: UserProfile | null): string[] {
  if (!userProfile) return []

  const role = userProfile.role
  const isSuperAdmin = role === 'superadmin'
  const isAdminDaerah = role === 'admin' && userProfile.daerah_id && !userProfile.desa_id
  const isAdminDesa = role === 'admin' && userProfile.desa_id && !userProfile.kelompok_id
  const isTeacherDaerah = role === 'teacher' && userProfile.daerah_id && !userProfile.desa_id && !userProfile.kelompok_id
  const isTeacherDesa = role === 'teacher' && userProfile.desa_id && !userProfile.kelompok_id

  if (isSuperAdmin) return ['daerah_name', 'desa_name', 'kelompok_name']
  if (isAdminDaerah || isTeacherDaerah) return ['desa_name', 'kelompok_name']
  if (isAdminDesa || isTeacherDesa) return ['kelompok_name']
  return []
}

/**
 * Format attendance rate value as string with % suffix
 */
export function formatAttendanceRate(value: string | number): string {
  if (typeof value === 'number') return `${value}%`
  if (String(value).endsWith('%')) return String(value)
  return `${value}%`
}

/**
 * Build summary rows for the PDF summary section
 */
export function buildPDFSummaryRows(summaryStats: {
  total: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendanceRate: number
  totalMeetings?: number
  periodLabel: string
  dateRange: { start: string | null; end: string | null }
}): Array<{ label: string; value: string }> {
  return [
    { label: 'Total Kehadiran', value: `${summaryStats.hadir} / ${summaryStats.total} (${summaryStats.attendanceRate}%)` },
    { label: 'Hadir', value: String(summaryStats.hadir) },
    { label: 'Izin', value: String(summaryStats.izin) },
    { label: 'Sakit', value: String(summaryStats.sakit) },
    { label: 'Alpha', value: String(summaryStats.alpha) },
  ]
}
```

Run test → harus PASS (GREEN):
```bash
npm run test:run -- src/app/\(admin\)/laporan/utils/__tests__/pdfLogic.test.ts
```
Expected output: `PASS` 5 test suites passing

---

### Task 2: Buat AttendancePDFDocument.tsx

**File:** `src/app/(admin)/laporan/components/AttendancePDFDocument.tsx`

```typescript
'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { UserProfile } from '@/stores/userProfileStore'
import { buildPDFTitle, buildPDFOrgColumns, buildPDFSummaryRows, formatAttendanceRate } from '../utils/pdfLogic'

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 2,
    color: '#555555',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginVertical: 10,
  },
  summarySection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
    gap: 4,
  },
  summaryItem: {
    flexDirection: 'row',
    width: '48%',
    marginBottom: 4,
  },
  summaryLabel: {
    width: 120,
    color: '#555555',
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    minHeight: 20,
    alignItems: 'center',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#000000',
    backgroundColor: '#f5f5f5',
    minHeight: 22,
    alignItems: 'center',
  },
  tableCell: {
    paddingHorizontal: 4,
    paddingVertical: 3,
    fontSize: 9,
  },
  tableCellHeader: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#888888',
  },
})

interface TableData {
  no: number
  student_id: string
  student_name: string
  class_name: string
  kelompok_name?: string
  desa_name?: string
  daerah_name?: string
  total_days: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendance_rate: string
}

interface SummaryStats {
  total: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendanceRate: number
  totalMeetings?: number
  periodLabel: string
  dateRange: { start: string | null; end: string | null }
}

interface AttendancePDFDocumentProps {
  tableData: TableData[]
  summaryStats: SummaryStats
  userProfile: UserProfile | null
  filters: any
  pageSize?: 'A4' | 'LETTER'
  orientation?: 'portrait' | 'landscape'
  includePageNumbers?: boolean
}

const ORG_COLUMN_LABELS: Record<string, string> = {
  daerah_name: 'Daerah',
  desa_name: 'Desa',
  kelompok_name: 'Kelompok',
}

export const AttendancePDFDocument: React.FC<AttendancePDFDocumentProps> = ({
  tableData,
  summaryStats,
  userProfile,
  filters,
  pageSize = 'A4',
  orientation = 'portrait',
  includePageNumbers = true,
}) => {
  const title = buildPDFTitle(filters)
  const orgColumns = buildPDFOrgColumns(userProfile)
  const summaryRows = buildPDFSummaryRows(summaryStats)

  // Column widths (landscape fits more columns)
  const isLandscape = orientation === 'landscape'
  const noWidth = 24
  const nameWidth = isLandscape ? 140 : 120
  const classWidth = isLandscape ? 80 : 70
  const orgColWidth = isLandscape ? 70 : 60
  const numColWidth = isLandscape ? 40 : 36
  const rateWidth = isLandscape ? 60 : 50

  const generatedAt = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <Document>
      <Page size={pageSize} orientation={orientation} style={styles.page}>
        {/* Header */}
        <Text style={styles.title}>LAPORAN ABSENSI SANTRI</Text>
        <Text style={styles.subtitle}>{title}</Text>
        <View style={styles.divider} />

        {/* Summary */}
        <View style={styles.summarySection}>
          {summaryRows.map((row) => (
            <View key={row.label} style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text>: </Text>
              <Text style={styles.summaryValue}>{row.value}</Text>
            </View>
          ))}
          {summaryStats.totalMeetings !== undefined && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Jumlah Pertemuan</Text>
              <Text>: </Text>
              <Text style={styles.summaryValue}>{summaryStats.totalMeetings}</Text>
            </View>
          )}
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableCellHeader, { width: noWidth }]}>No</Text>
            <Text style={[styles.tableCellHeader, { width: nameWidth }]}>Nama Siswa</Text>
            {orgColumns.map((col) => (
              <Text key={col} style={[styles.tableCellHeader, { width: orgColWidth }]}>
                {ORG_COLUMN_LABELS[col] || col}
              </Text>
            ))}
            <Text style={[styles.tableCellHeader, { width: classWidth }]}>Kelas</Text>
            <Text style={[styles.tableCellHeader, { width: numColWidth, textAlign: 'center' }]}>Total</Text>
            <Text style={[styles.tableCellHeader, { width: numColWidth, textAlign: 'center' }]}>Hadir</Text>
            <Text style={[styles.tableCellHeader, { width: numColWidth, textAlign: 'center' }]}>Izin</Text>
            <Text style={[styles.tableCellHeader, { width: numColWidth, textAlign: 'center' }]}>Sakit</Text>
            <Text style={[styles.tableCellHeader, { width: numColWidth, textAlign: 'center' }]}>Alpha</Text>
            <Text style={[styles.tableCellHeader, { width: rateWidth, textAlign: 'center' }]}>% Hadir</Text>
          </View>

          {/* Data rows */}
          {tableData.map((row, index) => (
            <View key={row.student_id} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa' }]}>
              <Text style={[styles.tableCell, { width: noWidth, textAlign: 'center' }]}>{row.no}</Text>
              <Text style={[styles.tableCell, { width: nameWidth }]}>{row.student_name}</Text>
              {orgColumns.map((col) => (
                <Text key={col} style={[styles.tableCell, { width: orgColWidth }]}>
                  {(row as any)[col] || '-'}
                </Text>
              ))}
              <Text style={[styles.tableCell, { width: classWidth }]}>{row.class_name}</Text>
              <Text style={[styles.tableCell, { width: numColWidth, textAlign: 'center' }]}>{row.total_days}</Text>
              <Text style={[styles.tableCell, { width: numColWidth, textAlign: 'center' }]}>{row.hadir}</Text>
              <Text style={[styles.tableCell, { width: numColWidth, textAlign: 'center' }]}>{row.izin}</Text>
              <Text style={[styles.tableCell, { width: numColWidth, textAlign: 'center' }]}>{row.sakit}</Text>
              <Text style={[styles.tableCell, { width: numColWidth, textAlign: 'center' }]}>{row.alpha}</Text>
              <Text style={[styles.tableCell, { width: rateWidth, textAlign: 'center' }]}>
                {formatAttendanceRate(row.attendance_rate)}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Dicetak: {generatedAt}</Text>
          {includePageNumbers && (
            <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
          )}
        </View>
      </Page>
    </Document>
  )
}

export default AttendancePDFDocument
```

**No test needed** — this is pure presentational UI (`@react-pdf/renderer` components). Skip TDD per CLAUDE.md rules.

---

### Task 3: Buat AttendancePDFExportModal.tsx

**File:** `src/app/(admin)/laporan/components/AttendancePDFExportModal.tsx`

Pola sama dengan `rapot/components/PDFExportModal.tsx` tapi disesuaikan untuk laporan absensi.

```typescript
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { pdf } from '@react-pdf/renderer'
import React from 'react'
import type { UserProfile } from '@/stores/userProfileStore'

// Lazy-load PDF document (avoid SSR issues)
const AttendancePDFDocument = dynamic(
  () => import('./AttendancePDFDocument'),
  { ssr: false }
)

interface TableData {
  no: number
  student_id: string
  student_name: string
  class_name: string
  kelompok_name?: string
  desa_name?: string
  daerah_name?: string
  total_days: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendance_rate: string
}

interface SummaryStats {
  total: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendanceRate: number
  totalMeetings?: number
  periodLabel: string
  dateRange: { start: string | null; end: string | null }
}

interface AttendancePDFExportModalProps {
  isOpen: boolean
  onClose: () => void
  tableData: TableData[]
  summaryStats: SummaryStats
  userProfile: UserProfile | null
  filters: any
}

export default function AttendancePDFExportModal({
  isOpen,
  onClose,
  tableData,
  summaryStats,
  userProfile,
  filters,
}: AttendancePDFExportModalProps) {
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER'>('A4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [includePageNumbers, setIncludePageNumbers] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  if (!isOpen) return null

  const handleExport = async () => {
    setIsGenerating(true)
    try {
      // Dynamic import to ensure client-side only
      const { default: AttendancePDFDocumentComponent } = await import('./AttendancePDFDocument')

      const doc = React.createElement(AttendancePDFDocumentComponent, {
        tableData,
        summaryStats,
        userProfile,
        filters,
        pageSize,
        orientation,
        includePageNumbers,
      })

      const blob = await pdf(doc as any).toBlob()

      const fileName = `Laporan_Absensi_${new Date().toISOString().split('T')[0]}.pdf`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      onClose()
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Export Laporan Absensi PDF
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
            disabled={isGenerating}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Paper Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ukuran Kertas
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['A4', 'LETTER'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                    pageSize === size
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {size === 'A4' ? 'A4 (210 x 297 mm)' : 'Letter (216 x 279 mm)'}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Orientasi
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['portrait', 'landscape'] as const).map((ori) => (
                <button
                  key={ori}
                  type="button"
                  onClick={() => setOrientation(ori)}
                  className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                    orientation === ori
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {ori === 'portrait' ? 'Portrait' : 'Landscape'}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Opsi Tambahan
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includePageNumbers}
                onChange={(e) => setIncludePageNumbers(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Tampilkan Nomor Halaman
              </span>
            </label>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              PDF akan berisi {tableData.length} data siswa sesuai filter yang aktif.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isGenerating || tableData.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Membuat PDF...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

### Task 4: Modifikasi DataTable.tsx — Tambah Tombol Export

**File:** `src/app/(admin)/laporan/components/DataTable.tsx`

Perubahan:
1. Import `AttendancePDFExportModal`
2. Tambah state `isExportModalOpen`
3. Tambah props `summaryStats` dan `filters` ke `DataTableProps`
4. Tambah tombol "Export PDF" di header card
5. Render modal di bawah component

**Exact changes (bukan rewrite penuh):**

**A. Tambah import:**
```typescript
// TAMBAH di baris 8 (setelah import type { UserProfile })
import { useState as useModalState } from 'react'  // ganti nama untuk menghindari konflik
```

Lebih baik, gabungkan dengan useState yang sudah ada. Cukup tambah `lazy` import di dalam handler:

**B. Ubah interface DataTableProps** (tambah props baru):
```typescript
interface DataTableProps {
  tableData: TableData[]
  userProfile?: UserProfile | null
  summaryStats?: {                    // TAMBAH
    total: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
    attendanceRate: number
    totalMeetings?: number
    periodLabel: string
    dateRange: { start: string | null; end: string | null }
  } | null
  filters?: any                       // TAMBAH (LaporanFilters)
}
```

**C. Tambah state dan handler** di dalam component function:
```typescript
const [isExportModalOpen, setIsExportModalOpen] = useState(false)
```

**D. Ubah header section** dari:
```typescript
<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
    Detail Laporan per Siswa
  </h3>
</div>
```

Menjadi:
```typescript
<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
    Detail Laporan per Siswa
  </h3>
  {tableData.length > 0 && summaryStats && (
    <button
      type="button"
      onClick={() => setIsExportModalOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      Export PDF
    </button>
  )}
</div>
```

**E. Tambah modal** sebelum closing `</div>` terakhir (di luar return, setelah DataTable):
```typescript
{/* PDF Export Modal */}
{isExportModalOpen && summaryStats && (
  <AttendancePDFExportModal
    isOpen={isExportModalOpen}
    onClose={() => setIsExportModalOpen(false)}
    tableData={tableData}
    summaryStats={summaryStats}
    userProfile={userProfile ?? null}
    filters={filters}
  />
)}
```

**F. Import AttendancePDFExportModal** secara dynamic (avoid SSR):
```typescript
import dynamic from 'next/dynamic'
const AttendancePDFExportModal = dynamic(
  () => import('./AttendancePDFExportModal'),
  { ssr: false }
)
```

---

### Task 5: Update page.tsx — Pass Props Baru ke DataTable

**File:** `src/app/(admin)/laporan/page.tsx`

Ubah baris `<DataTable tableData={tableData} userProfile={userProfile} />` menjadi:

```typescript
<DataTable
  tableData={tableData}
  userProfile={userProfile}
  summaryStats={summaryStats}
  filters={filters}
/>
```

---

### Task 6: Update index.ts — Export Komponen Baru

**File:** `src/app/(admin)/laporan/components/index.ts`

Tambahkan exports:
```typescript
export { default as AttendancePDFExportModal } from './AttendancePDFExportModal'
export { default as AttendancePDFDocument } from './AttendancePDFDocument'
```

---

### Task 7: Type-check & Verify

```bash
npm run type-check
```

Expected: 0 errors.

```bash
npm run test:run -- src/app/\(admin\)/laporan/
```

Expected: all tests pass.

---

## Final Verification Checklist

- [ ] `pdfLogic.test.ts` — semua test PASS
- [ ] `npm run type-check` — 0 errors
- [ ] Tombol "Export PDF" muncul di header DataTable ketika ada data
- [ ] Klik tombol → modal muncul dengan opsi A4/Letter, portrait/landscape, nomor halaman
- [ ] Download PDF berhasil dengan nama file `Laporan_Absensi_YYYY-MM-DD.pdf`
- [ ] PDF berisi header, summary stats, dan tabel data siswa
- [ ] Kolom organisasi di PDF sesuai role user (superadmin: daerah+desa+kelompok, dll)
- [ ] Modal tidak muncul jika `tableData` kosong atau `summaryStats` null

---

## Commit Message Template

```
feat(laporan): tambah export laporan absensi ke PDF (GH-#19)

- Tambah AttendancePDFDocument komponen menggunakan @react-pdf/renderer
- Tambah AttendancePDFExportModal dengan opsi ukuran kertas dan orientasi
- Tambah pdfLogic.ts pure functions dengan unit tests (TDD)
- Integrasikan tombol Export PDF ke DataTable header
- Kolom organisasi di PDF dinamis sesuai role user

Closes #19

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
