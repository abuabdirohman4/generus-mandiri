CONTEXT:
Saya mengerjakan Generus Mandiri — Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi plan di @docs/plans/2026-06-23-sm-aej4-refresh-on-back.md

ISSUE: sm-aej4 / GH-#108
BRANCH: master (langsung, bukan feature branch — proyek ini pakai trunk-based)

BACKGROUND (penting untuk pahami masalah):
- Halaman `/presensi` (list) pakai SWR `useMeetings` dengan `dedupingInterval: 30000ms`
- Saat user save absensi di `/presensi/[meetingId]` lalu back ke `/presensi`, SWR TIDAK
  refetch karena dedupingInterval belum habis → data lama selama ~30-40 detik
- Sudah dicoba: optimistic cache patch (`upsertMeetingInCache`) — tidak efektif karena
  inter-route SWR cache tidak reliable
- Solusi: trigger `mutate()` dari list page saat kembali (via sessionStorage flag), +
  tampilkan loading indicator kecil di card saat refetch berlangsung

REQUIREMENTS:
1. Ikuti plan task-by-task
2. JANGAN tulis unit test untuk perubahan ini (perubahan UI + SWR behavior, bukan logic)
3. Setelah semua task: `npm run type-check` harus lulus
4. Output per task: "✅ Task N complete: [ringkasan]"
5. JANGAN deviate dari plan tanpa approval user

KEY FILES:
- Hook: `src/app/(admin)/presensi/hooks/useMeetings.ts`
  - SWR call di line ~100, return di line ~196
  - Tambah `isValidating` ke return, turunkan `dedupingInterval` 30000 → 2000
- Detail page: `src/app/(admin)/presensi/[meetingId]/page.tsx`
  - `handleSave` di line ~134 — set sessionStorage saat `result.success`
  - Key sessionStorage: `"presensi_needs_refresh"`
- List page: `src/app/(admin)/presensi/page.tsx`
  - `useMeetings` dipanggil line ~126, return `{ mutate, isLoading }`
  - Tambah useEffect: check sessionStorage → mutate() → removeItem
  - Pass `isRefreshing={isValidating && paginatedMeetings.length > 0}` ke MeetingList
- MeetingList: `src/app/(admin)/presensi/components/MeetingList.tsx`
  - Props interface di line ~466
  - Tambah `isRefreshing?: boolean` prop
  - Tampilkan spinner kecil (pakai `<Spinner size={16} />` yang sudah ada) di header/pojok
    list saat `isRefreshing=true` — BUKAN full skeleton, data tetap tampil

EXISTING IMPORTS (sudah ada, jangan duplikat):
- `Spinner` sudah di-import di MeetingList.tsx
- `mutate` dari `useMeetings` sudah ada di page.tsx

CONSTRAINT:
- RTK proxy active — hindari `head`, `find -exec`, pipe ke head
- Git: JANGAN commit/push — user yang eksekusi git

Mulai dari Task 1.
