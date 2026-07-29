# Plan: Migrasi Dev ke Turbopack (sm-ac3l)

## Context

Dev lokal lambat buka halaman. Log terminal membuktikan biang = **Webpack cold-compile per-route**:
```
✓ Compiled /home in 19.4s (3800 modules)
✓ Compiled /users/siswa in 39.4s (5153 modules)
```
Bukan DB lokal (terbukti salah), bukan Sentry runtime. Murni compile Webpack yang proporsional ke jumlah modules (app besar). Obat: **Turbopack** (`next dev --turbopack`) — 5-10x lebih cepat compile.

**Produksi TIDAK terpengaruh**: `next build` tetap Webpack. Turbopack cuma untuk `dev`.

Turbopack lebih strict dari Webpack → mengaktifkannya membongkar 3 hutang teknis lama yang selama ini ditoleransi Webpack. Plan ini beresi semua sekaligus.

**Prasyarat**: sm-9fnc (13 error type pre-existing) harus beres dulu — `npm run type-check` wajib bersih agar verifikasi valid. sm-ac3l blocked-by sm-9fnc.

## Sudah di-apply di master (JANGAN ubah)
Sentry-guard `if (process.env.NODE_ENV === 'production')` di `sentry.edge.config.ts`, `sentry.server.config.ts`, `src/instrumentation-client.ts`. Biarkan — bagian ini benar & sudah commit terpisah.

---

## Task 1 — Aktifkan Turbopack + SVGR rule

### 1a. `package.json`
```json
"dev": "next dev --turbopack"
```

### 1b. `next.config.ts` — tambah `turbopack.rules` TOP-LEVEL (bukan di `experimental`!)
`icons.tsx` import ~70 `.svg` sebagai React component via SVGR. Turbopack tak baca blok `webpack()` → butuh rule sendiri. **Key top-level** (sejak Next 15.3; `experimental.turbopack` diabaikan diam-diam).

Sisipkan di `nextConfig` (sejajar `experimental`, bukan di dalamnya). Blok `webpack()` lama TETAP (dipakai `next build`):
```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  turbopack: {
    rules: {
      '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' },
    },
  },
  webpack(config) { /* SVGR rule lama — JANGAN hapus */ ... },
  ...
}
```

---

## Task 2 — Hapus anti-pattern `export type` dari 10 file `use server`

**Root cause error**: file `'use server'` cuma boleh export async function. `export type { X }` (segala bentuk: local re-export DAN `... from '...'`) → Turbopack: *"Only async functions are allowed to be exported in a 'use server' file"* atau `ReferenceError: X is not defined`. Webpack toleran, Turbopack tolak.

**Aturan fix**: hapus `export type` dari file `use server`. Type harus di-export dari **file non-server** (barrel `index.ts` non-server BOLEH re-export dari source). Konsumer import type dari source langsung / barrel.

**Penting**: kalau body file pakai type-nya, `import type { X }` TETAP dipertahankan (import type + tanpa export = valid). `import type` + `export type from` koeksis tanpa "Duplicate identifier" (sudah diverifikasi).

### 10 file `use server` — hapus baris `export type`:
| File | baris | type |
|---|---|---|
| `dashboard/actions/monitoring/actions.ts` | 26 | ClassMonitoringData, ClassMonitoringFilters |
| `dashboard/actions/overview/actions.ts` | 21 | Dashboard, DashboardFilters, TodayMeeting, ClassPerformance, MeetingTypeDistribution |
| `users/guru/actions/settings/actions.ts` | 18 | MeetingFormSettings |
| `users/guru/actions/teachers/actions.ts` | 29 | TeacherData |
| `users/siswa/[studentId]/actions/enrollmentHistory.ts` | 6 | EnrollmentHistoryRow |
| `users/siswa/actions/classes/actions.ts` | 15 | Class |
| `users/siswa/actions/management/actions.ts` | 40 | Student, TransferRequest |
| `users/siswa/actions/students/actions.ts` | 50 | Student (=StudentWithClasses alias) |
| `kelas/actions/classes.ts` | 10 | ClassWithMaster |
| `kelas/actions/masters.ts` | 9 | ClassMaster |

> Setelah hapus `export type`, cek tiap type: kalau body file **masih pakai** (mis. `Promise<ClassMaster[]>`), pastikan `import type` tetap ada. Kalau import type kehapus, re-add `import type { X } from '<source>'`.

### Barrel index (NON-server) — re-export type dari SOURCE (bukan dari action file):
- **`dashboard/actions/index.ts`**: `export type {...} from './overview/actions'` → `from '@/types/dashboard'`; `export type {...} from './monitoring/actions'` → `from '@/types/dashboard'`
- **`users/guru/actions/index.ts`**: `TeacherData`/`MeetingFormSettings` `from './teachers/actions'|'./settings/actions'` → `from './types'`
- **`users/siswa/actions/index.ts`**:
  - blok `from './classes/actions'`: hapus `type Class` dari situ → tambah baris `export type { Class } from '@/types/class'`
  - blok `from './students/actions'`: hapus `type Student` → tambah `export type { StudentWithClasses as Student } from '@/types/student'`
  - blok `from './management/actions'`: hapus `type TransferRequest` (tak ada konsumer via barrel — cek `grep`; kalau ada, `export type { TransferRequest } from '<source permissions>'`)

### Konsumer yang import type via action file LANGSUNG (deep path) — alihkan ke source:
| Konsumer | type | ganti ke |
|---|---|---|
| `laporan/components/OverviewTab.tsx` | ClassMonitoringData | `@/types/dashboard` |
| `presensi/[meetingId]/MeetingOrgBreakdown.tsx` | ClassMonitoringData | via barrel `dashboard/actions` (sudah fixed) — OK, no change |
| `kelas/stores/kelasStore.ts` | ClassWithMaster, ClassMaster | `import type {...} from '@/types/class'` |
| `kelas/components/ClassModal.tsx` | ClassWithMaster, ClassMaster | pisah: runtime tetap dari action, `import type` dari `@/types/class` |
| `kelas/components/ClassMasterModal.tsx` | ClassMaster | pisah: runtime dari action, `import type` dari `@/types/class` |

> Konsumer via barrel (`../actions`, `@/app/.../dashboard/actions`, `@/app/.../users/siswa/actions`, `@/app/.../users/guru/actions`) TIDAK perlu diubah — barrel sudah re-export dari source. Cuma yang import dari **deep action path** (`../actions/classes`, `.../monitoring/actions`) yang dialihkan.

---

## Verifikasi (end-to-end)

Scan otomatis (harus 0):
```python
# tak ada 'export type' tersisa di file 'use server'
import os,re
for root,_,files in os.walk('src'):
  for f in files:
    if f.endswith(('.ts','.tsx')):
      p=os.path.join(root,f); c=open(p).read()
      if c.lstrip()[:15].startswith(("'use server'",'"use server"')):
        for i,l in enumerate(c.split('\n'),1):
          if l.strip().startswith('export type'): print(f"BAD {p}:{i}")
```

Manual:
1. `npm run type-check` → **0 error** (prasyarat: sm-9fnc sudah beres).
2. `npm run dev` → log `▲ Next.js 15.5.9 (Turbopack)`. Compile `/users/siswa` harus **jauh < 39s**.
3. Buka `/signin` (icon EyeIcon/EyeCloseIcon render), `/home`, `/users/siswa`, `/kelas`, `/dashboard`, `/presensi` → semua render, icon tampil, **tak ada error "Element type invalid" / "X is not defined"**.
4. `npm run build` → sukses (produksi Webpack tak regresi).

## Rollback
Kalau buntu: `git checkout HEAD -- package.json next.config.ts` + revert file action → balik Webpack dev. Sentry-guard tetap (commit terpisah).
