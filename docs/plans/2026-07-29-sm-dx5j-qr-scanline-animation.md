# Plan: Garis Scan Naik-Turun (QRIS-style) di QR Presensi

## Context

Viewport kamera scan QR presensi (`QrScannerTab.tsx`) polos — tidak ada indikator visual bahwa app sedang aktif memindai. User minta animasi garis naik-turun seperti QRIS di aplikasi bank digital untuk memberi feedback visual "sedang scan".

Ini murni UI overlay (CSS animation), tidak menyentuh logika scan / html5-qrcode / cooldown.

## Scope

- **2 file** yang diubah
- **~20 baris** total
- Mode: **B (Direct)**

---

## Task 1 — Tambah keyframe + kelas CSS di `globals.css`

**File:** `src/app/globals.css`

**Sisipkan** di dekat blok `@keyframes pulse` yang sudah ada (~baris 812, setelah penutup `}` keyframes pulse):

```css
@keyframes qr-scanline {
  0%   { top: 0%; }
  50%  { top: calc(100% - 2px); }
  100% { top: 0%; }
}

.qr-scanline {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-brand-500), transparent);
  box-shadow: 0 0 8px 2px color-mix(in srgb, var(--color-brand-500) 60%, transparent);
  animation: qr-scanline 2.5s ease-in-out infinite;
  pointer-events: none;
}
```

---

## Task 2 — Bungkus viewport dengan wrapper relative di `QrScannerTab.tsx`

**File:** `src/app/(admin)/presensi/components/QrScannerTab.tsx`

**Ganti** blok viewport (branch non-error) dari:

```tsx
<div
  id={QR_ELEMENT_ID}
  ref={qrRef}
  className="aspect-square w-full overflow-hidden rounded-md [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
/>
```

**Jadi:**

```tsx
<div className="relative aspect-square w-full overflow-hidden rounded-md">
  <div
    id={QR_ELEMENT_ID}
    ref={qrRef}
    className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
  />
  <div className="qr-scanline" />
</div>
```

**Kenapa aman:**
- Wrapper `relative` + `overflow-hidden` = garis tidak keluar dari viewport
- `pointer-events-none` di `.qr-scanline` = scan QR tetap berfungsi
- Garis ada di dalam branch `else` (non-error) → otomatis tidak muncul saat kamera gagal
- html5-qrcode inject video + UI internal ke `#qr-reader-presensi` div, tidak terganggu oleh sibling div

---

## Verifikasi

1. `npm run dev` → `/presensi` → pilih pertemuan → tab **Scan QR**
2. Izinkan kamera → garis brand-color menyapu naik-turun mulus (~2.5s/siklus)
3. Dark mode: garis tetap kontras (brand-500 + glow)
4. Tolak izin kamera → pesan error tampil, garis tidak muncul
5. Scan QR nyata → terdeteksi normal (overlay tidak blocking)

---

## TDD Note

UI presentasional murni (CSS animation overlay) — TDD skip sesuai aturan CLAUDE.md.

---

## CLAUDE.md Check
- [ ] Pattern baru? Tidak — ini CSS overlay standar, sudah ada pola `@keyframes` di globals.css
- [ ] Tabel baru? Tidak
- [ ] Route baru? Tidak
- [ ] Permission pattern baru? Tidak
- [ ] Tidak ada yang perlu diupdate di CLAUDE.md / docs/claude/
