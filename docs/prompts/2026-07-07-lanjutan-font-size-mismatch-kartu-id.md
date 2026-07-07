CONTEXT:
Lanjutan debugging fitur "Bulk Cetak Kartu ID QR dari Template" (sm-vckd + sm-bt6y + sm-k31t). File utama: `src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx` (preview drag-and-drop editor), `src/lib/idCard/composeCard.client.ts` (canvas compose buat PDF), `src/lib/idCard/GridPreview.tsx`.

CRITICAL: Baca @CLAUDE.md dulu untuk semua coding rules, patterns, constraints.

RTK quirk aktif sesi lalu: Read tool sering error `PreToolUse:Read hook error: ... No stderr output`. Kalau kejadian, pakai `rtk proxy python3 -c "print(open('PATH').read())"` via Bash buat baca file, dan python heredoc script (assert string replace) buat edit file kalau Edit tool ikut gagal.

RIWAYAT BUG YANG SUDAH DIPERBAIKI SESI LALU (jangan diulang investigasi ini):
1. Resize QR handle cuma bisa mengecil — root cause `restrictToParentElement` clamp gerak-keluar. Fix: ResizeHandle native pointer-capture (bukan dnd-kit lagi).
2. Grid card gak center di kertas A4 → lalu diubah ke distribute-justified → user gak suka (gap tengah lebar) → REVERT ke center (final: center, `marginCm=0.5`).
3. QR clamp size dibatasi posisi (`100-qrPos.x`) → dilonggarkan jadi bebas 0-100 (QR boleh keluar tepi kartu, sesuai keputusan user).
4. Validasi backend `logic.ts` masih tolak QR keluar tepi → boundary check dihapus (selaras keputusan poin 3).
5. WYSIWYG mismatch nama/kelompok (preview vs PDF beda posisi) — 2 root cause: (a) `fontSize` gak pernah di-apply ke CSS preview (fix: pakai CSS container query unit `cqw`, formula `fontSize: (fontSizePx/imageWidth)*100 + 'cqw'`, container dikasih `containerType:'inline-size'`), (b) anchor mismatch — canvas compose pakai `textAlign=center,textBaseline=middle` (titik tengah), tapi editor render `top/left` = pojok kiri-atas. Fix: box nama/kelompok (BUKAN qr-box) dapat CSS `transform: translate(-50%,-50%)` tambahan via prop `centerAnchor`, biar posisi CSS `left/top` = titik tengah visual, match canvas.
6. Snap-to-center guide (garis biru) gak muncul di preview edit-mode untuk box nama/kelompok (QR normal) — root cause: dnd-kit `active.rect.current.translated.left` melaporkan posisi SEBELUM transform `-50%,-50%` diterapkan (dnd-kit gak tau soal CSS transform kosmetik kita). Untuk box `centerAnchor`, `translated.left` ITU SENDIRI sudah = titik tengah visual, TAPI kode lama masih tambah `+width/2` (formula box biasa) → salah geser setengah lebar box. Fix: `isCenterAnchored = id==='name-box'||id==='kelompok-box'` → kalau true, `boxCenterX = translated.left` (TANPA +width/2); QR tetap `translated.left + width/2`.
7. Data numeric dari Supabase (kolom `numeric`) balik sebagai STRING bukan JS number — bikin drag math (`prev.x + deltaXPct`) jadi string concatenation, box hilang/posisi rusak. Fix: `Number(...)` di semua field numeric saat load existing template (`useEffect` di `TemplateClient.tsx`).
8. Preview kolom kanan kosong total saat edit-mode — container `w-fit` collapse ke 0×0 kalau `<img>` (signed URL remote, bukan local blob) belum selesai load. Fix: container CSS `aspectRatio` dari state (`imageDims`), lalu diubah lagi jadi `w-full` (bukan `w-fit`) biar ukuran preview edit-mode SAMA BESAR dengan mode buat-baru.
9. Fitur List+Edit+Hapus template ditambahkan (`TemplateList.tsx`, `TemplateManager.tsx` baru). Edit mode: gambar template TIDAK bisa diganti (by design, sesuai keputusan user — hapus & buat baru kalau mau ganti gambar). Field `name` (nama template) sempat gak ke-update saat edit — root cause: `TemplatePositions` type gak punya field `name`, jadi `saveIdCardTemplatePositions` gak pernah kirim `name` ke update query. Fix: parameter `name?` ditambah ke `saveIdCardTemplatePositions`/`updateIdCardTemplatePositions`.
10. "Template Tersimpan" list dibuat collapsible (pakai `ChevronDownIcon` dari `@/lib/icons`, pola manual bukan `CollapsibleCard` existing karena butuh header selalu-visible + toggle sendiri).

TASK YANG SEDANG DIKERJAKAN (BELUM SELESAI, LANJUTKAN DARI SINI):
User laporkan (dengan screenshot preview vs hasil PDF): posisi nama/kelompok SUDAH OKE (posisi bug di atas sudah teratasi), TAPI **font size nama/kelompok preview vs PDF proporsinya BEDA** (mismatch scaling lagi) — user KONFIRMASI ini bug baru, bukan cuma soal ukuran font kekecilan.

Font size yang diset: 18px untuk nama & kelompok. Di screenshot preview, teks "[NAMA SISWA]"/"[NAMA KELOMPOK]" terlihat CUKUP BESAR relatif kotak QR (nempel border bawah QR). Di screenshot hasil PDF, teks "Aang"/"Pongporang" terlihat JAUH LEBIH KECIL relatif lebar kartu.

HIPOTESIS AWAL (belum diverifikasi, mulai dari sini):
Kemarin container preview diubah dari `w-fit` → `w-full` (buat fix ukuran preview edit-mode kekecilan, lihat poin 8 di atas). Font-size preview pakai formula `cqw` yang basisnya `containerType:'inline-size'` pada `containerRef` div — SATUANNYA relatif LEBAR CONTAINER RENDER (browser, biasanya lebar penuh kolom ~900-1000px), sedangkan formula asalnya `(fontSizePx / imageWidth) * 100 cqw` diasumsikan container-render-width == imageWidth (gambar native px). KEMUNGKINAN BESAR sekarang, setelah container jadi `w-full`, lebar RENDER container BEDA dari `imageWidth` (dimensi native gambar, misal 591px) — kalau container render JAUH LEBIH LEBAR dari 591px (karena kolom di layar bisa 900px+), maka `1 cqw` = 1% dari 900px = 9px, padahal formula ASUMSI `1cqw` semestinya scale sedemikian hingga hasil akhir font-size PIXEL RENDER = `fontSizePx * (containerRenderWidth/imageWidth)` — coba cek APAKAH FORMULA INI SUDAH BENAR SECARA MATEMATIS ATAU ADA SALAH HITUNG. Verifikasi:
- `fontSize: cqw_value + 'cqw'` dimana `cqw_value = (fontSizePx/imageWidth)*100`.
- 1cqw = 1% dari INLINE-SIZE container (lebar container, KARENA `containerType:'inline-size'` cuma bikin container jadi query-context untuk INLINE axis, width).
- Hasil px = `cqw_value * containerRenderWidth / 100 = (fontSizePx/imageWidth) * containerRenderWidth`.
- Ini SEHARUSNYA benar (font scale proporsional sesuai rasio containerRenderWidth/imageWidth, PERSIS gimana `<img>` sendiri di-scale via CSS `w-full`). Kalau container `w-full` beneran punya lebar SAMA dengan lebar tampilan gambar (karena `<img>` juga `w-full` di dalam container yang sama), maka formula ini SEHARUSNYA tetap benar dan konsisten — TIDAK peduli berapa lebar render aktualnya, KARENA font-size ikut scale proporsional bersama gambar.

JADI: kalau hipotesis di atas benar (formula cqw sendiri sudah benar), maka bug HARUS ada di tempat lain — kemungkinan:
(a) Container `aspectRatio` yang di-set kemarin (`${imageDims.width}/${imageDims.height}`) TIDAK sama persis dengan cara `<img w-full h-auto>` scale — cek APAKAH container width beneran = img displayed width (mestinya iya, karena container `w-full` relatif parent yang sama, dan img `w-full` relatif container — coba pikirkan apakah ada layer tambahan/padding/border yang bikin container width != img displayed width, MISALNYA `border` CSS di container (`className="relative border overflow-hidden w-full"` — border nambah sedikit px tapi biasanya negligible, bukan penyebab mismatch BESAR yang dilaporkan user).
(b) Coba bandingkan: apakah font-size DraggableBox mungkin ke-override atau ke-inherit dari parent lain (Tailwind base font-size, atau CSS specificity issue) sehingga `cqw` value gak ke-apply dengan benar — cek actual computed style kalau bisa (butuh browser devtools, minta user bantu screenshot "Computed" panel devtools kalau perlu).
(c) PALING PENTING: cek ulang composeCard.client.ts — apakah font size PDF-nya sendiri BENAR (`ctx.font = ...fontSize.px...`)? Screenshot user nunjukin font PDF KECIL — kemungkinan compose PDF-nya sendiri yang salah baca `name_font_size`/`kelompok_font_size` dari row DB (inget: masalah string-vs-number dari Supabase SEBELUMNYA sudah difix di TemplateClient.tsx load, TAPI compose PDF (`idCardPdfUtils.ts`/`composeCard.client.ts`) BACA LANGSUNG dari `template` object yang didapat dari `getIdCardTemplatesAction()` — apakah itu JUGA butuh `Number(...)` parsing yang BELUM dilakukan? Field font-size dipakai di `composeCard.client.ts` via TEMPLATE STRING interpolation (`` `${positions.name_font_size}px` ``) — kalau `name_font_size` STRING (mis `"18"`), hasil interpolasi TETAP `"18px"` (valid, gak masalah, string concatenation JS otomatis convert number-like value ke representasi yang sama). JADI KEMUNGKINAN BUKAN DI SINI. Tapi VERIFIKASI ULANG, jangan asumsi.

FILE YANG RELEVAN:
- `src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx` (preview editor, DraggableBox component, font-size cqw formula sekitar baris 46-75)
- `src/lib/idCard/composeCard.client.ts` (canvas compose, font rendering baris ~49-76)
- `src/lib/idCard/idCardPdfUtils.ts` (pemanggil composeCard, teruskan `template` fields)
- `src/types/idCardTemplate.ts` (definisi type `IdCardTemplate`/`TemplatePositions` — CEK apakah field numeric di sini type-lie sebagai `number` padahal runtime bisa string dari Supabase, ini pattern bug yang berulang di proyek ini)

PERTANYAAN KEDUA DARI USER (belum dibahas sama sekali, tanyakan dulu detail sebelum implementasi):
User juga tanya soal CASING nama siswa/kelompok di kartu — opsi: (1) ikut apa adanya dari database (`student.name`, `student.kelompok_name`), (2) UPPERCASE semua, (3) cuma huruf awal tiap kata besar (Title Case). User belum menjelaskan preferensi nya secara eksplisit, cuma melempar pertanyaan "atau mengikuti format nama yang sudah ada di database yah?" — INI PERLU DIKLARIFIKASI DULU pakai AskUserQuestion sebelum implementasi, JANGAN asumsi.

REQUIREMENTS:
1. Mulai dengan investigasi root cause font-size mismatch — JANGAN buru-buru fix sebelum yakin akar masalahnya, ini proyek yang sering ternyata "matematika kelihatan benar tapi ada yang kelewat" (riwayat bug WYSIWYG sebelumnya butuh 2 kali audit mendalam).
2. Kalau butuh audit independen yang teliti (banyak kemungkinan harus dicek satu-satu), pertimbangkan spawn Plan agent (subagent_type: Plan) dengan prompt yang detail — sudah terbukti efektif buat kasus-kasus serupa di sesi sebelumnya, TAPI JANGAN Iover-delegate hal yang bisa dicek langsung dengan baca kode + kalkulasi manual dulu.
3. Setelah fix font-size, TDD kalau ada logic pure-function yang berubah (ikuti CLAUDE.md).
4. Setelah itu, klarifikasi requirement casing nama/kelompok via AskUserQuestion SEBELUM implementasi.
5. Jalankan `npm run type-check` dan `npm run test:run` (scope idCard + qr-cards) setelah tiap perubahan, verifikasi 0 error sebelum lapor selesai.
6. JANGAN jalankan `git add/commit/push` — itu tugas user.

Mulai dengan re-baca `TemplateClient.tsx` (bagian DraggableBox + font-size cqw) dan `composeCard.client.ts` (bagian render font) dari awal, lalu lakukan analisa matematis ulang seperti dijelaskan di atas.
