# Plan — sm-vckd — Bulk Cetak Kartu ID QR dari Template

**Issue:** sm-vckd · feat: bulk cetak kartu ID QR dari template
**Type:** feature (P3) · **GH:** #120
**Date:** 2026-07-06 (revisi drag-preview)
**Depends on:** sm-q7x (`buildStudentQrPayload` dari `src/lib/qr/qrPayload.ts`, sudah selesai)

---

## 1. Context

Bagian dari fitur QR Code Attendance, dipisah dari sm-q7x (QR generate+scan inti, sudah kelar). Admin upload 1 desain kartu (background polos, tanpa QR/nama), lalu sistem auto-generate kartu ID tiap siswa (QR unik + nama tercetak di atas template) untuk print massal jadi 1 PDF — bukan cuma download 1-1 seperti sm-q7x.

**Revisi keputusan (2026-07-06):** Plan awal pakai form koordinat manual (ketik angka qr_x/qr_y dst). User usul pakai Sejda PDF editor eksternal untuk set posisi — ditolak karena Sejda tidak bisa loop-generate QR unik per siswa (placeholder statis, sistem tetap harus compose ulang). Insight yang diambil: **hindari ketik koordinat manual**. Keputusan final: **drag-and-drop langsung di preview in-app** (dnd-kit, sudah terinstall `@dnd-kit/core`/`@dnd-kit/modifiers` tapi 0 usage runtime di codebase — ini jadi pemakaian pertama). Admin geser kotak "QR" dan kotak "Nama" di atas gambar template, posisi (x/y dalam % dari dimensi gambar, bukan px absolut — supaya scale-independent) tersimpan otomatis.

**Akses:** tombol "Cetak Kartu QR" di halaman `/users/siswa` existing (toolbar, dekat tombol "Tambah"/"Batch"/"Assign"). TIDAK ada entry baru di Sidebar/QuickActions/getPageTitle.

## 2. Reuse / Context (terverifikasi via Explore 2026-07-06)

- **QR payload**: `buildStudentQrPayload(studentId): string` → `GM-STUDENT:<id>`, dari `src/lib/qr/qrPayload.ts`. JANGAN duplikasi format.
- **PDF assembly**: `@react-pdf/renderer` v4 (`^4.3.1`, sudah terpasang). Pola trigger download di `src/app/(admin)/rapot/components/pdfUtils.ts`:
  - `pdf(doc).toBlob()` (BUKAN `PDFDownloadLink`) → `URL.createObjectURL` → `<a download>` click → `revokeObjectURL`. Lihat `downloadStudentPDF` (pdfUtils.ts:35-52).
  - Pola bulk-merge: `PDFBulkReportDocument` di `PDFReportDocument.tsx:531-546` — satu `<Document>`, `students.map(...)` jadi banyak `<Page>`. Progress callback: `downloadBulkPDFs(...)` pola `onProgress?(current, total)` (pdfUtils.ts:76-102) — tiru untuk progress "X/Y kartu diproses".
  - `<Image src={dataURL}>` pattern: `PDFReportDocument.tsx:254-257`.
- **Toolbar tombol**: `src/app/(admin)/users/siswa/page.tsx:293-360` — blok tombol kanan header. Pakai `Button` dari `@/components/ui/button/Button` (`variant="outline"` cocok, konsisten dengan tombol "Batch" existing).
- **Row selection checkbox: BELUM ADA — harus dibangun baru.** `StudentsTable.tsx` (props line 19-45) dan shared `DataTable` (`src/components/table/Table.tsx`, props line 23-71) TIDAK punya `rowSelection`/`selectedIds`. Opsi: tambah state selection lokal di halaman baru `qr-cards/page.tsx` (checkbox custom di kolom pertama, reuse `StudentsTable` HANYA untuk styling/filter row, atau render list sendiri dari data yang sama) — **JANGAN modifikasi `DataTable` generic** (dipakai banyak halaman lain, resiko regresi). Pendekatan termudah: halaman baru punya tabel siswa sendiri (query sama dengan siswa/actions, minimal kolom: checkbox, nama, NIS, kelompok/kelas) dengan checkbox state lokal — bukan reuse `StudentsTable` component langsung.
- **Student type**: field row-list ada di `src/hooks/useStudents.ts` (bukan langsung `src/types/student.ts` — StudentsTable import `Student` dari situ). Field relevan kartu: `id` (untuk QR payload), `name`, `nomor_induk` (NIS), `kelompok_name`, `class_name`/`classes`. **Verifikasi field exact ada di `useStudents.ts` sebelum implementasi** (Explore menandai ada beberapa varian tipe `Student` di modul siswa — kolom biodata seperti `nomor_induk` bisa jadi cuma ada di `StudentBiodata`, bukan di row list).
- **Storage**: 0 usage Supabase Storage di project (grep konfirmasi). Bucket `id-card-templates` baru dari nol — dokumentasikan pola pertama kali di `docs/claude/database-operations.md` setelah implementasi.
- **dnd-kit**: `@dnd-kit/core ^6.3.1`, `@dnd-kit/modifiers ^9.0.0` sudah di package.json, 0 pemakaian runtime. Bebas tentukan pola sendiri — pakai `DndContext` + `useDraggable` (2 draggable: kotak QR, kotak nama) dalam 1 area preview `position: relative`, `useDraggable` delta di-translate ke persentase posisi terhadap container.
- **3-layer architecture**: queries.ts (Layer 1) → logic.ts (Layer 2, TDD) → actions.ts (Layer 3, `'use server'`).

## 3. Dependency Baru
- `qrcode` (plain, non-React) — generate QR via `toCanvas`/`toDataURL` di luar JSX, untuk compose ke canvas offscreen.
- `@dnd-kit/core` — SUDAH terinstall, tinggal dipakai (pemakaian pertama di codebase).
- Tidak perlu `html2canvas` — compose pakai raw canvas `drawImage`/`fillText`.

## 4. Data Model

```sql
create table id_card_templates (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  image_path text not null,           -- path di Supabase Storage bucket 'id-card-templates'
  image_width integer not null,       -- dimensi asli gambar (px), untuk konversi % <-> px saat compose
  image_height integer not null,
  qr_x_pct numeric not null,          -- posisi QR, persen dari image_width (0-100)
  qr_y_pct numeric not null,          -- persen dari image_height
  qr_size_pct numeric not null,       -- ukuran QR, persen dari image_width (sisi persegi)
  name_x_pct numeric not null,
  name_y_pct numeric not null,
  name_font_size integer not null default 24,  -- px absolut (font size tidak perlu scale-relative)
  card_width_cm numeric not null default 8.5,  -- lebar kartu fisik saat print (cm); tinggi = card_width_cm * (image_height/image_width). Dipakai hitung grid per halaman A4 (Task 6).
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table id_card_templates enable row level security;
-- RLS: admin/superadmin CRUD only, lainnya tidak ada akses
```

**Kenapa persen (bukan px absolut seperti plan lama):** drag di preview terjadi pada gambar yang mungkin di-render lebih kecil dari ukuran asli (mis. preview 400px lebar, asli 1000px). Simpan sebagai persentase → saat compose asli (Task 4) tinggal `x_pct/100 * image_width_asli`, tidak peduli ukuran preview saat drag.

**Kenapa `card_width_cm` (keputusan user 2026-07-06):** ukuran kartu fisik BEDA-BEDA tergantung template (ada yang besar/muat 4 per A4, ada yang kecil/muat 8+). TIDAK fixed grid count — admin isi 1 angka lebar kartu dalam cm saat upload, tinggi kartu otomatis dari aspect ratio gambar asli (`card_height_cm = card_width_cm * image_height/image_width`). Sistem hitung sendiri berapa kolom/baris muat di halaman A4 (lihat Task 6).

Storage bucket `id-card-templates`: upload admin/superadmin only, read via **signed URL** (template tidak untuk publik).

## 5. Tasks

### Task 1 — Migration ✅ SELESAI (dikerjakan Claude Code langsung via MCP, 2026-07-06 — bukan Antigravity, MCP Supabase tidak diakses dari sana)
- ✅ `apply_migration` via MCP: tabel `id_card_templates` (schema di atas) + RLS policy `id_card_templates_admin_all` (`get_user_role() in ('superadmin','admin')`, pola konsisten dengan `profiles`/`app_settings`).
- ✅ Storage bucket `id-card-templates` dibuat (`public=false`) + RLS policy `id_card_templates_bucket_admin_all` di `storage.objects` (upload/read admin & superadmin only via `get_user_role()`).
- ✅ Verifikasi: `list_tables` + `get_advisors security` — tidak ada warning baru dari tabel/bucket ini. Advisory existing (`teacher_classes` dll RLS disabled) sudah tercatat terpisah, bukan bagian task ini.
- **Antigravity: SKIP Task 1, mulai langsung dari Task 2.**

### Task 2 — Template CRUD (3-layer)
Folder: `src/app/(admin)/users/siswa/qr-cards/actions/template/`.
- **queries.ts**: `fetchIdCardTemplates(supabase)`, `insertIdCardTemplate(supabase, data)`, `updateIdCardTemplatePositions(supabase, id, positions)`, `deleteIdCardTemplate(supabase, id)`, `uploadTemplateImage(supabase, file)` (storage upload, return path).
- **logic.ts** (TDD): `validateTemplatePositions({qr_x_pct, qr_y_pct, qr_size_pct, name_x_pct, name_y_pct, name_font_size})` — reject: nilai < 0 atau > 100 (pct fields), qr_x_pct + qr_size_pct > 100 (QR keluar batas kanan), qr_y_pct + qr_size_pct > 100 (keluar batas bawah), name_font_size <= 0. Test: tiap kondisi reject + 1 kasus valid pass.
- **actions.ts**: `uploadIdCardTemplate(formData)` (upload gambar + insert row + get image dimensions), `getIdCardTemplate(id)` (return signed URL + positions), `saveIdCardTemplatePositions(id, positions)` (panggil `validateTemplatePositions` dulu, reject kalau invalid), `deleteIdCardTemplateAction(id)`. Guard: admin/superadmin only (`isSuperAdmin`/`isAdmin` dari `@/lib/userUtils` client-side check + re-check server-side via `accessControlServer`).

### Task 3 — Config UI (upload + drag posisi + live preview)
- New page `src/app/(admin)/users/siswa/qr-cards/template/page.tsx`.
- Upload form: input file gambar → preview area menampilkan gambar (constrained max-width, aspect-ratio dipertahankan). Tambah 1 input numerik "Lebar kartu (cm)" (default 8.5, standar ID card) — dipakai hitung grid PDF di Task 6.
- **Drag QR + Nama box**: 2 elemen draggable (`useDraggable` dari `@dnd-kit/core`) overlay di atas `<img>` template dalam `DndContext`, container `position: relative`. Kotak "QR" (persegi, placeholder abu-abu/QR dummy via `qrcode` generate sekali) dan kotak "Nama" (placeholder teks "Contoh Nama"). `onDragEnd`: hitung delta posisi (px) → konversi ke pct berdasar dimensi container preview saat itu → update state posisi.
- Live preview render ulang tiap posisi berubah (React state, tidak perlu `<canvas>` re-render manual — cukup CSS `position:absolute; left:{x_pct}%; top:{y_pct}%`).
- Tombol "Simpan Posisi" → panggil `saveTemplatePositions`.
- Gate: admin/superadmin only (redirect kalau bukan, pola existing di halaman admin-only lain).

### Task 4 — Compose util (client-only canvas, skip unit test — canvas butuh DOM)
- `src/lib/idCard/composeCard.client.ts`:
  ```ts
  async function composeCard(params: {
    templateImageUrl: string   // signed URL
    qrPayload: string
    studentName: string
    imageWidth: number
    imageHeight: number
    positions: { qr_x_pct, qr_y_pct, qr_size_pct, name_x_pct, name_y_pct, name_font_size }
  }): Promise<string>  // dataURL PNG, ukuran = imageWidth x imageHeight asli
  ```
  Load template via `new Image()`, `drawImage` full-size ke canvas offscreen (`imageWidth x imageHeight`), convert pct→px pakai `imageWidth`/`imageHeight`, generate QR via `qrcode`'s `toCanvas` lalu `drawImage` ke posisi terhitung, `ctx.fillText(studentName, ...)`. Return `canvas.toDataURL('image/png')`.
- Client-only (`.client.ts` suffix, canvas API butuh browser). Manual QA cukup (CLAUDE.md TDD skip-list: "UI presentasional murni").

### Task 5 — Student selection + bulk generate
- New page `src/app/(admin)/users/siswa/qr-cards/page.tsx`.
- Tabel siswa sendiri (bukan reuse `StudentsTable` langsung — lihat §2 alasan row-selection): kolom checkbox + nama + NIS + kelompok/kelas, reuse `DataFilter` existing untuk filter kelompok/kelas/status. State: `Set<string>` selected student IDs, checkbox "select all" di header.
- Dropdown pilih template (dari `fetchIdCardTemplates`).
- Tombol "Generate Kartu" — disabled kalau template belum dipilih ATAU 0 siswa terpilih.

### Task 6 — Bulk PDF export, grid otomatis per halaman A4 (reuse @react-pdf/renderer, pola pdfUtils.ts)
- **Layer 2 (logic, TDD)** `src/lib/idCard/gridLayout.ts`:
  ```ts
  function calculateCardGrid(params: {
    cardWidthCm: number
    cardHeightCm: number       // = cardWidthCm * image_height/image_width
    pageWidthCm?: number       // default 21 (A4 portrait)
    pageHeightCm?: number      // default 29.7
    marginCm?: number          // default 1
    gapCm?: number             // default 0.3, jarak antar kartu
  }): {
    cols: number
    rows: number
    cardsPerPage: number
    positions: Array<{ xCm: number; yCm: number }>  // posisi kiri-atas tiap slot kartu dalam 1 halaman
  }
  ```
  Hitung `cols = floor((pageWidthCm - 2*marginCm + gapCm) / (cardWidthCm + gapCm))`, sama untuk `rows` pakai `pageHeightCm`. Test: berbagai `cardWidthCm` (kartu besar → grid kecil mis. 2x2, kartu kecil → grid besar mis. 3x4), test kartu lebih besar dari halaman → `cols=1,rows=1` (tidak negative/crash), test gap dihitung benar.
- `src/lib/idCard/IdCardDocument.tsx` — `<Document>`: loop siswa terpilih per-chunk sesuai `cardsPerPage` dari `calculateCardGrid` — tiap chunk siswa jadi 1 `<Page size="A4">` berisi multiple `<View style={{position:'absolute', left, top, width, height}}>` (satu per kartu dalam grid) masing-masing berisi `<Image src={dataURL}>` hasil `composeCard()`. Halaman terakhir kalau sisa siswa < `cardsPerPage` cukup render yang ada (grid tidak perlu penuh).
- `src/lib/idCard/idCardPdfUtils.ts` — tiru pola `pdfUtils.ts`: `generateIdCardsPdfBlob(students, template)` (compose semua kartu via `composeCard()` dulu, lalu susun grid via `calculateCardGrid`) + `downloadIdCardsPdf(...)` dengan `onProgress?(current, total)`, trigger via `pdf(doc).toBlob()` → `URL.createObjectURL` → `<a download>` → `revokeObjectURL`.
- Progress UI di halaman Task 5 saat generate berjalan (mis. toast atau progress bar "12/50 kartu diproses").

## 6. Verifikasi
- Upload template test (gambar apapun), drag kotak QR & Nama ke posisi berbeda, refresh halaman → posisi ke-load balik sama (persisted).
- Resize browser / preview di ukuran beda → posisi tetap proporsional benar (validasi pct-based bukan px-absolut).
- Pilih 3-5 siswa test, generate → cek PDF hasil: tiap halaman QR di posisi sama persis dengan preview drag, nama tidak overlap elemen desain.
- Test grid: upload template lebar besar (mis. 10cm) vs kecil (mis. 5cm) → cek jumlah kartu per halaman beda sesuai perhitungan, generate 15+ siswa → cek halaman baru dimulai saat grid penuh, halaman terakhir render sisa kartu tanpa error.
- Scan salah satu QR dari hasil PDF (print/screenshot) pakai scanner sm-q7x → harus match siswa benar (`GM-STUDENT:<uuid>` sesuai).
- Permission: user bukan admin/superadmin → halaman template config & generate tidak bisa diakses (redirect), action ditolak server-side kalau dipanggil langsung.
- `npm run test:run` (logic Task 2 `validateTemplatePositions` + Task 6 `calculateCardGrid`) + `npm run type-check`.

## 7. Commit
```
feat(users/siswa): bulk cetak kartu ID QR dari template custom

Admin upload template kartu + drag posisi QR/nama langsung di preview
(dnd-kit), sistem generate kartu tiap siswa terpilih jadi 1 PDF
multi-halaman siap print. Reuse @react-pdf/renderer (rapot) + qrPayload
dari sm-q7x. Posisi disimpan sebagai persentase (scale-independent).

fixes #120

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

## CLAUDE.md Check
- [ ] Tabel baru `id_card_templates` → tambah ke Key Tables di CLAUDE.md.
- [x] Route baru `/users/siswa/qr-cards`, `/users/siswa/qr-cards/template` — dikonfirmasi user: akses via tombol "Cetak Kartu QR" di halaman `/users/siswa` existing, TIDAK perlu entry baru di Sidebar/QuickActions/getPageTitle.
- [ ] Supabase Storage bucket baru (pemakaian PERTAMA di project) — dokumentasikan pola di `docs/claude/database-operations.md`.
- [ ] Dependency baru `qrcode` — tambah ke Key Technologies.
- [ ] dnd-kit (pemakaian PERTAMA runtime, dep sudah ada) — catat pola drag di `docs/claude/architecture-patterns.md` kalau akan dipakai fitur lain juga.
