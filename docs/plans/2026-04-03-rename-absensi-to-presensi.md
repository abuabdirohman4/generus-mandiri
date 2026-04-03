# Plan: Rename "absensi" → "presensi"

## Context

Perubahan terminologi dari "absensi" (ketidakhadiran) ke "presensi" (kehadiran) karena "presensi" lebih tepat secara bahasa Indonesia untuk fitur pencatatan kehadiran siswa. Scope: UI teks + URL route saja. Variabel/fungsi internal TIDAK diubah karena risikonya tidak sepadan.

**Tidak ada redirect** — user konfirmasi tidak ada bookmark/link eksternal ke `/absensi`.

---

## Scope

| Jenis | Diubah? |
|---|---|
| UI text / labels | ✅ Ya |
| URL route (`/absensi` → `/presensi`) | ✅ Ya |
| Folder App Router | ✅ Ya (folder rename) |
| `accessControl.ts` feature flag | ✅ Ya |
| `middleware.ts` route guard | ✅ Ya |
| E2E tests (locators, `goto`) | ✅ Ya |
| Unit test assertions (revalidatePath strings) | ✅ Ya |
| `CLAUDE.md` Architecture Overview | ✅ Ya |
| Variabel/fungsi internal (`absensiUIStore`, dll.) | ❌ Tidak |
| localStorage key (`absensi-ui-store`) | ❌ Tidak |
| Docs/plans lama | ❌ Tidak |
| Redirect dari `/absensi` | ❌ Tidak perlu |

---

## Task 1: Rename Folder App Router (BLOCKING — harus pertama)

**Jalankan:**
```bash
git mv "src/app/(admin)/absensi" "src/app/(admin)/presensi"
```

Ini mengubah Next.js route segment dari `/absensi` ke `/presensi` sekaligus. Semua file di dalamnya ikut pindah.

---

## Task 2: Fix `layout.tsx` (di dalam folder yang sudah di-rename)

**File:** `src/app/(admin)/presensi/layout.tsx`

| Find | Replace |
|---|---|
| `title: "Absensi \| Generus Mandiri"` | `title: "Presensi \| Generus Mandiri"` |
| `description: "Absensi siswa di Generus Mandiri"` | `description: "Presensi siswa di Generus Mandiri"` |
| `function AbsensiLayout` | `function PresensiLayout` |

---

## Task 3: Fix URL & Toast Strings di Dalam Folder `presensi/`

### `src/app/(admin)/presensi/page.tsx`
| Find | Replace |
|---|---|
| `router.push(\`/absensi?page=${page}\`` | `router.push(\`/presensi?page=${page}\`` |
| `router.replace('/absensi?page=1')` | `router.replace('/presensi?page=1')` |

### `src/app/(admin)/presensi/[meetingId]/page.tsx`
| Find | Replace |
|---|---|
| `'Data absensi berhasil disimpan!'` | `'Data presensi berhasil disimpan!'` |
| `'Gagal menyimpan data absensi: '` | `'Gagal menyimpan data presensi: '` |
| `router.push('/absensi')` | `router.push('/presensi')` |

### `src/app/(admin)/presensi/hooks/useAttendance.ts`
| Find | Replace |
|---|---|
| `'Data absensi berhasil disimpan!'` | `'Data presensi berhasil disimpan!'` |
| `'Gagal menyimpan data absensi: '` | `'Gagal menyimpan data presensi: '` |

### `src/app/(admin)/presensi/components/MeetingList.tsx` (jika ada)
| Find | Replace |
|---|---|
| `` href={`/absensi/${meeting.id}`} `` | `` href={`/presensi/${meeting.id}`} `` |

### `src/app/(admin)/presensi/components/MeetingCards.tsx` (jika ada)
| Find | Replace |
|---|---|
| `` href={`/absensi/${meeting.id}`} `` | `` href={`/presensi/${meeting.id}`} `` |

### `src/app/(admin)/presensi/actions/meetings/actions.ts`
| Find | Replace |
|---|---|
| `revalidatePath('/absensi')` (semua, ~3x) | `revalidatePath('/presensi')` |
| `'Tidak dapat menghapus pertemuan karena masih terdapat data absensi yang terkait. Silakan hapus data absensi terlebih dahulu.'` | `'Tidak dapat menghapus pertemuan karena masih terdapat data presensi yang terkait. Silakan hapus data presensi terlebih dahulu.'` |

### `src/app/(admin)/presensi/actions/attendance/actions.ts`
| Find | Replace |
|---|---|
| `revalidatePath('/absensi')` (semua, ~2x) | `revalidatePath('/presensi')` |

---

## Task 4: Fix Import Paths di File Luar Folder `presensi/`

File-file ini import dari folder yang sudah di-rename, sehingga import path-nya broken.

### `src/components/shared/DataFilter.tsx`
| Find | Replace |
|---|---|
| `from '@/app/(admin)/absensi/hooks/useMeetingTypes'` | `from '@/app/(admin)/presensi/hooks/useMeetingTypes'` |

### `src/app/(admin)/laporan/components/FilterSection.tsx`
| Find | Replace |
|---|---|
| `from '@/app/(admin)/absensi/hooks/useMeetingTypes'` | `from '@/app/(admin)/presensi/hooks/useMeetingTypes'` |

### `src/app/(admin)/users/siswa/[studentId]/components/MeetingDetailModal.tsx`
| Find | Replace |
|---|---|
| `from '@/app/(admin)/absensi/components/MeetingTypeBadge'` | `from '@/app/(admin)/presensi/components/MeetingTypeBadge'` |

### `src/app/(admin)/users/siswa/[studentId]/components/AttendanceList.tsx`
| Find | Replace |
|---|---|
| `from '@/app/(admin)/absensi/components/MeetingTypeBadge'` | `from '@/app/(admin)/presensi/components/MeetingTypeBadge'` |

---

## Task 5: Fix `revalidatePath` di Server Actions Luar Folder

### `src/app/(full-width-pages)/(auth)/actions.ts`
| Find | Replace |
|---|---|
| `revalidatePath("/absensi")` | `revalidatePath("/presensi")` |

### `src/app/(admin)/users/guru/actions/settings/actions.ts`
| Find | Replace |
|---|---|
| `revalidatePath('/absensi')` | `revalidatePath('/presensi')` |

### `src/app/(admin)/users/siswa/actions/students/actions.ts`
| Find | Replace |
|---|---|
| `revalidatePath('/absensi')` (semua) | `revalidatePath('/presensi')` |

### `src/app/(admin)/users/siswa/actions/management/actions.ts`
| Find | Replace |
|---|---|
| `revalidatePath('/absensi')` (semua) | `revalidatePath('/presensi')` |

---

## Task 6: Fix Middleware & Access Control

### `src/middleware.ts`
| Find | Replace |
|---|---|
| `'/absensi',` | `'/presensi',` |

### `src/lib/accessControl.ts`
| Find | Replace |
|---|---|
| `return ['users', 'absensi'].includes(feature);` | `return ['users', 'presensi'].includes(feature);` |

---

## Task 7: Fix UI Teks di Navigation & Layout

### `src/components/layouts/AppSidebar.tsx`
| Find | Replace |
|---|---|
| `name: "Absensi"` | `name: "Presensi"` |
| `path: "/absensi"` | `path: "/presensi"` |

### `src/components/layouts/BottomNavigation.tsx`
| Find | Replace |
|---|---|
| `href: "/absensi"` | `href: "/presensi"` |
| `label: "Absensi"` | `label: "Presensi"` |

### `src/components/layouts/AppHeader.tsx`
| Find | Replace |
|---|---|
| `path.startsWith('/absensi')` (semua) | `path.startsWith('/presensi')` |
| `return 'Absensi'` | `return 'Presensi'` |

### `src/components/PWA/index.tsx`
| Find | Replace |
|---|---|
| `pathname.startsWith('/absensi')` | `pathname.startsWith('/presensi')` |

### `src/app/(admin)/home/components/QuickActions.tsx`
| Find | Replace |
|---|---|
| `id: 'absensi'` | `id: 'presensi'` |
| `name: 'Absensi'` | `name: 'Presensi'` |
| `href: '/absensi'` | `href: '/presensi'` |
| `description: 'Laporan absensi'` | `description: 'Laporan presensi'` |

### `src/app/(admin)/home/page.tsx`
| Find | Replace |
|---|---|
| `data & absensi generus` | `data & presensi generus` |

### `src/app/layout.tsx`
| Find | Replace |
|---|---|
| `absensi dan data siswa` (semua, ~3x) | `presensi dan data siswa` |

---

## Task 8: Fix PWA Manifest & Dashboard Link

### `public/manifest.json`
| Find | Replace |
|---|---|
| `"name": "Absensi"` (shortcuts) | `"name": "Presensi"` |
| `"short_name": "Absensi"` (shortcuts) | `"short_name": "Presensi"` |
| `"url": "/absensi"` (shortcuts) | `"url": "/presensi"` |

### `src/app/(admin)/dashboard/components/TodayMeetings.tsx`
| Find | Replace |
|---|---|
| `` href={`/admin/absensi/${meeting.id}`} `` | `` href={`/presensi/${meeting.id}`} `` |

> Catatan: URL lama `/admin/absensi/` tidak sesuai App Router — diperbaiki sekalian ke `/presensi/`.

---

## Task 9: Fix Unit Test Assertions

### `src/app/(admin)/presensi/actions/meetings/__tests__/actions.test.ts`
| Find | Replace |
|---|---|
| `toHaveBeenCalledWith('/absensi')` (semua) | `toHaveBeenCalledWith('/presensi')` |
| `toContain('data absensi')` | `toContain('data presensi')` |

### `src/app/(admin)/presensi/actions/attendance/__tests__/actions.test.ts`
| Find | Replace |
|---|---|
| `toHaveBeenCalledWith('/absensi')` (semua) | `toHaveBeenCalledWith('/presensi')` |

### `src/app/(admin)/users/siswa/actions/students/__tests__/actions.test.ts`
| Find | Replace |
|---|---|
| `toHaveBeenCalledWith('/absensi')` (semua) | `toHaveBeenCalledWith('/presensi')` |

### `src/app/(admin)/users/siswa/actions/management/__tests__/actions.test.ts`
| Find | Replace |
|---|---|
| `toHaveBeenCalledWith('/absensi')` (semua) | `toHaveBeenCalledWith('/presensi')` |

### `src/app/(admin)/users/guru/actions/settings/__tests__/actions.test.ts`
| Find | Replace |
|---|---|
| `toHaveBeenCalledWith('/absensi')` | `toHaveBeenCalledWith('/presensi')` |
| `toContain('/absensi')` | `toContain('/presensi')` |
| `not.toContain('/absensi')` | `not.toContain('/presensi')` |
| test description `"/absensi paths on success"` | `"/presensi paths on success"` |

---

## Task 10: Fix E2E Tests

### `tests/e2e/attendance.spec.ts`
| Find | Replace |
|---|---|
| `page.goto('/absensi')` | `page.goto('/presensi')` |
| `/absensi/i` (regex locator) | `/presensi/i` |
| `toHaveURL(/.*absensi/)` | `toHaveURL(/.*presensi/)` |
| `a[href^="/absensi/"]` | `a[href^="/presensi/"]` |

### `tests/e2e/permissions.spec.ts`
| Find | Replace |
|---|---|
| `page.goto('/absensi')` (semua) | `page.goto('/presensi')` |
| `text=/absensi/i` | `text=/presensi/i` |
| `toHaveURL(/.*absensi/)` (semua) | `toHaveURL(/.*presensi/)` |

### `tests/e2e/dashboard.spec.ts`
| Find | Replace |
|---|---|
| `href: '/absensi'` | `href: '/presensi'` |
| `/absensi/` (regex) | `/presensi/` |

### `tests/TEST_FIXES_NEEDED.md`
| Find | Replace |
|---|---|
| `/absensi` (semua) | `/presensi` |
| `Absensi` (semua) | `Presensi` |

### `tests/MULTI_ROLE_TESTING.md`
| Find | Replace |
|---|---|
| `page.goto('/absensi')` | `page.goto('/presensi')` |

---

## Task 11: Update CLAUDE.md

**File:** `CLAUDE.md` (project root)

| Find | Replace |
|---|---|
| `/home`, `/absensi`, `/laporan` | `/home`, `/presensi`, `/laporan` |

> Jangan ubah baris `absensiUIStore` di line 213 — itu nama variabel internal, di luar scope.

---

## Verification

Setelah semua task selesai, jalankan berurutan:

```bash
# 1. Pastikan tidak ada sisa referensi absensi (kecuali variabel internal)
grep -r "absensi" src/ --include="*.ts" --include="*.tsx" | grep -v "absensiUIStore\|absensi-ui-store\|useAbsensiUIStore"

# 2. TypeScript check — semua broken import akan muncul di sini
npm run type-check

# 3. Unit tests
npm run test:run

# 4. Manual check — buka browser
npm run dev
# → Kunjungi http://localhost:3000/presensi
```

**Expected:** `grep` output kosong, `type-check` 0 errors, semua unit test pass.

---

## Commit Message Template

```
refactor: rename route and UI text from absensi to presensi

Terminology correction: "presensi" (presence/attendance) is more
accurate in Indonesian than "absensi" (absence). Changes UI labels,
URL route (/absensi → /presensi), and related test assertions.
Internal variable names (absensiUIStore, etc.) are unchanged.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Files Changed Summary (39 operations)

| # | File | Jenis |
|---|---|---|
| 1 | `src/app/(admin)/absensi/` → `presensi/` | Folder rename |
| 2 | `presensi/layout.tsx` | UI text |
| 3 | `presensi/page.tsx` | URL strings |
| 4 | `presensi/[meetingId]/page.tsx` | URL + toast |
| 5 | `presensi/hooks/useAttendance.ts` | Toast text |
| 6 | `presensi/components/MeetingList.tsx` | URL |
| 7 | `presensi/components/MeetingCards.tsx` | URL |
| 8 | `presensi/actions/meetings/actions.ts` | revalidatePath + error msg |
| 9 | `presensi/actions/attendance/actions.ts` | revalidatePath |
| 10 | `src/components/shared/DataFilter.tsx` | Import path |
| 11 | `src/app/(admin)/laporan/components/FilterSection.tsx` | Import path |
| 12 | `src/app/(admin)/users/siswa/[studentId]/components/MeetingDetailModal.tsx` | Import path |
| 13 | `src/app/(admin)/users/siswa/[studentId]/components/AttendanceList.tsx` | Import path |
| 14 | `src/app/(full-width-pages)/(auth)/actions.ts` | revalidatePath |
| 15 | `src/app/(admin)/users/guru/actions/settings/actions.ts` | revalidatePath |
| 16 | `src/app/(admin)/users/siswa/actions/students/actions.ts` | revalidatePath |
| 17 | `src/app/(admin)/users/siswa/actions/management/actions.ts` | revalidatePath |
| 18 | `src/middleware.ts` | Route guard |
| 19 | `src/lib/accessControl.ts` | Feature flag |
| 20 | `src/components/layouts/AppSidebar.tsx` | Nav item |
| 21 | `src/components/layouts/BottomNavigation.tsx` | Nav item |
| 22 | `src/components/layouts/AppHeader.tsx` | Page title |
| 23 | `src/components/PWA/index.tsx` | Pathname check |
| 24 | `src/app/(admin)/home/components/QuickActions.tsx` | UI text + href |
| 25 | `src/app/(admin)/home/page.tsx` | Description |
| 26 | `src/app/layout.tsx` | Metadata |
| 27 | `public/manifest.json` | PWA shortcut |
| 28 | `src/app/(admin)/dashboard/components/TodayMeetings.tsx` | Meeting link |
| 29 | `presensi/actions/meetings/__tests__/actions.test.ts` | Unit test assertions |
| 30 | `presensi/actions/attendance/__tests__/actions.test.ts` | Unit test assertions |
| 31 | `src/app/(admin)/users/siswa/actions/students/__tests__/actions.test.ts` | Unit test assertions |
| 32 | `src/app/(admin)/users/siswa/actions/management/__tests__/actions.test.ts` | Unit test assertions |
| 33 | `src/app/(admin)/users/guru/actions/settings/__tests__/actions.test.ts` | Unit test assertions |
| 34 | `tests/e2e/attendance.spec.ts` | E2E tests |
| 35 | `tests/e2e/permissions.spec.ts` | E2E tests |
| 36 | `tests/e2e/dashboard.spec.ts` | E2E tests |
| 37 | `tests/TEST_FIXES_NEEDED.md` | Doc |
| 38 | `tests/MULTI_ROLE_TESTING.md` | Doc |
| 39 | `CLAUDE.md` | Architecture overview |
