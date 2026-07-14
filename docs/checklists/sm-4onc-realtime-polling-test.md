# sm-4onc — Checklist Test: Realtime Polling Adapter

**Tujuan**: Verifikasi bahwa polling adapter jalan di mode self-host, dan Cloud mode tidak terpengaruh.

## Prasyarat

```bash
# Terminal 1: Postgres.app harus jalan di port 5417
# Terminal 2: PostgREST
./selfhost/run-postgrest.sh

# .env.local harus ada baris ini (aktifkan self-host):
NEXT_PUBLIC_DATA_POSTGREST_URL=http://127.0.0.1:3001

npm run dev
```

---

## A. Mode Self-host (DATA_POSTGREST_URL aktif)

### A1. Presensi live — polling jalan

- [ ] Buka `/presensi` → pilih meeting yang ada siswa
- [ ] Buka tab **Live** / **Presentasi**
- [ ] Lihat indikator status di bawah persentase — harus ada **dot hijau berkedip** + teks "Live · polling"
- [ ] Buka browser kedua (atau tab incognito, login akun lain)
- [ ] Di browser kedua: ubah status siswa (misal Alfa → Hadir) → Save
- [ ] Di browser pertama: **tanpa refresh**, dalam 5-10 detik status siswa berubah otomatis
- [ ] **Expected**: perubahan muncul sendiri dalam ≤10 detik

### A2. Tab hidden — polling berhenti

- [ ] Buka halaman presensi live, lihat Network tab (DevTools → Network)
- [ ] Pindah ke tab lain (jangan tutup, pindah tab saja)
- [ ] Tunggu 15+ detik
- [ ] **Expected**: tidak ada request baru ke `127.0.0.1:3001` selama tab tersembunyi
- [ ] Balik ke tab presensi
- [ ] **Expected**: dalam beberapa detik langsung ada request poll baru

### A3. Tracking page — auto-refresh

- [ ] Buka `/tracking`
- [ ] Di tab/browser lain: buka halaman mana saja (navigasi) untuk trigger activity log baru
- [ ] Di tracking page: **tanpa refresh manual**, dalam 15-20 detik data baru muncul
- [ ] **Expected**: auto-refresh jalan tanpa action user

---

## B. Mode Cloud (DATA_POSTGREST_URL kosong/tidak ada)

```bash
# Di .env.local, comment atau hapus baris:
# NEXT_PUBLIC_DATA_POSTGREST_URL=http://127.0.0.1:3001

# Restart dev server setelah ubah env
npm run dev
```

- [ ] Buka presensi live — **tidak ada** dot hijau "polling", status harus `SUBSCRIBED` (realtime Cloud)
- [ ] Ubah presensi dari browser lain → perubahan muncul (Cloud postgres_changes masih jalan)
- [ ] **Expected**: perilaku sama persis seperti sebelum sm-4onc dikerjakan

---

## C. Regression — fungsi lain tidak broken

- [ ] Save presensi (radio button) → refresh → status tetap sama (bukan balik Alfa)
- [ ] QR scan tab jalan normal
- [ ] Halaman presensi list (`/presensi`) load normal

---

## Status

- [ ] **A selesai** (self-host polling jalan)
- [ ] **B selesai** (Cloud mode tidak terpengaruh)
- [ ] **C selesai** (tidak ada regresi)

**Setelah semua centang → sm-4onc verified, boleh proceed ke sm-91yt (cutover VM).**
