CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-17-sm-mseb-semester-model-enrollment-rapot.md

ISSUE: sm-mseb / GH-#144
BRANCH: feat/sm-mseb-semester-model

DEPENDENCY: Kerjakan sm-o08j (auto-carry enrollment) DULU — keduanya sentuh enrollment.

REQUIREMENTS:
1. Ini EPIC — kerjakan Task 1 → 6 BERURUTAN, jangan paralel
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

PENTING (mudah salah / berisiko):
- Task 2: hanya ganti DEFAULT FILTER semester → getCurrentSemester. JANGAN sentuh tempat yang MENYIMPAN semester ke DB (progress materi, rapot generate) — itu tetap tersimpan eksplisit.
- Task 3: rapot lepas filter semester HANYA untuk penentuan KELAS. Data presensi/materi rapot tetap per semester.
- Task 4 (migrasi data 2025/2026) & Task 5 (buat tabel): WAJIB konfirmasi user + eksekusi via MCP execute_sql/apply_migration, BUKAN file migration lokal. Konfirmasi user per langkah 4a/4b/4c. Verifikasi tiap langkah (cek tidak ada siswa >1 enrollment).
- Task 5: tabel BARU class_change_logs (immutable, RLS no UPDATE/DELETE). Naik kelas tetap grade_promotion_logs, transfer tetap transfer_history. Tiga jalur audit terpisah.
- getCurrentSemester: Jul-Des(bulan 7-12)=1, Jan-Jun(1-6)=2.

REFERENCE FILES:
- Plan: @docs/plans/2026-07-17-sm-mseb-semester-model-enrollment-rapot.md
- Rules: @CLAUDE.md
- Rapot queries: @src/app/(admin)/rapot/actions/queries.ts
- Monitoring: @src/app/(admin)/monitoring/actions/monitoring.ts
- Enrollment history: @src/app/(admin)/users/siswa/[studentId]/components/EnrollmentHistory.tsx
- Siswa management: @src/app/(admin)/users/siswa/actions/management/actions.ts
- laporanStore: @src/stores/laporanStore.ts
- Architecture (§Grade Promotion): @docs/claude/architecture-patterns.md

Mulai dari Task 1.
