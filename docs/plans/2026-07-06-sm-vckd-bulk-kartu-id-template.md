# Plan — sm-vckd — Bulk Cetak Kartu ID QR dari Template

**Issue:** sm-vckd · feat: bulk cetak kartu ID QR dari template
**Type:** feature (P3) · **GH:** #120
**Date:** 2026-07-06
**Depends on:** sm-q7x (butuh `buildStudentQrPayload` dari `src/lib/qr/qrPayload.ts`)

---

## 1. Context

Bagian dari fitur QR Code Attendance, dipisah dari sm-q7x (QR generate+scan inti). Admin ingin upload 1 desain/template kartu, lalu sistem auto-generate kartu ID tiap siswa (QR + identitas tercetak di atas template itu) untuk print massal — bukan cuma download 1-1.

**Keputusan terkonfirmasi user**: MVP = form koordinat manual + live preview (BUKAN drag-and-drop WYSIWYG). Referensi (`Afiyatna/presensi-mudamudi3`) tidak punya fitur template custom — bagian ini didesain baru untuk app ini.

## 2. Reuse / Context

- **QR payload**: reuse `buildStudentQrPayload(studentId)` dari sm-q7x (`src/lib/qr/qrPayload.ts`) — JANGAN duplikasi format payload.
- **PDF assembly**: reuse `@react-pdf/renderer` (v4, SUDAH terpasang & dipakai `src/app/(admin)/rapot/components/PDFReportDocument.tsx` + `pdfUtils.ts`) — BUKAN `jsPDF`. Ikuti pola trigger-download yang sudah ada di rapot.
- **Storage**: TIDAK ADA Supabase Storage usage di project ini saat ini (grep konfirmasi 0 hit) — bucket baru, bukan pola existing untuk ditiru.
- **3-layer architecture**: queries.ts (Layer 1) / logic.ts (Layer 2) / actions.ts (Layer 3, `'use server'`) — ikuti `architecture-patterns.md`.
- **Student list/filter**: reuse komponen existing di `src/app/(admin)/users/siswa/` (StudentsTable, DataFilter) untuk selection — jangan bikin list baru dari nol.

## 3. Dependency Baru
- `qrcode` (plain, non-React) — generate QR via `toCanvas`/`toDataURL` di luar JSX (beda dari `qrcode.react` yang dipakai sm-q7x untuk komponen React).
- Tidak perlu `html2canvas` — compose pakai raw canvas `drawImage`/`fillText`.

## 4. Data Model (satu-satunya tabel baru di seluruh fitur QR)

```sql
create table id_card_templates (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  image_path text not null,           -- path di Supabase Storage bucket 'id-card-templates'
  qr_x integer not null,
  qr_y integer not null,
  qr_size integer not null,
  name_x integer not null,
  name_y integer not null,
  name_font_size integer not null default 24,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table id_card_templates enable row level security;
-- RLS: admin/superadmin only (CRUD)
```

Storage bucket `id-card-templates`: upload admin/superadmin only, read via signed URL atau public (tentukan saat implementasi — signed URL lebih aman kalau template tidak untuk publik).

## 5. Tasks

### Task 1 — Migration
- `apply_migration` via MCP: buat tabel `id_card_templates` + RLS policy (admin/superadmin CRUD, lainnya tidak ada akses).
- Buat Storage bucket `id-card-templates` + storage policy (upload: admin/superadmin; read: signed URL).

### Task 2 — Template CRUD (3-layer)
Folder: `src/app/(admin)/users/siswa/qr-cards/actions/template/`.
- **queries.ts**: `fetchIdCardTemplates(supabase)`, `insertIdCardTemplate(supabase, data)`, `updateIdCardTemplatePositions(supabase, id, positions)`, `deleteIdCardTemplate(supabase, id)`.
- **logic.ts** (TDD): `validateTemplatePositions({qr_x,qr_y,qr_size,name_x,name_y,name_font_size})` — reject negative/out-of-bound values (butuh tahu dimensi image, atau minimal reject negative).
- **actions.ts**: `uploadIdCardTemplate(formData)` (upload ke storage + insert row), `getIdCardTemplate(id)`, `saveIdCardTemplatePositions(id, positions)`. Guard: admin/superadmin only (`isSuperAdmin`/`isAdmin` dari `@/lib/userUtils` atau `accessControlServer`).

### Task 3 — Config UI (upload + posisi + live preview)
- New page `src/app/(admin)/users/siswa/qr-cards/template/page.tsx` — form upload gambar background, input numerik tiap field posisi (qr_x, qr_y, qr_size, name_x, name_y, name_font_size).
- Live preview: `<canvas>` yang re-render tiap kali input berubah — draw template image + placeholder QR (kotak abu-abu atau QR dummy) + sample nama "Contoh Nama" di posisi yang diinput. Real-time feedback sebelum save.
- Gate: admin/superadmin only (redirect/hide kalau bukan).

### Task 4 — Compose util (pure canvas, TDD di bagian yang bisa)
- `src/lib/idCard/composeCard.ts`:
  ```ts
  async function composeCard(params: {
    templateImageUrl: string
    qrPayload: string
    studentName: string
    positions: { qr_x, qr_y, qr_size, name_x, name_y, name_font_size }
  }): Promise<string> // returns dataURL PNG
  ```
  Load template via `Image()`, `drawImage` ke canvas offscreen, generate QR via `qrcode`'s `toCanvas` (bukan `qrcode.react`, ini di luar JSX), `drawImage` QR ke posisi, `ctx.fillText(studentName, name_x, name_y)`. Return `canvas.toDataURL('image/png')`.
- Layer 2 murni kalau logic posisi/validasi dipisah dari DOM/canvas calls — canvas API butuh browser env, jadi fungsi ini client-only (`.client.ts` suffix), tidak unit-test-able tanpa DOM mock. Manual QA cukup untuk bagian ini (dicatat di CLAUDE.md TDD skip-list: "UI presentasional murni" — canvas compose termasuk kategori ini).

### Task 5 — Student selection + bulk generate
- New page `src/app/(admin)/users/siswa/qr-cards/page.tsx` — reuse `StudentsTable`/filter existing dengan tambahan checkbox multi-select. Tombol "Generate Kartu" (disabled kalau template belum dipilih atau 0 siswa terpilih).
- Pilih template (dropdown dari `fetchIdCardTemplates`), pilih siswa (checkbox), klik generate.

### Task 6 — Bulk PDF export (reuse @react-pdf/renderer)
- `src/lib/idCard/IdCardDocument.tsx` — `<Document>` React component: loop siswa terpilih, tiap siswa → `composeCard()` (async, tunggu semua selesai) → satu `<Page>` berisi `<Image src={dataURL} />` sized sesuai aspect ratio template.
- Ikuti pola trigger-download existing di `rapot/components/pdfUtils.ts` (`pdf().toBlob()` atau `PDFDownloadLink`).
- Progress indicator saat compose banyak siswa (bisa makan waktu kalau puluhan/ratusan siswa — loop async, tampilkan "X/Y kartu diproses").

## 6. Verifikasi
- Upload template test (gambar apapun), isi koordinat, cek live preview render benar (QR placeholder + nama contoh di posisi yang diinput).
- Pilih 3-5 siswa test, generate → cek PDF hasil: tiap halaman ada QR di posisi benar, nama tidak overlap dengan elemen lain.
- Scan salah satu QR dari hasil PDF (print atau screenshot) pakai fitur scan sm-q7x → harus match siswa yang benar (`GM-STUDENT:<uuid>` yang sesuai).
- Permission: user bukan admin/superadmin → halaman template config tidak bisa diakses.
- `npm run test:run` (logic Task 2 & validasi posisi) + `npm run type-check`.

## 7. Commit
```
feat(users/siswa): bulk cetak kartu ID QR dari template custom

Admin upload template kartu + set posisi QR/nama via form+live preview,
sistem generate kartu tiap siswa terpilih jadi 1 PDF multi-halaman siap
print. Reuse @react-pdf/renderer (rapot) + qrPayload dari sm-q7x.

fixes #120

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

## CLAUDE.md Check
- [ ] Tabel baru `id_card_templates` → tambah ke Key Tables di CLAUDE.md.
- [ ] Route baru `/users/siswa/qr-cards`, `/users/siswa/qr-cards/template` → tambah ke App Router Structure + 3 tempat navigasi (Sidebar, QuickActions, getPageTitle) kalau memang perlu entry menu (atau akses via link dari halaman siswa saja — putuskan saat implementasi).
- [ ] Supabase Storage bucket baru — dokumentasikan di `docs/claude/database-operations.md` (pola pertama kali storage dipakai di project ini).
- [ ] Dependency baru `qrcode` — tambah ke Key Technologies.
