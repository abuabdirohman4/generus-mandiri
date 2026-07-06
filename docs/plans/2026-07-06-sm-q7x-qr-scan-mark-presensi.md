# Plan — sm-q7x — QR Code Attendance: generate, scan & mark hadir

**Issue:** sm-q7x · feat: QR Code Attendance - scanner absensi & cetak QR siswa
**Type:** feature (P3) · **GH:** #25
**Date:** 2026-07-06

> **Scope split (2026-07-06):** Issue ini fokus INTI QR — generate QR per siswa, scan via kamera di meeting detail, mark hadir. Realtime counter "X/Y hadir" = **sm-f1nh** (sudah ada plan `useAttendanceRealtime`). Bulk cetak kartu dari template desain custom = **issue terpisah** (lihat `docs/plans/2026-07-06-<id>-bulk-kartu-id-template.md`). Deskripsi lama sm-q7x (html5-qrcode, folder `absensi`, bulk print grid) DIGANTIKAN plan ini.

---

## 1. Context

Presensi saat ini manual (centang siswa satu-satu di tabel meeting detail). User ingin opsi lebih cepat: tiap siswa punya QR identitas, admin/guru scan pakai kamera untuk mark hadir. Terinspirasi repo `Afiyatna/presensi-mudamudi3` (Vite+Supabase, QR working) — TAPI stack kita beda (Next 15 + React 19) jadi pilihan library disesuaikan.

**Keputusan terkonfirmasi user:**
- Izin scan = sama dengan yang sudah bisa edit presensi meeting itu (reuse permission existing, tidak ada role baru).
- QR payload = permanen, plain `student_id` (tanpa expiry/signing). Trade-off diterima: cuma untuk presensi, bukan akses sensitif.
- Scanner = `html5-qrcode` (**dikoreksi 2026-07-06** — sempat dicoba `@yudiel/react-qr-scanner` karena React 19-friendly, tapi GAGAL di manual test: library itu bergantung Barcode Detection API browser native + WASM polyfill dari CDN eksternal, rapuh di desktop browser tanpa native support. `html5-qrcode` bundle decoder ZXing sendiri, robust tanpa dependensi CDN runtime — sama seperti yang dipakai repo referensi setelah mereka juga pindah dari react-scanner).

## 2. Reuse / Context (terverifikasi via kode + DB)

- **Attendance write path**: `src/app/(admin)/presensi/actions/attendance/queries.ts:12` — `upsertAttendanceLogs(supabase, records)`, upsert `attendance_logs` `onConflict:'student_id,meeting_id'`. Status enum `'H'|'I'|'S'|'A'`.
- **WIB date math**: `saveAttendanceForMeeting` (actions.ts:140-146) sudah punya logic offset +7h dari `meeting.date`. Extract jadi helper shared, JANGAN duplikasi.
- **Roster peserta meeting** = `meeting.student_snapshot` (array student_id) — sumber kebenaran yang dipakai `useMeetingAttendance` + `calculateAttendancePercentage`. BUKAN `class_ids`.
- **Permission edit attendance**: `canUserEditMeetingAttendance(...)` di `src/app/(admin)/presensi/actions/meetings/helpers.client.ts`. Reuse untuk gate tab (client show/hide) + re-check server-side di action baru.
- **Tab pattern**: hand-rolled `useState activeTab` + header kecil. Contoh `src/app/(admin)/laporan/components/LaporanTabHeader.tsx` (`{id,label}[]` + `activeTab`/`onTabChange`). Generalize, jangan bikin markup baru.
- **3-layer architecture** (CLAUDE.md / architecture-patterns.md §3-Layer): `queries.ts` (Layer 1, DB, terima supabase param) → `logic.ts` (Layer 2, pure) → `actions.ts` (Layer 3, `'use server'`). Test co-located di `__tests__/`.
- **PDF (untuk halaman QR per-siswa, single)**: reuse `@react-pdf/renderer` (sudah terpasang, dipakai rapot) — bukan jsPDF.
- **DB terverifikasi**: `attendance_logs` RLS enabled + policy SELECT scoped (admin/teacher/superadmin). Realtime enforce RLS otomatis (relevan untuk sm-f1nh, bukan issue ini).

## 3. Dependency Baru
- `html5-qrcode` — scanner kamera. Bundle decoder ZXing sendiri, tidak bergantung Barcode Detection API native / WASM CDN eksternal (lihat catatan koreksi di §1).
- `qrcode.react` — render QR di komponen React (halaman QR per-siswa).
- Reuse `@react-pdf/renderer` untuk cetak single-card. TIDAK perlu `jspdf`/`html2canvas`.

## 4. Tasks

### Task 1 — QR generation util + halaman QR per-siswa
- Payload format: `GM-STUDENT:<student_id>` (prefix namespace → scanner bisa langsung tolak QR non-app tanpa lookup).
- **Layer 2 (logic, TDD)** `src/lib/qr/qrPayload.ts`:
  - `buildStudentQrPayload(studentId: string): string` → `` `GM-STUDENT:${studentId}` ``
  - `parseStudentQrPayload(raw: string): { studentId: string } | null` → validasi prefix, return null kalau bukan format app.
  - Test: build+parse round-trip, reject payload tanpa prefix, reject string kosong.
- New page `src/app/(admin)/users/siswa/[studentId]/qr/page.tsx` — render `<QRCodeCanvas value={buildStudentQrPayload(id)} />` + identitas + tombol download PNG + tombol cetak (single card via `@react-pdf/renderer`).
- Tambah entry di `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx` `TabItem[]` (`{label:'Kartu QR', href:.../qr, match:'/qr'}`).

### Task 2 — Server action markAttendanceByQrScan (3-layer)
Folder: `src/app/(admin)/presensi/actions/attendance/`.
- **Layer 2 (logic, TDD)** di `logic.ts`:
  - `getMeetingWibDateStr(meetingDate: string): string` — extract dari inline `saveAttendanceForMeeting:140-146` (offset +7h → `toISOString().split('T')[0]`). Refactor `saveAttendanceForMeeting` untuk pakai helper ini juga (hindari dup). Test: input timestamptz UTC midnight → return tanggal WIB benar.
  - `isStudentInMeeting(studentSnapshot: string[], studentId: string): boolean`. Test: ada/tidak ada.
- **Layer 3 (action)** di `actions.ts`:
  ```
  markAttendanceByQrScan(meetingId: string, studentId: string): Promise<{
    success: boolean
    status: 'marked' | 'already_marked' | 'not_in_meeting' | 'error'
    studentName?: string
    message?: string
  }>
  ```
  Logic: (1) auth check pola `saveAttendanceForMeeting`. (2) permission re-check server-side (setara `canUserEditMeetingAttendance`). (3) fetch meeting via `createAdminClient()` `.select('teacher_id, class_ids, date, student_snapshot')`, validasi `isStudentInMeeting(student_snapshot, studentId)` → else `not_in_meeting`. (4) cek existing row `attendance_logs (student_id, meeting_id)` — kalau sudah `status='H'` → `already_marked` (bukan error). (5) `upsertAttendanceLogs(admin, [{student_id, meeting_id, date: getMeetingWibDateStr(meeting.date), status:'H', recorded_by: profile.id}])`. (6) `logActivity` + `revalidatePath('/presensi')`.
  - Export via barrel `actions/index.ts`.

### Task 3 — Tab Scan QR di meeting detail
- New component `src/app/(admin)/presensi/components/PresensiTabHeader.tsx` — generalize `LaporanTabHeader` (props `{id,label}[]` + `activeTab`/`onTabChange`).
- Modify `src/app/(admin)/presensi/[meetingId]/page.tsx`: tambah `activeTab` state (`'daftar-hadir' | 'scan-qr'`). Tab `scan-qr` cuma render kalau (a) user boleh edit attendance (`!isReadOnlyMeeting`) DAN (b) meeting level Desa/Daerah (`isDesaOrDaerahMeeting`, reuse pola `getLevelRank`/`activity_level.code` yang sudah ada di file ini — **dikonfirmasi user 2026-07-06**: pertemuan Kelompok tidak butuh QR scan, cukup manual). Existing view (SummaryCard + DataFilter + AttendanceTable) di bawah `daftar-hadir`.
- New component `src/app/(admin)/presensi/components/QrScannerTab.tsx` — pakai `Html5Qrcode` class dari `html5-qrcode` (bukan React component, manual lifecycle `new Html5Qrcode(elementId)` + `.start()`/`.stop()`/`.clear()`), guard `isProcessingRef`/`isStoppingRef` (port dari pola repo referensi) + feedback (nama siswa terakhir discan, badge status) + list "baru discan". Props: `meetingId`, `students`.
- New hook `src/app/(admin)/presensi/hooks/useQrScanCooldown.ts` — debounce payload (`lastPayloadRef` + timestamp, cooldown 2s), parse via `parseStudentQrPayload`, panggil `markAttendanceByQrScan`. Return `{handleScan, lastResult, isProcessing}`.
- On scan sukses: optimistic update `localAttendance` + toast (`sonner`). Status `already_marked` → toast info beda warna, bukan error.

## 5. Verifikasi
- **QR generate**: buka `/users/siswa/[id]/qr` → QR render, download PNG jalan, decode manual pakai HP → hasil `GM-STUDENT:<uuid>`.
- **Scan flow**: meeting detail → tab Scan QR → scan QR siswa terdaftar → row `attendance_logs` status `H` masuk → scan ulang QR sama → feedback `already_marked`, tidak dobel insert.
- **not_in_meeting**: scan QR siswa yang BUKAN peserta meeting → toast `not_in_meeting`, tidak insert.
- **Permission**: login role tanpa izin edit meeting → tab Scan QR tidak muncul. Panggil action langsung (bypass UI) → ditolak server-side.
- **Kamera device nyata**: test di HP (permission kamera, facingMode belakang), bukan cuma webcam desktop.
- `npm run test:run` (logic Task 1 & 2 pass) + `npm run type-check`.

## 6. Commit
```
feat(presensi): QR code attendance — generate, scan & mark hadir

Tambah generate QR per siswa (GM-STUDENT:<id>), tab Scan QR di meeting
detail pakai @yudiel/react-qr-scanner, server action markAttendanceByQrScan
(3-layer, reuse upsertAttendanceLogs + student_snapshot roster).

fixes #25

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

## CLAUDE.md Check
- [ ] Route/page baru `/users/siswa/[studentId]/qr` — tambah ke App Router Structure? (sub-route, kemungkinan tidak wajib, tapi cek StudentTabHeader terdaftar).
- [ ] Pattern baru QR payload (`GM-STUDENT:` prefix) — dokumentasikan di `docs/claude/` kalau dipakai lintas fitur (scan + kartu).
- [ ] Dependency baru (`@yudiel/react-qr-scanner`, `qrcode.react`) — tambah ke Key Technologies CLAUDE.md.
- [ ] Tidak ada tabel DB baru di issue ini (reuse `attendance_logs`).
