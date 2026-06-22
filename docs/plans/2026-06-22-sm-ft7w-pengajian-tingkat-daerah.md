# Plan: Pengajian Tingkat Daerah

**Issue**: sm-ft7w / GH-#TBD  
**Date**: 2026-06-22  
**Branch**: `feat/sm-ft7w-pengajian-daerah`

---

## Context

Saat ini app punya 3 level pengajian via tabel `activity_levels` (`KELOMPOK`, `DESA`, `DAERAH` — semua sudah ada di DB). Pengajian **kelompok** dan **desa** sudah jalan penuh: user level desa bisa buat pengajian gabungan lintas kelompok dalam desanya (picker kelompok → pilih nama kelas → sistem expand ke semua kelas itu di kelompok terpilih).

**Pengajian daerah belum jalan.** Di kode `CreateMeetingModal.tsx:174` ada komentar eksplisit `"Guru Daerah: tampilkan semua (scope terpisah, bisa dikembangkan nanti)"` — `availableKelompok` mengembalikan `[]` untuk Guru Daerah, jadi mereka tidak bisa memilih scope.

**Outcome:** Admin Daerah & Guru Daerah bisa buat pengajian tingkat daerah lewat picker Desa → kelas (mirror pola desa). Meeting daerah tampil dengan badge "X Desa" dan format lokasi yang benar per role.

---

## Keputusan (dikonfirmasi user)

1. **Pembuat**: Admin Daerah + Guru Daerah (superadmin di-skip — tetap default KELOMPOK seperti sekarang).
2. **Pilih kelas**: Picker **Desa** (multi-select desa dalam daerah) → pilih nama kelas → expand ke semua kelas bernama itu di desa terpilih. Mirror persis pola desa (yang pakai picker kelompok).
3. **Badge**: Tambah badge ungu `"X Desa"` saat meeting span >1 desa (sejajar badge `"X Kelompok"` yang sudah ada).

---

## Arsitektur yang Di-reuse

- **`activity_levels.DAERAH`** — row sudah ada (`id: e59e98ac-...`, `code: DAERAH`). Tidak perlu migrasi DB.
- **`CreateMeetingModal.tsx:119-135`** — `activityLevelId` useMemo SUDAH map daerah user (`daerah_id && !desa_id`) → `DAERAH`. Tidak perlu diubah.
- **`meetings.kelompok_ids`** (jsonb array) — sudah dipakai untuk menyimpan kelompok scope. Akan diisi hasil expand dari desa terpilih.
- **Pola picker desa** = mirror `availableKelompok` + `<MultiSelectCheckbox label="Pilih Kelompok">` (modal line ~167, ~782).
- **`useDesa()`** hook sudah ada (dipakai di MeetingList).
- **`countUniqueKelompok()`** di MeetingList/Cards — buat `countUniqueDesa()` analog.

---

## File yang Disentuh

Semua di `src/app/(admin)/presensi/`:

1. `components/CreateMeetingModal.tsx` — picker desa + class expansion untuk daerah user.
2. `components/MeetingList.tsx` — `formatMeetingLocation` daerah branch + badge "X Desa" + `countUniqueDesa()`.
3. `components/MeetingCards.tsx` — mirror MeetingList.
4. `components/logic.ts` *(baru)* — `deriveClassIdsBySelection()` pure function (TDD).
5. `components/logic.test.ts` *(baru)* — unit test untuk logic.ts.

---

## Task 1 — Picker Desa di CreateMeetingModal (TDD untuk logic murni)

### 1a. Buat `logic.ts` + test (RED → GREEN)

**File baru**: `src/app/(admin)/presensi/components/logic.ts`

```ts
export function deriveClassIdsBySelection(
  availableClasses: { id: string; name: string; kelompok_id?: string; desa_id?: string }[],
  selectedClassNames: string[],
  selectedScopeIds: string[],
  scopeKey: 'kelompok_id' | 'desa_id'
): string[] {
  if (selectedClassNames.length === 0) return []
  const nameSet = new Set(selectedClassNames)
  return availableClasses
    .filter(cls => nameSet.has(cls.name))
    .filter(cls => selectedScopeIds.length === 0 || selectedScopeIds.includes(cls[scopeKey] ?? ''))
    .map(cls => cls.id)
}
```

**File baru**: `src/app/(admin)/presensi/components/logic.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { deriveClassIdsBySelection } from './logic'

const classes = [
  { id: 'c1', name: 'Pra Nikah 1', kelompok_id: 'k1', desa_id: 'd1' },
  { id: 'c2', name: 'Pra Nikah 1', kelompok_id: 'k2', desa_id: 'd2' },
  { id: 'c3', name: 'SMP 1',       kelompok_id: 'k1', desa_id: 'd1' },
  { id: 'c4', name: 'SMP 1',       kelompok_id: 'k3', desa_id: 'd2' },
]

describe('deriveClassIdsBySelection', () => {
  it('expand by desa_id: Pra Nikah 1 × 2 desa → c1 + c2', () => {
    const result = deriveClassIdsBySelection(classes, ['Pra Nikah 1'], ['d1', 'd2'], 'desa_id')
    expect(result.sort()).toEqual(['c1', 'c2'])
  })

  it('expand by desa_id: single desa → only c1', () => {
    const result = deriveClassIdsBySelection(classes, ['Pra Nikah 1'], ['d1'], 'desa_id')
    expect(result).toEqual(['c1'])
  })

  it('scope empty → all matching by name', () => {
    const result = deriveClassIdsBySelection(classes, ['SMP 1'], [], 'desa_id')
    expect(result.sort()).toEqual(['c3', 'c4'])
  })

  it('expand by kelompok_id: backward compat', () => {
    const result = deriveClassIdsBySelection(classes, ['Pra Nikah 1'], ['k1'], 'kelompok_id')
    expect(result).toEqual(['c1'])
  })

  it('no class names → empty', () => {
    const result = deriveClassIdsBySelection(classes, [], ['d1'], 'desa_id')
    expect(result).toEqual([])
  })
})
```

Jalankan: `npm run test:run -- --reporter=verbose src/app/(admin)/presensi/components/logic.test.ts`
Expect: **5 tests FAIL** (file belum ada). Baru buat `logic.ts`, jalankan lagi → **PASS**.

### 1b. Update CreateMeetingModal.tsx

Lokasi: `src/app/(admin)/presensi/components/CreateMeetingModal.tsx`

**Step 1 — Tambah state baru** (dekat `selectedKelompokIds`, line ~53):
```ts
const [selectedDesaIds, setSelectedDesaIds] = useState<string[]>([])
```

**Step 2 — Tambah hook `useDesa()`** (di bagian hook di atas, mirror `useKelompok`/`useKelas`):
```ts
const { desa } = useDesa()
```
Cek: `useDesa` sudah di-import di file lain (e.g. MeetingList) — import dari path yang sama.

**Step 3 — Tambah `isDaerahLevelUser` useMemo** (setelah `isHierarchicalTeacher`):
```ts
const isDaerahLevelUser = useMemo(() => {
  if (!userProfile) return false
  return userProfile.role !== 'superadmin'
    && !!userProfile.daerah_id
    && !userProfile.desa_id
    && !userProfile.kelompok_id
}, [userProfile])
```

**Step 4 — Tambah `availableDesa` useMemo** (setelah `availableKelompok`):
```ts
const availableDesa = useMemo(() => {
  if (!desa || !userProfile || !isDaerahLevelUser) return []
  return (desa as any[]).filter(d => d.daerah_id === userProfile.daerah_id)
}, [desa, userProfile, isDaerahLevelUser])
```

**Step 5 — Auto-select desa saat modal buka** (mirror useEffect auto-select kelompok line ~353):
```ts
useEffect(() => {
  if (!isOpen) return
  if (availableDesa.length === 0) return
  setSelectedDesaIds(availableDesa.map((d: any) => d.id))
}, [isOpen, availableDesa.length])
```

**Step 6 — Audit semua `isHierarchicalTeacher` gate** di modal:
Cari semua occurrences. Kandidat yang harus `|| isDaerahLevelUser`:
- `dedupedClassOptions` useMemo: `if (!isHierarchicalTeacher) return []` → `if (!isHierarchicalTeacher && !isDaerahLevelUser) return []`
- auto-derive `selectedClassIds` useEffect gate yang sama
- `availableClasses` filter/sort: tambah cabang daerah (step 7 di bawah)

**Step 7 — Filter `availableClasses` by selected desa** (dalam useMemo `availableClasses` line ~179):

Daerah user butuh classes yang kelompok_id-nya ada di desa yang dipilih. Classes punya `kelompok_id`; butuh map `kelompok_id → desa_id` dari data kelompok.

```ts
// Tambah map kelompok→desa di atas return
const kelompokDesaMap = new Map(
  (kelompok as any[]).map(k => [k.id, k.desa_id])
)

if (isDaerahLevelUser && selectedDesaIds.length > 0) {
  sorted = sorted.filter(cls => {
    const desaId = kelompokDesaMap.get((cls as any).kelompok_id)
    return desaId && selectedDesaIds.includes(desaId)
  })
}
```

Cek `kelompok` sudah tersedia di modal (dari `useKelompok` atau prop). Jika belum, tambah hook.

**Step 8 — Auto-derive classIds untuk daerah user** (useEffect line ~265):

Ganti gate `if (!isHierarchicalTeacher) return` menjadi:
```ts
if (!isHierarchicalTeacher && !isDaerahLevelUser) return
```

Dalam effect, tambah cabang daerah:
```ts
import { deriveClassIdsBySelection } from './logic'

// ... dalam useEffect
const scopeKey = isDaerahLevelUser ? 'desa_id' : 'kelompok_id'
const scopeIds = isDaerahLevelUser ? selectedDesaIds : selectedKelompokIds

// Enrich availableClasses dengan desa_id dari kelompokDesaMap
const enriched = availableClassesForDerive.map(cls => ({
  ...cls,
  desa_id: kelompokDesaMap.get(cls.kelompok_id)
}))

const derived = deriveClassIdsBySelection(enriched, selectedClassNames, scopeIds, scopeKey)
setSelectedClassIds(derived)
```

**Step 9 — Save handler** (line ~699):

Daerah user: `selectedKelompokIds` kosong → fallback infer-from-classes di `else` branch line ~704 sudah handle ini. Verifikasi saja jalurnya:
```ts
// existing else branch (line ~704):
const kelompokIdsFromClasses = [...new Set(
  selectedClassIds.map(id => classesMap.get(id)?.kelompok_id).filter(Boolean)
)]
```
Daerah user otomatis lewat sini — `kelompok_ids` keisi lintas desa. Tidak perlu ubah.

**Step 10 — UI Picker** (mirror blok `<MultiSelectCheckbox label="Pilih Kelompok">` line ~782):

```tsx
{isDaerahLevelUser && availableDesa.length > 1 && (
  <MultiSelectCheckbox
    label="Pilih Desa"
    options={availableDesa.map((d: any) => ({ value: d.id, label: d.name }))}
    value={selectedDesaIds}
    onChange={setSelectedDesaIds}
  />
)}
```

Letakkan SEBELUM picker kelompok (desa lebih tinggi level). JANGAN raw HTML.

---

## Task 2 — MeetingList.tsx

Lokasi: `src/app/(admin)/presensi/components/MeetingList.tsx`

### 2a. Tambah `countUniqueDesa()`

Mirror `countUniqueKelompok` (line ~146). Tambah setelah fungsi tersebut:

```ts
const countUniqueDesa = (
  meeting: MeetingWithStats,
  classesData: ClassData[],
  kelompokData: KelompokData[],
  desaData: DesaData[]
): number => {
  if (!meeting.class_ids?.length) return 0
  const kelompokMap = new Map(kelompokData.map(k => [k.id, k.desa_id]))
  const classMap = new Map(classesData.map(c => [c.id, c]))
  const desaIds = new Set<string>()
  for (const classId of meeting.class_ids) {
    const cls = classMap.get(classId)
    if (!cls) continue
    const desaId = kelompokMap.get(cls.kelompok_id)
    if (desaId) desaIds.add(desaId)
  }
  return desaIds.size
}
```

### 2b. Badge "X Desa"

Di render badge (cari pattern `uniqueKelompokCount > 1`), tambah cabang SEBELUM cek kelompok:

```tsx
const uniqueDesaCount = countUniqueDesa(meeting, classesData, kelompokData, desaData)
// ganti existing badge logic:
{uniqueDesaCount > 1 ? (
  <span className="badge-purple">{uniqueDesaCount} Desa</span>
) : uniqueKelompokCount > 1 ? (
  <span className="badge-indigo">{uniqueKelompokCount} Kelompok</span>
) : meeting.class_ids?.length > 1 ? (
  <span className="badge-blue">{meeting.class_ids.length} Kelas</span>
) : null}
```

Pakai class Tailwind yang sudah ada di file (lihat badge kelompok yang ada, mirror warna — ungu/violet untuk desa).

### 2c. `formatMeetingLocation` daerah branch

Lokasi: `formatMeetingLocation` function, cabang `else if (isDaerahUser)` (line ~83).

Saat ini selalu push desa + kelompok. Ganti dengan:
```ts
else if (isDaerahUser) {
  if (desaNames.length === 1) {
    parts.push(String([...desaNames][0]))
    if (kelompokNames.length === 1) parts.push(String([...kelompokNames][0]))
  } else {
    return ''  // multi-desa = daerah-level meeting, hilangkan
  }
}
```

---

## Task 3 — MeetingCards.tsx

Komponen kembar MeetingList. Terapkan **persis sama**:

1. `countUniqueDesa()` — copy paste dari MeetingList, sesuaikan tipe jika berbeda.
2. Badge "X Desa" — mirror Task 2b.
3. `formatMeetingLocation` daerah branch — cek variabel: Cards pakai `isAdminDaerahUser` (bukan `isDaerahUser`). Terapkan logika yang sama.

Cek semua type annotation — Cards dan List mungkin punya tipe sedikit berbeda.

---

## Verifikasi

1. `npm run test:run` — `deriveClassIdsBySelection` 5 tests PASS.
2. `npm run type-check` — no error.
3. Login Admin Daerah → Create Meeting → cek picker "Pilih Desa" muncul, default semua desa ter-check.
4. Pilih 2 desa + 2 nama kelas → submit → cek DB via MCP:
   ```sql
   SELECT class_ids, kelompok_ids, activity_level_id FROM meetings ORDER BY created_at DESC LIMIT 1;
   ```
   - `class_ids`: kelas dari kedua desa
   - `kelompok_ids`: semua kelompok lintas desa
   - `activity_level_id`: DAERAH (`e59e98ac-...`)
5. Cek tampilan MeetingList/Cards: badge "X Desa", lokasi kosong untuk user daerah.
6. Regresi: pengajian kelompok/desa existing tetap benar.

---

## CLAUDE.md Check
- [ ] Pattern baru: `deriveClassIdsBySelection` (logic.ts) — jika jadi util reusable, dokumentasikan di `architecture-patterns.md` § Meeting scope.
- [ ] Tabel DB baru: Tidak (activity_levels.DAERAH sudah ada).
- [ ] Route/page baru: Tidak.
- [ ] Permission pattern baru: Tidak (reuse role check daerah).
- [ ] Update roadmap.md: baris Presensi + tambah sm-ft7w ke Next Up.
