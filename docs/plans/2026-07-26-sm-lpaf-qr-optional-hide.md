# Plan: QR Code Opsional di Template Kartu

**Issue:** (isi setelah bd create) · **Date:** 2026-07-26

## Tujuan

QR code di template kartu kini WAJIB tampil. Tambah flag `show_qr` agar bisa
dimatikan — untuk kebutuhan kartu ID tanpa QR.

**Default:** `show_qr = true` (perilaku existing tak berubah). User bisa uncheck
untuk sembunyikan QR.

## Pola

Tiru `show_kelompok` / `show_custom_field` yang sudah ada: flag boolean di 2
interface + toggle Checkbox + conditional render (composeCard, preview,
DraggableBox).

## Files terdampak

1. `src/types/idCardTemplate.ts` — `show_qr: boolean` di `IdCardTemplate` + `TemplatePositions`
2. `src/app/(admin)/users/siswa/qr-cards/actions/template/actions.ts` — default `show_qr: true` saat upload
3. `src/lib/idCard/composeCard.client.ts` — skip gambar QR kalau `!show_qr`
4. `src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx` — state `showQr`, toggle Checkbox, load existing, kirim di positions, conditional DraggableBox QR
5. `src/lib/idCard/idCardPdfUtils.ts` — teruskan `show_qr` ke positions (cek apakah eksplisit list field atau spread)
6. Migration: kolom `show_qr boolean DEFAULT true`

---

## Task 0 — Migration DB (USER eksekusi, prod + local)

```sql
ALTER TABLE id_card_templates
  ADD COLUMN IF NOT EXISTS show_qr boolean NOT NULL DEFAULT true;
```
Setelah itu reload PostgREST schema cache (prod):
```sql
NOTIFY pgrst, 'reload schema';
```
Default true → template existing tetap tampil QR. Aman.

---

## Task 1 — Type

**File:** `src/types/idCardTemplate.ts`

Tambah `show_qr: boolean` di KEDUA interface (`IdCardTemplate` sekitar line 14 area,
`TemplatePositions` sekitar line 48 area). Letakkan dekat `qr_size_pct` atau
sebelum `show_kelompok` agar konsisten.

```typescript
  qr_size_pct: number
  show_qr: boolean
```
(di IdCardTemplate dan TemplatePositions)

Verifikasi: `npm run type-check` (belum harus pass).

---

## Task 2 — Default upload (actions.ts)

**File:** `.../actions/template/actions.ts` — `templateData` object.

Tambah dekat `qr_size_pct: 20,`:
```typescript
      qr_size_pct: 20,
      show_qr: true,
```

---

## Task 3 — composeCard: skip QR kalau off

**File:** `src/lib/idCard/composeCard.client.ts`

Bungkus blok "2. Generate and draw QR code" dengan guard. Cek default true bila
undefined (data lama tanpa kolom — walau migration default true, defensive):
```typescript
        // 2. Generate and draw QR code (skippable via show_qr)
        if (positions.show_qr !== false) {
          const qrSizePx = (positions.qr_size_pct / 100) * imageWidth
          // ... existing QR block ...
          ctx.drawImage(qrCanvas, qrXPx, qrYPx, qrSizePx, qrSizePx)
        }
```

Verifikasi: `npm run type-check`.

---

## Task 4 — idCardPdfUtils: teruskan show_qr

**File:** `src/lib/idCard/idCardPdfUtils.ts`

Blok `positions: { ... }` yang di-pass ke composeCard MENYALIN field satu-satu
(bukan spread). Tambah:
```typescript
        qr_size_pct: template.qr_size_pct,
        show_qr: template.show_qr,
```

Verifikasi: `npm run type-check`.

---

## Task 5 — TemplateClient: toggle + conditional

**File:** `.../template/TemplateClient.tsx`

### 5a. State (dekat qrSize state)
```typescript
  const [showQr, setShowQr] = useState(true)
```

### 5b. Load existing (dekat `setQrSize(...)`, line ~273)
```typescript
      setQrSize(Number(template.qr_size_pct))
      setShowQr(template.show_qr !== false)
```

### 5c. Kirim di positions object (line ~428)
```typescript
        qr_size_pct: qrSize,
        show_qr: showQr,
```

### 5d. Toggle Checkbox — letakkan dekat input "Ukuran QR (%)" (line ~536).
Bungkus/tambah sebelum atau sesudah field ukuran QR:
```tsx
          <div className="flex items-end">
            <Checkbox
              id="show-qr"
              label="Tampilkan QR Code"
              checked={showQr}
              onChange={setShowQr}
            />
          </div>
```
> Cek import `Checkbox` sudah ada (dipakai kelompok bold/italic). Kalau input QR
> size perlu disembunyikan saat QR off, bungkus input `qr-size` dengan `{showQr && (...)}`.
> Minimal: biarkan input size tetap tampil (tak masalah kalau QR off).

### 5e. Conditional DraggableBox QR di preview (line ~862)
Bungkus `<DraggableBox id="qr-box" ...>` dengan `{showQr && (...)}`:
```tsx
              {showQr && (
                <DraggableBox id="qr-box" position={qrPos} sizePct={qrSize} onResize={handleQrResize} disabled={isPreviewMode}>
                  ...
                </DraggableBox>
              )}
```

Verifikasi: `npm run type-check`.

---

## Task 6 — Test

`composeCard` DOM-heavy → skip unit. Minimal `npm run test:run` hijau (logic.ts
test tak terpengaruh — cek validateTemplatePositions tidak wajibkan show_qr).
Cek `logic.test.ts` fixture `makePositions` — tambah `show_qr: true` kalau TS
strict butuh (TemplatePositions kini punya field baru wajib).

Manual: template QR-off → PDF & preview tanpa QR. Template QR-on → normal.

---

## Verifikasi akhir
```bash
npm run type-check   # PASS
npm run test:run     # PASS
```

## Prasyarat (USER)
- [ ] Jalankan migration Task 0 (prod + local) + reload schema SEBELUM deploy.

## CLAUDE.md Check
- [ ] Pattern baru? Tidak (tiru show_kelompok).
- [ ] Kolom DB baru? Ya — `show_qr` di `id_card_templates` (minor, boolean flag).
- [ ] Route/permission baru? Tidak.

## Commit
```
feat(qr-card): QR code opsional di template kartu

Tambah flag show_qr (default true) — QR bisa disembunyikan untuk kartu ID
tanpa QR. Tiru pola show_kelompok/show_custom_field.

fixes #XX

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
