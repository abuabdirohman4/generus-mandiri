# Strategi Backup DB VM — pg_dump harian + R2 offsite + monitoring + test-restore

**Issue:** sm-rd16 · **Depends on:** sm-91yt (Phase 2 cutover) · **Epic:** sm-f2wm
**Scope:** Data-loss protection SAJA — bukan availability/failover.
**Status:** DEFERRED — kerjakan HANYA setelah Phase 2 cutover selesai & VM jadi source-of-truth.

---

## Konteks & keputusan

Setelah Phase 2 cutover, **VM = source of truth** untuk data (Postgres di VM). Supabase Cloud
tetap dipakai untuk Auth + Realtime, tapi tabel data (`public.*`) tidak lagi di-update di Cloud
→ Cloud jadi snapshot basi, BUKAN backup aktif.

Butuh strategi backup yang tahan disaster nyata (VM mati total / hardware rusak / salah delete
massal). Keputusan user (2026-07-16):

- **Offsite = Cloudflare R2** (bukan Google Drive). Alasan: S3-compatible, 10GB free, egress
  gratis, purpose-built untuk backup. Google Drive rclone rawan token expire diam-diam.
- **Scope = data-loss protection**, bukan availability. VM-down-sementara di luar scope
  (itu masalah uptime/failover, solusi beda).

## Prinsip inti (kenapa 4 layer, bukan sekadar cron pg_dump)

> **Backup yang tak pernah dites = bukan backup.** Cron pg_dump yang gagal diam-diam atau
> menghasilkan dump korup baru ketahuan saat disaster — saat sudah terlambat. Karena itu
> monitoring (#3) & test-restore (#4) BUKAN opsional; itu yang bikin backup bisa dipercaya.

| Layer | Tempat | Retensi | Fungsi |
|---|---|---|---|
| 1. Dump harian | VM lokal (`/var/backups/generus`) | 7 hari | Recovery cepat |
| 2. Offsite | Cloudflare R2 | 30 hari | VM mati total |
| 3. Monitoring | healthchecks.io | — | Deteksi cron gagal / backup mati diam |
| 4. Test-restore | Manual, terjadwal | Bulanan | Buktikan dump valid & bisa di-restore |

---

## Task 1 — Dump harian di VM

**Buat script** `/opt/generus/backup.sh` (owner postgres/deploy user, `chmod 700`):

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/generus"
DB_NAME="generus_production"        # sesuaikan nama DB VM saat cutover
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/generus_${STAMP}.sql.gz"
HC_URL="https://hc-ping.com/<UUID>"  # healthchecks.io — isi saat Task 3

mkdir -p "$BACKUP_DIR"

# Ping start (healthchecks tahu job mulai)
curl -fsS -m 10 --retry 3 "${HC_URL}/start" || true

# Dump + gzip. pg_dump exit non-zero -> set -e hentikan -> ping fail (di trap).
pg_dump "$DB_NAME" | gzip > "$FILE"

# Verifikasi dump tidak kosong / tidak korup (gzip -t + ukuran minimal)
gzip -t "$FILE"
MIN_BYTES=10240                      # dump valid mustahil < 10KB; sesuaikan
[ "$(stat -c%s "$FILE")" -ge "$MIN_BYTES" ] || { echo "dump too small"; exit 1; }

# Offsite ke R2 (Task 2 setup credential)
rclone copy "$FILE" r2:generus-backups/ --s3-no-check-bucket

# Rotate lokal: hapus > 7 hari
find "$BACKUP_DIR" -name 'generus_*.sql.gz' -mtime +7 -delete

# Sukses -> ping OK
curl -fsS -m 10 --retry 3 "$HC_URL" || true
```

**Trap untuk lapor gagal** (tambah di atas, setelah `set -euo pipefail`):
```bash
trap 'curl -fsS -m 10 "${HC_URL}/fail" || true' ERR
```

**Cron** (`crontab -e` sebagai user yang punya akses pg_dump, mis. 02:00):
```
0 2 * * * /opt/generus/backup.sh >> /var/log/generus-backup.log 2>&1
```

**Verifikasi Task 1:** jalankan `./backup.sh` manual → file `.sql.gz` muncul, `gzip -t` lolos,
`log` bersih.

---

## Task 2 — Offsite Cloudflare R2

1. Daftar Cloudflare (gratis) → R2 → **Create bucket** `generus-backups`.
2. R2 → **Manage API Tokens** → buat token scope Object Read & Write untuk bucket itu →
   catat Access Key ID + Secret + account-id endpoint.
3. Install rclone di VM: `sudo apt install rclone` (atau `curl https://rclone.org/install.sh | sudo bash`).
4. `rclone config` → remote baru `r2`, tipe `s3`, provider `Cloudflare`, isi key + endpoint
   `https://<account-id>.r2.cloudflarestorage.com`.
5. Test: `rclone lsd r2:` harus tampilkan bucket. `rclone copy test.txt r2:generus-backups/`.
6. **Lifecycle rule di R2** (retensi 30 hari): R2 bucket → Settings → Object lifecycle →
   delete objects older than 30 days. (R2 tidak auto-rotate seperti find lokal; pakai lifecycle.)

**Verifikasi Task 2:** `backup.sh` upload sukses, file terlihat di R2 dashboard.

---

## Task 3 — Monitoring (healthchecks.io)

> **Ini layer yang bikin backup bisa dipercaya.** Tanpa ini, cron bisa mati berminggu-minggu
> tanpa kamu sadar.

1. Daftar healthchecks.io (gratis, 20 check).
2. Buat check `generus-db-backup`, period **1 day**, grace **1 hour**.
3. Salin ping URL → isi `HC_URL` di `backup.sh`.
4. Set notifikasi: email / Telegram / WhatsApp (via integrasi) → **kalau backup tidak ping
   dalam 1 hari + grace, kamu dapat alert.**

Mekanisme: script ping `/start` di awal, `HC_URL` di sukses, `/fail` di error (trap). Kalau
VM mati / cron hilang / pg_dump gagal → tidak ada ping → healthchecks kirim alert.

**Verifikasi Task 3:** jalankan `backup.sh` → check jadi hijau. Simulasikan gagal
(`DB_NAME` salah) → check jadi merah + alert masuk.

---

## Task 4 — Test-restore terjadwal (bulanan)

> **Dump yang tak pernah di-restore = harapan, bukan backup.** Jadwalkan (kalender/reminder)
> test-restore tiap awal bulan.

**Runbook restore (ke DB kosong, TIDAK menyentuh production):**
```bash
# 1. Ambil dump terbaru dari R2 (atau lokal)
rclone copy r2:generus-backups/generus_YYYYMMDD_HHMMSS.sql.gz /tmp/

# 2. Buat DB test kosong
createdb generus_restore_test

# 3. Restore
gunzip -c /tmp/generus_YYYYMMDD_HHMMSS.sql.gz | psql generus_restore_test

# 4. Verifikasi row count tabel kunci vs production
psql generus_restore_test -tAc "
  SELECT 'profiles: '||count(*) FROM profiles
  UNION ALL SELECT 'students: '||count(*) FROM students
  UNION ALL SELECT 'attendance_logs: '||count(*) FROM attendance_logs
  UNION ALL SELECT 'meetings: '||count(*) FROM meetings"
# Bandingkan dengan production (angka harus mendekati, selisih wajar = data hari itu)

# 5. Bersihkan
dropdb generus_restore_test
```

**Kriteria lulus:** restore selesai tanpa error + row count masuk akal. Kalau gagal → dump
korup / pg_dump kurang flag → perbaiki `backup.sh` SEBELUM disaster nyata.

**Catatan:** test-restore manual OK untuk skala ini. Kalau mau, bisa di-otomasi jadi cron
mingguan yang restore ke DB throwaway + ping healthchecks terpisah — tapi manual bulanan sudah
cukup untuk data-loss protection.

---

## Yang SENGAJA di luar scope

- **Availability / failover** — kalau VM down sementara (bukan mati total), backup tak
  menolong app tetap jalan. Itu masalah uptime, solusi beda (hot standby, load balancer).
  Justru alasan Supabase Cloud dipertahankan di hybrid untuk Auth+Realtime.
- **Point-in-time recovery (PITR)** — restore ke detik tertentu butuh WAL archiving, kompleks.
  Untuk skala sekolah, dump harian (kehilangan max 1 hari) sudah dapat diterima.
- **Sync balik ke Supabase Cloud** — Cloud post-cutover dibiarkan sebagai snapshot pra-cutover.
  Tidak diurus aktif. Egress = 0 (backup tidak menyentuh Supabase).

## Egress note

Backup ini **nol egress Supabase**: dump dari Postgres VM → file lokal → R2. Tidak ada pull
dari Supabase Cloud. R2 egress juga gratis. Aman terhadap biaya.

---

## Checklist eksekusi (post-cutover)

- [ ] Task 1: `backup.sh` + cron 02:00, verifikasi dump valid
- [ ] Task 2: R2 bucket + rclone + lifecycle 30 hari, verifikasi upload
- [ ] Task 3: healthchecks.io check + alert, verifikasi hijau & merah
- [ ] Task 4: runbook test-restore pertama, verifikasi row count
- [ ] Simpan reminder kalender: test-restore tiap awal bulan
- [ ] `bd close sm-rd16`