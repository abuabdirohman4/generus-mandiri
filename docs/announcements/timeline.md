# Timeline Pengerjaan — Target 26 Juni 2026

Hari ini: 12 Juni 2026. Sisa waktu: **14 hari**.
Total: **20 open issues** (sm-8pv, sm-16x, sm-7ca, sm-0v3, sm-kyle selesai sejak timeline dibuat).

---

## Fase 1 — Notifikasi (✅ SELESAI)

| Issue | Judul | Status |
|---|---|---|
| `sm-69c` | feat: in-app broadcast/notifikasi by scope | ✅ closed |
| `sm-rnm` | feat: send form config UI (mode/dismiss/visibility) | ✅ closed |
| `sm-5o7` | [epic] konfigurasi tampilan notifikasi | ✅ closed |
| `sm-rqr` | feat: BlockingNotificationModal + dismiss logic | ✅ closed |
| `sm-q3d` | feat: filter visibility notif di dropdown + list | ✅ closed |

> Pengumuman `planned.md` #1 (Fitur Notifikasi) sudah dikirim 12 Juni 2026. ✅

---

## Fase 2 — Quick Wins / Mode B (✅ SELESAI)

| Issue | Judul | Priority | Status |
|---|---|---|---|
| `sm-8pv` | fix: filter siswa tidak aktif di laporan | P1 bug | ✅ done |
| `sm-7ca` | feat: username persist + remember me | P3 | ✅ done (branch `fix/sm-7ca`) |
| `sm-16x` | feat: sort nama + status di AttendanceTable | P3 | ✅ done (branch `feat/sm-16x`) |
| `sm-kyle` | chore: post-commit hook release reminder | P3 | ✅ done |
| — | fix: toolbar DataTable responsive | — | ✅ done (no beads) |
| — | feat: kolom jenis kelamin di laporan (hidden default) | — | ✅ done (no beads) |
| `sm-36mh` | task: investigasi auto-logout saat deploy | P2 | ✅ done |

---

## Fase 3 — Medium (Target: 13–16 Juni)

| Issue | Judul | Priority | Est. |
|---|---|---|---|
| `sm-0v3` | feat: column toggle di laporan presensi | P3 | ✅ done (branch `feat/sm-0v3`) |
| `sm-4op` | isi konten dokumentasi per fitur | P3 | 2–3 jam (fitur stabil bisa mulai) |
| `sm-1jj` | feat: bulk edit teacher permissions | P2 | 2–3 jam |
| `sm-ix1` | feat: export laporan absensi ke PDF | P2 | 2–3 jam |
| `sm-x20` | feat: WhatsApp report sharing | P2 | 2–3 jam |
| `sm-7fw` | test: E2E naik kelas (grade promotion) | P3 | 2–3 jam |
| `sm-4cy` | Integrasi Sentry error tracking | P3 | 1–2 jam |

---

## Fase 4 — Besar / Mode A (Target: 17–24 Juni)

| Issue | Judul | Priority | Est. |
|---|---|---|---|
| `sm-1kz` | feat: bulk import siswa via Excel | P2 | 4–6 jam |
| `sm-dp7` | feat: bulk edit ganti kelas siswa | P2 | 3–4 jam |
| `sm-ju54` | feat: onboarding wizard org+kelas+guru | P2 | 4–6 jam |
| `sm-ejs` | feat: pending naik kelas actionable per kelompok | P2 | 2–3 jam |
| `sm-q7x` | feat: QR Code Attendance | P3 | 4–6 jam |

> Setelah sm-ejs + deploy: kirim pengumuman `planned.md` #4 dan #5 (Naik Kelas).

---

## Backlog — Kerjakan setelah 26 Juni atau saat ada waktu

| Issue | Judul | Priority | Catatan |
|---|---|---|---|
| `sm-2bx` | Enable RLS junction tables | P3 | Kompleks, 38 query terpengaruh, butuh audit penuh |
| `sm-rfa` | fix rapot core bugs | P3 | Tunggu desain rapot final |
| `sm-skj` | refactor: pecah god file server actions | P3 | Besar, tidak urgent |
| `sm-8hu` | refactor: migrate material_item_classes | P4 | Tunggu desain rapot final |
| `sm-a6y` | refactor: remove semester column | P4 | Tunggu desain rapot final |
| `sm-8cz` | refactor: pecah DataFilter | P4 | Low priority |
| `sm-vlf1` | refactor: compound-component table system | P4 | Epic besar, 24 consumer, kerjakan setelah sm-0v3 stabil |

---

## Pengumuman yang Terkait

Lihat `docs/announcements/planned.md` untuk draft konten.

| Setelah | Kirim pengumuman |
|---|---|
| Fase 1 selesai + deploy | #1 Fitur Notifikasi |
| Fase 4 (sm-ejs) + deploy | #4 Naik Kelas + #5 Info Paud/Pra Nikah |
| sm-4op selesai + deploy | #3 Dokumentasi |
| Issue hapus/archive siswa selesai | #2 Fitur Hapus & Archive Siswa |
