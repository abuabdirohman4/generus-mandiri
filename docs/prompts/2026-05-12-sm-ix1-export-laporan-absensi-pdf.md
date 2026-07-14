CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-04-03-sm-ix1-export-laporan-absensi-pdf.md

ISSUE: sm-ix1 / GH-#19
BRANCH: feature/sm-ix1-export-laporan-pdf

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 7)
2. Terapkan TDD untuk Task 1 (pdfLogic.ts): RED → GREEN → REFACTOR
3. Task 2-6 adalah pure UI/presentational — skip TDD per CLAUDE.md rules
4. Jalankan test setelah Task 1: npm run test:run
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

TASK OVERVIEW:
- Task 1: TDD pdfLogic.ts — buildPDFTitle(), buildPDFSubtitle(), buildPDFOrgColumns(), formatAttendanceRate(), buildPDFSummaryRows() + unit tests
- Task 2: AttendancePDFDocument.tsx — @react-pdf/renderer Document/Page/View/Text component
- Task 3: AttendancePDFExportModal.tsx — modal opsi export (ukuran kertas, orientasi, nomor halaman)
- Task 4: DataTable.tsx — tambah props summaryStats+filters, state isExportModalOpen, tombol "Export PDF", render modal
- Task 5: page.tsx — pass summaryStats dan filters ke DataTable
- Task 6: components/index.ts — tambah exports komponen baru
- Task 7: Type-check & final verify

REFERENCE FILES:
- Plan: @docs/plans/2026-04-03-sm-ix1-export-laporan-absensi-pdf.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Pola PDF yang sudah ada: @src/app/(admin)/rapot/components/PDFReportDocument.tsx
- Pola modal export: @src/app/(admin)/rapot/components/PDFExportModal.tsx
- Pola pdf().toBlob(): @src/app/(admin)/rapot/components/pdfUtils.ts
- DataTable yang dimodifikasi: @src/app/(admin)/laporan/components/DataTable.tsx
- Laporan page: @src/app/(admin)/laporan/page.tsx
- Laporan components index: @src/app/(admin)/laporan/components/index.ts
- User types: @src/types/user.ts

KEY TECHNICAL NOTES:
- @react-pdf/renderer harus client-side only — import dynamic dengan ssr: false
- AttendancePDFDocument: dynamic import di dalam handleExport() untuk menghindari SSR error
- buildPDFOrgColumns() menentukan kolom org berdasarkan role:
  - superadmin → daerah + desa + kelompok
  - admin/teacher daerah → desa + kelompok
  - admin/teacher desa → kelompok saja
  - admin/teacher kelompok → tidak ada kolom org
- Tombol "Export PDF" hanya muncul jika tableData.length > 0 DAN summaryStats tidak null
- Nama file download: `Laporan_Absensi_YYYY-MM-DD.pdf`
- Default orientasi: landscape (lebih banyak kolom muat)
- summaryStats dan filters di DataTable adalah optional props (backward compatible)

Mulai dari Task 1.
