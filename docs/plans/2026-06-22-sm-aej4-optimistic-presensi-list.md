# Plan: Optimistic Update Stats List Presensi (sm-aej4)

## Context

Balik dari meeting detail setelah isi absensi, card stats di list `/presensi` lambat update
(sepersekian detik delay). User kira data tidak terupdate.

Akar masalah (dari eksplorasi):
- `handleSave` di `[meetingId]/page.tsx` panggil `invalidateMeetingsCache(userId, classId)` yang
  set cache `undefined` + `revalidate: true` -> SWR BUANG data lama lalu FULL REFETCH.
- Refetch berat: `getMeetingsWithStats` recompute SEMUA stats SEMUA meeting (986 baris, 5 query,
  no cache, limit 1000). Itu sumber delay.
- Indikator "Memperbarui data..." SUDAH ada (`isRevalidating` di `page.tsx`), jadi loading bukan
  masalah -- masalahnya stat card nampak basi dulu sampai refetch kelar.

Solusi: OPTIMISTIC UPDATE. Saat save sukses, patch SWR cache list langsung dari local attendance
(stat sudah dihitung di detail), lalu revalidate di belakang TANPA buang data lama. Card update
instan, server sinkron belakangan.

## Files

- `src/app/(admin)/presensi/utils/cache.ts` -- tambah fungsi `updateMeetingStatsInCache`
- `src/app/(admin)/presensi/[meetingId]/page.tsx` -- `handleSave` patch cache optimistic sebelum revalidate
- `src/app/(admin)/presensi/utils/cache.test.ts` -- unit test fungsi baru (TDD)

## Key Facts (dari eksplorasi)

- SWR key list: `/api/meetings/${userId}?dummy=false` (atau `/api/meetings/${classId}/${userId}?dummy=false`).
  Shape data cache: `{ allMeetings: MeetingWithStats[], total: number }`.
- `MeetingWithStats` field stats: `attendancePercentage, totalStudents, presentCount, absentCount,
  sickCount, excusedCount` (lihat `useMeetings.ts`).
- Di detail page, `localAttendance` = `Record<studentId, {status, reason}>` untuk SEMUA student
  snapshot meeting (bukan cuma visible). `visibleStudents` cuma untuk tampilan/filter role.
  -> Untuk patch cache stats GLOBAL meeting, hitung dari SELURUH `localAttendance`, BUKAN filtered.
- `calculateLocalStats()` existing memfilter `visibleStudents` -> JANGAN dipakai untuk cache global
  (akan salah untuk admin/guru daerah yang lihat subset). Hitung counts baru dari full localAttendance.

## Tasks

### Task 1 -- RED: test `updateMeetingStatsInCache`

Buat `src/app/(admin)/presensi/utils/cache.test.ts`. Mock `swr` `mutate`. Verifikasi:
- Fungsi panggil `mutate(key, updaterFn, { revalidate: true })` untuk dummy=false key.
- Updater menerima cache lama `{ allMeetings, total }`, mengganti hanya meeting dengan `meetingId`
  cocok: set `presentCount/absentCount/sickCount/excusedCount/totalStudents/attendancePercentage`
  dari argumen stats, sisanya meeting lain tidak berubah.
- Kalau cache `undefined` (belum ada) -> updater return cache apa adanya (no crash).
- `revalidate: true` dipakai (background sync tetap jalan, tapi data lama TIDAK dibuang karena
  pakai updater function, bukan `undefined`).

Run: `npm run test:run -- cache.test` -> harus FAIL (fungsi belum ada).

### Task 2 -- GREEN: implement `updateMeetingStatsInCache`

Di `src/app/(admin)/presensi/utils/cache.ts`, tambah:

```ts
interface OptimisticStats {
  totalStudents: number
  presentCount: number
  absentCount: number
  sickCount: number
  excusedCount: number
}

/**
 * Optimistic: patch stats satu meeting di cache list TANPA buang data lama.
 * Card update instan; revalidate jalan di belakang untuk sinkron server.
 */
export async function updateMeetingStatsInCache(
  userId: string,
  meetingId: string,
  stats: OptimisticStats,
  classId?: string
) {
  const baseKey = classId ? `/api/meetings/${classId}/${userId}` : `/api/meetings/${userId}`
  const attendancePercentage = stats.totalStudents > 0
    ? Math.round((stats.presentCount / stats.totalStudents) * 100)
    : 0

  const updater = (current: any) => {
    if (!current?.allMeetings) return current
    return {
      ...current,
      allMeetings: current.allMeetings.map((m: any) =>
        m.id === meetingId
          ? { ...m, ...stats, attendancePercentage }
          : m
      ),
    }
  }

  // dummy=false key (real data). revalidate:true -> server sync di belakang,
  // tapi updater langsung tampil (data lama tidak dibuang).
  await mutate(`${baseKey}?dummy=false`, updater, { revalidate: true })
}
```

Run: `npm run test:run -- cache.test` -> harus PASS.

### Task 3 -- GREEN: pakai di `handleSave`

Di `src/app/(admin)/presensi/[meetingId]/page.tsx` `handleSave`, ganti blok setelah
`result.success` (baris ~146-157). Hitung stats GLOBAL dari full `localAttendance` (bukan
`calculateLocalStats` yang filtered):

```ts
if (result.success) {
  toast.success('Data presensi berhasil disimpan!')
  hasInitialized.current = false
  mutate() // refresh detail page

  const userId = await getCurrentUserId()
  if (userId) {
    const classId = meeting?.class_id
    // Optimistic: hitung stats GLOBAL dari seluruh localAttendance (semua student snapshot)
    const allRecords = Object.values(localAttendance)
    const optimisticStats = {
      totalStudents: allRecords.length,
      presentCount: allRecords.filter(r => r.status === 'H').length,
      absentCount: allRecords.filter(r => r.status === 'A').length,
      sickCount: allRecords.filter(r => r.status === 'S').length,
      excusedCount: allRecords.filter(r => r.status === 'I').length,
    }
    await updateMeetingStatsInCache(userId, meetingId, optimisticStats, classId)
  }
}
```

Import: tambah `updateMeetingStatsInCache` ke import dari `../utils/cache` (path yang dipakai file
untuk `invalidateMeetingsCache`). Ganti pemanggilan `invalidateMeetingsCache` di handleSave dengan
fungsi baru. CEK dulu apakah `invalidateMeetingsCache` dipakai di tempat lain -- kalau ya, biarkan
fungsinya tetap ada, cukup ganti pemanggilan di handleSave saja.

> Catatan totalStudents: optimistic pakai jumlah seluruh localAttendance = total student snapshot
> meeting. Untuk akun daerah/desa yang di server stats-nya difilter per-scope, angka optimistic
> bisa beda sebentar dari nilai server -- revalidate di belakang akan koreksi. Acceptable: yang
> penting card langsung gerak lalu sinkron. Kalau mismatch terasa, fallback: optimistic untuk
> presentCount delta saja. (Default plan: full snapshot, koreksi via revalidate.)

### Task 4 -- Verifikasi type & test

```bash
npm run type-check        # bersih
npm run test:run -- cache # cache.test PASS
```

## Verifikasi End-to-End

1. Login akun kelompok biasa. Buka `/presensi`. Catat % salah satu meeting.
2. Buka detail meeting, ubah beberapa status (mis. set semua Hadir), Save.
3. Klik back ke list -> card stats meeting itu LANGSUNG update (tanpa nunggu).
4. Tunggu 1-2 detik -> angka tetap konsisten (revalidate server tidak mengubah balik).
5. Login akun daerah/desa (subset visible) -> optimistic boleh beda sesaat, lalu terkoreksi oleh
   revalidate. Pastikan tidak ada crash / NaN%.
6. Regresi: meeting lain di list tidak berubah stat-nya.

## CLAUDE.md Check
- [ ] Pattern baru (optimistic SWR cache patch) -- pertimbangkan dokumentasi singkat di
  data-fetching section kalau dipakai ulang.
- [ ] Tidak ada tabel/route/permission baru.

## Out of Scope (issue terpisah)
- sm-nke7 -- grafik per-desa/kelompok per pertemuan (P3 backlog)
- sm-f1nh -- tab realtime presensi infocus (P3 backlog)
