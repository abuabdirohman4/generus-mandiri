# 🗺️ Roadmap: Generus Mandiri

> **File ini = peta arah produk.** Sumber tunggal visi + status fitur + next up.
> PRD & spec detail di [`products/PRODUCT_SPECIFICATIONS.md`](./products/PRODUCT_SPECIFICATIONS.md). Task detail di beads (`bd list`, prefix `sm-`). Plan per-issue di [`plans/`](./plans/).
> Diperbarui: 2026-07-07 · Versi app: **v1.15.1**

---

## 🎯 Visi

**Generus Mandiri** = sistem manajemen sekolah digital untuk program pendidikan agama LDII. Mengelola santri, pengajar, kelas, absensi, rapot, dan materi lintas hierarki organisasi (Daerah → Desa → Kelompok) dengan akses berbasis peran.

Dibangun sebagai kontribusi amal (jariyah): open source, gratis, mobile-first (PWA), data-driven.

Target pengguna: superadmin, admin (daerah/desa/kelompok), pengajar, santri.

---

## 📊 Status Fitur

Legenda: ✅ jadi · 🔄 sebagian / ada perbaikan terbuka · ⏳ belum jalan

| Fitur | Status | Route | Catatan / Issue terbuka |
|---|---|---|---|
| Dashboard / Home | ✅ | `/home`, `/dashboard` | metrik real-time |
| Presensi (absensi) | 🔄 | `/presensi` | realtime infocus (`sm-f1nh` 🔄), grafik per-desa (`sm-nke7` 🔄) |
| Laporan absensi | 🔄 | `/laporan` | export PDF (`sm-ix1`), share WA (`sm-x20`) |
| Manajemen User (siswa/guru/admin) | 🔄 | `/users/*` | bulk import Excel (`sm-1kz`), bulk edit guru (`sm-1jj`) |
| Kelas | ✅ | `/kelas` | sort by `sort_order` |
| Organisasi | ✅ | `/organisasi` | Daerah/Desa/Kelompok |
| Rapot | 🔄 | `/rapot` | core bugs end-to-end (`sm-rfa`), refactor enrollment (`sm-a6y`) |
| Materi | 🔄 | `/materi` | refactor single-source-of-truth (`sm-8hu`) |
| Kegiatan | ✅ | `/kegiatan` | activity logging |
| Tracking | ✅ | `/tracking` | — |
| Naik Kelas (grade promotion) | 🔄 | `/naik-kelas` | toggle-gated; E2E (`sm-7fw`) |
| Tahun Ajaran | ✅ | `/tahun-ajaran` | — |
| Notifikasi | ✅ | `/notifikasi`, `/settings` | in-app broadcast by scope |
| Settings | ✅ | `/settings`, `/settings/grade-promotion` | feature flags |
| Onboarding | ✅ | `/onboarding` | wizard org+kelas+guru |
| Monitoring | ✅ | `/monitoring` | — |
| Dokumentasi | 🔄 | `content/docs/` | isi konten per fitur (`sm-4op`) |

---

## 🚧 Next Up (issue terbuka, `bd ready`)

Urutan saran: security dulu, lalu quick win, refactor terakhir.

### 🔴 P1 — Critical
- [x] `sm-77m6` — [bug] fix stats card multi-class meeting
- [x] `sm-x8gl` — rotate `SUPABASE_SERVICE_ROLE_KEY` (ter-ekspos saat investigasi)

### ⚡ P2 — Performance & Fitur
- [x] `sm-871q` — perf: optimize `getMeetingsWithStats` slow query
- [x] `sm-ft7w` — pengajian tingkat daerah (lintas desa, Admin/Guru Daerah)
- [x] `sm-dp7` — bulk edit ganti kelas siswa
- [x] `sm-ejs` — pending naik kelas actionable per kelompok
- [x] `sm-ju54` — onboarding wizard (org + kelas + guru)
- [ ] `sm-1kz` — bulk import siswa via Excel
- [ ] `sm-1jj` — bulk edit teacher permissions
- [ ] `sm-ix1` — export laporan absensi ke PDF
- [ ] `sm-x20` — share laporan via WhatsApp

### 🐛 P3 — Bug / penyempurnaan
- [x] `sm-77m6` — fix stats card multi-class meeting
- [x] `sm-8nvh` — null-guard `student_snapshot` di `getMeetingsWithStats`
- [x] `sm-7ca` — username persist + remember me
- [x] `sm-q7x` — QR Code attendance (scanner + cetak QR siswa)
- [x] `sm-4cy` — integrasi Sentry error tracking
- [ ] `sm-1ldv` — [bug] pre-existing meetings actions test failures
- [ ] `sm-rfa` — rapot core bugs (end-to-end usable)
- [ ] `sm-f1nh` — tab realtime presensi untuk infocus 🔄 in progress
- [ ] `sm-nke7` — grafik per-desa/kelompok per pertemuan 🔄 in progress
- [ ] `sm-4op` — isi konten dokumentasi per fitur
- [ ] `sm-7fw` — E2E naik kelas
- [ ] `sm-2bx` — enable RLS junction tables (security hole, deferred)

### 🧹 Refactor / tech-debt (P3–P4)
- [ ] `sm-skj` — pecah god file server actions + konsistenkan response
- [ ] `sm-8cz` — pecah DataFilter per domain + composite hooks
- [ ] `sm-8hu` — migrate ke `material_monthly_targets` (single source of truth)
- [ ] `sm-a6y` — remove kolom semester dari `student_enrollments`
- [ ] `sm-vlf1` — compound-component table system

---

## 📌 Catatan perawatan

- File ini diperbarui **tiap akhir sesi** yang ubah status fitur / issue.
- Status fitur turun dari kondisi `src/app/(admin)/` aktual + `bd list`.
- Detail visi/scope/arsitektur → PRD (`products/PRODUCT_SPECIFICATIONS.md`). Roadmap ini ringkas, PRD detail.
- Timeline lama (`announcements/timeline.md`) sudah kadaluarsa (deadline 26 Juni 2026) — diarsipkan, jangan dipakai untuk arah.
