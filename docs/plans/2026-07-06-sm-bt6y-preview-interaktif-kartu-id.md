# sm-bt6y — Preview Interaktif Kartu ID (grid, resize, styling, snap)

**Issue**: sm-bt6y / GH-#121 — ✅ SELESAI (Claude Code Opus, 2026-07-06)
**Follow-up dari**: sm-vckd (base bulk cetak kartu ID QR)
**Eksekusi**: Claude Code langsung (Opus), TDD ketat. User tidur — otonom sampai selesai.

## Konteks

Enhancement UX config template kartu ID (`TemplateClient.tsx`) + pagination tabel siswa (`qr-cards/page.tsx`). 5 item:

1. **Pagination** tabel siswa — default 30, selector 10/30/50/100. Select-all pilih SEMUA `filteredStudents` (lintas halaman, bukan cuma halaman aktif — perilaku existing dipertahankan).
2. **Live grid-count preview** — mini A4 (rasio 21:29.7) dgn kotak-kotak posisi dari `calculateCardGrid()`, update realtime tiap `cardWidthCm` berubah + teks "X kartu/halaman (C×R)".
3. **Resize QR via drag-handle** — handle pojok kanan-bawah kotak QR (Canva/Figma-style), drag = resize (persegi 1:1, magnitude terbesar delta). Slider "Ukuran QR (%)" DIHAPUS.
4. **Text styling nama & kelompok** — warna (`<input type=color>`), italic (Checkbox), bold (Checkbox). Preview live + apply ke canvas PDF.
5. **Snap-guide tengah** — saat drag (onDragMove), kalau center-x kotak masuk radius ±1% dari 50%, tampilkan garis vertikal putus-putus di tengah + snap x ke 50%. Cuma garis vertikal (x=50%), TIDAK horizontal.

## Data Model (SUDAH DIMIGRASI via MCP, 2026-07-06)

```sql
ALTER TABLE id_card_templates
  ADD COLUMN name_color text NOT NULL DEFAULT '#000000',
  ADD COLUMN name_italic boolean NOT NULL DEFAULT false,
  ADD COLUMN name_bold boolean NOT NULL DEFAULT true,
  ADD COLUMN kelompok_color text NOT NULL DEFAULT '#000000',
  ADD COLUMN kelompok_italic boolean NOT NULL DEFAULT false,
  ADD COLUMN kelompok_bold boolean NOT NULL DEFAULT true;
```

## Task

### Task 1 — Types (`src/types/idCardTemplate.ts`)
Tambah 6 field ke `IdCardTemplate` DAN `TemplatePositions`: `name_color`, `name_italic`, `name_bold`, `kelompok_color`, `kelompok_italic`, `kelompok_bold`.

### Task 2 — logic.ts validasi (TDD)
`validateTemplatePositions`: validasi `name_color`/`kelompok_color` format hex (`/^#[0-9a-fA-F]{6}$/`). RED→GREEN. Update `logic.test.ts` (test existing sudah fail karena kolom kelompok — sekalian fix dgn field lengkap).

### Task 3 — actions.ts default
`uploadIdCardTemplate` templateData default: `name_color:'#000000', name_italic:false, name_bold:true, kelompok_color:'#000000', kelompok_italic:false, kelompok_bold:true`.

### Task 4 — composeCard.client.ts (canvas PDF render)
Nama: `ctx.font = \`${bold?'bold':''} ${italic?'italic':''} ${size}px sans-serif\`.trim()`, `ctx.fillStyle = name_color`. Sama untuk kelompok.

### Task 5 — gridLayout util → GridPreview component
File baru `src/lib/idCard/GridPreview.tsx` — mini A4 div (rasio via `aspect-[210/297]`), kotak dari `calculateCardGrid()` di-scale, teks ringkas. Props: `cardWidthCm`, `imageWidth`, `imageHeight`.

### Task 6 — TemplateClient.tsx (bulk perubahan)
- Hapus slider QR, `qrSize` state tetap (dikontrol drag-handle).
- `DraggableBox` QR: tambah resize-handle (nested draggable, id `qr-resize`), `onDragEnd` handle → update qrSize.
- `onDragMove` → deteksi center-x radius → set `showCenterGuide`, snap. Garis vertikal absolute `left-1/2`.
- State + kontrol styling: nameColor/nameItalic/nameBold + kelompok. Kirim di `saveIdCardTemplatePositions`.
- Preview teks apply `style={{color, fontStyle, fontWeight}}`.
- `<GridPreview>` di panel config.

### Task 7 — qr-cards/page.tsx pagination
`currentPage`+`itemsPerPage` state, `InputFilter` selector (10/30/50/100), `Pagination` component, slice, reset page-1 on filter change. Select-all TETAP pilih semua filteredStudents.

## Verifikasi
- `npm run test:run` (logic + gridLayout) pass.
- `npm run type-check` clean.
- Manual: preview live, resize handle, snap garis, styling, pagination, generate PDF.

## CLAUDE.md Check
- Pattern baru: resize-handle dnd-kit, snap-guide — dokumentasikan kalau jadi precedent (opsional).


---

## ✅ Status Eksekusi (2026-07-06)

Semua 7 task selesai, dikerjakan Claude Code langsung (Opus):

- ✅ Task 1 — Types: 6 field styling di `IdCardTemplate` + `TemplatePositions`.
- ✅ Task 2 — logic.ts validasi hex `#RRGGBB` (TDD: 2 RED → GREEN; test di-rewrite pakai `makePositions()` factory, sekaligus fix pre-existing type error TS2345 + assertion salah `name_font_size:0`). 8/8 pass.
- ✅ Task 3 — actions.ts default styling values.
- ✅ Task 4 — composeCard.client.ts + idCardPdfUtils.ts: font italic/bold via `ctx.font`, warna via `ctx.fillStyle`.
- ✅ Task 5 — `GridPreview.tsx` mini-A4 realtime.
- ✅ Task 6 — TemplateClient.tsx: hapus slider QR, resize-handle (nested draggable id `-resize`), snap-guide vertikal (onDragMove deteksi + onDragEnd snap, radius 1.5%), styling controls (color/bold/italic nama+kelompok), GridPreview.
- ✅ Task 7 — qr-cards/page.tsx pagination (default 30, selector 10/30/50/100, `Pagination` component). Select-all TETAP lintas halaman.

**Verifikasi**: `tsc --noEmit` full project clean · `vitest run` idCard+qr-cards 10/10 pass.
**DB**: migration `add_text_styling_id_card_templates` live (6 kolom).
