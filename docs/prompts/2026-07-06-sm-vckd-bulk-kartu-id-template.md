CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

PREREQUISITE: Issue ini depends on sm-q7x — pastikan @src/lib/qr/qrPayload.ts (buildStudentQrPayload) sudah ada sebelum mulai Task 4. Kalau belum, kerjakan sm-q7x dulu (docs/plans/2026-07-06-sm-q7x-qr-scan-mark-presensi.md).

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-06-sm-vckd-bulk-kartu-id-template.md

ISSUE: sm-vckd / GH-#120
BRANCH: feat/sm-vckd-bulk-kartu-id-template

PENTING: Task 1 (migration tabel `id_card_templates` + storage bucket `id-card-templates`) SUDAH SELESAI dikerjakan langsung via Supabase MCP (kamu tidak punya akses MCP). Tabel + bucket + RLS policy sudah live di database. MULAI LANGSUNG DARI TASK 2. Jangan buat migration lagi untuk tabel/bucket ini.

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 2 → Task 6, Task 1 sudah selesai)
2. (SKIP — Task 1 sudah dikerjakan terpisah, lihat catatan di plan)
3. Terapkan TDD untuk Layer 2 (logic.ts) yang bisa ditest tanpa DOM — Task 4 (canvas compose) BOLEH skip TDD karena butuh browser env (dicatat di plan sebagai UI-presentasional)
4. Jalankan test setelah setiap task: npm run test:run
5. Jangan lanjut jika ada test FAIL
6. Setelah semua task: npm run type-check
7. Ikuti 3-layer architecture (queries.ts/logic.ts/actions.ts)
8. Install dependency baru dulu: npm install qrcode @types/qrcode (SKIP @dnd-kit/core, SUDAH terinstall)
9. REUSE @react-pdf/renderer untuk PDF assembly — JANGAN install jsPDF/html2canvas
10. Drag posisi QR/Nama (Task 3) pakai @dnd-kit/core (DndContext + useDraggable) — SUDAH di package.json tapi 0 pemakaian runtime di codebase, jadi TIDAK ADA pola existing untuk ditiru, bebas implementasi wajar. Posisi disimpan sebagai PERSENTASE (qr_x_pct dll, 0-100), BUKAN pixel absolut — lihat §4 Data Model di plan untuk alasan (scale-independent terhadap ukuran preview).
11. Row selection checkbox siswa (Task 5) HARUS dibangun baru — StudentsTable & shared DataTable (@src/components/table/Table.tsx) TIDAK support rowSelection. JANGAN modifikasi DataTable generic (dipakai banyak halaman lain). Buat tabel siswa sendiri di halaman qr-cards dengan checkbox state lokal (reuse DataFilter untuk filter, bukan reuse StudentsTable component).
12. Verifikasi field Student yang dibutuhkan (nomor_induk, kelompok_name, class_name) benar-benar tersedia di @src/hooks/useStudents.ts SEBELUM implementasi Task 5 — ada beberapa varian tipe Student di modul siswa, jangan asumsi field ada tanpa cek.
13. Task 6 (PDF export) pakai GRID otomatis per halaman A4 (BUKAN 1 kartu/halaman) — admin isi "lebar kartu (cm)" saat upload template (Task 3), sistem hitung sendiri berapa kartu muat per halaman via `calculateCardGrid()` (logic.ts, TDD wajib — pure math, tidak butuh DOM). Lihat §4 Data Model (`card_width_cm`) dan Task 6 di plan untuk formula grid.
14. Output per task: "✅ Task N complete: [ringkasan]"
15. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-06-sm-vckd-bulk-kartu-id-template.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Pola PDF existing (reuse untuk bulk export): @src/app/(admin)/rapot/components/PDFReportDocument.tsx
- Pola trigger download PDF: @src/app/(admin)/rapot/components/pdfUtils.ts
- QR payload builder (dari sm-q7x, prerequisite): @src/lib/qr/qrPayload.ts
- Student list/filter untuk reuse selection UI: @src/app/(admin)/users/siswa/page.tsx

Mulai dari Task 1.
