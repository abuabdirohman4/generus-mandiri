CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-04-09-sm-x20-whatsapp-report-sharing.md

ISSUE: sm-x20 / GH-#34
BRANCH: feature/sm-x20-whatsapp-report

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 9)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

TASK OVERVIEW:
- Task 1: DB Migration — tambah kolom `whatsapp_settings` JSONB di tabel `profiles`
- Task 2: Type Definition — `WhatsAppSettings` + `DEFAULT_WHATSAPP_SETTINGS` di `src/types/user.ts`
- Task 3: Server Actions — `getWhatsAppSettings` + `saveWhatsAppSettings` di `src/app/(admin)/laporan/actions/whatsapp/actions.ts`
- Task 4: Helper Utility — `src/lib/whatsapp.ts` dengan `buildWhatsAppUrl` + `buildMessage` + unit tests
- Task 5: `StudentReportCard` component — hidden div untuk html2canvas screenshot
- Task 6: `WhatsAppModal` component — modal pilih target, edit template, toggle download, tombol kirim
- Task 7: Update query laporan — sertakan `nomor_telepon` + `telepon_orangtua` di student data
- Task 8: Update `DataTable.tsx` — tambah kolom WA button + integrasi modal
- Task 9: Manual E2E checklist — verifikasi full flow di browser

REFERENCE FILES:
- Plan: @docs/plans/2026-04-09-sm-x20-whatsapp-report-sharing.md
- Design context: @docs/plans/2026-04-08-calendar-bug-and-whatsapp-report-design.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Business Rules: @docs/claude/business-rules.md
- Existing laporan actions: @src/app/(admin)/laporan/actions/
- Existing DataTable: @src/app/(admin)/laporan/components/DataTable.tsx
- User types: @src/types/user.ts
- SWR keys: @src/lib/swr.ts

KEY TECHNICAL NOTES:
- html2canvas harus di-import secara dynamic (`const html2canvas = (await import('html2canvas')).default`) karena SSR akan error
- wa.me link format: `https://wa.me/62xxx?text=encoded_text` (no image attach — user download terpisah)
- `profiles.whatsapp_settings` JSONB — pattern sama dengan `meeting_form_settings` yang sudah ada
- `nomor_telepon` = nomor siswa, `telepon_orangtua` = nomor ortu (keduanya di tabel `students`)
- Placeholder: `{nama_siswa}`, `{bulan}`, `{tahun}`, `{hadir}`, `{izin}`, `{sakit}`, `{alfa}`, `{persentase}`
- Server actions WAJIB di-export dari `src/app/(admin)/laporan/actions/index.ts`

Mulai dari Task 1.
