# Pangkas Egress List /presensi — sm-2fux

**Tanggal:** 2026-07-10
**Beads:** sm-2fux (P1)
**GH:** #TBD
**Status:** direncanakan

## Konteks — kenapa ini ada

`/presensi` (list pertemuan, halaman absensi harian) = **215 view pada 10 Jul — frekuensi TERTINGGI dari semua halaman**. Karena egress = payload × frekuensi, halaman ini kandidat kuat penyumbang egress besar walau per-view lebih ringan dari /laporan.

**Bukti dari git history (dicek):** commit `b2c7e15` (sm-kt2j "reduce egress") HANYA menyentuh `swr.ts`, `useNotifications.ts`, `middleware.ts` — setting global (revalidateOnFocus, notif polling, prefetch). Query list meeting `/presensi` **tidak pernah dioptimasi**. Efek "terasa lebih hemat" = frekuensi refetch turun (focus off), tapi **bytes per fetch tetap gemuk**.

### Sumber boros (baca `fetchMeetingsByClass`, `presensi/actions/meetings/queries.ts:59`)

Query list meeting fetch tiap row:
- **`student_snapshot`** — jsonb array id siswa (bisa 174 id/row). Di list **cuma lewat**: `MeetingCards.tsx:434` deklarasi type tapi TIDAK render; dipakai `CreateMeetingModal.tsx:553-555` saat **EDIT** pertemuan (pre-fill siswa terpilih). Jadi tak perlu di query list — ambil saat modal edit buka.
- **`description`** — hanya dipakai `CreateMeetingModal` (edit-prefill, line 55/526). Tidak dirender di card.
- **`topic`** — dipakai `MeetingCards.tsx:701-703` render di card → **KEEP**.

`fetchMeetingById` (queries.ts:12) sudah membawa `student_snapshot` + `topic` + `description` lengkap → sudah jadi jalur lazy-fetch yang siap dipakai modal edit. Tidak perlu bikin query baru.

### Pagination sudah ada (jangan diutak-atik)

`fetchMeetingsByClass` sudah cursor-paginated (`limit` + `.lt('created_at', cursor)`). Itu bagus — jangan diubah.

## Keputusan: drop field gemuk dari list, lazy-fetch saat modal edit

Pola sama seperti sm-euox (detail-presensi) dan sm-5jzd (laporan): field gemuk yang hanya dipakai pada aksi klik jangan di-egress untuk semua row. Ambil on-demand.

## Scope

### Task 1 — Trim query list

`fetchMeetingsByClass` (queries.ts:~67) — buang `student_snapshot` dan `description` dari select. Pertahankan: `topic` (dirender di card) + sisanya. Hasil: payload list menyusut sebesar snapshot jsonb + description text setiap row.

```typescript
// select baru (buang student_snapshot, description):
id, class_id, class_ids, teacher_id, title, date, topic,
created_at, activity_type_id, activity_level_id, start_time, check_time_enabled,
activity_type:activity_types(id, code, name),
activity_level:activity_levels(id, code, name),
kelompok_ids,
classes ( id, name )
```

### Task 2 — Lazy-fetch saat modal edit dibuka

`CreateMeetingModal` saat mode edit butuh `student_snapshot` (pre-fill siswa) + `description`. Alih-alih mengandalkan object list:
- Saat modal edit dibuka, panggil `getMeetingById(meetingId)` (server action yang sudah ada, membungkus `fetchMeetingById` — verifikasi export-nya di `presensi/actions`; kalau belum ada, tambah tipis).
- Isi `formData.student_snapshot`, `formData.description`, `formData.topic` dari hasil lazy-fetch itu, bukan dari prop list.
- SWR/state: fetch sekali saat buka, jangan refetch on focus.

**Tipe:** buat `student_snapshot?` dan `description?` OPSIONAL pada tipe meeting yang dipakai list (`MeetingCards`/`MeetingList`/`useMeetings`). Update tipe canonical di `src/types/meeting.ts` — jangan redefine inline. List tak lagi menjamin field itu; modal edit yang menyediakannya.

### Task 3 — Verifikasi konsumen lain

`MeetingList.tsx:432` juga deklarasi `student_snapshot: string[]` dan `topic` di-comment (tidak render). Pastikan tak ada tempat lain di list yang membaca `student_snapshot`/`description` selain modal edit. Grep sebelum finalisasi:
```bash
grep -rn "student_snapshot\|\.description" src/app/\(admin\)/presensi/components/
```
Kalau ada render yang butuh `.length` (mis. badge "X siswa") — ganti jadi count ringan (mirip sm-5jzd `snapshot_count`) via RPC/select count, bukan tarik full array. (Dari cek awal: tidak ada render `.length` di card — konfirmasi ulang.)

### Task 4 — Tests

- `queries.test`: assert select `fetchMeetingsByClass` TIDAK mengandung `student_snapshot`/`description`; `fetchMeetingById` tetap mengandungnya.
- Komponen: `CreateMeetingModal` edit mode tetap pre-fill siswa+topic+description setelah lazy-fetch; render gracefully saat field absen di object list.
- User jalankan `npm run test:run` + `npm run type-check` (Claude tidak menjalankan test — feedback proyek).

## Verifikasi

- Buka `/presensi`: list + card identik (topic tetap tampil, jumlah/nama benar).
- Edit pertemuan → modal pre-fill siswa terpilih + topic + description benar.
- `mcp get_logs (api)` sesudah buka /presensi: URL list meeting tidak lagi memuat `student_snapshot`/`description`; `meetings?id=eq.<x>` (lengkap) hanya muncul saat modal edit dibuka.
- Dashboard egress: PostgREST MB per load /presensi turun. Karena frekuensi tertinggi, dampak absolut berpotensi terbesar.

## Risiko

- SEDANG. Task 1 aman (drop field tak-terender). Task 2 menyentuh alur edit modal (state pre-fill) — ditutup test komponen + tipe opsional. Hati-hati: jangan sampai create/edit pertemuan kehilangan data siswa saat submit.

## CLAUDE.md Check
- [ ] Pattern baru? Tidak — sama dengan sm-euox (lazy-fetch field gemuk saat aksi). Sudah tercakup aturan di `egress-cost-optimization.md`.
- [ ] Tabel DB baru? Tidak.
- [ ] Route/page baru? Tidak.
- [ ] Permission pattern baru? Tidak.

## Terkait
- sm-euox (detail-presensi) — pola identik, halaman beda.
- sm-5jzd (laporan RPC) — sekelas.
- `docs/claude/egress-register.md` (biang #— akan ditambah baris untuk /presensi).
- `docs/claude/egress-cost-optimization.md`.

## Workflow / handoff
- Claude Code: plan + bd (sm-2fux) + GH + prompt.
- Implementasi: Antigravity (≥3 file: queries, modal, hook/action, types, tests) atau direct.
- User: git + jalankan test.
