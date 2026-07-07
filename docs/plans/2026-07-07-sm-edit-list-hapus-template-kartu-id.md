# List + Edit + Hapus Template Kartu ID

## Context

`/qr-cards/template` cuma form upload template baru. Backend (`getIdCardTemplatesAction`, `getIdCardTemplate`, `deleteIdCardTemplateAction`, `saveIdCardTemplatePositions`) sudah lengkap, tapi tidak ada UI list/edit/hapus — template lama tidak bisa dikelola sama sekali kecuali lewat DB manual.

## Scope

- List semua template (nama + tombol Edit + Hapus) di atas form upload.
- Edit: load template existing ke form (posisi, ukuran, style semua field), submit = update in-place (bukan insert baru). **Gambar TIDAK bisa diganti saat edit** (field upload disembunyikan di mode edit) — ganti gambar = hapus lalu buat baru.
- Hapus: confirm dialog sebelum panggil `deleteIdCardTemplateAction`.

## Implementasi

### 1. `TemplateList.tsx` (baru) — `src/app/(admin)/users/siswa/qr-cards/template/TemplateList.tsx`
Client component. Fetch via `getIdCardTemplatesAction()` on mount. Render list (nama + `Button variant=outline` Edit + `Button variant=outline` Hapus warna merah/destructive kalau ada, cek `Button` component variant options dulu).
- Hapus: `window.confirm` sederhana (konsisten pola project — cek apakah ada modal-confirm component reusable dulu, `grep -r "confirm" components/`), lalu panggil `deleteIdCardTemplateAction(id)`, `toast.success/error`, refetch list.
- Edit: panggil callback prop `onEdit(id)` — parent (`page.tsx`) simpan `editingId` state, teruskan ke `TemplateClient`.

### 2. `TemplateClient.tsx` — tambah prop `templateId?: string`
- Kalau `templateId` ada: `useEffect` panggil `getIdCardTemplate(templateId)`, populate SEMUA state (qrPos, qrSize, namePos, nameFontSize, styling, kelompok, dst) dari `data.template`, `previewUrl = data.signedUrl`, `imageDims = {width: template.image_width, height: template.image_height}`. Field upload gambar disembunyikan (`{!templateId && <UploadField/>}`).
- `handleSave`: kalau `templateId` ada → panggil `saveIdCardTemplatePositions(templateId, positions)` langsung (skip `uploadIdCardTemplate`). Kalau tidak ada → alur existing (upload baru).
- Tombol submit label: "Update Template & Posisi" (edit) vs "Simpan Template & Posisi" (baru).

### 3. `page.tsx` — jadi client wrapper minimal
Ubah dikit: tambah state `editingId` (`useState<string|undefined>()`), render `<TemplateList onEdit={setEditingId} />` lalu `<TemplateClient templateId={editingId} />`. Karena `page.tsx` sekarang Server Component (access-gate), pindahkan state ke wrapper client baru ATAU biarkan `page.tsx` tetap server gate, buat `TemplateManager.tsx` client component yang bungkus List+Client dengan state editingId, dipanggil dari `page.tsx`.

## File yang disentuh
- `src/app/(admin)/users/siswa/qr-cards/template/TemplateList.tsx` (baru)
- `src/app/(admin)/users/siswa/qr-cards/template/TemplateManager.tsx` (baru, client wrapper state editingId)
- `src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx` (tambah prop templateId + load existing + update-vs-insert)
- `src/app/(admin)/users/siswa/qr-cards/template/page.tsx` (render TemplateManager bukan TemplateClient langsung)

## Verifikasi
- `npm run type-check` clean.
- Manual: buka /qr-cards/template → list muncul → klik Edit → form terisi data lama → ubah posisi → Update → cek DB row ke-update (bukan row baru) → klik Hapus → confirm → row hilang dari DB + storage.
