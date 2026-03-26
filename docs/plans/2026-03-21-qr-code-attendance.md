# QR Code Attendance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambah fitur absensi via scan QR code — tiap siswa punya QR unik (berdasarkan UUID), guru bisa scan dari tab baru di halaman detail absensi, dan QR bisa dicetak dari halaman biodata (individual) maupun list siswa (bulk).

**Architecture:** QR code encode plain UUID `students.id` (no JSON wrapper). Generate menggunakan library `qrcode` yang menghasilkan base64 PNG — format yang sama bisa dipakai di browser `<img>` maupun di PDF via `@react-pdf/renderer`. Scanner menggunakan `html5-qrcode` yang handle camera lifecycle dan iOS Safari quirks. Scan langsung auto-save 1 record ke `saveAttendanceForMeeting` (server action yang sudah ada) tanpa perlu klik Simpan.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, `qrcode` (baru), `html5-qrcode` (baru), `@react-pdf/renderer` (sudah ada), Sonner toast (sudah ada)

**Beads Issue:** `sm-q7x`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install libraries**

```bash
npm install qrcode html5-qrcode
npm install --save-dev @types/qrcode
```

**Step 2: Verify install**

```bash
npm run type-check
```
Expected: No new errors (kedua library punya types)

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install qrcode and html5-qrcode for QR attendance feature"
```

---

## Task 2: QR Generation Utility

**Files:**
- Create: `src/lib/qr/generateQR.ts`
- Create: `src/lib/qr/__tests__/generateQR.test.ts`

**Step 1: Tulis failing test**

Buat file `src/lib/qr/__tests__/generateQR.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateStudentQRDataURL } from '../generateQR'

describe('generateStudentQRDataURL', () => {
  it('returns a base64 PNG data URL for a valid UUID', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const result = await generateStudentQRDataURL(uuid)
    expect(result).toMatch(/^data:image\/png;base64,/)
  })

  it('throws for empty string', async () => {
    await expect(generateStudentQRDataURL('')).rejects.toThrow()
  })
})
```

**Step 2: Jalankan test untuk pastikan FAIL**

```bash
npm run test:run -- src/lib/qr/__tests__/generateQR.test.ts
```
Expected: FAIL — "Cannot find module '../generateQR'"

**Step 3: Implementasi minimal**

Buat file `src/lib/qr/generateQR.ts`:

```typescript
import QRCode from 'qrcode'

/**
 * Generate QR code as base64 PNG data URL for a student.
 * Encodes the student's UUID directly.
 * Compatible with browser <img> and @react-pdf/renderer <Image>.
 */
export async function generateStudentQRDataURL(studentId: string): Promise<string> {
  if (!studentId) throw new Error('studentId is required')

  return QRCode.toDataURL(studentId, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 200,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}
```

**Step 4: Jalankan test untuk pastikan PASS**

```bash
npm run test:run -- src/lib/qr/__tests__/generateQR.test.ts
```
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/lib/qr/
git commit -m "feat(qr): add generateStudentQRDataURL utility"
```

---

## Task 3: QR Scanner Component

**Files:**
- Create: `src/app/(admin)/absensi/components/QRScannerTab.tsx`

> **Note:** Komponen ini tidak butuh unit test (pure UI + camera API — test via E2E manual).

**Step 1: Buat komponen QRScannerTab**

Buat file `src/app/(admin)/absensi/components/QRScannerTab.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import type { StudentWithClasses } from '@/types/student'

interface AttendanceRecord {
  status: 'H' | 'I' | 'S' | 'A'
  reason?: string
}

interface QRScannerTabProps {
  students: StudentWithClasses[]
  attendance: Record<string, AttendanceRecord>
  onStudentScanned: (studentId: string) => void
  isActive: boolean
}

const SCANNER_DIV_ID = 'qr-attendance-scanner'
const RECENTLY_SCANNED_TTL_MS = 5000

export default function QRScannerTab({
  students,
  attendance,
  onStudentScanned,
  isActive,
}: QRScannerTabProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const recentlyScanned = useRef<Map<string, number>>(new Map())
  const [lastResult, setLastResult] = useState<{
    name: string
    status: 'success' | 'already' | 'not_found'
  } | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const studentMap = useRef<Map<string, StudentWithClasses>>(new Map())
  useEffect(() => {
    studentMap.current = new Map(students.map(s => [s.id, s]))
  }, [students])

  // Start/stop camera based on tab active state
  useEffect(() => {
    if (!isActive) {
      stopScanner()
      return
    }
    startScanner()
    return () => { stopScanner() }
  }, [isActive])

  const startScanner = async () => {
    setIsStarting(true)
    setCameraError(null)
    try {
      const scanner = new Html5Qrcode(SCANNER_DIV_ID)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {} // ignore frame errors (normal during scanning)
      )
    } catch (err: any) {
      const msg = err?.message || String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setCameraError('Akses kamera ditolak. Silakan izinkan akses kamera di browser Anda.')
      } else {
        setCameraError('Kamera tidak dapat diakses. Pastikan perangkat memiliki kamera.')
      }
    } finally {
      setIsStarting(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (_) {}
      scannerRef.current = null
    }
  }

  const onScanSuccess = (decodedText: string) => {
    const now = Date.now()

    // De-duplicate: ignore if scanned within TTL
    const lastScan = recentlyScanned.current.get(decodedText)
    if (lastScan && now - lastScan < RECENTLY_SCANNED_TTL_MS) return
    recentlyScanned.current.set(decodedText, now)

    // Look up student
    const student = studentMap.current.get(decodedText)
    if (!student) {
      setLastResult({ name: '', status: 'not_found' })
      return
    }

    // Check if already marked present
    const currentStatus = attendance[decodedText]?.status
    if (currentStatus === 'H') {
      setLastResult({ name: student.name, status: 'already' })
      return
    }

    onStudentScanned(decodedText)
    setLastResult({ name: student.name, status: 'success' })

    // Auto-clear feedback after 3s
    setTimeout(() => setLastResult(null), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Camera viewfinder */}
      {!cameraError && (
        <div className="flex flex-col items-center">
          {isStarting && (
            <p className="text-sm text-gray-500 mb-2">Memulai kamera...</p>
          )}
          <div
            id={SCANNER_DIV_ID}
            className="w-full max-w-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
          />
          <p className="mt-2 text-xs text-gray-400">
            Arahkan kamera ke QR code siswa
          </p>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">{cameraError}</p>
        </div>
      )}

      {/* Scan result feedback */}
      {lastResult && (
        <div className={`rounded-lg p-4 text-sm font-medium ${
          lastResult.status === 'success'
            ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
            : lastResult.status === 'already'
            ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
            : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
        }`}>
          {lastResult.status === 'success' && `✓ ${lastResult.name} — ditandai Hadir`}
          {lastResult.status === 'already' && `⚠ ${lastResult.name} — sudah ditandai Hadir`}
          {lastResult.status === 'not_found' && `✕ Siswa tidak terdaftar dalam pertemuan ini`}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Pastikan TypeScript compile**

```bash
npm run type-check 2>&1 | head -30
```
Expected: No errors di file baru

**Step 3: Commit**

```bash
git add src/app/(admin)/absensi/components/QRScannerTab.tsx
git commit -m "feat(qr): add QRScannerTab component with html5-qrcode"
```

---

## Task 4: Tambah Tab di Halaman Absensi

**Files:**
- Modify: `src/app/(admin)/absensi/[meetingId]/page.tsx`

**Context penting sebelum edit:**
- File ini 675 baris — gunakan Edit tool, jangan Write
- Import baru perlu ditambahkan di baris 1-22
- Tab state harus ditambahkan di area `useState` (baris 43-65)
- `handleQRScan` function baru perlu ditambahkan setelah `handleSave` (setelah baris 132)
- UI tab ditambahkan di JSX antara Summary Card (baris 610-616) dan Filters (baris 620)
- Save button (baris 648-659) perlu dibungkus conditional `{activeTab === 'manual' && ...}`

**Step 1: Tambah import QRScannerTab di baris 22 (setelah baris terakhir import)**

Cari baris:
```typescript
import { isCaberawitClass, isTeacherClass, isSambungDesaEligible } from '@/lib/utils/classHelpers'
```

Ganti dengan:
```typescript
import { isCaberawitClass, isTeacherClass, isSambungDesaEligible } from '@/lib/utils/classHelpers'
import QRScannerTab from '../components/QRScannerTab'
```

**Step 2: Tambah tab state di area useState**

Cari baris:
```typescript
  const [saving, setSaving] = useState(false)
```

Ganti dengan:
```typescript
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'manual' | 'qr'>('manual')
```

**Step 3: Tambah `handleQRScan` setelah `handleSave` (setelah baris 132, sebelum `calculateLocalStats`)**

Cari baris:
```typescript
  // Calculate stats from local attendance state (real-time updates)
  const calculateLocalStats = () => {
```

Tambahkan SEBELUM baris tersebut:
```typescript
  const handleQRScan = async (studentId: string) => {
    // Optimistic update
    setLocalAttendance(prev => ({
      ...prev,
      [studentId]: { status: 'H', reason: undefined }
    }))

    if (!meeting) return
    try {
      const result = await saveAttendanceForMeeting(meetingId, [{
        student_id: studentId,
        date: meeting.date,
        status: 'H',
        reason: null,
      }])
      if (!result.success) {
        // Rollback optimistic update on failure
        setLocalAttendance(prev => ({
          ...prev,
          [studentId]: { status: 'A', reason: undefined }
        }))
      }
    } catch {
      setLocalAttendance(prev => ({
        ...prev,
        [studentId]: { status: 'A', reason: undefined }
      }))
    }
  }

  // Calculate stats from local attendance state (real-time updates)
  const calculateLocalStats = () => {
```

**Step 4: Tambah UI tab di JSX, setelah SummaryCard dan sebelum DataFilter**

Cari baris:
```typescript
        {/* Filters */}
        <DataFilter
```

Tambahkan SEBELUM baris tersebut:
```typescript
        {/* Tabs: Absen Manual | Scan QR */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Absen Manual
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'qr'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Scan QR
          </button>
        </div>

        {/* Filters */}
        <DataFilter
```

**Step 5: Wrap AttendanceTable dan Save Button dalam conditional, tambah QRScannerTab**

Cari baris:
```typescript
        {/* Attendance Table */}
        <div className="pb-28 md:pb-8">
          <AttendanceTable
```

Ganti seluruh blok "Attendance Table" hingga akhir "Save Button" (sampai akhir tag `</div>` save button di baris 659):
```typescript
        {/* Tab Content */}
        {activeTab === 'manual' ? (
          <>
            {/* Attendance Table */}
            <div className="pb-28 md:pb-8">
              <AttendanceTable
                students={visibleStudents}
                attendance={localAttendance}
                onStatusChange={handleStatusChange}
                canEditStudent={canEditStudent}
              />
            </div>

            {/* Save Button - Mobile: floating, Desktop: static */}
            <div className="fixed md:static bottom-16 left-4 right-4 md:flex md:justify-end z-50 shadow-lg md:shadow-none">
              <Button
                onClick={handleSave}
                disabled={saving}
                variant="primary"
                className="w-full md:w-auto"
                loading={saving}
                loadingText="Menyimpan..."
              >
                Simpan
              </Button>
            </div>
          </>
        ) : (
          <div className="pb-28 md:pb-8 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <QRScannerTab
              students={visibleStudents}
              attendance={localAttendance}
              onStudentScanned={handleQRScan}
              isActive={activeTab === 'qr'}
            />
          </div>
        )}
```

**Step 6: Hapus blok Save Button lama** (yang asli di baris 648-659) — sudah dipindahkan ke dalam conditional di step 5.

> Pastikan blok save button lama sudah dihapus dan tidak ada duplikat.

**Step 7: Type-check dan test manual**

```bash
npm run type-check
npm run dev
```

Buka `/absensi/[meetingId]` di browser, cek 2 tab muncul. Klik "Scan QR" — kamera harus minta permission.

**Step 8: Commit**

```bash
git add src/app/(admin)/absensi/[meetingId]/page.tsx
git commit -m "feat(qr): add QR scanner tab to meeting attendance page"
```

---

## Task 5: QR Display di Halaman Biodata Siswa

**Files:**
- Create: `src/app/(admin)/users/siswa/components/QRCodeDisplay.tsx`
- Modify: `src/app/(admin)/users/siswa/[studentId]/biodata/page.tsx`

**Step 1: Buat komponen QRCodeDisplay**

Buat file `src/app/(admin)/users/siswa/components/QRCodeDisplay.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { generateStudentQRDataURL } from '@/lib/qr/generateQR'

interface QRCodeDisplayProps {
  studentId: string
  studentName: string
}

export function QRCodeDisplay({ studentId, studentName }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    generateStudentQRDataURL(studentId)
      .then(setDataUrl)
      .catch(() => setError(true))
  }, [studentId])

  if (error) {
    return <p className="text-sm text-red-500">Gagal generate QR code</p>
  }

  if (!dataUrl) {
    return (
      <div className="w-[200px] h-[200px] bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg" />
    )
  }

  return (
    <img
      src={dataUrl}
      alt={`QR Code ${studentName}`}
      className="w-[200px] h-[200px] rounded-lg border border-gray-200 dark:border-gray-700"
    />
  )
}
```

**Step 2: Tambah section QR di biodata page**

Di `src/app/(admin)/users/siswa/[studentId]/biodata/page.tsx`, tambah import:

Cari baris:
```typescript
import Button from '@/components/ui/button/Button'
```

Ganti dengan:
```typescript
import Button from '@/components/ui/button/Button'
import { QRCodeDisplay } from '../../components/QRCodeDisplay'
```

Lalu di JSX, cari baris:
```typescript
        {/* Student Profile View */}
        <StudentProfileView student={student} onEdit={() => setIsModalOpen(true)} />
```

Tambahkan section QR SETELAH StudentProfileView:
```typescript
        {/* Student Profile View */}
        <StudentProfileView student={student} onEdit={() => setIsModalOpen(true)} />

        {/* QR Code Section */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Kode QR Siswa
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <QRCodeDisplay studentId={studentId} studentName={student.name} />
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Scan kode ini untuk absensi otomatis.</p>
              <p className="mt-1">Cetak dan berikan kepada siswa.</p>
            </div>
          </div>
        </div>
```

**Step 3: Type-check**

```bash
npm run type-check
```

**Step 4: Commit**

```bash
git add src/app/(admin)/users/siswa/components/QRCodeDisplay.tsx
git add src/app/(admin)/users/siswa/[studentId]/biodata/page.tsx
git commit -m "feat(qr): add QR code display to student biodata page"
```

---

## Task 6: PDF Document untuk Cetak QR

**Files:**
- Create: `src/app/(admin)/users/siswa/components/QRPrintDocument.tsx`

> **Reference pattern:** Lihat `src/app/(admin)/rapot/components/` untuk pola `@react-pdf/renderer`.

**Step 1: Buat QRPrintDocument**

Buat file `src/app/(admin)/users/siswa/components/QRPrintDocument.tsx`:

```typescript
import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'

export interface QRStudentData {
  id: string
  name: string
  className?: string
  kelompokName?: string
  qrDataUrl: string
}

// ── Individual card layout (1 per A4 page) ──────────────────────────
const cardStyles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#ffffff', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  card: { border: '1pt solid #e5e7eb', borderRadius: 8, padding: 24, alignItems: 'center', width: 300 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4, textAlign: 'center' },
  meta: { fontSize: 10, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  qr: { width: 180, height: 180 },
  label: { fontSize: 9, color: '#9ca3af', marginTop: 12 },
})

export function QRCardDocument({ students }: { students: QRStudentData[] }) {
  return (
    <Document>
      {students.map(s => (
        <Page key={s.id} size="A4" style={cardStyles.page}>
          <View style={cardStyles.card}>
            <Text style={cardStyles.name}>{s.name}</Text>
            {(s.className || s.kelompokName) && (
              <Text style={cardStyles.meta}>
                {[s.className, s.kelompokName].filter(Boolean).join(' · ')}
              </Text>
            )}
            <Image style={cardStyles.qr} src={s.qrDataUrl} />
            <Text style={cardStyles.label}>Scan untuk Absensi</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}

// ── Grid layout (6 per A4 page, 2 col × 3 row) ──────────────────────
const CARD_W = 88  // mm approximation in pts
const CARD_H = 120

const gridStyles = StyleSheet.create({
  page: { padding: 16, backgroundColor: '#ffffff' },
  row: { flexDirection: 'row', marginBottom: 8 },
  cell: { width: CARD_W, height: CARD_H, border: '0.5pt solid #d1d5db', borderRadius: 4, marginRight: 8, alignItems: 'center', justifyContent: 'center', padding: 6 },
  name: { fontSize: 8, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 2 },
  meta: { fontSize: 6, color: '#6b7280', textAlign: 'center', marginBottom: 4 },
  qr: { width: 72, height: 72 },
  label: { fontSize: 6, color: '#9ca3af', marginTop: 4 },
})

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

export function QRGridDocument({ students }: { students: QRStudentData[] }) {
  const pages = chunk(students, 6)
  return (
    <Document>
      {pages.map((pageStudents, pi) => {
        const rows = chunk(pageStudents, 2)
        return (
          <Page key={pi} size="A4" style={gridStyles.page}>
            {rows.map((row, ri) => (
              <View key={ri} style={gridStyles.row}>
                {row.map(s => (
                  <View key={s.id} style={gridStyles.cell}>
                    <Text style={gridStyles.name}>{s.name}</Text>
                    {(s.className || s.kelompokName) && (
                      <Text style={gridStyles.meta}>
                        {[s.className, s.kelompokName].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                    <Image style={gridStyles.qr} src={s.qrDataUrl} />
                    <Text style={gridStyles.label}>Scan untuk Absensi</Text>
                  </View>
                ))}
              </View>
            ))}
          </Page>
        )
      })}
    </Document>
  )
}
```

**Step 2: Type-check**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add src/app/(admin)/users/siswa/components/QRPrintDocument.tsx
git commit -m "feat(qr): add QR PDF document layouts (card and grid)"
```

---

## Task 7: QR Print Modal

**Files:**
- Create: `src/app/(admin)/users/siswa/components/QRPrintModal.tsx`

**Step 1: Buat QRPrintModal**

Buat file `src/app/(admin)/users/siswa/components/QRPrintModal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { generateStudentQRDataURL } from '@/lib/qr/generateQR'
import { QRCardDocument, QRGridDocument, QRStudentData } from './QRPrintDocument'
import type { Student } from '@/hooks/useStudents'

interface QRPrintModalProps {
  students: Student[]
  isOpen: boolean
  onClose: () => void
  classes?: Array<{ id: string; name: string; kelompok_id?: string | null }>
}

type PrintFormat = 'card' | 'grid'

export function QRPrintModal({ students, isOpen, onClose, classes }: QRPrintModalProps) {
  const [format, setFormat] = useState<PrintFormat>('grid')
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  const handlePrint = async () => {
    const total = students.length
    setProgress({ current: 0, total })

    try {
      // Generate all QR data URLs first (async, show progress)
      const qrStudents: QRStudentData[] = []
      for (let i = 0; i < students.length; i++) {
        const s = students[i]
        const qrDataUrl = await generateStudentQRDataURL(s.id)
        const classInfo = classes?.find(c => c.id === s.class_id)
        qrStudents.push({
          id: s.id,
          name: s.name,
          className: classInfo?.name,
          kelompokName: undefined, // kelompok not available in Student type directly
          qrDataUrl,
        })
        setProgress({ current: i + 1, total })
      }

      // Generate PDF blob
      const doc = format === 'card'
        ? <QRCardDocument students={qrStudents} />
        : <QRGridDocument students={qrStudents} />

      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `qr-siswa-${Date.now()}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      console.error('Failed to generate QR PDF:', err)
    } finally {
      setProgress(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Cetak QR Code
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {students.length} siswa dipilih
        </p>

        {/* Format picker */}
        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Format Cetak
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormat('grid')}
              className={`p-3 rounded-lg border-2 text-sm text-left transition-colors ${
                format === 'grid'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="font-medium">Sheet Grid</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">6 per halaman A4</div>
            </button>
            <button
              onClick={() => setFormat('card')}
              className={`p-3 rounded-lg border-2 text-sm text-left transition-colors ${
                format === 'card'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="font-medium">Kartu Individual</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">1 per halaman A4</div>
            </button>
          </div>
        </div>

        {/* Progress */}
        {progress && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Generating QR...</span>
              <span>{progress.current}/{progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={!!progress}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handlePrint}
            disabled={!!progress}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {progress ? 'Generating...' : 'Cetak PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Type-check**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add src/app/(admin)/users/siswa/components/QRPrintModal.tsx
git commit -m "feat(qr): add QRPrintModal with format picker and progress"
```

---

## Task 8: Tambah Checkbox QR Selection di StudentsTable

**Files:**
- Modify: `src/app/(admin)/users/siswa/components/StudentsTable.tsx`

**Context:** File ini 300+ baris. Perlu tambah 2 optional props dan 1 kolom checkbox tanpa breaking existing API.

**Step 1: Tambah optional props ke interface StudentsTableProps**

Cari interface `StudentsTableProps`:
```typescript
  studentsWithPendingTransfer?: Set<string>
}
```

Tambahkan 2 baris SEBELUM closing `}`:
```typescript
  studentsWithPendingTransfer?: Set<string>
  selectedForQR?: Set<string>
  onQRSelect?: (studentId: string, selected: boolean) => void
}
```

**Step 2: Destruktur props baru di function signature**

Cari baris:
```typescript
  studentsWithPendingTransfer
}: StudentsTableProps) {
```

Ganti dengan:
```typescript
  studentsWithPendingTransfer,
  selectedForQR,
  onQRSelect,
}: StudentsTableProps) {
```

**Step 3: Tambah kolom checkbox di definisi columns**

Cari tempat di kode di mana columns array didefinisikan untuk DataTable. Tambahkan kolom pertama secara conditional jika `onQRSelect` tersedia. Kolom ini harus muncul sebagai kolom pertama.

Perlu dibaca lebih lanjut bagian columns dari StudentsTable untuk mendapat exact location — gunakan pola yang sudah ada di file.

> **Hint:** Cari baris dengan `const columns = ` atau tempat columns array didefinisikan, lalu tambahkan:
```typescript
...(onQRSelect ? [{
  title: '',
  dataIndex: 'qr_select',
  key: 'qr_select',
  width: 40,
  render: (_: unknown, record: Student) => (
    <input
      type="checkbox"
      checked={selectedForQR?.has(record.id) ?? false}
      onChange={e => onQRSelect(record.id, e.target.checked)}
      onClick={e => e.stopPropagation()}
      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
    />
  ),
}] : []),
```

**Step 4: Type-check**

```bash
npm run type-check
```

**Step 5: Commit**

```bash
git add src/app/(admin)/users/siswa/components/StudentsTable.tsx
git commit -m "feat(qr): add optional QR checkbox selection to StudentsTable"
```

---

## Task 9: Wire Up Bulk Print di Halaman List Siswa

**Files:**
- Modify: `src/app/(admin)/users/siswa/page.tsx`

**Step 1: Tambah import QRPrintModal**

Di bagian imports page.tsx, tambahkan:
```typescript
import { QRPrintModal } from './components/QRPrintModal'
```

**Step 2: Tambah state selection**

Di dalam component `SiswaPage` (atau nama component utama), tambahkan:
```typescript
const [selectedForQR, setSelectedForQR] = useState<Set<string>>(new Set())
const [showQRPrintModal, setShowQRPrintModal] = useState(false)

const handleQRSelect = (studentId: string, selected: boolean) => {
  setSelectedForQR(prev => {
    const next = new Set(prev)
    if (selected) next.add(studentId)
    else next.delete(studentId)
    return next
  })
}
```

**Step 3: Tambah tombol "Cetak QR" di header**

Cari bagian header halaman siswa di JSX. Tambahkan tombol yang hanya muncul saat ada siswa terpilih:

```typescript
{selectedForQR.size > 0 && (
  <button
    onClick={() => setShowQRPrintModal(true)}
    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
    Cetak QR ({selectedForQR.size})
  </button>
)}
```

**Step 4: Pass props ke StudentsTable**

Cari `<StudentsTable` di JSX dan tambahkan props:
```typescript
selectedForQR={selectedForQR}
onQRSelect={handleQRSelect}
```

**Step 5: Tambah QRPrintModal di akhir JSX (sebelum closing tag)**

```typescript
{showQRPrintModal && (
  <QRPrintModal
    students={students.filter(s => selectedForQR.has(s.id))}
    isOpen={showQRPrintModal}
    onClose={() => {
      setShowQRPrintModal(false)
      setSelectedForQR(new Set()) // Reset selection after print
    }}
    classes={classesData}
  />
)}
```

**Step 6: Type-check dan test manual**

```bash
npm run type-check
npm run dev
```

Buka `/users/siswa`, centang beberapa siswa, klik "Cetak QR", pilih format, download PDF.

**Step 7: Commit**

```bash
git add src/app/(admin)/users/siswa/page.tsx
git commit -m "feat(qr): add bulk QR print selection to siswa list page"
```

---

## Verification End-to-End

### Test 1: Scanner QR
1. Buat pertemuan baru di `/absensi`
2. Buka halaman detail pertemuan
3. Klik tab "Scan QR"
4. Izinkan akses kamera
5. Generate QR test via browser console: `generateStudentQRDataURL('uuid-siswa')` → tampilkan di `<img>`
6. Scan QR → siswa harus muncul di feedback sebagai Hadir
7. Cek SummaryCard update real-time
8. Kembali ke tab "Absen Manual" → siswa terlihat status H
9. Scanner harus berhenti saat pindah tab (kamera LED mati)

### Test 2: Error States Scanner
- Scan QR yang bukan UUID siswa di meeting → tampilkan error merah
- Scan siswa yang sudah H → tampilkan warning kuning
- Tolak permission kamera → tampilkan pesan instruksi (bukan crash)

### Test 3: Print QR Individual
1. Buka halaman biodata siswa
2. Cek section "Kode QR Siswa" muncul dengan QR image
3. Klik cetak (jika diimplementasikan di biodata) atau ambil dari list

### Test 4: Bulk Print QR
1. Buka halaman `/users/siswa`
2. Centang 3-5 siswa
3. Klik tombol "Cetak QR (3)"
4. Pilih format "Sheet Grid" → klik "Cetak PDF"
5. PDF terdownload, cek 6 QR per halaman A4
6. Pilih format "Kartu Individual" → PDF dengan 1 kartu per halaman

### Test 5: Type-check dan build
```bash
npm run type-check
npm run build
```
Expected: No TypeScript errors, build succeeds
