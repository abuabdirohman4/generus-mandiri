CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-03-21-qr-code-attendance.md
Design reference: @docs/plans/2026-03-21-qr-code-attendance-design.md

ISSUE: sm-q7x / GH-#25
BRANCH: feat/sm-q7x-qr-code-attendance

REQUIREMENTS:
1. Ikuti plan task-by-task (Task 1 → Task 9)
2. TDD untuk QR utility + logic (generateStudentQRDataURL, parsing, error states); skip untuk komponen scanner/PDF presentasional
3. npm run test:run setelah tiap task; jangan lanjut kalau FAIL
4. Install deps: qrcode + @types/qrcode + html5-qrcode (user yang jalankan kalau Claude tak boleh install)
5. QR encode plain UUID students.id (NO JSON wrapper). Scan → auto-set Hadir (H) → auto-save via saveAttendanceForMeeting (action existing). JANGAN bikin save action baru.
6. Scanner pakai html5-qrcode (handle camera lifecycle + iOS Safari). Tangani error states: siswa tidak di meeting, sudah hadir (warning), kamera denied.
7. PDF cetak QR pakai @react-pdf/renderer (sudah ada). 2 layout: kartu individual & grid 6/halaman.
8. Tab di /absensi/[meetingId]: Absen Manual | Scan QR. Checkbox QR selection di StudentsTable opsional (jangan ganggu flow existing).
9. Pakai komponen form/button existing — JANGAN raw HTML form.
10. Setelah semua: npm run type-check (0 errors)
11. Output per task: "✅ Task N complete: [ringkasan]"
12. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-03-21-qr-code-attendance.md
- Design: @docs/plans/2026-03-21-qr-code-attendance-design.md
- Rules: @CLAUDE.md
- Existing save action: cari saveAttendanceForMeeting di @src/app/(admin)/absensi/ atau /presensi/
- PDF reference: @src/app/(admin)/rapot/components/PDFReportDocument.tsx
- Server actions convention: @docs/claude/server-actions-conventions.md

Mulai dari Task 1.
