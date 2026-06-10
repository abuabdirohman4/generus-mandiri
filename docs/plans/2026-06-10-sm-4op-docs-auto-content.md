# Plan: Otomasi Konten Dokumentasi (sm-4op)

## Context

**Masalah:** Scaffold MDX docs (Fumadocs/Nextra) sudah ada di `content/docs/` — 7 fitur (`fitur/*.mdx`) + 3 panduan role (`panduan/*.mdx`), tapi semua masih placeholder (`> Halaman ini sedang dalam pengerjaan`). Belum ada screenshot, video, atau konten nyata.

**Kebutuhan user:** Konten terisi **otomatis** sebisa mungkin, bukan manual:
- Screenshot per fitur → di-generate Playwright (multi-role login, navigate alur, jepret).
- Video pendek per fitur → di-rekam Playwright dengan **kecepatan diperlambat** (`slowMo`), tanpa narasi. Tujuan: user lihat fitur "benar-benar jalan" (gambar saja kurang jelas).
- Video di-upload user ke YouTube channel → user paste video ID ke slot embed MDX.
- Teks MDX (langkah, tips, contoh) → Claude draft dari fitur asli, user review.

**Outcome:** Pipeline reusable yang menghasilkan screenshot + video bot per fitur, komponen MDX untuk menampilkannya, dan draft konten docs yang tinggal di-review + diisi YouTube ID.

**Tracking:** 1 bead issue (sm-4op) dengan checklist fase di body — bukan banyak issue terpisah.

---

## Arsitektur Pipeline

```
Playwright capture spec (slowMo + screenshot)
  ├─ Login per role (helper existing: loginAsGuruDesa, dll)
  ├─ Navigate alur utama tiap fitur
  ├─ page.screenshot() di titik kunci → public/images/docs/<fitur>/*.png
  └─ video: 'on' → .webm → convert mp4 (ffmpeg) → user upload YouTube manual
       ↓
Komponen MDX (Image, Steps, Callout, YouTubeEmbed) di mdx-components.tsx
       ↓
Draft konten MDX (Claude tulis dari kode fitur) → embed screenshot + slot YouTube ID
       ↓
User: review teks + upload video + isi YouTube ID
```

---

## Fase Eksekusi (checklist di sm-4op)

### Fase 1: Seed data demo diperkaya
**Tujuan:** Screenshot tidak tampak kosong. User sudah punya akun demo — perkaya datanya.
- Buat script `scripts/seed-demo-data.ts` yang menambah data realistis ke **org demo existing** (konfirmasi org ID demo saat eksekusi): banyak siswa, kelas terisi, beberapa meeting + attendance, rapot dengan nilai, materi + progress.
- Idempotent (upsert), aman dijalankan ulang.
- **CATATAN:** Jangan pakai data production (data sensitif siswa bocor di docs publik).

### Fase 2: Komponen MDX
**Tujuan:** `src/mdx-components.tsx` sekarang kosong (`return {}`). Tambah komponen tampilan.
- `YouTubeEmbed.tsx` — terima `id` prop, render iframe responsif. Slot dengan placeholder ID kosong → tampilkan "video segera hadir".
- `Steps` / `Step` — numbered walkthrough.
- `Callout` — tips/warning/info (manfaatkan style blockquote existing di `docs.css`).
- `DocImage` — wrapper Next Image, path `/images/docs/...`, lazy + caption (style `.docs-content img` sudah ada).
- Register semua di `useMDXComponents()`.
- File: `src/mdx-components.tsx`, komponen baru di `src/components/docs/`.

### Fase 3: Infra capture Playwright
**Tujuan:** Spec khusus generate screenshot + video pelan. **Tidak mengganggu config test existing.**
- Buat **project Playwright terpisah** `docs-capture` di `playwright.config.ts` (jangan ubah `screenshot/video` global yang sekarang `only-on-failure`/`retain-on-failure`):
  ```ts
  {
    name: 'docs-capture',
    testDir: './tests/docs-capture',
    use: {
      ...devices['Desktop Chrome'],
      screenshot: 'on',
      video: 'on',
      launchOptions: { slowMo: 600 }, // perlambat agar alur kebaca di video
      viewport: { width: 1280, height: 800 },
    },
  }
  ```
- Spec di `tests/docs-capture/<fitur>.capture.ts` — pakai helper auth existing (`tests/e2e/helpers/auth.ts`: `loginAsGuruDesa`, `loginAsAdminKelompok`, `loginAsSuperadmin`, dll).
- Tiap spec: login role yang sesuai → navigate alur utama fitur → `page.screenshot({ path: 'public/images/docs/<fitur>/NN-langkah.png' })` di titik kunci → biarkan video merekam seluruh alur.
- Script post-process: `ffmpeg` convert `.webm` (di `test-results/`) → `.mp4` ke folder staging (`docs-videos/`) untuk user upload YouTube.
- npm script baru: `test:docs-capture` (`playwright test --project=docs-capture`).
- Selector pattern reuse dari spec existing (`a[href^="/presensi/"]`, `button:has-text(...)`, `getByRole`, `.ant-table`).

### Fase 4: Konten per fitur (batch, di-review user)
**Tujuan:** Isi tiap MDX dengan teks nyata + embed screenshot + slot YouTube.
Per fitur, Claude tulis: ringkasan, langkah penggunaan (Steps + screenshot), tips (Callout), contoh kasus, slot `<YouTubeEmbed id="" />`.
- `fitur/absensi.mdx` — /presensi: filter → buat meeting → mark attendance (role: guru).
- `fitur/rapot.mdx` — /rapot: pilih siswa → edit → export PDF (role: admin).
- `fitur/monitoring.mdx` — /tracking: presence, audit log, filter (role: superadmin).
- `fitur/kelas.mdx` — /kelas: tab Kelas/Master, batch standar (role: admin).
- `fitur/materi.mdx` — /materi: content/kelas view, item modal (role: guru/admin).
- `fitur/organisasi.mdx` — /organisasi: tab daerah/desa/kelompok cascading (role: admin).
- `fitur/users.mdx` — /users/siswa|guru|admin: list, modal, import, transfer (role: admin).
- `panduan/guru.mdx`, `panduan/admin.mdx`, `panduan/superadmin.mdx` — alur kerja per role lintas fitur.

---

## File Kunci

| File | Aksi |
|---|---|
| `scripts/seed-demo-data.ts` | BARU — seed data demo |
| `src/mdx-components.tsx` | MODIF — register komponen (sekarang `return {}`) |
| `src/components/docs/YouTubeEmbed.tsx`, `Steps.tsx`, `Callout.tsx`, `DocImage.tsx` | BARU |
| `playwright.config.ts` | MODIF — tambah project `docs-capture` (jangan utak-atik config existing) |
| `tests/docs-capture/*.capture.ts` | BARU — spec capture per fitur |
| `tests/e2e/helpers/auth.ts` | REUSE — helper login |
| `public/images/docs/<fitur>/*.png` | OUTPUT — screenshot |
| `content/docs/fitur/*.mdx`, `content/docs/panduan/*.mdx` | MODIF — isi konten |
| `package.json` | MODIF — script `test:docs-capture` |

---

## Verifikasi

1. **Seed:** jalankan script, cek via app/Supabase data demo terisi realistis.
2. **Komponen:** render 1 MDX percobaan dengan tiap komponen, buka `/docs`, cek tampilan + dark mode.
3. **Capture:** `npm run test:docs-capture` → screenshot muncul di `public/images/docs/`, video `.webm` di `test-results/`, mp4 ter-convert. Tonton video: alur kebaca (tidak terlalu cepat).
4. **Docs:** buka `/docs/fitur/<x>` — teks, screenshot tampil, slot YouTube tampil placeholder saat ID kosong.
5. **End-to-end 1 fitur dulu** (Absensi) sebagai pilot sebelum batch sisanya.

## Keputusan Terkunci
- Video: Playwright `slowMo` rekam bot, tanpa narasi, tunjuk fitur jalan.
- Hosting video: YouTube (user upload manual, paste ID ke MDX).
- Teks: Claude draft, user review.
- Seed: perkaya akun demo existing (bukan production).
- Tracking: 1 issue sm-4op + checklist fase internal.

## Catatan untuk Eksekusi
- Model: Sonnet (eksekusi terdefinisi).
- Mulai pilot 1 fitur (Absensi) end-to-end dulu, validasi pipeline, baru batch sisanya.
- Konfirmasi org ID demo ke user sebelum seed.

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini?
- [ ] Apakah ada route baru? → Tidak (docs route sudah ada)
- [ ] Apakah ada MDX component pattern baru? → Ya, `src/components/docs/` perlu didokumentasikan setelah implementasi
- [ ] Jika ada yang perlu diupdate → update `docs/claude/architecture-patterns.md` setelah implementasi selesai
