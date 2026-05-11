# Plan: Fix Archive Permission Guru Multi-Kelompok + Back Navigation Bug

## Context

Dua bug ditemukan setelah review sm-mf8:

1. **Archive icon tidak muncul untuk guru multi-kelompok**: Guru yang mengajar Kelas 1 di 2 kelompok berbeda (tidak punya `kelompok_id` di profile — null karena lintas kelompok) tidak bisa melihat/mengakses tombol archive untuk siswa. Root cause: `canTeacherAccessStudent` hanya check `kelompok_id` dan tidak handle kasus guru dengan `classes[]` array.

2. **Back navigation traverses tabs**: Saat user klik tab di detail siswa, `router.push()` menambah browser history entry. Back button browser traverse antar tab, bukan kembali ke halaman sebelumnya.

---

## Files yang Dimodifikasi

| File | Action |
|------|--------|
| `src/lib/accessControl.ts` | Fix `canTeacherAccessStudent` — tambah fallback via `classes[]` |
| `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx` | Ganti `router.push` → `router.replace` |
| `src/app/(admin)/users/siswa/actions/students/__tests__/permissions.test.ts` | Tambah test case guru multi-kelompok |
| `src/lib/__tests__/accessControl.test.ts` | Tambah test case `canTeacherAccessStudent` multi-kelompok |

---

## TASK 1 — Fix `canTeacherAccessStudent` di `src/lib/accessControl.ts`

### Step 1.1 — Tulis failing test dulu (RED)

File: `src/lib/__tests__/accessControl.test.ts`

Tambah test cases di bagian `canTeacherAccessStudent` (atau buat describe block baru jika belum ada):

```ts
// Tambah di akhir file atau di describe block yang sesuai

describe('canTeacherAccessStudent — multi-kelompok teacher', () => {
    const multiKelompokTeacher: UserProfile = {
        id: 'mt1',
        full_name: 'Guru Multi Kelompok',
        role: 'teacher',
        daerah_id: 'da1',
        desa_id: 'd1',
        kelompok_id: null, // null karena lintas kelompok
        classes: [
            { id: 'class-k1', name: 'Kelas 1 Kelompok A' },
            { id: 'class-k2', name: 'Kelas 1 Kelompok B' },
        ],
        permissions: { can_archive_students: true },
    }

    it('returns true for student in one of teacher classes (via classes[])', () => {
        const student = {
            daerah_id: 'da1',
            desa_id: 'd1',
            kelompok_id: 'kA',
            classes: [{ id: 'class-k1' }],
        }
        expect(canTeacherAccessStudent(multiKelompokTeacher, student)).toBe(true)
    })

    it('returns false for student not in any of teacher classes', () => {
        const student = {
            daerah_id: 'da1',
            desa_id: 'd1',
            kelompok_id: 'kC',
            classes: [{ id: 'class-k3' }],
        }
        expect(canTeacherAccessStudent(multiKelompokTeacher, student)).toBe(false)
    })

    it('returns true for student with matching class_id', () => {
        const student = {
            daerah_id: 'da1',
            desa_id: 'd1',
            kelompok_id: 'kA',
            class_id: 'class-k1',
        }
        expect(canTeacherAccessStudent(multiKelompokTeacher, student)).toBe(true)
    })
})
```

Jalankan: `npm run test:run` → Verify **FAIL** (fungsi belum diubah).

### Step 1.2 — Implementasi fix (GREEN)

File: `src/lib/accessControl.ts`

**SEBELUM (line 48-65):**
```ts
export function canTeacherAccessStudent(
  profile: UserProfile,
  student: { daerah_id?: string | null; desa_id?: string | null; kelompok_id?: string | null }
): boolean {
  if (!isTeacher(profile)) return false

  if (isTeacherDaerah(profile)) {
    return student.daerah_id === profile.daerah_id
  }
  if (isTeacherDesa(profile)) {
    return student.desa_id === profile.desa_id
  }
  if (isTeacherKelompok(profile)) {
    return student.kelompok_id === profile.kelompok_id
  }

  return false
}
```

**SESUDAH:**
```ts
export function canTeacherAccessStudent(
  profile: UserProfile,
  student: {
    daerah_id?: string | null
    desa_id?: string | null
    kelompok_id?: string | null
    classes?: Array<{ id: string }> | null
    class_id?: string | null
  }
): boolean {
  if (!isTeacher(profile)) return false

  if (isTeacherDaerah(profile)) {
    return student.daerah_id === profile.daerah_id
  }
  if (isTeacherDesa(profile)) {
    return student.desa_id === profile.desa_id
  }
  if (isTeacherKelompok(profile)) {
    return student.kelompok_id === profile.kelompok_id
  }
  // Teacher tanpa kelompok_id (mengajar di multiple kelompok): cek via classes array
  if (profile.classes && profile.classes.length > 0) {
    const teacherClassIds = new Set(profile.classes.map(c => c.id))
    if (student.class_id && teacherClassIds.has(student.class_id)) return true
    if (student.classes) return student.classes.some(c => teacherClassIds.has(c.id))
  }

  return false
}
```

Jalankan: `npm run test:run` → Verify **PASS**.

### Step 1.3 — Tambah test di permissions.test.ts

File: `src/app/(admin)/users/siswa/actions/students/__tests__/permissions.test.ts`

Tambah fixture guru multi-kelompok dan test `canArchiveStudent`:

```ts
// Fixture tambahan — guru yang mengajar di 2 kelompok
const teacherMultiKelompok: UserProfile = {
    id: 'tmt1',
    full_name: 'Guru Multi Kelompok',
    role: 'teacher',
    daerah_id: 'da1',
    desa_id: 'd1',
    kelompok_id: null,
    classes: [
        { id: 'class-in-k1', name: 'Kelas 1 Kelompok 1' },
        { id: 'class-in-k2', name: 'Kelas 1 Kelompok 2' },
    ],
    permissions: {
        can_archive_students: true,
        can_transfer_students: false,
        can_soft_delete_students: false,
        can_hard_delete_students: false,
    },
}

// Tambah di describe('canArchiveStudent'):
it('teacher multi-kelompok can archive student whose class is in their classes list', () => {
    const studentInTeacherClass = {
        ...studentInK1,
        kelompok_id: 'k_other',
        classes: [{ id: 'class-in-k1', name: 'Kelas 1 Kelompok 1' }],
    }
    expect(canArchiveStudent(teacherMultiKelompok, studentInTeacherClass as any)).toBe(true)
})

it('teacher multi-kelompok cannot archive student from unrelated class', () => {
    const studentNotInTeacherClass = {
        ...studentInK1,
        kelompok_id: 'k_other',
        classes: [{ id: 'class-unrelated', name: 'Kelas 2' }],
    }
    expect(canArchiveStudent(teacherMultiKelompok, studentNotInTeacherClass as any)).toBe(false)
})
```

Jalankan: `npm run test:run` → PASS.

---

## TASK 2 — Fix Back Navigation: `router.push` → `router.replace`

### File: `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx`

**SEBELUM (line 45):**
```tsx
router.push(tab.href)
```

**SESUDAH:**
```tsx
router.replace(tab.href)
```

Hanya 1 baris. Tidak perlu test tambahan (pure UI behavior, existing tests masih valid).

Jalankan: `npm run test:run` → PASS. `npm run type-check` → bersih.

---

## Verification

- [ ] Login sebagai guru yang mengajar di 2 kelompok berbeda
- [ ] Buka `/users/siswa/` → semua siswa di kedua kelompok punya archive icon
- [ ] Archive icon tidak muncul untuk siswa di kelompok lain (di luar scope guru)
- [ ] Klik tab di detail siswa → back button browser kembali ke halaman sebelumnya (bukan tab sebelumnya)
- [ ] `npm run test:run` → pass
- [ ] `npm run type-check` → bersih

---

## Commit Message Template

```
fix(siswa): archive permission guru multi-kelompok + back navigation tab

- accessControl: canTeacherAccessStudent tambah fallback via classes[] untuk guru lintas kelompok
- StudentTabHeader: router.push → router.replace agar back button tidak traverse tabs

fixes #68

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check
- [ ] Tidak ada pattern/arsitektur baru
- [ ] `canTeacherAccessStudent` signature diperluas (backward compatible — optional fields)
- [ ] Tidak ada route/tabel baru
- [ ] Pattern "guru multi-kelompok fallback via classes[]" mungkin perlu didokumentasikan di `docs/claude/architecture-patterns.md` jika ada fungsi lain yang perlu handle kasus yang sama
