# sm-4onc — Realtime Polling Adapter (env-gated) untuk Self-Host Cutover

**Issue:** sm-4onc (P1, HARD GATE) · Epic: sm-f2wm · Blocks: sm-91yt (cutover)
**Tanggal:** 2026-07-12
**Model eksekusi:** desain (Opus) → implementasi (Sonnet/Antigravity)

---

## 1. Masalah

Setelah data plane pindah ke VM (self-host PostgREST + Postgres), Supabase Realtime
tetap baca WAL DB **Supabase Cloud** (yang tak lagi menerima write). Akibatnya semua
channel `postgres_changes` yang watch **tabel** berhenti melihat write baru — **diam-diam
mati** (WebSocket connected, tapi tak ada event).

Terdampak (inventory lengkap, hanya 2):

| Consumer | File | Tabel | Dampak |
|---|---|---|---|
| `useAttendanceRealtime` | `src/hooks/useAttendanceRealtime.ts` | `attendance_logs` | Live presensi antar-guru mati. **KRITIS** — sm-6niw sudah buang `revalidateOnFocus`, jadi presensi gantung 100% ke realtime. Tanpa fix = tak ada live sync sama sekali. |
| `tracking-logs-changes` | `src/app/(admin)/tracking/page.tsx` | `activity_logs` | Tracking page tak auto-refresh saat log baru masuk. Sudah punya debounce `scheduleRefresh`. |

**AMAN (tidak terdampak):** Presence `online-users` (`usePresenceStore`) — tidak baca tabel,
murni presence state. Tetap di Supabase Cloud.

---

## 2. Keputusan desain (disepakati user 2026-07-12)

**Prioritas user:** hemat egress > realtime live. "Kalau bisa live bagus, kalau tidak,
prioritaskan egress hemat."

**Strategi:** ganti `postgres_changes` → **polling adaptif ke PostgREST** (Supabase Cloud
saat mode cloud, VM saat mode self-host). Bukan self-host Realtime (VM 3.6GB RAM, Realtime +
WAL replication berat, ROI rendah untuk 2 channel).

**Kenapa polling tidak melawan tujuan egress:**
- Egress **Supabase** (yang dibilling, kena Free tier) → tetap 0 setelah cutover.
- Polling makan **bandwidth VM** (kuota 1.54TB/mo, 308× Free tier, sudah dibayar) — bukan Supabase.

### Parameter (final)

| Parameter | Nilai |
|---|---|
| Interval attendance (aktif, ada scan barusan) | **5s** |
| Interval attendance (idle >1 menit tanpa perubahan) | **15s** |
| Interval tracking | **15s** (pakai debounce existing) |
| Tab hidden / halaman lain | **STOP total** (0 request) — `document.visibilityState` |
| UI indikator | **Halus**: dot hijau "● Live · diperbarui Xs lalu", berkedip saat fetch |

Adaptif = cepat saat aktivitas, lambat saat sepi. Bukan interval konstan (3s konstan boros
VM tanpa benefit terasa vs 5s).

---

## 3. Arsitektur — env-gated adapter (pola sama dengan client-split)

Prinsip: satu API hook, dua implementasi, dipilih env `NEXT_PUBLIC_DATA_POSTGREST_URL`.
Sama seperti `createClient()` yang sudah env-gated. Jadi kode **jalan di kedua mode** — tak
merusak dev cloud yang existing, langsung kepakai saat cutover.

```
useAttendanceRealtime(meetingId, opts)   ← API TIDAK berubah (consumer tak diubah)
  │
  ├─ NEXT_PUBLIC_DATA_POSTGREST_URL unset  → useAttendanceRealtimeCloud  (postgres_changes, existing)
  └─ NEXT_PUBLIC_DATA_POSTGREST_URL set    → useAttendanceRealtimePolling (SWR refreshInterval adaptif)
```

Return shape dijaga identik: `{ attendanceMap, connectionStatus }`. Polling adapter petakan
`connectionStatus` → `'POLLING'` / `'SUBSCRIBED'`-equiv agar UI indikator seragam.

---

## 4. Langkah implementasi (batch)

### Batch 1 — Attendance adapter
1. Ekstrak API publik `useAttendanceRealtime` jadi dispatcher env-gated.
2. `useAttendanceRealtimeCloud.ts` = isi lama (postgres_changes) dipindah apa adanya.
3. `useAttendanceRealtimePolling.ts` = SWR ke `getAttendanceByMeeting(meetingId)` dengan:
   - `refreshInterval` adaptif (5s/15s via state "last change ts").
   - `refreshWhenHidden: false` (SWR stop saat tab hidden — verifikasi default).
   - Merge hasil ke `AttendanceMap` reuse `applyAttendanceEvent` / rebuild dari rows.
4. Reuse `useAttendanceRealtime.logic.ts` (reducer murni) — sudah ada unit test, jaga hijau.

### Batch 2 — Indikator UI halus
5. Komponen kecil `<RealtimeStatusDot status lastUpdated />` — dot + "diperbarui Xs lalu".
   Pakai komponen existing, JANGAN raw HTML (cek `components/ui/`).
6. Pasang di halaman detail presensi meeting (consumer `useAttendanceRealtime`).

### Batch 3 — Tracking adapter
7. `tracking/page.tsx`: bungkus channel `activity_logs` dengan cek env yang sama.
   Mode polling → interval 15s reuse `scheduleRefresh` yang sudah ada.

### Batch 4 — Test + verifikasi
8. Unit test polling reducer + pemilihan interval adaptif (RED→GREEN).
9. E2E/manual: mode cloud (env unset) = channel jalan seperti sekarang; mode self-host
   (env set) = polling jalan, tab hidden = 0 request (verif via Network tab).

---

## 5. Definition of Done (gate cutover)

- [ ] `useAttendanceRealtime` live-update di mode self-host (polling), tab hidden = stop.
- [ ] `tracking-logs-changes` auto-refresh di mode self-host.
- [ ] Mode cloud (env unset) TIDAK berubah perilaku — regression guard hijau.
- [ ] Indikator UI halus tampil, timestamp update jalan.
- [ ] Unit test hijau, type-check 0 error.
- [ ] sm-4onc closed → sm-91yt (cutover) unblocked.

---

## 6. Catatan

- Presence `online-users` JANGAN disentuh — aman, tetap Supabase Cloud.
- Interval bisa di-tune via konstanta terpusat (mudah ubah kalau VM bandwidth jadi isu).
- Adapter ini juga fondasi kalau nanti mau upgrade ke SSE (ganti impl polling saja, API tetap).
