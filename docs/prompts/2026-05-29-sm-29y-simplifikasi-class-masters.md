CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-29-sm-29y-simplifikasi-class-masters.md

ISSUE: sm-29y / GH-#78
NOTE: Task ini MURNI SQL via MCP Supabase — tidak ada perubahan kode apapun.

REQUIREMENTS:
1. Ikuti plan task-by-task SESUAI urutan eksekusi yang benar (Task 5a → 5b → 5c → 1 → 2 → 3 → 4a-4g → 6)
2. Jalankan setiap SQL via mcp__generus-mandiri-v2__execute_sql (untuk SELECT/UPDATE) atau mcp__generus-mandiri-v2__apply_migration (untuk DDL)
3. Setelah setiap task, jalankan verification query untuk konfirmasi hasil
4. Jangan lanjut ke task berikutnya jika verification gagal
5. Output per task: "✅ Task N complete: [ringkasan hasil]"
6. Di akhir: jalankan SEMUA verification queries dari section Verification

CRITICAL ORDERING:
- Task 5 (isi tanggal_lahir) HARUS sebelum Task 4 (remap mappings)
- Task 4 (remap) HARUS sebelum Task 6 (delete masters)
- Jika urutan salah, data akan hilang

REFERENCE FILES:
- Plan: @docs/plans/2026-05-29-sm-29y-simplifikasi-class-masters.md

Mulai dari Task 5a (isi tanggal_lahir siswa Orang Tua <35).
