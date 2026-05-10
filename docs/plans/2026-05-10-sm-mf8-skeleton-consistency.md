# Plan: sm-mf8 — Plan A: Konsistensi Skeleton + Cache Biodata

## Context

Tab detail siswa (`/users/siswa/[studentId]/`) punya inkonsistensi loading:

1. **Biodata tidak ter-cache** — pakai `useState` + manual fetch, refetch setiap kunjungan
2. **Skeleton tidak konsisten** antar tab:
   - Profil: `bg-gray-100 rounded-xl`, no min-h-screen ✅
   - Presensi: `StudentDetailSkeleton` — punya `min-h-screen bg-gray-50` sendiri (layout shift) ❌
   - Materi: `bg-gray-100 rounded-xl` inline, no min-h-screen ✅
   - Biodata: `bg-gray-200 rounded-lg` + `min-h-screen bg-gray-50` (layout shift) ❌

Tujuan: cache biodata + standardisasi semua skeleton ke style yang sama (no layout shift).

**Standard skeleton pattern** untuk semua tab:
```tsx
<div className="space-y-4 animate-pulse">
    <div className="h-[N] bg-gray-100 dark:bg-gray-800 rounded-xl" />
</div>
```
— Tidak ada `min-h-screen`, tidak ada `bg-gray-50` wrapper, warna `bg-gray-100 dark:bg-gray-800`, radius `rounded-xl`.

---

## Files yang Dimodifikasi

| File | Action | Alasan |
|------|--------|--------|
| `src/app/(admin)/users/siswa/[studentId]/biodata/page.tsx` | MODIF | Ganti useState→useSWR (cache) + fix skeleton |
| `src/app/(admin)/users/siswa/[studentId]/presensi/page.tsx` | MODIF | Ganti StudentDetailSkeleton → skeleton inline |
| `src/app/(admin)/users/siswa/[studentId]/components/IkhtisarView.tsx` | MODIF | Standardisasi warna skeleton jika belum `bg-gray-100` |

`StudentDetailSkeleton` hanya dipakai di `presensi/page.tsx` — aman diganti, file component-nya tidak dihapus.

---

## TASK 1 — Cache Biodata + Fix Skeleton Biodata

### File: `src/app/(admin)/users/siswa/[studentId]/biodata/page.tsx`

**Perubahan 1: Ganti fetch pattern ke useSWR**

```tsx
// SEBELUM — useState + useEffect manual fetch:
const [student, setStudent] = useState<StudentBiodata | null>(null)
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
    loadStudent()
}, [studentId])

const loadStudent = async () => {
    setIsLoading(true)
    const result = await getStudentBiodata(studentId)
    if (result.success) setStudent(result.data)
    else setError(result.error || 'Gagal memuat data')
    setIsLoading(false)
}

// SESUDAH — useSWR:
import useSWR, { mutate } from 'swr'

const SWR_KEY = `student-biodata-${studentId}`

const { data: result, isLoading, error: swrError } = useSWR(
    SWR_KEY,
    () => getStudentBiodata(studentId),
    {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    }
)

const student = result?.success ? result.data ?? null : null
const error = result?.success === false ? (result.error ?? 'Gagal memuat data') : null
```

**Perubahan 2: Edit sukses → mutate SWR**

Cari semua tempat di file ini yang memanggil `loadStudent()` setelah edit sukses, ganti dengan:
```tsx
mutate(SWR_KEY)
```

**Perubahan 3: Fix skeleton**

```tsx
// SEBELUM:
if (isLoading) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="space-y-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200"></div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// SESUDAH — inline, no wrapper, konsisten dengan tab lain:
if (isLoading) {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
    )
}
```

Test: `npm run test:run` → pass.

---

## TASK 2 — Standardisasi Skeleton Presensi

### File: `src/app/(admin)/users/siswa/[studentId]/presensi/page.tsx`

**Perubahan:**

1. Hapus import `StudentDetailSkeleton` (hanya dipakai di file ini, aman dihapus)

2. Ganti skeleton loading:
```tsx
// SEBELUM (sekitar line 98-100):
if (isLoading) {
    return <StudentDetailSkeleton />
}

// SESUDAH — skeleton inline konsisten:
if (isLoading) {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                ))}
            </div>
            <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
    )
}
```

Test: `npm run test:run` → pass.

---

## TASK 3 — Standardisasi Skeleton Profil (IkhtisarView)

### File: `src/app/(admin)/users/siswa/[studentId]/components/IkhtisarView.tsx`

Cek `IkhtisarSkeleton` function di bawah file. Jika masih pakai `bg-gray-200 dark:bg-gray-700`, update ke `bg-gray-100 dark:bg-gray-800`. Jika sudah `bg-gray-100 dark:bg-gray-800`, skip task ini.

```tsx
// Target state — IkhtisarSkeleton:
function IkhtisarSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-44 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                <div className="h-44 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            </div>
        </div>
    )
}
```

Test: `npm run test:run` → pass. `npm run type-check` → bersih.

---

## Verification Checklist

- [ ] Tab Biodata: kunjungi pertama kali → skeleton sebentar → konten muncul
- [ ] Tab Biodata: pindah tab lain → kembali → instant (SWR cache)
- [ ] Tab Biodata: edit data → simpan → data terupdate (SWR mutate revalidate)
- [ ] Semua 4 tab: skeleton style sama (`bg-gray-100 dark:bg-gray-800`, `rounded-xl`, no `min-h-screen`)
- [ ] Tidak ada layout shift saat skeleton muncul di manapun
- [ ] `npm run type-check` → bersih
- [ ] `npm run test:run` → pass

---

## Tidak Berubah

- `MateriView.tsx` — skeleton sudah konsisten, tidak perlu diubah
- `StudentDetailSkeleton.tsx` — tidak dihapus (aman), hanya tidak dipakai lagi di presensi

## Commit Message Template

```
fix(siswa): standardisasi skeleton + cache biodata dengan SWR

- biodata/page.tsx: ganti useState→useSWR (cache per session), skeleton konsisten
- presensi/page.tsx: ganti StudentDetailSkeleton → skeleton inline konsisten
- IkhtisarView: standardisasi warna skeleton ke bg-gray-100

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
