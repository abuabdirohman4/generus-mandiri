# Custom Field QR Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambah satu field teks bebas per siswa ("Keterangan") yang muncul di kartu QR PDF — nilainya diisi saat sesi cetak, tidak disimpan ke DB.

**Architecture:** Template editor dapat toggle `show_custom_field` + posisi/styling (mirror dari `kelompok`). Saat cetak, `QrCardsTab` tampilkan kolom input per siswa jika template aktif menggunakan field ini. `composeCard` menerima `customFieldValue` dan render ke canvas. Data hanya hidup di React state.

**Tech Stack:** Next.js 15, TypeScript, Supabase MCP (schema migration via `mcp__generus-mandiri-v2__execute_sql`), `@react-pdf/renderer`, Canvas API, `@dnd-kit/core`

---

## Task 1: DB Migration — Tambah kolom custom_field ke id_card_templates

**Files:**
- No file changes — eksekusi via MCP Supabase

**Step 1: Jalankan migration via MCP**

```sql
ALTER TABLE id_card_templates
  ADD COLUMN IF NOT EXISTS show_custom_field boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_field_label text NOT NULL DEFAULT 'Keterangan',
  ADD COLUMN IF NOT EXISTS custom_field_x_pct numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS custom_field_y_pct numeric NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS custom_field_font_size integer NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS custom_field_casing text NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS custom_field_color text NOT NULL DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS custom_field_italic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_field_bold boolean NOT NULL DEFAULT false;
```

Gunakan `mcp__generus-mandiri-v2__execute_sql` dengan query di atas.

**Step 2: Verifikasi kolom ada**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'id_card_templates'
  AND column_name LIKE 'custom_field%'
ORDER BY column_name;
```

Expected: 9 baris (show, label, x, y, font_size, casing, color, italic, bold).

---

## Task 2: Update Type Definitions

**Files:**
- Modify: `src/types/idCardTemplate.ts`

**Step 1: Tambah field baru ke `IdCardTemplate` interface**

Di bawah `kelompok_bold: boolean`, tambah:

```typescript
  show_custom_field: boolean
  custom_field_label: string
  custom_field_x_pct: number
  custom_field_y_pct: number
  custom_field_font_size: number
  custom_field_casing: 'original' | 'uppercase' | 'titlecase'
  custom_field_color: string
  custom_field_italic: boolean
  custom_field_bold: boolean
```

**Step 2: Tambah field yang sama ke `TemplatePositions` interface**

Mirror persis field yang sama (tidak termasuk `custom_field_label` — label tidak perlu di positions, cukup di IdCardTemplate).

---

## Task 3: Update composeCard — Render custom field ke canvas

**Files:**
- Modify: `src/lib/idCard/composeCard.client.ts`

**Step 1: Tambah parameter `customFieldValue` ke params**

```typescript
export async function composeCard(params: {
  templateImageUrl: string
  qrPayload: string
  studentName: string
  studentKelompok?: string
  customFieldValue?: string          // <-- tambah ini
  imageWidth: number
  imageHeight: number
  positions: TemplatePositions
}): Promise<string>
```

**Step 2: Destructure parameter baru**

```typescript
const { templateImageUrl, qrPayload, studentName, studentKelompok, customFieldValue, imageWidth, imageHeight, positions } = params
```

**Step 3: Tambah render block custom field setelah render kelompok (sekitar baris 75)**

```typescript
// 5. Draw Custom Field if enabled
if (positions.show_custom_field && customFieldValue && positions.custom_field_x_pct !== undefined) {
  const cfXPx = (positions.custom_field_x_pct / 100) * imageWidth
  const cfYPx = (positions.custom_field_y_pct / 100) * imageHeight
  const cfFontSize = positions.custom_field_font_size || 18

  const cfStyleParts = [
    positions.custom_field_italic ? 'italic' : '',
    positions.custom_field_bold ? 'bold' : '',
    `${cfFontSize}px`,
    'sans-serif',
  ].filter(Boolean)

  ctx.font = cfStyleParts.join(' ')
  ctx.fillStyle = positions.custom_field_color || '#000000'
  const casedCf = applyCasing(customFieldValue, positions.custom_field_casing || 'original')
  ctx.fillText(casedCf, cfXPx, cfYPx)
}
```

---

## Task 4: Update idCardPdfUtils — Pass custom field ke composeCard

**Files:**
- Modify: `src/lib/idCard/idCardPdfUtils.ts`

**Step 1: Update signature `generateIdCardsPdfBlob`**

```typescript
export async function generateIdCardsPdfBlob(
  students: Student[],
  template: IdCardTemplate & { signedUrl?: string },
  onProgress?: (current: number, total: number) => void,
  customFieldValues?: Record<string, string>   // <-- tambah: key=studentId, value=teks
): Promise<Blob>
```

**Step 2: Tambah `customFieldValue` ke `composeCard` call**

```typescript
const dataUrl = await composeCard({
  templateImageUrl,
  qrPayload,
  studentName: student.name,
  studentKelompok: student.kelompok_name,
  customFieldValue: customFieldValues?.[student.id],  // <-- tambah ini
  imageWidth: template.image_width,
  imageHeight: template.image_height,
  positions: {
    // ... existing fields ...
    show_custom_field: template.show_custom_field,
    custom_field_x_pct: template.custom_field_x_pct,
    custom_field_y_pct: template.custom_field_y_pct,
    custom_field_font_size: template.custom_field_font_size,
    custom_field_casing: template.custom_field_casing || 'original',
    custom_field_color: template.custom_field_color,
    custom_field_italic: template.custom_field_italic,
    custom_field_bold: template.custom_field_bold,
  }
})
```

---

## Task 5: Update actions.ts — Tambah default nilai di uploadIdCardTemplate

**Files:**
- Modify: `src/app/(admin)/users/siswa/qr-cards/actions/template/actions.ts`

**Step 1: Tambah default custom_field values ke `templateData` object (dalam `uploadIdCardTemplate`)**

```typescript
const templateData: Omit<IdCardTemplate, 'id' | 'created_at' | 'created_by'> = {
  // ... existing fields ...
  show_custom_field: false,
  custom_field_label: 'Keterangan',
  custom_field_x_pct: 50,
  custom_field_y_pct: 70,
  custom_field_font_size: 18,
  custom_field_casing: 'original',
  custom_field_color: '#000000',
  custom_field_italic: false,
  custom_field_bold: true,
}
```

---

## Task 6: Update TemplateClient — Tambah toggle + drag box custom field

**Files:**
- Modify: `src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx`

Pola: mirror persis dari implementasi `kelompok`. Cari semua blok `kelompok` dan duplikasi untuk `customField`.

**Step 1: Tambah state variables (setelah `kelompokBold` state ~baris 200)**

```typescript
const [showCustomField, setShowCustomField] = useState(false)
const [customFieldLabel, setCustomFieldLabel] = useState('Keterangan')
const [customFieldPos, setCustomFieldPos] = useState<Position>({ x: 50, y: 70 })
const [customFieldFontSize, setCustomFieldFontSize] = useState(18)
const [customFieldCasing, setCustomFieldCasing] = useState<'original' | 'uppercase' | 'titlecase'>('original')
const [customFieldColor, setCustomFieldColor] = useState('#000000')
const [customFieldItalic, setCustomFieldItalic] = useState(false)
const [customFieldBold, setCustomFieldBold] = useState(true)
```

**Step 2: Load state dari template (dalam `useEffect` yang load template, setelah kelompok fields ~baris 260)**

```typescript
setShowCustomField(template.show_custom_field)
setCustomFieldLabel(template.custom_field_label || 'Keterangan')
setCustomFieldPos({ x: Number(template.custom_field_x_pct), y: Number(template.custom_field_y_pct) })
setCustomFieldFontSize(Number(template.custom_field_font_size))
setCustomFieldCasing(template.custom_field_casing || 'original')
setCustomFieldColor(template.custom_field_color)
setCustomFieldItalic(template.custom_field_italic)
setCustomFieldBold(template.custom_field_bold)
```

**Step 3: Tambah ke `positions` object dalam `handleSave` (setelah `kelompok_bold` ~baris 415)**

```typescript
show_custom_field: showCustomField,
custom_field_label: customFieldLabel,
custom_field_x_pct: customFieldPos.x,
custom_field_y_pct: customFieldPos.y,
custom_field_font_size: customFieldFontSize,
custom_field_casing: customFieldCasing,
custom_field_color: customFieldColor,
custom_field_italic: customFieldItalic,
custom_field_bold: customFieldBold,
```

**Step 4: Tambah DraggableBox untuk custom field di preview area**

Cari DraggableBox untuk kelompok di JSX dan tambah satu lagi setelahnya:

```tsx
{showCustomField && (
  <DraggableBox
    id="custom_field"
    x={customFieldPos.x}
    y={customFieldPos.y}
    label={customFieldLabel || 'Keterangan'}
    fontSize={customFieldFontSize}
    containerWidthPx={containerWidthPx}
    imageWidthPx={imageDims.width}
    color={customFieldColor}
    italic={customFieldItalic}
    bold={customFieldBold}
    casing={customFieldCasing}
    showCenterGuide={showCenterGuide}
    onPositionChange={(pos) => setCustomFieldPos(pos)}
  />
)}
```

**Step 5: Handle `onDragEnd` untuk `custom_field` drag ID**

Cari switch/if-else `onDragEnd` yang handle `kelompok` dan tambah case `custom_field`:

```typescript
} else if (active.id === 'custom_field') {
  setCustomFieldPos(prev => clampPos({
    x: prev.x + deltaXPct,
    y: prev.y + deltaYPct,
  }))
}
```

**Step 6: Tambah UI controls (toggle + styling) di panel kanan**

Cari blok UI kelompok (toggle + font size + casing + color + bold + italic) dan tambah blok identik untuk custom field, dengan tambahan input untuk label:

```tsx
{/* Custom Field */}
<div className="space-y-3 border-t pt-3">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium">Field Kustom</span>
    <Checkbox checked={showCustomField} onChange={setShowCustomField} />
  </div>
  {showCustomField && (
    <>
      {/* Label field */}
      <div>
        <label className="text-xs text-gray-500">Label</label>
        <input
          type="text"
          value={customFieldLabel}
          onChange={e => setCustomFieldLabel(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-600"
          placeholder="Keterangan"
        />
      </div>
      {/* Font size, casing, color, bold, italic — mirror dari kelompok */}
    </>
  )}
</div>
```

Untuk font size, casing, color, bold, italic: copy exact dari blok kelompok, ganti `kelompok*` state → `customField*` state.

---

## Task 7: Update QrCardsTab — Kolom input keterangan per siswa

**Files:**
- Modify: `src/app/(admin)/users/siswa/components/QrCardsTab.tsx`

**Step 1: Tambah state `customFieldValues`**

```typescript
const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
```

**Step 2: Compute template aktif**

```typescript
const activeTemplate = useMemo(
  () => templates.find(t => t.id === selectedTemplateId),
  [templates, selectedTemplateId]
)
const showCustomFieldColumn = activeTemplate?.show_custom_field ?? false
const customFieldLabel = activeTemplate?.custom_field_label || 'Keterangan'
```

**Step 3: Tambah kolom ke `columns` array (conditional)**

```typescript
...(showCustomFieldColumn ? [{
  key: 'custom_field',
  label: customFieldLabel,
  sortable: false,
}] : []),
```

**Step 4: Handle render cell `custom_field`**

Dalam `renderCell`:
```typescript
if (column.key === 'custom_field') {
  return (
    <input
      type="text"
      value={customFieldValues[item.id] || ''}
      onChange={e => setCustomFieldValues(prev => ({ ...prev, [item.id]: e.target.value }))}
      className="border rounded px-2 py-1 text-sm w-full dark:bg-gray-800 dark:border-gray-600"
      placeholder={customFieldLabel}
    />
  )
}
```

**Step 5: Pass `customFieldValues` ke `generateIdCardsPdfBlob` di `handleGenerate`**

```typescript
const blob = await generateIdCardsPdfBlob(
  selectedStudentsData,
  template,
  (current, total) => { setProgress({ current, total }) },
  customFieldValues   // <-- tambah ini
)
```

**Step 6: Reset `customFieldValues` saat template berubah**

```typescript
useEffect(() => {
  setCustomFieldValues({})
}, [selectedTemplateId])
```

---

## Task 8: Verifikasi End-to-End

**Step 1: Start dev server**
```bash
npm run dev
```

**Step 2: Buka template editor, aktifkan Field Kustom, atur posisi, simpan**

URL: `http://localhost:3000/users/siswa/qr-cards/template`

**Step 3: Buka tab QR Cards, pilih template dengan custom field**

Verifikasi: kolom "Keterangan" (atau label yang diset) muncul di tabel siswa.

**Step 4: Isi nilai custom per siswa, generate PDF**

Verifikasi: teks custom muncul di posisi yang benar di tiap kartu PDF.

**Step 5: Test dengan template yang `show_custom_field = false`**

Verifikasi: kolom tidak muncul, generate tetap bekerja normal.

---

## Catatan Implementasi

- **Tidak ada perubahan DB untuk data siswa** — field custom hanya di state React.
- **`TemplatePositions` harus include `custom_field_*` fields** (kecuali `custom_field_label`) karena `composeCard` menerima `positions: TemplatePositions`.
- **Label field** (`custom_field_label`) disimpan di `id_card_templates` tapi tidak perlu masuk `TemplatePositions` — cukup baca dari template object langsung di `QrCardsTab`.
- **Pattern `kelompok`** adalah referensi utama untuk semua bagian implementasi ini — jika ragu, cari blok kelompok dan mirror.
