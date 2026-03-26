# Design: QR Code Attendance

**Date:** 2026-03-21
**Beads Issue:** sm-q7x
**Status:** Approved — ready for implementation

---

## Context

Sistem absensi saat ini mengharuskan guru membuka halaman detail pertemuan dan mencentang status (H/I/S/A) satu per satu untuk setiap siswa. Proses ini lambat, terutama untuk pertemuan dengan banyak siswa.

**Problem:** Tidak ada cara cepat untuk mencatat kehadiran satu siswa — setiap absensi butuh scroll, cari nama, klik status.

**Solution:** Tambah tab "Scan QR" di halaman detail pertemuan. Setiap siswa punya QR code unik berdasarkan UUID mereka. Guru scan QR siswa → siswa otomatis tercatat Hadir, tanpa klik Simpan. QR code bisa dicetak dari halaman biodata (individual) atau list siswa (bulk).

---

## Scope

1. **Scanner tab** di `/absensi/[meetingId]` — kamera scan → auto-set H + auto-save
2. **QR display** di `/users/siswa/[studentId]/biodata` — tampilkan + cetak 1 siswa
3. **Bulk print** di `/users/siswa` — checkbox multi-pilih → cetak PDF (2 format)

---

## Key Decisions

### QR Data Format: Plain UUID (bukan JSON)

UUID siswa di-encode langsung sebagai string, contoh: `550e8400-e29b-41d4-a716-446655440000`

**Kenapa bukan JSON** `{"id": "...", "type": "student"}`:
- Lebih banyak karakter = QR lebih padat = lebih susah di-scan di kartu kecil
- UUID sudah globally unique, tidak perlu namespace tambahan
- Kalau nanti perlu extend, bisa pakai prefix `STU:uuid` tanpa schema baru

### QR Generation Library: `qrcode` (npm)

Bukan `qrcode.react` karena:
- `qrcode` menghasilkan base64 PNG via `toDataURL()` — dipakai di **browser** `<img>` DAN di **PDF** via `@react-pdf/renderer` `<Image>`
- `qrcode.react` hanya output JSX component, tidak bisa di-embed ke PDF — butuh 2 library

### Scanner Library: `html5-qrcode`

Dipilih vs `@zxing/library` karena:
- Handle iOS Safari quirks dengan `getUserMedia` secara otomatis
- API sederhana — init, start, stop
- Tidak perlu manage raw MediaStream secara manual

### Tidak Ada Perubahan Database

QR code adalah fungsi deterministik dari `students.id` yang sudah ada. Auto-save scan menggunakan `saveAttendanceForMeeting` yang sudah ada, dipanggil dengan 1 record per scan.

---

## Architecture

### Flow: Scan QR untuk Absensi

```
Guru buka tab "Scan QR"
  → QRScannerTab mount → start Html5Qrcode camera
  → Scan QR siswa → onScanSuccess(uuid)
  → Cek: uuid ada di visibleStudents? Belum H?
  → Optimistic update localAttendance
  → saveAttendanceForMeeting(meetingId, [{student_id, date, status:'H'}])
  → Feedback: nama siswa + "ditandai Hadir" (3 detik)
  → SummaryCard update real-time
```

### Flow: Cetak QR Bulk

```
Guru centang siswa di tabel
  → Tombol "Cetak QR (N)" muncul di header
  → Klik → QRPrintModal terbuka
  → Pilih format: Sheet Grid (6/hal) atau Kartu Individual (1/hal)
  → Klik "Cetak PDF"
  → generateStudentQRDataURL dipanggil per siswa (tampilkan progress)
  → QRPrintDocument di-render via @react-pdf/renderer
  → PDF blob → download otomatis
```

---

## Files

### Files Baru (9 files)

| File | Deskripsi |
|------|-----------|
| `src/lib/qr/generateQR.ts` | Utility `generateStudentQRDataURL(id) → base64 PNG` |
| `src/lib/qr/__tests__/generateQR.test.ts` | Unit test utility |
| `src/app/(admin)/absensi/components/QRScannerTab.tsx` | Scanner UI, camera lifecycle, feedback |
| `src/app/(admin)/users/siswa/components/QRCodeDisplay.tsx` | Display QR di browser (`<img>`) |
| `src/app/(admin)/users/siswa/components/QRPrintDocument.tsx` | PDF layouts: kartu + grid |
| `src/app/(admin)/users/siswa/components/QRPrintModal.tsx` | Modal format picker + progress |

### Files Dimodifikasi (4 files)

| File | Perubahan |
|------|-----------|
| `src/app/(admin)/absensi/[meetingId]/page.tsx` | Tambah tab state, `handleQRScan`, UI tab, QRScannerTab |
| `src/app/(admin)/users/siswa/[studentId]/biodata/page.tsx` | Tambah section QR di bawah StudentProfileView |
| `src/app/(admin)/users/siswa/components/StudentsTable.tsx` | Tambah optional QR checkbox column |
| `src/app/(admin)/users/siswa/page.tsx` | State selection, tombol Cetak QR, QRPrintModal |

---

## Print Layout Design

### Sheet Grid (6 per halaman A4)
```
┌──────────────┬──────────────┐
│  [Nama]      │  [Nama]      │
│  [Kelas]     │  [Kelas]     │
│  ┌────────┐  │  ┌────────┐  │
│  │  QR    │  │  │  QR    │  │
│  │ 72x72  │  │  │ 72x72  │  │
│  └────────┘  │  └────────┘  │
│ Scan Absensi │ Scan Absensi │
├──────────────┼──────────────┤
│    ...       │    ...       │
└──────────────┴──────────────┘
```
- 2 kolom × 3 baris = 6 kartu per halaman
- Border tipis (0.5pt) → mudah digunting

### Kartu Individual (1 per halaman A4)
```
┌──────────────────────────┐
│    Nama Lengkap Siswa    │
│   Kelas · Kelompok       │
│                          │
│    ┌──────────────┐      │
│    │   QR 180pt   │      │
│    └──────────────┘      │
│    Scan untuk Absensi    │
└──────────────────────────┘
```
- Cocok untuk dilaminating sebagai kartu permanen

---

## Error Handling: Scanner

| Kondisi | Behavior |
|---------|----------|
| UUID valid, siswa ada di meeting | Set H, feedback hijau "✓ [Nama] — ditandai Hadir" |
| UUID valid, siswa sudah H | Feedback kuning "⚠ [Nama] — sudah ditandai Hadir" |
| UUID tidak ada di student list meeting | Feedback merah "✕ Siswa tidak terdaftar dalam pertemuan ini" |
| Kamera permission denied | Pesan instruksi statis (tidak crash) |
| Scan duplikat dalam 5 detik | Diabaikan silently (debounce) |

---

## Non-Scope (Tidak Dikerjakan Sekarang)

- Siswa scan layar besar secara mandiri (butuh akun siswa)
- QR code expire / rotation (UUID tidak berubah, QR static)
- Scan multi-kamera (hanya kamera belakang)
- Status selain H saat scan (misalnya I/S via QR)
- Manajemen QR dari halaman settings
