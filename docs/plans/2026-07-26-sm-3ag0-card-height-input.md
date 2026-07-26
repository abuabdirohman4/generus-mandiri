# Plan: Input Tinggi Kartu Fisik di Template QR/ID Card

**Issue:** sm-qrh · **Date:** 2026-07-26

## Tujuan

Tambah input **Tinggi Kartu Fisik (cm)** di halaman edit template QR
(`/users/siswa/qr-cards/template`). Saat ini hanya lebar yang bisa diisi;
tinggi dihitung otomatis dari `lebar × (image_height / image_width)` (aspect
ratio terkunci gambar).

**Keputusan user:** tinggi **manual penuh** — user isi lebar & tinggi bebas,
kartu pakai persis angka itu (boleh beda dari rasio gambar). Fallback ke rasio
gambar hanya bila tinggi belum diisi (data lama).

## Ringkasan perubahan

Sekarang `card_height_cm` **tidak disimpan** — diturunkan di 2 tempat:
- `src/lib/idCard/idCardPdfUtils.ts:69` (PDF generation)
- `src/lib/idCard/GridPreview.tsx:22` (preview A4)

Perubahan: simpan `card_height_cm` eksplisit di DB + kirim dari form, dengan
fallback ke rumus rasio bila NULL (data lama). Edit-mode saat ini TIDAK mengirim
width/height sama sekali (`saveIdCardTemplatePositions` hanya positions) — perlu
ditambah agar width & height bisa diubah saat edit.

## Files terdampak

1. Migration SQL — tambah kolom `card_height_cm` (nullable)
2. `src/types/idCardTemplate.ts` — tambah `card_height_cm?: number`
3. `src/app/(admin)/users/siswa/qr-cards/actions/template/actions.ts` — upload + save persist height
4. `src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx` — state + input + kirim
5. `src/lib/idCard/idCardPdfUtils.ts` — pakai height tersimpan, fallback rasio
6. `src/lib/idCard/GridPreview.tsx` — terima prop `cardHeightCm`, fallback rasio
7. `src/lib/idCard/gridLayout.test.ts` — (tetap, sudah pakai cardHeightCm eksplisit)

---

## Task 0 — Migration DB (nullable, aman untuk data lama)

**⚠️ Produksi self-host VM.** User yang eksekusi (Claude tak punya izin SSH DB).

```sql
ALTER TABLE id_card_templates
  ADD COLUMN IF NOT EXISTS card_height_cm numeric;
```

Nullable → data lama NULL, kode fallback ke rumus rasio. Tidak perlu backfill.

Verifikasi:
```sql
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name='id_card_templates' AND column_name='card_height_cm';
```
Expected: 1 baris, `is_nullable=YES`, `data_type=numeric`.

---

## Task 1 — Type: tambah `card_height_cm`

**File:** `src/types/idCardTemplate.ts` (sekitar line 34)

Setelah baris `card_width_cm: number` tambah:
```typescript
  card_width_cm: number
  card_height_cm?: number   // manual; fallback ke rasio gambar bila undefined (data lama)
```

Verifikasi: `npm run type-check` (belum harus pass — masih ada konsumen).

---

## Task 2 — Server action: persist height (upload + edit)

**File:** `src/app/(admin)/users/siswa/qr-cards/actions/template/actions.ts`

### 2a. `uploadIdCardTemplate` (sekitar line 41-55)

Setelah `const cardWidthCm = parseFloat(...)` tambah parse height:
```typescript
    const cardWidthCm = parseFloat(formData.get('cardWidthCm') as string)
    const cardHeightCm = parseFloat(formData.get('cardHeightCm') as string)

    if (!file || !name || !imageWidth || !imageHeight || !cardWidthCm) {
      return { success: false, message: 'Missing required fields' }
    }
```
(cardHeightCm TIDAK dimasukkan ke guard required — opsional; kalau NaN jangan di-set.)

Di object `templateData` setelah `card_width_cm: cardWidthCm,`:
```typescript
      card_width_cm: cardWidthCm,
      ...(Number.isFinite(cardHeightCm) ? { card_height_cm: cardHeightCm } : {}),
```

### 2b. `saveIdCardTemplatePositions` (line 111) — terima width/height opsional

Ubah signature + update:
```typescript
export async function saveIdCardTemplatePositions(
  id: string,
  positions: TemplatePositions,
  name?: string,
  dimensions?: { cardWidthCm?: number; cardHeightCm?: number }
) {
  try {
    const { adminSupabase } = await checkTemplateAdminAccess()

    validateTemplatePositions(positions)

    const data = await updateIdCardTemplatePositions(adminSupabase, id, positions, name)

    // Persist physical card dimensions if provided (edit mode)
    const dimUpdate: Record<string, number> = {}
    if (dimensions?.cardWidthCm && Number.isFinite(dimensions.cardWidthCm)) dimUpdate.card_width_cm = dimensions.cardWidthCm
    if (dimensions?.cardHeightCm && Number.isFinite(dimensions.cardHeightCm)) dimUpdate.card_height_cm = dimensions.cardHeightCm
    if (Object.keys(dimUpdate).length > 0) {
      await adminSupabase.from('id_card_templates').update(dimUpdate).eq('id', id)
    }

    revalidatePath('/users/siswa')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to save positions' }
  }
}
```

> Catatan: menulis dimensi langsung via `adminSupabase` di sini konsisten dgn
> pola action lain di file (upload juga insert langsung). Tidak perlu query
> layer baru untuk 1 update kecil.

Verifikasi: `npm run type-check`.

---

## Task 3 — Form: state + input + kirim (TemplateClient.tsx)

**File:** `src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx`

### 3a. State (sekitar line 178)
Setelah `const [cardWidthCm, setCardWidthCm] = useState('8.5')`:
```typescript
  const [cardWidthCm, setCardWidthCm] = useState('8.5')
  const [cardHeightCm, setCardHeightCm] = useState('')
```
(default kosong = pakai rasio gambar sampai user isi)

### 3b. Load existing (sekitar line 272)
Setelah `setCardWidthCm(String(template.card_width_cm))`:
```typescript
      setCardWidthCm(String(template.card_width_cm))
      if (template.card_height_cm != null) setCardHeightCm(String(template.card_height_cm))
```

### 3c. handleSave — edit mode (sekitar line 452)
Ubah call:
```typescript
        const posRes = await saveIdCardTemplatePositions(templateId, positions, name, {
          cardWidthCm: Number(cardWidthCm) || undefined,
          cardHeightCm: Number(cardHeightCm) || undefined,
        })
```

### 3d. handleSave — create mode (sekitar line 461)
Setelah `formData.append('cardWidthCm', cardWidthCm)`:
```typescript
        formData.append('cardWidthCm', cardWidthCm)
        if (cardHeightCm) formData.append('cardHeightCm', cardHeightCm)
```

### 3e. Input UI (sekitar line 508-520)
Ubah grid: input lebar sekarang berbagi kolom dengan QR size. Tambah input
tinggi. Ganti blok `<div>` lebar + QR jadi 3 kolom, ATAU sisipkan tinggi setelah
lebar. Rekomendasi: buat baris tinggi+lebar berdampingan, QR turun sendiri.

Ganti blok input lebar (line ~510-521) menjadi:
```tsx
          <div>
            <Label htmlFor="card-width-cm">Lebar Kartu Fisik (cm)</Label>
            <Input
              id="card-width-cm"
              type="number"
              step={0.1}
              value={cardWidthCm}
              onChange={e => setCardWidthCm(e.target.value)}
              placeholder="8.5"
            />
          </div>
          <div>
            <Label htmlFor="card-height-cm">Tinggi Kartu Fisik (cm)</Label>
            <Input
              id="card-height-cm"
              type="number"
              step={0.1}
              value={cardHeightCm}
              onChange={e => setCardHeightCm(e.target.value)}
              placeholder="Otomatis dari rasio gambar"
            />
          </div>
```
(QR size input tetap di grid yang sama — grid `md:grid-cols-2` akan wrap jadi
2×2. Boleh biarkan atau naikkan ke `md:grid-cols-2` tetap, wrap otomatis.)

### 3f. GridPreview call (sekitar line 534)
```tsx
          <GridPreview
            cardWidthCm={Number(cardWidthCm)}
            cardHeightCm={Number(cardHeightCm) || undefined}
            imageWidth={imageDims.width}
            imageHeight={imageDims.height}
          />
```

Verifikasi: `npm run type-check`.

---

## Task 4 — GridPreview: terima height eksplisit, fallback rasio

**File:** `src/lib/idCard/GridPreview.tsx`

Tambah prop `cardHeightCm?: number` ke interface (line ~7). Di useMemo (line ~22)
ganti:
```typescript
    const cardHeightCm = cardWidthCm * (imageHeight / imageWidth)
```
menjadi:
```typescript
    const resolvedHeightCm =
      cardHeightCm && cardHeightCm > 0
        ? cardHeightCm
        : cardWidthCm * (imageHeight / imageWidth)
```
lalu ganti semua pemakaian `cardHeightCm` di dalam useMemo (mis. yg diteruskan
ke `calculateCardGrid`) memakai `resolvedHeightCm`. Update dependency array
`[cardWidthCm, cardHeightCm, imageWidth, imageHeight]`.

Jangan sampai shadowing: rename var lokal jadi `resolvedHeightCm` supaya tak
bentrok dgn prop `cardHeightCm`.

Verifikasi: `npm run type-check`.

---

## Task 5 — PDF: pakai height tersimpan, fallback rasio

**File:** `src/lib/idCard/idCardPdfUtils.ts` (line 69)

Ganti:
```typescript
  const cardHeightCm = template.card_width_cm * (template.image_height / template.image_width)
```
menjadi:
```typescript
  const cardHeightCm =
    template.card_height_cm && template.card_height_cm > 0
      ? template.card_height_cm
      : template.card_width_cm * (template.image_height / template.image_width)
```

Verifikasi: `npm run type-check` (harus PASS sekarang, semua konsumen update).

---

## Task 6 — Test regression (TDD)

`src/lib/idCard/gridLayout.test.ts` sudah pakai `cardHeightCm` eksplisit — tak
berubah. Tambah 1 test untuk GridPreview fallback logic bila mudah diisolasi
(useMemo internal → skip kalau butuh render; grid math sudah tercakup gridLayout
test). **Minimal:** pastikan `npm run test:run` hijau setelah perubahan.

Opsional (kalau ada waktu): unit test kecil fungsi resolusi height —
extract `resolveCardHeightCm(width, height, imgW, imgH)` ke helper murni dan test
2 case (manual set vs fallback rasio). Hanya bila mau; else inline fallback cukup.

---

## Verifikasi akhir

```bash
npm run type-check   # PASS
npm run test:run     # PASS
```

Manual: buka template lama (card_height_cm NULL) → preview & PDF tetap pakai
rasio (tidak berubah). Isi tinggi manual → preview A4 & PDF pakai angka itu.

## CLAUDE.md Check
- [ ] Pattern/arsitektur BARU? — Tidak (extend field existing).
- [ ] Tabel DB baru? — Tidak, hanya kolom `card_height_cm` di `id_card_templates`. Update deskripsi `id_card_templates` di CLAUDE.md Key Tables bila perlu (opsional, minor).
- [ ] Route/page baru? — Tidak.
- [ ] Permission pattern baru? — Tidak.

## Commit (user eksekusi)
```
feat(qr-card): tambah input tinggi kartu fisik di template

Tinggi kartu kini bisa diisi manual (sebelumnya terkunci rasio gambar).
Fallback ke rasio gambar untuk template lama (card_height_cm NULL).

fixes #XX

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
