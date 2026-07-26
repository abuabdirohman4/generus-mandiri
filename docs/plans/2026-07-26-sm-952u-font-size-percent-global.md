# Plan: Font Size Kartu QR jadi Persen Lebar Gambar (global, konsisten)

**Issue:** (isi setelah bd create) · **Date:** 2026-07-26

## Masalah

Font size template kartu (`name_font_size`, `kelompok_font_size`,
`custom_field_font_size`) disimpan sebagai **pixel absolut** dan dirender di
canvas seukuran resolusi gambar asli (`composeCard.client.ts` → `${font_size}px`
pada canvas `imageWidth`).

Akibat: font TIDAK proporsional. Di gambar 500px, 24px = besar (5% lebar). Di
gambar 3000px, 24px = mungil (0.8% lebar). User harus menaikkan font makin besar
untuk file makin besar, dan sering mentok validasi 8–72 → error
"Font size must be between 8 and 72".

## Solusi

Reinterpret ketiga kolom font size sebagai **persen dari lebar gambar** (relatif),
sama seperti posisi (`x_pct`, `qr_size_pct`) yang sudah relatif. Render:
`fontPx = (font_size_pct / 100) × imageWidth`. Hasil: font konsisten di ukuran
file berapapun.

**TANPA migrasi & tanpa kolom baru** — user sudah hapus semua template lama
(mulai 0). Kolom `*_font_size` dipakai ulang, artinya berubah dari px → persen.

### Skala angka baru

| Field | Default lama (px) | Default baru (% lebar) |
|---|---|---|
| name | 24 | 5 |
| kelompok | 18 | 3.5 |
| custom_field | 18 | 3.5 |

Range validasi baru: **0.5–20** (persen). 0.5% = teks super kecil, 20% = sangat
besar. Cukup lebar untuk semua kebutuhan.

## Files terdampak

1. `src/lib/idCard/composeCard.client.ts` — render font pakai `(pct/100)*imageWidth`
2. `src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx` — preview render, default state, label input, step/range
3. `src/app/(admin)/users/siswa/qr-cards/actions/template/logic.ts` — validasi range 0.5–20
4. `src/app/(admin)/users/siswa/qr-cards/actions/template/actions.ts` — default values saat upload (cek apakah ada hardcode 24/18)

---

## Task 1 — composeCard: render font sebagai persen

**File:** `src/lib/idCard/composeCard.client.ts`

Ganti 3 tempat font px jadi persen × imageWidth.

### 1a. Name (sekitar line 54)
```typescript
        const nameFontPx = (positions.name_font_size / 100) * imageWidth
        const nameStyleParts = [
          positions.name_italic ? 'italic' : '',
          positions.name_bold ? 'bold' : '',
          `${nameFontPx}px`,
          'sans-serif',
        ].filter(Boolean)
```

### 1b. Kelompok (sekitar line 68)
```typescript
          const kelFontPct = positions.kelompok_font_size || 3.5
          const kelFontPx = (kelFontPct / 100) * imageWidth

          const kelStyleParts = [
            positions.kelompok_italic ? 'italic' : '',
            positions.kelompok_bold ? 'bold' : '',
            `${kelFontPx}px`,
            'sans-serif',
          ].filter(Boolean)
```

### 1c. Custom field (sekitar line 87)
```typescript
          const cfFontPct = positions.custom_field_font_size || 3.5
          const cfFontPx = (cfFontPct / 100) * imageWidth

          const cfStyleParts = [
            positions.custom_field_italic ? 'italic' : '',
            positions.custom_field_bold ? 'bold' : '',
            `${cfFontPx}px`,
            'sans-serif',
          ].filter(Boolean)
```

Verifikasi: `npm run type-check`.

---

## Task 2 — Validasi range persen (logic.ts)

**File:** `src/app/(admin)/users/siswa/qr-cards/actions/template/logic.ts`

Ganti validasi 8–72 jadi 0.5–20 (persen):
```typescript
  if (name_font_size < 0.5 || name_font_size > 20) {
    throw new Error('Ukuran font harus antara 0.5% dan 20% dari lebar kartu')
  }
```
```typescript
  if (positions.kelompok_font_size && (positions.kelompok_font_size < 0.5 || positions.kelompok_font_size > 20)) {
    throw new Error('Ukuran font Kelompok tidak valid (0.5%–20%)')
  }
```
Cek juga apakah ada validasi `custom_field_font_size` — kalau belum ada, boleh
biarkan (default aman) atau tambah serupa.

Verifikasi: `npm run type-check`.

---

## Task 3 — Preview render (PositionableItem di TemplateClient)

**File:** `src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx` (sekitar line 84)

Font disimpan sbg persen → preview jadi lebih simpel (imageWidth cancel out):
```typescript
    fontSize:
      textStyle && containerWidthPx
        ? `${(textStyle.fontSizePx / 100) * containerWidthPx}px`
        : undefined,
```
> `textStyle.fontSizePx` sekarang berisi **persen** (nama field dibiarkan agar
> diff kecil; nilainya kini persen). Update komentar di atasnya: font size = persen
> lebar kartu, dirender relatif ke lebar container preview. `imageWidth` prop bisa
> dibiarkan (dipakai hal lain) atau dihapus dari perhitungan font ini.

---

## Task 4 — Default state + label input (TemplateClient)

**File:** `src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx`

### 4a. Default state (line ~188, 194, 207)
```typescript
  const [nameFontSize, setNameFontSize] = useState(5)      // persen lebar
  const [kelompokFontSize, setKelompokFontSize] = useState(3.5)
  const [customFieldFontSize, setCustomFieldFontSize] = useState(3.5)
```

### 4b. Label + input step (3 input font, line ~572, ~629, ~694)
Ganti label `Ukuran Font (px)` → `Ukuran Font (% lebar)` dan tambah `step={0.5}`
+ `min={0.5}` `max={20}`:
```tsx
                <Label htmlFor="name-font-size">Ukuran Font (% lebar)</Label>
                <Input
                  id="name-font-size"
                  type="number"
                  step={0.5}
                  min={0.5}
                  max={20}
                  value={nameFontSize}
                  onChange={e => setNameFontSize(Number(e.target.value))}
                />
```
Ulangi untuk kelompok-font-size & custom-field-font-size.

Verifikasi: `npm run type-check`.

---

## Task 5 — Default values saat upload (actions.ts)

**File:** `src/app/(admin)/users/siswa/qr-cards/actions/template/actions.ts`

Cek `templateData` default (upload baru): `name_font_size: 24` → `5`,
`kelompok_font_size: 18` → `3.5`, dan custom field kalau ada. Ganti agar konsisten
dengan default persen.

Verifikasi: `npm run type-check`.

---

## Task 6 — Test

`composeCard` sulit unit-test (butuh canvas/DOM). Minimal:
- `npm run test:run` hijau (tidak ada regresi validasi logic.ts).
- Manual: upload template baru, set font name 5% → preview & PDF konsisten di
  gambar kecil (500px) dan besar (3000px) — teks tampil proporsional sama.

Opsional (kalau mau TDD): extract helper murni `fontPctToPx(pct, imageWidth)`
di logic.ts + test 2 case. Kecil, boleh.

---

## Verifikasi akhir

```bash
npm run type-check   # PASS
npm run test:run     # PASS
```

Manual: 2 template beda resolusi gambar, font size sama (mis. 5%) → hasil PNG/PDF
teks proporsional identik relatif ke kartu.

## Prasyarat (USER)

- [ ] Hapus SEMUA template lama via UI aplikasi (row + storage) SEBELUM deploy —
      supaya tidak ada template dengan `font_size` px lama yang salah dibaca sebagai persen.

## CLAUDE.md Check
- [ ] Pattern baru? — Tidak (reinterpret kolom existing).
- [ ] Tabel DB baru? — Tidak.
- [ ] Route/page baru? — Tidak.
- [ ] Perlu catat konvensi "font_size = persen lebar" di docs? — Opsional, minor. Bisa tambah 1 baris di deskripsi id_card_templates kalau perlu.

## Commit
```
feat(qr-card): font size template jadi persen lebar (global konsisten)

Font size (name/kelompok/custom) kini persen dari lebar gambar, bukan px
absolut. Hasil proporsional & konsisten di semua ukuran file — tidak perlu
lagi menaikkan font saat gambar besar. Range validasi 0.5–20%. Template lama
sudah dihapus (mulai 0), tanpa migrasi.

fixes #XX

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
