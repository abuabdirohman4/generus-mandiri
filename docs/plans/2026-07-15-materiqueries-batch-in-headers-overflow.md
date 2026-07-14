# Plan: Batch `.in()` di materiQueries.ts — fix HeadersOverflow (permanent)

## Context

Laporan materi memfilter progress siswa dengan `.in('student_id', [...])`. Untuk daerah
besar array ini ~773 UUID → PostgREST meng-encode `.in()` sebagai query string
`?student_id=in.(uuid,uuid,...)` sepanjang ~28–30KB. Node default header limit = 16KB →
`UND_ERR_HEADERS_OVERFLOW`. Sekarang cuma ditambal band-aid `NODE_OPTIONS=--max-http-header-size=65536`
di `ecosystem.config.js` (server VM).

Fix permanennya sudah ada polanya: util `fetchInBatches()` (chunk 100) di
`src/lib/utils/batchFetching.ts`. `queries.ts` sebagian sudah pakai util batch, tapi
**`materiQueries.ts` terlewat** — masih 16 `.in()` mentah. Beberapa `.in()` di `queries.ts`
juga masih mentah.

**Kenapa sekarang (bukan nanti):** ini blocker Phase 2 self-host cutover
(`docs/prompts/sm-91yt-cutover-vm-phase2.md` Step 2). Self-hosted PostgREST **pakai URL
filter `?id=in.(...)` yang sama** dan punya batas request-line/header sendiri (bisa 414/431).
Band-aid Node cuma menutup sisi klien HTTP header, bukan batas URL PostgREST. Jadi fix ini
**wajib**, bukan opsional — walau band-aid tetap dipertahankan (belt-and-suspenders).

## Outcome yang diharapkan

- Tidak ada `.in()` mentah dengan array skala-data-user (`student_id`, `material_item_id`,
  `material_items.id`) di `materiQueries.ts` / `queries.ts`.
- Semua di-chunk ≤100 via util batch → URL per request aman < ~6KB.
- Laporan materi untuk daerah 700+ siswa jalan tanpa `UND_ERR_HEADERS_OVERFLOW` dan tanpa
  bergantung ke band-aid header.

## Scope

### File
- `src/app/(admin)/laporan/actions/reports/materiQueries.ts` — 16 `.in()` mentah (utama).
- `src/app/(admin)/laporan/actions/reports/queries.ts` — `.in('id', classIds)` L62,
  `.in('class_id', classIds)` L154 (cek apakah `classIds` bisa besar; kalau bounded kecil, boleh dilewat).
- `src/lib/utils/batchFetching.ts` — **tambah 1 helper** untuk compound-filter (lihat bawah).

### Klasifikasi `.in()` di materiQueries.ts (per baris, per risiko)

| Baris | Kolom | Array | Risiko | Aksi |
|-------|-------|-------|--------|------|
| 143, 325, 413, 506 | `student_id` | ~773 UUID | 🔴 tinggi (offender terbukti) | **wajib batch** |
| 144, 326, 414, 507 | `material_item_id` | puluhan–ratusan, **satu query bareng student_id** | 🟠 | ikut compound (lihat bawah) |
| 113, 133, 272 | `material_items.id` | jumlah materi (bisa ratusan) | 🟠 | batch (`fetchInBatches`) |
| 98, 245, 311, 387, 483 | `class_master_id` | jumlah kelas (puluhan, bounded) | 🟢 rendah | boleh dilewat; batch hanya kalau terbukti bisa besar |

### Nuance kritis — compound filter (2 `.in()` di query yang sama)

4 query `student_material_progress` (L141–144, L323–326, L411–414, L504–507) memfilter
**dua kolom sekaligus**: `.in('student_id', studentIds).in('material_item_id', materialIds)`.
`fetchInBatches()` yang ada hanya chunk **satu** kolom, jadi tidak cukup.

**Solusi:** chunk dimensi `student_id` (yang 773, offender utama), sambil tetap terapkan
filter `material_item_id` di tiap chunk. Tambah helper di `batchFetching.ts`:

```ts
/**
 * Batch by one column while keeping extra filters applied per chunk.
 * Chunks `chunkIds` (e.g. student_id) into `chunkSize`, runs the extra
 * filter (e.g. .in('material_item_id', ids)) on each chunk in parallel.
 */
export async function fetchInBatchesWithFilter(
    supabaseClient: any,
    table: string,
    chunkColumn: string,
    chunkIds: string[],
    selectQuery: string,
    applyExtraFilter: (q: any) => any = (q) => q,
    chunkSize = 100,
): Promise<{ data: any[] | null; error: any }> {
    if (!chunkIds || chunkIds.length === 0) return { data: [], error: null }
    const chunks: string[][] = []
    for (let i = 0; i < chunkIds.length; i += chunkSize) {
        chunks.push(chunkIds.slice(i, i + chunkSize))
    }
    try {
        const results = await Promise.all(
            chunks.map(chunk =>
                applyExtraFilter(
                    supabaseClient.from(table).select(selectQuery).in(chunkColumn, chunk)
                )
            )
        )
        const allData: any[] = []
        for (const r of results) {
            if (r.error) return { data: null, error: r.error }
            if (r.data) allData.push(...r.data)
        }
        return { data: allData, error: null }
    } catch (error: any) {
        return { data: null, error }
    }
}
```

Pemakaian di materiQueries.ts (contoh L141–144):

```ts
const { data: progress, error } = await fetchInBatchesWithFilter(
    supabase,
    'student_material_progress',
    'student_id',
    studentIds,
    'student_id, material_item_id, nilai, done',
    (q) => q.in('material_item_id', filteredTableItemIds),
)
```

> Catatan: kalau `material_item_id` di suatu query **juga** bisa >~100 sekaligus, URL per
> chunk = panjang(student chunk) + panjang(material list). 100 student (~3.6KB) + 100 materi
> (~3.6KB) ≈ 7KB — masih aman < 16KB. Kalau ada kombinasi ekstrem (materi juga ratusan),
> pertimbangkan chunk dimensi yang lebih besar; untuk data sekarang chunk student_id cukup.

Untuk `.in('id', ...)` tunggal (L113/133/272) pakai `fetchInBatches()` biasa (sudah ada).

## Guardrails

- **Jangan ubah semantik query** — hasil gabungan tiap chunk harus identik dengan satu query
  besar (union baris). Util sudah gabung `push(...data)`; pastikan tidak ada `ORDER BY` /
  `LIMIT` per-query yang rusak saat di-chunk (materiQueries progress tidak pakai limit → aman).
- **Pertahankan band-aid** `--max-http-header-size=65536` di `ecosystem.config.js` — jangan dihapus.
- **RLS tetap jalan** — util pakai `supabaseClient` yang sama (client RLS atau admin), tiap chunk
  tetap kena policy. Tidak ada bypass.
- Tidak menyentuh file lain di luar 3 di atas.

## Verifikasi (end-to-end)

1. `npm run type-check` — helper baru + call-site tetap typecheck.
2. `npm run test` — unit test laporan materi (`reports/__tests__`) hijau; tambah/utak test
   yang mem-verifikasi gabungan chunk == hasil non-chunk untuk array > chunkSize.
3. E2E: buka Laporan → tab Materi untuk **daerah dengan ≥700 siswa aktif**. Semua tab
   (bulanan, kumulatif, per-semester) render tanpa error.
4. DevTools Network / server log: tidak ada `UND_ERR_HEADERS_OVERFLOW`; request ke data plane
   terpecah jadi beberapa call `student_id=in.(...)` masing-masing ≤100 id.
5. (Setelah PostgREST VM up di Phase 2 Step 4) ulang query yang sama lawan `127.0.0.1:3001` →
   tidak 414/431.

## Deploy

Fix ini **code**, lewat alur normal: PR di repo → merge `master` → CI build → rsync artifact
ke VM → `pm2 reload`. **Jangan** di-push dari VM. Konfirmasi artifact ter-deploy sudah memuat
fix ini sebelum cutover Phase 2 (atau tetap andalkan band-aid sampai deploy mendarat).
