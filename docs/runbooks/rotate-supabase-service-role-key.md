# Runbook — Rotate Supabase Service Role Key (sm-x8gl)

**Issue**: sm-x8gl (P1)
**Dibuat**: 2026-06-12
**Alasan**: `SUPABASE_SERVICE_ROLE_KEY` aktif (project `eahntxowlefjaizjoqys` / generus-mandiri-v2) ter-ekspos lengkap ke chat AI saat investigasi sm-36mh (screenshot `.env.local`). Service role bypass RLS = akses penuh DB. Anggap kompromis → rotate.

## ⚠️ KAPAN dieksekusi
- **JANGAN saat jam ramai** — rotate menyebabkan logout massal + downtime singkat.
- Pilih **jam sepi** (mis. dini hari / sela aktivitas sekolah).
- Siapkan ~10-15 menit fokus, jangan terganggu di tengah.

## ⚠️ Konsekuensi yang HARUS dipahami sebelum mulai
1. **Rotate JWT secret me-rotate SEMUA key** (anon + service_role) sekaligus — bukan cuma service_role.
2. **Anon key ikut berubah** → wajib update di Vercel + `.env.local`, kalau tidak app DOWN.
3. **Semua user aktif logout** (sesi lama invalid) — sekali, normal.
4. **Downtime singkat** antara rotate dan selesai redeploy. Update env harus cepat.

## Prasyarat
- [ ] Waktu sepi (bukan jam ramai aplikasi)
- [ ] Akses Supabase dashboard (project generus-mandiri-v2)
- [ ] Akses Vercel dashboard (project school-management)
- [ ] Akses `.env.local` di mesin dev
- [ ] Buka 2 tab: Supabase + Vercel

---

## LANGKAH (urut, jangan loncat)

### STEP 1 — Rotate di Supabase
1. Supabase → project **generus-mandiri-v2** → **Settings → JWT Keys**
2. Cari **"Rotate JWT secret"** / "Generate new JWT secret"
3. Klik rotate → konfirmasi
4. **JANGAN tutup tab.** Key baru (anon + service_role) langsung tampil setelah rotate.
5. **Jika muncul opsi grace period / "valid until"** untuk key lama: pilih **revoke immediately** (atau grace sependek mungkin) — tujuan kita matikan key lama yg ter-ekspos. Konsekuensi: STEP 3-5 harus cepat biar downtime minim.

### STEP 2 — Salin key baru
6. Settings → **API Keys** → tab **"Legacy anon, service_role API keys"**
7. Salin **anon key baru** (Copy)
8. Klik **Reveal** di service_role → salin **service_role key baru**
9. Simpan dua-duanya sementara di tempat aman. **JANGAN paste ke chat AI / channel apa pun.**

### STEP 3 — Update Vercel
10. Vercel → project → Settings → Environment Variables
11. Edit `NEXT_PUBLIC_SUPABASE_ANON_KEY` → paste anon baru → Save
12. Edit `SUPABASE_SERVICE_ROLE_KEY` → paste service_role baru → Save
13. `NEXT_PUBLIC_SUPABASE_URL` **TIDAK berubah** — biarkan

### STEP 4 — Redeploy Vercel
14. Vercel → Deployments → deployment terakhir → **⋯ → Redeploy**
    (env baru hanya ter-apply setelah redeploy)

### STEP 5 — Update `.env.local` (dev lokal)
15. Edit `.env.local`:
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY=` → anon baru
    - `SUPABASE_SERVICE_ROLE_KEY=` → service_role baru
16. Restart `npm run dev`

### STEP 6 — Verifikasi
17. Tunggu redeploy Vercel selesai → buka app PRODUCTION → login → cek data muncul (= anon + service_role baru OK)
18. Lokal: `npm run dev` → login → cek normal
19. Pastikan **tidak ada** error 401/403 di console (tanda key mismatch)

---

## Cleanup setelah rotate (opsional, prioritas rendah)
- [ ] Var duplikat `*_V1` di Vercel (`ANON_KEY_V1`, `URL_V1`, `SERVICE_ROLE_KEY_V1`) — app tak pakai, bisa dihapus
- [ ] Baris `_V1` (commented) di `.env.local` — bisa dihapus, sisa project lama `bcmcsvxuhwefgcahrcya`
- [ ] **Project lama `bcmcsvxuhwefgcahrcya`** — kalau masih ada di Supabase & simpan data sensitif: rotate/hapus juga (service_role lama-nya juga sempat ke-ekspos di screenshot). Kalau project sudah mati/kosong → abaikan.

## Catatan
- **Anon key TIDAK perlu dikhawatirkan keamanannya** — memang dirancang publik (dipakai di browser, dilindungi RLS). Dia ikut berubah cuma karena efek samping rotate JWT secret, bukan karena bocor jadi masalah.
- Yang kritis = **service_role** (bypass RLS).

## Pencegahan ke depan
- JANGAN paste/screenshot file berisi `service_role` / `SERVICE_ROLE_KEY` / JWT secret / DB password / `.env` lengkap ke chat AI atau channel apa pun.
- Kalau perlu tunjukkan struktur env, sensor value-nya. Anon key & URL boleh.

## Setelah selesai
- [ ] `bd close sm-x8gl --reason="service_role rotated + env updated + redeployed + verified"`
