CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-25-sm-ejs-naik-kelas-deadline-pranikah.md

Ganti sistem toggle ON/OFF naik kelas jadi sistem batas waktu (deadline) dengan bypass Pra Nikah untuk guru kelompok, dan VIP bypass (full akses) untuk guru desa/daerah + admin.

ISSUE: sm-ejs / GH-#111
BRANCH: feat/sm-ejs-naik-kelas-deadline-pranikah

CONSTRAINT PENTING:
- ZERO perubahan database. TIDAK ada migrasi, TIDAK ada DDL, TIDAK ada kolom baru.
  end_date disimpan di dalam jsonb `value` row app_settings (key='grade_promotion_enabled') yang SUDAH ADA, lewat upsert biasa. Row legacy {enabled,...} tetap valid via fallback.
- Deteksi Pra Nikah pakai helper parse NAMA (isPraNikahName), BUKAN kolom kategori. category_group TIDAK punya slot pra_nikah (Pra Nikah = muda_mudi), jadi jangan sentuh schema class_masters.
- Komparasi tanggal WAJIB server-side Jakarta TZ (pola dashboard/actions/overview/logic.ts). Jangan andalkan clock client.

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1-8).
2. Terapkan TDD ketat untuk LOGIC (Task 1 helper Pra Nikah, Task 4 filter window): RED -> GREEN -> REFACTOR.
3. Jalankan test setelah setiap task TDD: npm run test:run
4. Jangan lanjut jika ada test FAIL.
5. Settings UI date picker: WAJIB pakai komponen existing (Flatpickr / components/form), JANGAN raw <input type=date>.
6. Setelah semua task: npm run type-check (0 error).
7. Output per task: "[OK] Task N complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user.

ATURAN ROLE (inti):
- Guru kelompok (isTeacherKelompok): window tutup -> HANYA Pra Nikah; window aktif -> semua kelas.
- Guru desa (isTeacherDesa), guru daerah (isTeacherDaerah), admin daerah/desa, superadmin: SELALU full akses (bypass deadline).

REFERENCE FILES:
- Plan: @docs/plans/2026-06-25-sm-ejs-naik-kelas-deadline-pranikah.md
- Rules: @CLAUDE.md
- Role helpers: @src/lib/accessControl.ts (isTeacherKelompok, isTeacherDesa, isTeacherDaerah)
- Settings actions: @src/app/(admin)/naik-kelas/actions/settings/actions.ts
- Source options: @src/app/(admin)/naik-kelas/actions/classes/actions.ts
- Helper kelas: @src/lib/utils/classHelpers.ts
- Sidebar: @src/components/layouts/AppSidebar.tsx
- Date TZ pattern: @src/app/(admin)/dashboard/actions/overview/logic.ts

Mulai dari Task 1.
