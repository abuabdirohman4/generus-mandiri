CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

PREREQUISITE: Issue ini depends on sm-q7x — pastikan @src/lib/qr/qrPayload.ts (buildStudentQrPayload) sudah ada sebelum mulai Task 4. Kalau belum, kerjakan sm-q7x dulu (docs/plans/2026-07-06-sm-q7x-qr-scan-mark-presensi.md).

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-06-sm-vckd-bulk-kartu-id-template.md

ISSUE: sm-vckd / GH-#120
BRANCH: feat/sm-vckd-bulk-kartu-id-template

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 6)
2. Task 1 (migration + storage bucket) pakai Supabase MCP tools (apply_migration) — cek dulu list_tables sebelum apply
3. Terapkan TDD untuk Layer 2 (logic.ts) yang bisa ditest tanpa DOM — Task 4 (canvas compose) BOLEH skip TDD karena butuh browser env (dicatat di plan sebagai UI-presentasional)
4. Jalankan test setelah setiap task: npm run test:run
5. Jangan lanjut jika ada test FAIL
6. Setelah semua task: npm run type-check
7. Ikuti 3-layer architecture (queries.ts/logic.ts/actions.ts)
8. Install dependency baru dulu: npm install qrcode @types/qrcode
9. REUSE @react-pdf/renderer untuk PDF assembly — JANGAN install jsPDF/html2canvas
10. Output per task: "✅ Task N complete: [ringkasan]"
11. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-06-sm-vckd-bulk-kartu-id-template.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Pola PDF existing (reuse untuk bulk export): @src/app/(admin)/rapot/components/PDFReportDocument.tsx
- Pola trigger download PDF: @src/app/(admin)/rapot/components/pdfUtils.ts
- QR payload builder (dari sm-q7x, prerequisite): @src/lib/qr/qrPayload.ts
- Student list/filter untuk reuse selection UI: @src/app/(admin)/users/siswa/page.tsx

Mulai dari Task 1.
