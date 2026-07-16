CONTEXT:
Saya mengerjakan Generus Mandiri — Next.js 15 school management system, sedang di epic
sm-91yt (Self-host: server cutover VM Phase 2). Data plane sudah berjalan hybrid:
`NEXT_PUBLIC_DATA_POSTGREST_URL=http://127.0.0.1:3001` di `.env.local` → query data
ke PostgREST self-hosted, Auth + Realtime tetap Supabase Cloud.

CRITICAL: Baca @CLAUDE.md untuk semua rules dan constraints.

---

## Bug yang ditemukan

Error saat admin update data guru (`POST /users/guru`):

```
code: '42P01'
message: 'relation "auth.users" does not exist'
```

Stack: `updateTeacher()` → `updateTeacherProfile()` → UPDATE `profiles` via `createClient()`
(self-hosted PostgREST). Postgres eksekusi RLS policy di tabel `profiles` yang reference
`auth.users` — tapi self-hosted Postgres tidak punya schema `auth` asli (GoTrue-only di
Supabase Cloud).

`selfhost/sql/01_auth_shim.sql` sudah buat shim `auth.uid()/role()/jwt()`, tapi rupanya
ada FK atau RLS policy body yang reference tabel `auth.users` langsung — belum di-cover shim.

Dari `docs/prompts/2026-07-14-sm-91yt-cutover-vm-phase2.md` Step 3 sudah ada catatan:
> "restore-local.sh (drops+recreates the DB, strips the `profiles→auth.users` FK...)"

Jadi FK sudah di-strip di restore script. Tapi error masih muncul di local dev — artinya
ada RLS policy atau trigger yang masih query `auth.users` secara langsung, bukan lewat FK.

---

## Task (investigasi + fix, bukan implementasi cutover)

**Step 1 — Audit local Postgres**

Jalankan query berikut ke local Postgres (self-hosted, bukan Supabase Cloud):

```sql
-- 1. Cari semua policies yang reference auth.users
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE qual ILIKE '%auth.users%' OR with_check ILIKE '%auth.users%';

-- 2. Cari FK constraints ke auth.users
SELECT tc.table_name, kcu.column_name, ccu.table_schema, ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_schema = 'auth' AND ccu.table_name = 'users';

-- 3. Cari functions/triggers yang reference auth.users
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%auth.users%';
```

**Step 2 — Compare dengan auth shim**

Baca `@selfhost/sql/01_auth_shim.sql` — apakah shim sudah include:
- Schema `auth` dibuat?
- Tabel/view `auth.users` mock?
- Hanya functions (`uid()`, `role()`, `jwt()`)?

Jika shim hanya buat functions tapi tidak buat `auth.users` view/table mock, maka
RLS policies yang reference `auth.users` langsung (bukan via functions) akan gagal.

**Step 3 — Baca restore-local.sh**

Baca `@selfhost/restore-local.sh` — konfirmasi:
- Di bagian mana FK di-strip?
- Apakah ada langkah patch RLS policies yang reference `auth.users`?
- Kalau tidak ada patch policies, restore ke VM juga akan kena bug ini.

**Step 4 — Fix**

Berdasarkan temuan, pilih fix yang paling minimal:

**Option A** — Tambah mock view `auth.users` di `01_auth_shim.sql`:
```sql
-- Mock auth.users view — dipakai RLS policies Supabase
-- Membaca dari profiles table (kolom yang dibutuhkan policies)
CREATE OR REPLACE VIEW auth.users AS
  SELECT id, email, raw_user_meta_data AS raw_app_meta_data, created_at
  FROM public.profiles;
GRANT SELECT ON auth.users TO anon, authenticated, service_role;
```
Ini fix paling bersih — policies tidak perlu diubah, shim yang di-extend.

**Option B** — Patch policies di `restore-local.sh` untuk hapus/rewrite policy body
yang reference `auth.users`. Lebih invasif, rawan drift jika policies di-update di Cloud.

**Option C** — Kombinasi: shim mock `auth.users` (Option A) + strip FK tetap di restore.

Rekomendasikan mana yang paling aman dan apply fix-nya.

**Step 5 — Verifikasi**

Setelah fix:
1. Restart PostgREST local (`pkill postgrest && ./selfhost/run-postgrest.sh` atau sejenisnya)
2. Test ulang: update data guru via admin → harus sukses
3. Cek query lain yang mungkin affected: update siswa, update admin, delete

**Step 6 — Status blocker**

Tentukan:
- Apakah bug ini blocker untuk Phase 2 cutover ke VM?
- Apakah `restore-local.sh` perlu diupdate sebelum cutover?
- Jika perlu update `restore-local.sh` / `01_auth_shim.sql`, apakah cukup satu fix
  yang solve keduanya (local dev + VM production)?

---

## Reference files

- Auth shim: `@selfhost/sql/01_auth_shim.sql`
- Restore script: `@selfhost/restore-local.sh`
- Roles SQL: `@selfhost/sql/00_roles.sql`
- Grants SQL: `@selfhost/sql/02_grants.sql`
- Cutover Phase 2 prompt: `@docs/prompts/2026-07-14-sm-91yt-cutover-vm-phase2.md`
- Cutover plan: `@docs/plans/2026-07-10-self-host-postgres-postgrest-hybrid.md`
- Supabase server client: `@src/lib/supabase/server.ts`
- Guru actions (trigger error): `@src/app/(admin)/users/guru/actions/teachers/actions.ts`

---

## Output yang diharapkan

1. Root cause dikonfirmasi (policy mana / tabel mana / baris SQL mana yang gagal)
2. Apakah `restore-local.sh` saat ini sudah handle ini untuk VM, atau juga akan kena
3. Fix yang diapply (ke file mana, perubahan apa)
4. Hasil verifikasi (update guru berhasil)
5. Status: blocker Phase 2 atau tidak