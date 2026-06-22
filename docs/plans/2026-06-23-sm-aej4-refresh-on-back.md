# Plan: Trigger Revalidasi Saat Back + Loading State per Card (sm-aej4 lanjutan)

## Context

Optimistic cache patch (`upsertMeetingInCache`) tidak berhasil karena ada dua masalah bertumpuk:

1. **Key mismatch**: SWR key di `useMeetings` pakai `?dummy=${useDummyData}` (bukan hardcode
   `dummy=false`). Kalau `NEXT_PUBLIC_USE_DUMMY_DATA` tidak set, `useDummyData` = false, key =
   `?dummy=false` — harusnya cocok. Tapi ternyata masih tidak update.

2. **Root masalah sebenarnya**: `/presensi` (list) dan `/presensi/[meetingId]` (detail) adalah
   **dua halaman terpisah**. Saat user navigasi back, Next.js App Router melakukan navigasi
   antar route. SWR cache di list page sudah stale (atau tidak pernah ke-mount ulang saat
   navigasi back ke cached page). SWR `revalidateOnMount: true` harusnya trigger refetch —
   tapi dengan `dedupingInterval: 30000`, refetch di-dedupe selama 30 detik. Jadi kalau user
   balik dalam 30 detik setelah buka list, cache tidak disentuh → data lama.

## Solusi: Trigger mutate saat kembali ke list page

Daripada patch cache dari detail page (inter-route), lebih handal: **saat list page di-mount
kembali** (focus / visibility change / route change), langsung trigger `mutate()` dari
`useMeetings` agar refetch segera — dan tampilkan loading indicator di card yang
baru di-visit agar user tahu data sedang diperbarui.

### Implementasi

**A. Di `useMeetings.ts`**: expose `isValidating` dari SWR (SWR sudah punya ini secara built-in
— `isValidating=true` saat refetch background). Tambah ke return value.

**B. Di `presensi/page.tsx`**: setelah back dari detail, trigger `mutate()` via:
- `useEffect` yang watch `searchParams` atau pakai `usePathname` / router events
- Lebih simple: pakai `revalidateOnFocus: true` (sudah ada) DAN turunkan `dedupingInterval`
  dari 30000ms ke 5000ms — sehingga user back dalam 5 detik pun sudah refetch.
- ATAU: simpan `meetingId` yang terakhir di-visit ke sessionStorage di detail page, lalu di
  list page `useEffect` check — kalau ada → `mutate()` segera + hapus sessionStorage key.

**C. Di `MeetingList.tsx`**: tambah prop `isRefreshing?: boolean`. Kalau true, tampilkan
loading indicator kecil di pojok kanan atas setiap card (spinner kecil / shimmer), BUKAN
full skeleton (data masih tampil). User tahu "sedang diperbarui" tanpa layar blank.

### Pendekatan terpilih: sessionStorage trigger + isValidating

1. **Detail page (`[meetingId]/page.tsx`)**: saat save berhasil, set
   `sessionStorage.setItem('presensi_needs_refresh', meetingId)`.

2. **List page (`page.tsx`)**: `useEffect` on mount + pada focus, check sessionStorage:
   - Kalau ada key → `mutate()` → hapus key
   - Bisa juga dikombinasi: turunkan `dedupingInterval` jadi 2000ms supaya refetch hampir
     selalu jalan saat kembali.

3. **`useMeetings.ts`**: tambah `isValidating` ke return value (ambil dari SWR).

4. **`presensi/page.tsx`**: pass `isRefreshing={isValidating && paginatedMeetings.length > 0}`
   ke `MeetingList`.

5. **`MeetingList.tsx`**: tambah prop `isRefreshing`. Render `<Spinner size={16} />` kecil di
   pojok atas card (atau badge "memperbarui..." di header list) saat `isRefreshing=true`.

## Files

- `src/app/(admin)/presensi/hooks/useMeetings.ts` — expose `isValidating`, turunkan
  `dedupingInterval` dari 30000 → 2000
- `src/app/(admin)/presensi/[meetingId]/page.tsx` — set sessionStorage saat save sukses
- `src/app/(admin)/presensi/page.tsx` — useEffect trigger mutate dari sessionStorage,
  pass `isRefreshing` ke MeetingList
- `src/app/(admin)/presensi/components/MeetingList.tsx` — tambah `isRefreshing` prop +
  UI indicator kecil di card

## Verifikasi

1. Isi absensi pertemuan → Save → back ke /presensi
2. EXPECTED: refetch langsung mulai (≤2 detik), card tampil data lama + spinner kecil "memperbarui"
3. Setelah refetch selesai (~30-40 detik karena getMeetingsWithStats lambat): spinner hilang,
   angka terupdate
4. Regresi: halaman list normal tanpa save → tidak ada spinner, tidak ada refetch tidak perlu
5. `npm run type-check` harus lulus

## Out of Scope
- Optimize `getMeetingsWithStats` (sm-871q backlog) — ini yang benar-benar menyembuhkan 40s
- `upsertMeetingInCache` / cache patch — pertahankan di file, tapi tidak diandalkan sebagai
  mekanisme utama update (bisa dihapus kalau sm-871q sudah done)
