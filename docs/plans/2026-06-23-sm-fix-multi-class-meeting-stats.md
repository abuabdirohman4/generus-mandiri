# Fix: Multi-Class Meeting Stats Salah di Card Presensi

**Date**: 2026-06-23  
**Issue**: TBD  
**Problem**: Stats (hadir/alfa/izin/sakit) di card/list presensi menunjukkan angka subset untuk meeting multi-kelas, berbeda dengan detail page.

---

## Root Cause

Di `getMeetingsWithStats` (`src/app/(admin)/presensi/actions/meetings/actions.ts`), ada logika filter per-teacher:

```typescript
if (profile.role === 'teacher' && teacherClassIdsTeacher.length > 0 && !isPengajarMeeting) {
  relevantStudentIds = meeting.student_snapshot.filter((studentId: string) => {
    const studentClassIds = studentToClassMap.get(studentId) || []
    return studentClassIds.some(classId => teacherClassIdsTeacher.includes(classId))
  })
}
```

Untuk **multi-class meeting** (meeting dengan `class_ids.length > 1`), filter ini salah — hanya menghitung siswa di kelas teacher, bukan semua siswa di snapshot. Padahal meeting lintas kelas harus tampil stats untuk semua peserta.

Detail page (`useMeetingAttendance`) tidak punya filter ini → tampil benar.

---

## Fix

Tambah kondisi `isMultiClassMeeting` — jika meeting punya >1 kelas, **skip** filter per-teacher, gunakan semua siswa di snapshot.

Ada **2 occurrence** di file yang sama:

### Occurrence 1: ~baris 1035 (Regular Teacher branch)

Sudah punya `isPengajarMeeting`, tambahkan `isMultiClassMeeting`:

```typescript
// BEFORE:
if (profile.role === 'teacher' && teacherClassIdsTeacher.length > 0 && !isPengajarMeeting) {

// AFTER:
const isMultiClassMeeting = meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.length > 1
if (profile.role === 'teacher' && teacherClassIdsTeacher.length > 0 && !isPengajarMeeting && !isMultiClassMeeting) {
```

### Occurrence 2: ~baris 1965 (Teacher via Admin branch)

Tidak punya `isPengajarMeeting` check sama sekali. Fix:

```typescript
// BEFORE:
if (profile.role === 'teacher' && teacherClassIdsAdmin.length > 0) {

// AFTER:
const isMultiClassMeeting = meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.length > 1
if (profile.role === 'teacher' && teacherClassIdsAdmin.length > 0 && !isMultiClassMeeting) {
```

---

## Task List

- [ ] Task 1: Temukan exact line numbers untuk kedua occurrence
- [ ] Task 2: Fix occurrence 1 (~baris 1035)
- [ ] Task 3: Fix occurrence 2 (~baris 1965)
- [ ] Task 4: Verifikasi dengan MCP — meeting `0a3e4ca2` stats harus match detail page

---

## Verification

Setelah fix, query MCP untuk meeting `0a3e4ca2-8806-410b-8426-b419c7e7b01d` via UI harus menampilkan stats yang sama antara card dan detail page (18H, 40A, 4I, 0S — sesuai detail page, bukan 8H, 16A, 3I).

---

## CLAUDE.md Check
- [ ] Pattern baru? Tidak — hanya bugfix kondisi filter existing
- [ ] Tabel baru? Tidak
- [ ] Route baru? Tidak
- [ ] Permission pattern baru? Tidak
