# sm-vhdr: Fix Gating Jam Masuk + Backfill Bug + UI Badge

Follow-up dari sm-8c8i. 4 perbaikan independen, dikerjakan berurutan.

## Task 1: Fix backfill bug — jangan restamp check_in_time siswa H lama

**Bug:** `saveAttendanceForMeeting` restamp `check_in_time = now()` untuk SEMUA siswa berstatus H yang belum punya `check_in_time` (data lama sebelum fitur ini ada), tiap kali attendance di-save ulang. Efek: nyalain toggle di meeting lama pas jam berapapun bikin semua siswa H lama keitung "baru check-in sekarang" → semua Telat kalau di atas jam mulai.

**File: `src/app/(admin)/presensi/actions/attendance/actions.ts`**

Current logic (function `saveAttendanceForMeeting`, sekitar baris 160-168):
```typescript
const attendanceRecords = attendanceData.map(record => {
  const existing = existingByStudent.get(record.student_id)
  let checkInTime: string | null = null
  if (record.status === 'H') {
    checkInTime = existing?.status === 'H' && existing.check_in_time
      ? existing.check_in_time
      : nowIso
  }
  return { ... }
})
```

Masalah: `existing.check_in_time` falsy (null) untuk data lama → jatuh ke `nowIso`. Harusnya: kalau `existing.status === 'H'` (siswa SUDAH H sebelumnya, apapun check_in_time-nya), JANGAN restamp — biarkan apa adanya (termasuk tetap NULL). Cuma stamp `nowIso` kalau ini transisi BARU jadi H (dari status lain, atau record belum ada sama sekali).

Fix:
```typescript
const attendanceRecords = attendanceData.map(record => {
  const existing = existingByStudent.get(record.student_id)
  let checkInTime: string | null = null
  if (record.status === 'H') {
    checkInTime = existing?.status === 'H'
      ? (existing.check_in_time ?? null) // sudah H sebelumnya -> jangan restamp, biarkan null kalau memang null
      : nowIso // transisi baru jadi H -> stamp sekarang
  }
  return { ... }
})
```

**Test**: update/tambah test case di `src/app/(admin)/presensi/actions/attendance/__tests__/actions.test.ts` describe `saveAttendanceForMeeting`:
```typescript
it('does not restamp check_in_time for student already H with null check_in_time (legacy data)', async () => {
  vi.mocked(validateAttendanceData).mockReturnValue({ valid: true })
  const profileBuilder = makeQueryBuilder({ data: { id: 'profile-1', role: 'teacher' }, error: null })
  const supabase = makeSupabase({ fromBuilder: profileBuilder })
  vi.mocked(createClient).mockResolvedValue(supabase)

  const meetingBuilder = makeQueryBuilder({
    data: { teacher_id: 'teacher-1', class_ids: ['class-1'], date: '2026-03-18' },
    error: null
  })
  // Existing log: already H, but check_in_time is null (legacy data pre-feature)
  const existingLogsBuilder = makeQueryBuilder({
    data: [{ student_id: 'student-1', status: 'H', check_in_time: null }],
    error: null
  })
  const adminClient = makeAdminSupabase({
    tableBuilders: { meetings: meetingBuilder, attendance_logs: existingLogsBuilder }
  })
  vi.mocked(createAdminClient).mockResolvedValue(adminClient)
  vi.mocked(upsertAttendanceLogs).mockResolvedValue({ data: [], error: null })

  const validData = [{ student_id: 'student-1', date: '2026-03-18', status: 'H' as const }]
  await saveAttendanceForMeeting('meeting-1', validData)

  expect(upsertAttendanceLogs).toHaveBeenCalledWith(
    adminClient,
    expect.arrayContaining([
      expect.objectContaining({ student_id: 'student-1', check_in_time: null })
    ])
  )
})
```
RED → GREEN: pastikan test ini FAIL dengan kode lama (restamp ke now()) sebelum fix, PASS sesudah.

## Task 2: Gating toggle "Aktifkan cek waktu masuk" via permission

Ikuti pola existing `canManageMaterials` / `can_manage_materials` persis.

**File: `src/types/user.ts`** — tambah field permission (sekitar baris 55-65, dalam `UserProfile.permissions`):
```typescript
permissions?: {
  can_archive_students?: boolean
  can_transfer_students?: boolean
  can_soft_delete_students?: boolean
  can_hard_delete_students?: boolean
  can_manage_materials?: boolean
  can_access_materials?: boolean
  can_access_monitoring?: boolean
  can_multi_kelompok_laporan?: boolean
  can_manage_check_time?: boolean // NEW
}
```

**File: `src/lib/accessControl.ts`** — tambah function baru (dekat `canManageMaterials`, sekitar baris 106):
```typescript
export function canManageCheckTime(profile: UserProfile | null): boolean {
  if (!profile) return false
  if (profile.role === 'superadmin') return true
  if (profile.role === 'admin') return true
  return profile.permissions?.can_manage_check_time === true
}
```

**File: `src/app/(admin)/users/guru/actions/settings/actions.ts`** — extend `updateTeacherPermissions` param type (sekitar baris 129-137):
```typescript
export async function updateTeacherPermissions(
    userId: string,
    permissions: {
        can_archive_students?: boolean
        can_transfer_students?: boolean
        can_soft_delete_students?: boolean
        can_hard_delete_students?: boolean
        can_multi_kelompok_laporan?: boolean
        can_manage_check_time?: boolean // NEW
    }
): Promise<{ success: boolean; message?: string }> {
```
Cek `updateTeacherPermissionsQuery` di `settings/queries.ts` — pastikan pakai JSONB merge pattern (fetch-then-merge), bukan overwrite. Kalau sudah generic (spread `...permissions`), tidak perlu diubah.

**File: `src/app/(admin)/users/guru/components/SettingsModal.tsx`**:
- Extend `TeacherPermissions` interface (baris 27-33): tambah `can_manage_check_time?: boolean`
- Tambah state: `const [canManageCheckTime, setCanManageCheckTime] = useState(currentPermissions?.can_manage_check_time || false)`
- Di `handleSave`, masukkan ke `updateTeacherPermissions` call:
  ```typescript
  const permissionsResult = await updateTeacherPermissions(userId, {
    ...permissions,
    can_multi_kelompok_laporan: canMultiKelompokLaporan,
    can_manage_check_time: canManageCheckTime,
  })
  ```
- Tambah checkbox UI di section "Student Management Permissions" (atau section baru "Presensi") — pola sama checkbox existing di file ini (native `<input type="checkbox">` dengan className `h-4 w-4 text-blue-600...`, lihat blok Tipe Kegiatan baris ~250 untuk contoh persis):
  ```tsx
  <label className="flex items-center gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={canManageCheckTime}
      onChange={(e) => setCanManageCheckTime(e.target.checked)}
      disabled={isSaving}
      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
    />
    <span className="text-sm text-gray-700 dark:text-gray-300">
      Aktifkan Cek Waktu Masuk di Pertemuan
    </span>
  </label>
  ```

**File: `src/app/(admin)/presensi/components/CreateMeetingModal.tsx`** — gate toggle block yang sudah ada (dari sm-8c8i, sekitar baris 1047-1068):
```tsx
import { useUserProfile } from '@/stores/userProfileStore' // sudah ada import ini
import { canManageCheckTime } from '@/lib/accessControl' // NEW import

// di dalam komponen, ambil userProfile (sudah ada variable ini di file — cek nama persis)
const canUseCheckTime = canManageCheckTime(userProfile)

// bungkus toggle block:
{canUseCheckTime && (
  <>
    <div className="mb-4">
      <Checkbox
        label="Aktifkan cek waktu masuk"
        checked={checkTimeEnabled}
        onChange={(checked) => setCheckTimeEnabled(checked)}
        disabled={isSubmitting}
      />
    </div>
    {checkTimeEnabled && (
      <div className="mb-4">
        {/* ...jam mulai input... */}
      </div>
    )}
  </>
)}
```
Cek dulu `useUserProfile` sudah di-destructure jadi variable apa di file ini (`grep -n "useUserProfile()" CreateMeetingModal.tsx`) — kemungkinan sudah ada, tinggal reuse.

**Test**: tambah unit test untuk `canManageCheckTime` di `src/lib/__tests__/accessControl.test.ts` (cek file test existing dulu, ikuti pola test `canManageMaterials` yang sudah ada persis — copy-paste-adapt).

## Task 3: Card badge — Telat/Tepat Waktu gantikan badge Hadir, background oranye untuk Telat

**File: `src/app/(admin)/presensi/components/LivePresensiTab.tsx`**

Current (dari sm-8c8i): card selalu render badge status (`STATUS_BADGE[status]`, hijau untuk H) DI ATAS badge Telat/Tepat Waktu terpisah (kalau checkTimeEnabled) → jadi dobel.

Target: kalau `checkTimeEnabled && isHadir && ada check_in_time` → badge status JADI "Telat"/"Tepat Waktu" (gantikan "Hadir"), background card juga ikut warna status (oranye untuk Telat, hijau untuk Tepat Waktu/Hadir biasa).

Refactor bagian card (sekitar baris 195-230):
```tsx
const isHadir = status === 'H'
const hasCheckIn = checkTimeEnabled && isHadir && !!attendanceMap[student.id]?.check_in_time
const late = hasCheckIn && isLate(attendanceMap[student.id].check_in_time, meetingDate || '', meetingStartTime)

// Tentukan label + warna badge final
const displayLabel = hasCheckIn ? (late ? 'Telat' : 'Tepat Waktu') : (status ? STATUS_LABEL[status] : 'Belum absen')
const badgeColorClass = hasCheckIn
  ? (late
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
      : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400')
  : (status ? STATUS_BADGE[status] : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500')
const dotColorClass = hasCheckIn
  ? (late ? 'bg-orange-500' : 'bg-green-500')
  : (status ? STATUS_DOT[status] : 'bg-gray-300 dark:bg-gray-600')

// Card container background: kalau late, pakai border/bg oranye; kalau isHadir (termasuk tepat waktu), tetap hijau seperti sekarang
const cardColorClass = late
  ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20'
  : isHadir
    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
```
Ganti pemakaian `isHadir ? 'border-green-300...' : 'border-gray-200...'` di card className jadi `cardColorClass`. Ganti render badge tunggal (hapus badge kedua yang lama dari sm-8c8i — jangan render 2 badge):
```tsx
<span className={`inline-flex items-center gap-1 rounded-full font-medium ${big ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-0.5 text-[10px]'} ${badgeColorClass}`}>
  <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} aria-hidden />
  {displayLabel}
</span>
```
Hapus blok badge Telat/Tepat Waktu terpisah yang ditambahkan sm-8c8i (yang sekarang duplikat).

**Test**: kalau ada test untuk LivePresensiTab (cek `find src/app/(admin)/presensi/components -iname "*LivePresensiTab*test*"`), update assertion. Kalau belum ada test file untuk komponen ini (murni presentational, dari CLAUDE.md TDD rule boleh skip untuk UI presentasional murni), skip — tapi verify manual di dev server.

## Task 4: Header counter — breakdown Telat/Tepat Waktu/Izin/Sakit/Alfa

**File: `src/app/(admin)/presensi/components/LivePresensiTab.tsx`**

Current header (sekitar baris 165-180) cuma tampilkan Hadir/Total + persentase besar. Tambah baris breakdown kecil di bawahnya, HANYA saat `checkTimeEnabled` true (kalau off, gak ada data telat untuk breakdown, cukup tampilan lama).

Hitung breakdown (tambah di `useMemo` dekat `hadirCount`/`percentage`, sekitar baris 143-148):
```typescript
const { lateCount, onTimeCount, izinCount, sakitCount, alfaCount } = useMemo(() => {
  let lateCount = 0, onTimeCount = 0, izinCount = 0, sakitCount = 0, alfaCount = 0
  students.forEach(s => {
    const entry = attendanceMap[s.id]
    const status = entry?.status
    if (status === 'H') {
      if (checkTimeEnabled && entry?.check_in_time) {
        if (isLate(entry.check_in_time, meetingDate || '', meetingStartTime)) lateCount++
        else onTimeCount++
      }
    } else if (status === 'I') izinCount++
    else if (status === 'S') sakitCount++
    else alfaCount++ // termasuk belum absen, treat sebagai alfa sementara (konsisten dgn default 'A' di useMeetingAttendance)
  })
  return { lateCount, onTimeCount, izinCount, sakitCount, alfaCount }
}, [students, attendanceMap, checkTimeEnabled, meetingDate, meetingStartTime])
```

Tambah UI di bawah persentase besar (sekitar baris 178, setelah blok `connectionStatus`):
```tsx
{checkTimeEnabled && (
  <div className={`mt-4 flex flex-wrap justify-center gap-2 ${big ? 'text-sm' : 'text-xs'}`}>
    <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 font-medium">Telat: {lateCount}</span>
    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-medium">Tepat Waktu: {onTimeCount}</span>
    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-medium">Izin: {izinCount}</span>
    <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 font-medium">Sakit: {sakitCount}</span>
    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 font-medium">Alfa: {alfaCount}</span>
  </div>
)}
```

## Task 5: Verification

```bash
npm run test:run
npm run type-check
```
Manual smoke test:
1. Meeting existing dengan siswa H lama (check_in_time null) → nyalain checkTimeEnabled + set jam mulai → save ulang attendance apapun → pastikan siswa H lama TETAP tanpa badge Telat/Tepat Waktu (check_in_time tetap null).
2. Login sebagai teacher TANPA `can_manage_check_time` → buka CreateMeetingModal → toggle "Aktifkan cek waktu masuk" TIDAK muncul.
3. Admin/superadmin → toggle selalu muncul (tidak perlu permission).
4. Set `can_manage_check_time=true` untuk seorang teacher via SettingsModal → toggle muncul untuk teacher itu.
5. Meeting dengan checkTimeEnabled true → siswa scan QR setelah jam mulai → card jadi oranye, badge "Telat" (bukan "Hadir" + "Telat" dobel).
6. Header Presentasi tampilkan breakdown Telat/Tepat Waktu/Izin/Sakit/Alfa yang akurat.

## CLAUDE.md Check
- [ ] Pattern baru? Tidak — permission gating ikut pola `can_manage_materials` existing persis.
- [ ] Tabel DB baru? Tidak.
- [ ] Route baru? Tidak.
- [ ] Permission pattern baru? Ya tapi ikut pola existing (`permissions.can_manage_check_time`) — tidak perlu dokumentasi baru, sudah tercakup pola `canManageMaterials` di `docs/claude/architecture-patterns.md`.
