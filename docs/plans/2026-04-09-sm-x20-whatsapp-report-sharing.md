# [sm-x20] feat: WhatsApp Report Sharing from Laporan Page

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambah fitur kirim laporan kehadiran bulanan siswa via WhatsApp dari halaman `/laporan` — tombol WA di tiap baris tabel, modal konfirmasi dengan pilihan nomor tujuan, template pesan dengan placeholder, toggle download gambar (html2canvas). Settings disimpan per akun di `profiles.whatsapp_settings` JSONB.

**Architecture:** 9 tasks berurutan. DB migration dulu (Task 1), lalu types (Task 2), lalu server actions (Task 3), lalu helper utility (Task 4), lalu komponen UI (Task 5-7), lalu integrasi ke DataTable (Task 8), lalu propagate nomor telepon dari query laporan (Task 9).

**Tech Stack:** Next.js 15, TypeScript, Supabase (`profiles` table JSONB), html2canvas (client-side screenshot), wa.me link API, Zustand (UI state sementara selama modal terbuka).

**Design Reference:** `docs/plans/2026-04-08-calendar-bug-and-whatsapp-report-design.md`

**Branch:** `feature/sm-x20-whatsapp-report`

---

## Task 1: DB Migration — Tambah Kolom `whatsapp_settings`

**Files:**
- Migration via Supabase MCP

**Step 1: Jalankan migration**

Gunakan MCP `apply_migration`:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS whatsapp_settings JSONB DEFAULT '{
  "target": "parent",
  "download_image": true,
  "message_template": "Assalamu''alaikum, berikut laporan kehadiran *{nama_siswa}* bulan *{bulan} {tahun}*:\n\n✅ Hadir: {hadir}x\n📋 Izin: {izin}x\n🤒 Sakit: {sakit}x\n❌ Alfa: {alfa}x\n📊 Persentase: {persentase}%\n\nWassalamu''alaikum"
}'::jsonb;
```

**Step 2: Verifikasi**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'whatsapp_settings';
```

Expected: 1 row, `data_type = jsonb`.

---

## Task 2: Type Definition — `WhatsAppSettings` di `src/types/user.ts`

**Files:**
- Modify: `src/types/user.ts`

**Step 1: Tambah type dan constant**

Tambah SETELAH block `permissions?` di `UserProfile` interface, SEBELUM `// ─── Aliases`:

```typescript
export interface WhatsAppSettings {
  target: 'student' | 'parent'
  download_image: boolean
  message_template: string
}

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  target: 'parent',
  download_image: true,
  message_template: `Assalamu'alaikum, berikut laporan kehadiran *{nama_siswa}* bulan *{bulan} {tahun}*:

✅ Hadir: {hadir}x
📋 Izin: {izin}x
🤒 Sakit: {sakit}x
❌ Alfa: {alfa}x
📊 Persentase: {persentase}%

Wassalamu'alaikum`
}
```

Tambah field `whatsapp_settings` di `UserProfile` interface (setelah `permissions?`):

```typescript
  whatsapp_settings?: WhatsAppSettings | null
```

**Step 2: Type-check**

```bash
npm run type-check
```

Expected: no new errors.

**Step 3: Commit**

```bash
git add src/types/user.ts
git commit -m "feat(types): add WhatsAppSettings type and DEFAULT_WHATSAPP_SETTINGS

Part of sm-x20 / fixes #34

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Server Actions — Get & Save WA Settings

**Files:**
- Create: `src/app/(admin)/laporan/actions/whatsapp/actions.ts`

**Step 1: Buat direktori dan file**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { DEFAULT_WHATSAPP_SETTINGS } from '@/types/user'
import type { WhatsAppSettings } from '@/types/user'

export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return DEFAULT_WHATSAPP_SETTINGS

    const { data, error } = await supabase
      .from('profiles')
      .select('whatsapp_settings')
      .eq('id', user.id)
      .single()

    if (error || !data?.whatsapp_settings) return DEFAULT_WHATSAPP_SETTINGS

    return { ...DEFAULT_WHATSAPP_SETTINGS, ...(data.whatsapp_settings as WhatsAppSettings) }
  } catch {
    return DEFAULT_WHATSAPP_SETTINGS
  }
}

export async function saveWhatsAppSettings(settings: Partial<WhatsAppSettings>): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    const current = await getWhatsAppSettings()
    const updated = { ...current, ...settings }

    const { error } = await supabase
      .from('profiles')
      .update({ whatsapp_settings: updated })
      .eq('id', user.id)

    if (error) throw error
  } catch (error) {
    handleApiError(error, 'menyimpan data', 'gagal menyimpan pengaturan WhatsApp')
    throw error
  }
}
```

**Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/\(admin\)/laporan/actions/whatsapp/actions.ts
git commit -m "feat(laporan): add getWhatsAppSettings and saveWhatsAppSettings server actions

Part of sm-x20 / fixes #34

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Helper Utility — `src/lib/whatsapp.ts`

**Files:**
- Create: `src/lib/whatsapp.ts`

**Step 1: Buat file**

```typescript
export interface WhatsAppReportData {
  nama_siswa: string
  bulan: string      // e.g. "Maret"
  tahun: string      // e.g. "2025"
  hadir: number
  izin: number
  sakit: number
  alfa: number
  persentase: string // e.g. "85"
}

/**
 * Konversi nomor lokal (08xxx) ke format internasional (628xxx)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) return '62' + cleaned.slice(1)
  if (cleaned.startsWith('62')) return cleaned
  return '62' + cleaned
}

/**
 * Replace placeholders di template dengan data real siswa
 */
export function resolvePlaceholders(
  template: string,
  data: WhatsAppReportData
): string {
  return template
    .replace(/\{nama_siswa\}/g, data.nama_siswa)
    .replace(/\{bulan\}/g, data.bulan)
    .replace(/\{tahun\}/g, data.tahun)
    .replace(/\{hadir\}/g, String(data.hadir))
    .replace(/\{izin\}/g, String(data.izin))
    .replace(/\{sakit\}/g, String(data.sakit))
    .replace(/\{alfa\}/g, String(data.alfa))
    .replace(/\{persentase\}/g, data.persentase)
}

/**
 * Generate wa.me URL dengan nomor dan pesan terisi
 */
export function generateWaLink(phone: string, message: string): string {
  const formatted = formatPhoneNumber(phone)
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${formatted}?text=${encoded}`
}

/**
 * Validasi nomor telepon — tidak null/kosong dan minimal 9 digit
 */
export function isPhoneValid(phone: string | null | undefined): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 9
}
```

**Step 2: Tulis unit tests**

Create: `src/lib/__tests__/whatsapp.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  formatPhoneNumber,
  resolvePlaceholders,
  generateWaLink,
  isPhoneValid
} from '../whatsapp'

describe('formatPhoneNumber', () => {
  it('converts 08xxx to 628xxx', () => {
    expect(formatPhoneNumber('081234567890')).toBe('6281234567890')
  })
  it('keeps 62xxx as-is', () => {
    expect(formatPhoneNumber('6281234567890')).toBe('6281234567890')
  })
  it('strips non-digits', () => {
    expect(formatPhoneNumber('0812-3456-7890')).toBe('6281234567890')
  })
  it('prepends 62 if no prefix', () => {
    expect(formatPhoneNumber('81234567890')).toBe('6281234567890')
  })
})

describe('resolvePlaceholders', () => {
  const data = {
    nama_siswa: 'Budi', bulan: 'Maret', tahun: '2026',
    hadir: 10, izin: 1, sakit: 0, alfa: 2, persentase: '77'
  }
  it('replaces all placeholders', () => {
    const result = resolvePlaceholders('Halo {nama_siswa}, hadir {hadir}x', data)
    expect(result).toBe('Halo Budi, hadir 10x')
  })
  it('replaces multiple occurrences', () => {
    const result = resolvePlaceholders('{bulan} {bulan}', data)
    expect(result).toBe('Maret Maret')
  })
})

describe('isPhoneValid', () => {
  it('returns false for null', () => expect(isPhoneValid(null)).toBe(false))
  it('returns false for empty string', () => expect(isPhoneValid('')).toBe(false))
  it('returns false for too short', () => expect(isPhoneValid('0812')).toBe(false))
  it('returns true for valid number', () => expect(isPhoneValid('081234567890')).toBe(true))
})

describe('generateWaLink', () => {
  it('generates correct wa.me URL', () => {
    const url = generateWaLink('081234567890', 'Halo Budi')
    expect(url).toBe('https://wa.me/6281234567890?text=Halo%20Budi')
  })
})
```

**Step 3: Run test — verifikasi PASS**

```bash
npm run test:run src/lib/__tests__/whatsapp.test.ts
```

Expected: all 9 tests PASS.

**Step 4: Commit**

```bash
git add src/lib/whatsapp.ts src/lib/__tests__/whatsapp.test.ts
git commit -m "feat(lib): add whatsapp helper utility with unit tests

Part of sm-x20 / fixes #34

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Komponen `StudentReportCard` — Hidden Card untuk Screenshot

**Files:**
- Create: `src/app/(admin)/laporan/components/StudentReportCard.tsx`

**Step 1: Install html2canvas**

```bash
npm install html2canvas
```

Verifikasi: `package.json` punya `"html2canvas"` di `dependencies`.

**Step 2: Buat komponen**

```typescript
'use client'

import { forwardRef } from 'react'
import type { WhatsAppReportData } from '@/lib/whatsapp'

interface StudentReportCardProps {
  data: WhatsAppReportData
}

const StudentReportCard = forwardRef<HTMLDivElement, StudentReportCardProps>(
  ({ data }, ref) => {
    const pct = parseFloat(data.persentase)
    const pctColor = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626'

    return (
      <div
        ref={ref}
        style={{
          width: '360px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          fontFamily: 'sans-serif',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
            Laporan Kehadiran
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            {data.bulan} {data.tahun}
          </div>
        </div>

        <div style={{
          backgroundColor: '#f3f4f6', borderRadius: '8px',
          padding: '12px', textAlign: 'center', marginBottom: '16px'
        }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
            {data.nama_siswa}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: pctColor }}>
            {data.persentase}%
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Tingkat Kehadiran</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Hadir', value: data.hadir, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Izin', value: data.izin, color: '#d97706', bg: '#fffbeb' },
            { label: 'Sakit', value: data.sakit, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Alfa', value: data.alfa, color: '#dc2626', bg: '#fef2f2' },
          ].map(({ label, value, color: c, bg }) => (
            <div key={label} style={{
              backgroundColor: bg, borderRadius: '8px',
              padding: '12px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: c }}>{value}x</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }
)

StudentReportCard.displayName = 'StudentReportCard'
export default StudentReportCard
```

**Step 3: Type-check**

```bash
npm run type-check
```

Expected: no errors.

---

## Task 6: Komponen `WhatsAppModal`

**Files:**
- Create: `src/app/(admin)/laporan/components/WhatsAppModal.tsx`

**Step 1: Buat modal**

```typescript
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
import { generateWaLink, resolvePlaceholders, isPhoneValid } from '@/lib/whatsapp'
import type { WhatsAppReportData } from '@/lib/whatsapp'
import type { WhatsAppSettings } from '@/types/user'
import { DEFAULT_WHATSAPP_SETTINGS } from '@/types/user'
import StudentReportCard from './StudentReportCard'
import { saveWhatsAppSettings } from '../actions/whatsapp/actions'

dayjs.locale('id')

interface StudentRowData {
  student_id: string
  student_name: string
  nomor_telepon?: string | null
  telepon_orangtua?: string | null
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendance_rate: string
}

interface WhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  student: StudentRowData
  month: number
  year: number
  initialSettings: WhatsAppSettings
  onSettingsChange: (settings: WhatsAppSettings) => void
}

export default function WhatsAppModal({
  isOpen,
  onClose,
  student,
  month,
  year,
  initialSettings,
  onSettingsChange,
}: WhatsAppModalProps) {
  const [settings, setSettings] = useState<WhatsAppSettings>(initialSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSettings(initialSettings)
  }, [initialSettings])

  const reportData: WhatsAppReportData = {
    nama_siswa: student.student_name,
    bulan: dayjs().month(month - 1).format('MMMM'),
    tahun: String(year),
    hadir: student.hadir,
    izin: student.izin,
    sakit: student.sakit,
    alfa: student.alpha,
    persentase: student.attendance_rate.replace('%', '').trim(),
  }

  const targetPhone = settings.target === 'student'
    ? student.nomor_telepon
    : student.telepon_orangtua

  const resolvedMessage = resolvePlaceholders(settings.message_template, reportData)
  const phoneValid = isPhoneValid(targetPhone)

  const handleSettingChange = useCallback(async (patch: Partial<WhatsAppSettings>) => {
    const updated = { ...settings, ...patch }
    setSettings(updated)
    onSettingsChange(updated)
    setIsSaving(true)
    try {
      await saveWhatsAppSettings(patch)
    } finally {
      setIsSaving(false)
    }
  }, [settings, onSettingsChange])

  const handleSend = useCallback(async () => {
    if (!phoneValid || !targetPhone) return
    setIsGenerating(true)
    try {
      if (settings.download_image && cardRef.current) {
        const { default: html2canvas } = await import('html2canvas')
        const canvas = await html2canvas(cardRef.current, { scale: 2 })
        const link = document.createElement('a')
        link.download = `laporan-${student.student_name}-${reportData.bulan}-${reportData.tahun}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      const url = generateWaLink(targetPhone, resolvedMessage)
      window.open(url, '_blank')
      onClose()
    } finally {
      setIsGenerating(false)
    }
  }, [phoneValid, targetPhone, settings, resolvedMessage, student, reportData, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Hidden card untuk screenshot */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <StudentReportCard ref={cardRef} data={reportData} />
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Kirim Laporan via WhatsApp
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Info siswa */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3">
              <div className="font-medium text-gray-900 dark:text-white">{student.student_name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {reportData.bulan} {reportData.tahun}
              </div>
            </div>

            {/* Pilih nomor tujuan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nomor Tujuan
              </label>
              <div className="space-y-2">
                {[
                  { value: 'parent' as const, label: 'Orang Tua', phone: student.telepon_orangtua },
                  { value: 'student' as const, label: 'Siswa', phone: student.nomor_telepon },
                ].map(({ value, label, phone }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="wa-target"
                      value={value}
                      checked={settings.target === value}
                      onChange={() => handleSettingChange({ target: value })}
                      className="text-green-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {label}
                      {phone
                        ? <span className="text-gray-400 ml-1">({phone})</span>
                        : <span className="text-red-400 ml-1">(tidak tersedia)</span>
                      }
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Template pesan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Template Pesan
              </label>
              <textarea
                value={settings.message_template}
                onChange={(e) => handleSettingChange({ message_template: e.target.value })}
                rows={7}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Placeholder: {'{nama_siswa}'} {'{bulan}'} {'{tahun}'} {'{hadir}'} {'{izin}'} {'{sakit}'} {'{alfa}'} {'{persentase}'}
              </p>
            </div>

            {/* Toggle download gambar */}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Download gambar laporan
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Gambar di-download otomatis, lalu attach manual di WA
                </div>
              </div>
              <button
                onClick={() => handleSettingChange({ download_image: !settings.download_image })}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  settings.download_image ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.download_image ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSend}
              disabled={!phoneValid || isGenerating}
              title={!phoneValid ? 'Nomor tidak tersedia' : undefined}
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.522 5.846L0 24l6.338-1.499A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.655-.493-5.19-1.357l-.372-.22-3.862.914.977-3.767-.241-.386A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              {isGenerating ? 'Memproses...' : 'Kirim ke WhatsApp'}
            </button>
          </div>

          {isSaving && (
            <div className="px-6 pb-3 text-xs text-gray-400 text-center">
              Menyimpan preferensi...
            </div>
          )}
        </div>
      </div>
    </>
  )
}
```

**Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

---

## Task 7: Update Laporan Query — Sertakan Nomor Telepon

**Files:**
- Modify: `src/app/(admin)/laporan/actions/reports/queries.ts` (atau logic.ts)

**Step 1: Baca file dulu**

```bash
cat src/app/\(admin\)/laporan/actions/reports/queries.ts
```

Cari query yang fetch student data (biasanya ada `students` JOIN atau select).

**Step 2: Tambah `nomor_telepon` dan `telepon_orangtua` ke SELECT**

Temukan baris yang select dari `students`, tambahkan kedua field:

```typescript
// Contoh — sesuaikan dengan kode aktual
.select(`
  students (
    id,
    name,
    nomor_telepon,        // tambah
    telepon_orangtua,     // tambah
    ...field lainnya
  )
`)
```

**Step 3: Propagate ke return type dan TableData**

Pastikan `nomor_telepon` dan `telepon_orangtua` ikut di-return sampai ke komponen `DataTable`. Cek:
- Return dari query
- Transform di logic.ts / actions.ts
- Type `TableData` di `DataTable.tsx`

**Step 4: Type-check**

```bash
npm run type-check
```

Expected: no errors.

---

## Task 8: Update `DataTable.tsx` — Tambah Tombol WA + Modal

**Files:**
- Modify: `src/app/(admin)/laporan/components/DataTable.tsx`

**Step 1: Tambah import**

```typescript
import { useState, useMemo, useEffect } from 'react'
import WhatsAppModal from './WhatsAppModal'
import { getWhatsAppSettings } from '../actions/whatsapp/actions'
import { DEFAULT_WHATSAPP_SETTINGS } from '@/types/user'
import type { WhatsAppSettings } from '@/types/user'
import { isPhoneValid } from '@/lib/whatsapp'
```

**Step 2: Update interface `TableData`**

```typescript
interface TableData {
  // ... existing fields ...
  nomor_telepon?: string | null
  telepon_orangtua?: string | null
}
```

**Step 3: Tambah state**

```typescript
const [waSettings, setWaSettings] = useState<WhatsAppSettings>(DEFAULT_WHATSAPP_SETTINGS)
const [waModalStudent, setWaModalStudent] = useState<TableData | null>(null)

useEffect(() => {
  getWhatsAppSettings().then(setWaSettings)
}, [])
```

**Step 4: Tambah kolom WA di `baseColumns`** (setelah kolom `actions`):

```typescript
{
  key: 'whatsapp',
  label: 'WA',
  align: 'center' as const,
  width: '16'
},
```

**Step 5: Tambah handler di `renderCell`** (setelah block `actions`):

```typescript
if (column.key === 'whatsapp') {
  const hasPhone = isPhoneValid(item.nomor_telepon) || isPhoneValid(item.telepon_orangtua)
  return (
    <button
      onClick={() => setWaModalStudent(item)}
      disabled={!hasPhone}
      title={hasPhone ? 'Kirim laporan via WhatsApp' : 'Nomor tidak tersedia'}
      className="mx-auto block text-green-600 hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.522 5.846L0 24l6.338-1.499A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.655-.493-5.19-1.357l-.372-.22-3.862.914.977-3.767-.241-.386A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
    </button>
  )
}
```

**Step 6: Tambah modal di return JSX** (sebelum closing `</div>` terluar):

```typescript
{waModalStudent && (
  <WhatsAppModal
    isOpen={!!waModalStudent}
    onClose={() => setWaModalStudent(null)}
    student={waModalStudent}
    month={filters.month}
    year={filters.year}
    initialSettings={waSettings}
    onSettingsChange={setWaSettings}
  />
)}
```

**Step 7: Type-check**

```bash
npm run type-check
```

Expected: no errors.

**Step 8: Commit semua task 1-8**

```bash
git add \
  src/app/\(admin\)/laporan/components/StudentReportCard.tsx \
  src/app/\(admin\)/laporan/components/WhatsAppModal.tsx \
  src/app/\(admin\)/laporan/components/DataTable.tsx \
  src/app/\(admin\)/laporan/actions/whatsapp/actions.ts \
  package.json package-lock.json
git commit -m "feat(laporan): add WhatsApp report sharing feature

- Add whatsapp_settings JSONB column to profiles table (migration)
- Add WhatsAppSettings type and DEFAULT_WHATSAPP_SETTINGS
- Add get/save WA settings server actions
- Add whatsapp helper utility (formatPhoneNumber, resolvePlaceholders, generateWaLink)
- Add hidden StudentReportCard for html2canvas screenshot
- Add WhatsAppModal with target selection, template editor, download toggle
- Add WA button column to DataTable with disabled state for missing phones
- Settings persist per-account in DB, sync across devices

fixes #34

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Manual Testing — Verifikasi End-to-End

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test checklist**

- [ ] Buka `/laporan`, pilih bulan dan kelas yang ada data
- [ ] Kolom WA (ikon hijau) muncul di tiap baris tabel
- [ ] Tombol WA disabled (abu-abu) untuk siswa tanpa nomor telepon
- [ ] Klik tombol WA → modal terbuka
- [ ] Modal menampilkan nama siswa dan bulan yang benar
- [ ] Radio button "Orang Tua" dan "Siswa" tampil dengan nomor masing-masing
- [ ] Template pesan bisa diedit
- [ ] Toggle download gambar berfungsi (on/off)
- [ ] Klik "Kirim ke WhatsApp" → gambar di-download (jika toggle on) → WA terbuka dengan pesan terisi
- [ ] Refresh halaman → settings (nomor tujuan, toggle, template) tetap tersimpan
- [ ] Login di browser lain dengan akun sama → settings sama

**Step 3: Type-check + build final**

```bash
npm run type-check && npm run build
```

Expected: no errors, build success.

---

## CLAUDE.md Check

- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini?
  - **Ya**: `whatsapp_settings` JSONB pattern di `profiles` — sama dengan `meeting_form_settings`, tidak perlu dokumen baru
- [ ] Apakah ada tabel database baru yang perlu ditambahkan ke Key Tables?
  - **Tidak**: hanya tambah kolom ke `profiles` yang sudah ada
- [ ] Apakah ada route/page baru?
  - **Tidak**: fitur di halaman `/laporan` yang sudah ada
- [ ] Apakah ada permission pattern baru?
  - **Tidak**: semua user laporan bisa akses
- [ ] Update `CLAUDE.md` atau `docs/claude/` setelah implementasi selesai?
  - **Tidak perlu**: pattern sudah terdokumentasi
