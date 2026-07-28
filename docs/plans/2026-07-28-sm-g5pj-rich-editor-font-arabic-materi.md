# Plan: Rich Editor + Font Arabic untuk Konten Materi

## Context

Di halaman `/materi`, pengisian **konten Sub Materi** (`MaterialItem.content`) saat ini flat plain-text: input `<textarea>` di `ItemModal.tsx`, disimpan sebagai TEXT, dirender apa adanya (`whitespace-pre-wrap`) di `ContentViewModal.tsx`. User ingin rich editor (formatting + **pemilihan font**, termasuk font Arabic yang bagus) supaya konten materi keagamaan (teks arab) tampil rapi.

Project SUDAH punya komponen rich editor TipTap (`src/components/ui/rich-text-editor/RichTextEditor.tsx`) yang dipakai di pengumuman/notifikasi. Rencana ini **reuse** komponen itu (extend, bukan bikin baru), tambah pemilihan font, dan sediakan 2 font Arabic legal (OFL): **Amiri** + **Scheherazade New** (via Google Fonts). "International Arabic" (Microsoft, proprietary) TIDAK di-bundle — diganti Amiri yang mirip. Bonus: memperbaiki bug lama `font-arabic` yang dipakai di `MaterialCard.tsx:39` tapi tak pernah didefinisikan.

Outcome: guru/admin bisa menulis konten materi dengan bold/italic/list + memilih font (Default / Amiri / Scheherazade New), teks Arabic tampil dengan font naskh yang bagus di editor, di kartu materi, dan di modal view.

## Font set final (keputusan user)
- **Default** (Outfit — font aplikasi)
- **Amiri** (Arabic, OFL) — pengganti "International Arabic"
- **Scheherazade New** (Arabic, OFL)

---

## Tasks

### Task 1 — Install deps
```bash
npm i @tiptap/extension-text-style @tiptap/extension-font-family
```
`@tiptap/extension-list-item` sudah tercakup StarterKit — tidak perlu.
Verifikasi: keduanya muncul di `package.json` dependencies, versi sejajar `@tiptap/react@^3.5.3`.

### Task 2 — Load font Arabic (Amiri + Scheherazade New)
File: `src/app/layout.tsx`

Tambah di sebelah import `Outfit`:
```typescript
import { Outfit, Amiri, Scheherazade_New } from 'next/font/google';

const outfit = Outfit({ subsets: ["latin"] });
const amiri = Amiri({ subsets: ['arabic'], weight: ['400','700'], variable: '--font-amiri' });
const scheherazade = Scheherazade_New({ subsets: ['arabic'], weight: ['400','700'], variable: '--font-scheherazade' });
```
Pada `<html>` className, gabungkan variabel font (className sekarang `outfit.className` — cari & ganti jadi menyertakan `${amiri.variable} ${scheherazade.variable}`). Pertahankan `outfit.className` sebagai font utama.

### Task 3 — Definisikan utility font (+ perbaiki bug `font-arabic`)
File: `src/app/globals.css`

Di dalam `@theme { ... }` (setelah `--font-outfit`):
```css
  --font-amiri: var(--font-amiri), 'Amiri', serif;
  --font-scheherazade: var(--font-scheherazade), 'Scheherazade New', serif;
```
Ini memberi Tailwind class `font-amiri` & `font-scheherazade`.

Tambahkan juga alias untuk bug lama `font-arabic` (dipakai `MaterialCard.tsx:39`) — arahkan ke Amiri sebagai default arab. Di luar `@theme`, tambah:
```css
.font-amiri { font-family: var(--font-amiri), 'Amiri', serif; }
.font-scheherazade { font-family: var(--font-scheherazade), 'Scheherazade New', serif; }
.font-arabic { font-family: var(--font-amiri), 'Amiri', serif; }
```
> Catatan: definisi eksplisit `.font-amiri`/`.font-scheherazade` dibutuhkan karena nilai font ini dipakai lewat **inline style** dari TipTap (lihat Task 4), sekaligus tetap tersedia sebagai utility class untuk `MaterialCard`.

### Task 4 — Extend RichTextEditor: font picker (opt-in)
File: `src/components/ui/rich-text-editor/RichTextEditor.tsx`

1. Tambah import:
```typescript
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
```
2. Tambah prop opsional `enableFontFamily?: boolean` (default `false`) supaya pemakaian di pengumuman TIDAK berubah.
3. Di array `extensions` `useEditor`, kalau `enableFontFamily` true, tambahkan `TextStyle`, `FontFamily`. (FontFamily butuh TextStyle.)
4. Tambah dropdown font di toolbar (hanya saat `enableFontFamily`), pakai komponen form existing bila cocok — kalau butuh `<select>`, gunakan `InputFilter`/`Select` dari `components/form/input/` (JANGAN raw `<select>`, sesuai aturan CLAUDE.md). Opsi:
   - `''` → "Default" → `editor.chain().focus().unsetFontFamily().run()`
   - `'Amiri, serif'` → "Arabic (Amiri)" → `setFontFamily('Amiri, serif')`
   - `"'Scheherazade New', serif"` → "Scheherazade New" → `setFontFamily(...)`
   Nilai aktif tercermin dari `editor.getAttributes('textStyle').fontFamily`.
5. Toolbar option label sebaiknya dirender memakai font-nya sendiri (preview) — opsional, kalau `InputFilter` mendukung custom render; kalau tidak, teks biasa cukup.

FontFamily menulis output `<span style="font-family: Amiri, serif">…</span>`. Ini berimplikasi ke sanitizer (Task 5).

### Task 5 — Widen sanitizer untuk span + style font
File: `src/lib/htmlText.ts` — fungsi `sanitizeHtml`

Sekarang `ALLOWED_TAGS` tanpa `span`, `ALLOWED_ATTR` tanpa `style`. Output FontFamily akan **dibuang** kalau tidak diperlebar.
```typescript
return DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'span', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
})
```
> `ul/ol/li` ditambah karena editor materi akan mengaktifkan list (Task 6). `style` diizinkan — DOMPurify secara default sudah mem-filter nilai style berbahaya (mis. `expression`, `url(javascript:)`), jadi aman untuk `font-family`.

TDD: tulis test `htmlText.test.ts` (RED dulu) — assert `sanitizeHtml('<span style="font-family: Amiri, serif">x</span>')` mempertahankan span+style; assert `<script>`/`onerror` tetap dibuang.

### Task 6 — Aktifkan editor + list di ItemModal
File: `src/app/(admin)/materi/components/modals/ItemModal.tsx` (textarea di ~line 404-413)

Ganti `<textarea>` konten dengan `<RichTextEditor value={formData.content} onChange={(html)=>setFormData(f=>({...f, content:html}))} enableFontFamily placeholder="Masukkan konten (opsional)" />`.

Karena materi butuh list (butir-butir), aktifkan bulletList/orderedList di StarterKit. Opsi:
- (a) Tambah prop `enableLists?: boolean` di RichTextEditor untuk tidak meng-disable list saat true, ATAU
- (b) cukup pakai fitur bold/italic/underline dulu.
Rekomendasi: **(a)** — materi sering butuh poin. Kalau ambil (a), pastikan `sanitizeHtml` sudah allow `ul/ol/li` (Task 5 sudah).

Simpan tetap lewat `createMaterialItem`/`updateMaterialItem` (tidak berubah — sudah terima `content: string`). Nilai `content` kini berisi HTML.

### Task 7 — Render HTML di ContentViewModal
File: `src/app/(admin)/materi/components/modals/ContentViewModal.tsx` (line 38-43)

Ganti render plain `{item.content}` jadi HTML tersanitasi:
```tsx
import { sanitizeHtml } from '@/lib/htmlText'
...
<div
  className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
  dir="auto"
  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content || '') }}
/>
```
Hapus `whitespace-pre-wrap` (HTML `<p>` sudah handle spacing). `dir="auto"` supaya paragraf Arabic otomatis RTL. Fallback "Tidak ada konten…" tetap.

### Task 8 — Backward-compat konten lama (plain text)
Konten materi existing masih plain-text (tanpa tag). Setelah Task 7, plain-text lama akan tampil sebagai satu blok (newline hilang karena bukan `<p>`).
Fix ringan di ContentViewModal: kalau `content` tidak mengandung `<` (bukan HTML), bungkus tiap baris ke `<p>` atau set `white-space: pre-wrap` untuk kasus itu. Contoh guard:
```tsx
const raw = item.content || ''
const isHtml = /<[a-z][\s\S]*>/i.test(raw)
const html = isHtml ? sanitizeHtml(raw) : `<p style="white-space:pre-wrap">${escapeHtml(raw)}</p>`
```
(Pakai helper escape sederhana untuk plain text; atau reuse yang ada bila tersedia.)

### Task 9 — Verifikasi type + lint
```bash
npm run type-check
```
Harus lulus. `npm run fix:all` untuk format.

---

## Files yang disentuh
- `package.json` (2 dep TipTap)
- `src/app/layout.tsx` (load Amiri + Scheherazade New)
- `src/app/globals.css` (font utility + fix `font-arabic`)
- `src/components/ui/rich-text-editor/RichTextEditor.tsx` (font picker opt-in + lists opt-in)
- `src/lib/htmlText.ts` (sanitizer widen) + `src/lib/__tests__/htmlText.test.ts` (baru, TDD)
- `src/app/(admin)/materi/components/modals/ItemModal.tsx` (textarea → RichTextEditor)
- `src/app/(admin)/materi/components/modals/ContentViewModal.tsx` (render sanitized HTML + backward-compat)

**~7 file inti, >100 baris → mode A (Antigravity) direkomendasikan.**

## Verifikasi (end-to-end)
1. `npm run dev`, buka `/materi` → buka/edit sebuah Sub Materi.
2. Editor muncul dengan toolbar (bold/italic/underline + dropdown font + list).
3. Ketik teks Latin → Default. Pilih "Arabic (Amiri)", ketik/paste `بِسْمِ اللَّهِ` → tampil font Amiri (naskh). Ganti "Scheherazade New" → bentuk huruf berubah.
4. Simpan → buka view (ContentViewModal) → konten tampil dengan format & font yang sama, paragraf Arabic RTL otomatis.
5. Buka Sub Materi LAMA (plain text) → masih terbaca rapi (newline tidak hilang) — cek Task 8.
6. Kartu materi (`MaterialCard`, teks arab `dir=rtl`) kini pakai font Amiri (bug `font-arabic` fixed).
7. Pengumuman/notifikasi (`RichTextEditor` tanpa `enableFontFamily`) TIDAK berubah — tak ada dropdown font. Regression check.
8. Unit test: `npm run test:run` — `htmlText.test.ts` hijau (span+style dipertahankan, script dibuang).

## CLAUDE.md Check
- [ ] Pattern BARU? Ya — font-family picker + sanitizer memperbolehkan `span/style`. Dokumentasikan singkat di `docs/claude/ui-components.md` (RichTextEditor sekarang punya `enableFontFamily`/`enableLists`, dan cara nambah font).
- [ ] Tabel DB baru? Tidak (kolom `content` existing, kini isi HTML).
- [ ] Route/page baru? Tidak.
- [ ] Permission pattern baru? Tidak.
- [ ] Catat di `docs/claude/architecture-patterns.md` (Material section) bahwa `MaterialItem.content` kini HTML (bukan plain), dan font Arabic = Amiri/Scheherazade (OFL); "International Arabic" ditolak (proprietary).
