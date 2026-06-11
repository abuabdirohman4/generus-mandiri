# Timeline Pengerjaan — Target 26 Juni 2026

Hari ini: 11 Juni 2026. Sisa waktu: **15 hari**.
Dengan AI-assisted development, semua issue di bawah realistis selesai sebelum target.

Bottleneck bukan kecepatan coding — tapi review di browser, keputusan UX, dan testing.

---

## Fase 1 — Selesaikan In-Progress (Target: 11–12 Juni)

| Issue | Judul | Est. |
|---|---|---|
| `sm-69c` | feat: in-app broadcast/notifikasi by scope | ~hari ini |
| `sm-rnm` | feat: send form config UI (mode/dismiss/visibility) | ~hari ini |
| `sm-5o7` | [epic] konfigurasi tampilan notifikasi | selesai setelah 69c + rnm |

> Setelah fase ini: deploy + kirim pengumuman `planned.md` #1 (Fitur Notifikasi).

---

## Fase 2 — Quick Wins / Mode B (Target: 13–14 Juni)

| Issue | Judul | Est. |
|---|---|---|
| `sm-8pv` | fix: filter siswa tidak aktif di laporan | 30 menit |
| `sm-7ca` | feat: username persist + remember me | 30 menit |
| `sm-16x` | feat: sort nama + status di AttendanceTable | 30 menit |
| `sm-36mh` | task: investigasi auto-logout saat deploy | 1–2 jam |
| `sm-kyle` | chore: post-commit hook release reminder | 30 menit |

---

## Fase 3 — Medium (Target: 15–19 Juni)

| Issue | Judul | Est. |
|---|---|---|
| `sm-rqr` | feat: BlockingNotificationModal | 2–3 jam |
| `sm-q3d` | feat: filter visibility notif di dropdown + list | 1–2 jam |
| `sm-0v3` | feat: column toggle di laporan presensi | 1 jam |
| `sm-1jj` | feat: bulk edit teacher permissions | 2–3 jam |

---

## Fase 4 — Besar / Mode A (Target: 20–25 Juni)

| Issue | Judul | Est. |
|---|---|---|
| `sm-1kz` | feat: bulk import siswa via Excel | 4–6 jam |
| `sm-dp7` | feat: bulk edit ganti kelas siswa | 3–4 jam |
| `sm-ju54` | feat: onboarding wizard org+kelas+guru | 4–6 jam |
| `sm-ejs` | feat: pending naik kelas actionable per kelompok | 2–3 jam |

> Setelah sm-ejs: kirim pengumuman `planned.md` #4 dan #5 (Naik Kelas).

---

## Backlog / Defer setelah 26 Juni

| Issue | Judul | Alasan defer |
|---|---|---|
| `sm-skj` | refactor: pecah god file server actions | Besar, tidak urgent |
| `sm-4op` | isi konten dokumentasi per fitur | Tunggu fitur stabil |
| `sm-2bx` | Enable RLS junction tables | Kompleks, perlu investigasi penuh |
| `sm-rfa` | fix rapot core bugs | Blocked, perlu sesi khusus |

---

## Pengumuman yang Terkait

Lihat `docs/announcements/planned.md` untuk draft konten tiap pengumuman.

| Setelah fase | Kirim pengumuman |
|---|---|
| Fase 1 selesai + deploy | #1 Fitur Notifikasi |
| Fase 3 (sm-rqr + q3d) + deploy | — |
| Fase 4 (sm-ejs) + deploy | #4 Naik Kelas + #5 Info Paud/Pra Nikah |
| sm-4op selesai + deploy | #3 Dokumentasi |
| Issue hapus/archive siswa selesai | #2 Fitur Hapus & Archive Siswa |
