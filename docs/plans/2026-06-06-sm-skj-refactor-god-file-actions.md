# Plan: Pecah god file server actions + konsistenkan pola response (sm-skj)

**Tanggal:** 2026-06-06
**Issue:** sm-skj
**Tipe:** Refactor (pemecahan file, no logic change) + konsistensi pola
**Status:** 📝 Plan

## Context

Audit backend (2026-06-06): arsitektur layer **sudah benar** (queries → logic → actions terpisah). Yang jadi masalah maintainability:
1. **God file:** `presensi/actions/meetings/actions.ts` = 2105 baris, `users/siswa/actions/students/actions.ts` = 1259 baris.
2. **Inkonsistensi pola response:** 3 actions.ts tak pakai `{success, data, message}` (laporan/reports, siswa/sebaran, auth). Ini akar yang sama dengan sm-601 (test drift expect pola lama vs kode pola baru).

Bukan "salah arsitektur" — user sempat kira "berantakan", ternyata cuma god file + inkonsistensi. (memory: jangan-vonis-tanpa-bukti)

**Tujuan:** pecah god file by sub-domain, konsistenkan return ke pola standar. ZERO perubahan logika (pure restructure) supaya aman.

## Temuan god file

### meetings/actions.ts (2105 baris)
| fn | baris | catatan |
|---|---|---|
| createMeeting | 32 | |
| getMeetingsByClass | 193 | |
| getMeetingById | 260 | |
| updateMeeting | 403 | |
| deleteMeeting | 478 | |
| **getMeetingsWithStats** | **532-2074 (~1540 baris!)** | 🔴 MONSTER — 1 fungsi, mayoritas file |
| getMyAllowedClassesForMeeting | 2074 | |

→ Fokus utama: bedah `getMeetingsWithStats`. Kemungkinan banyak helper inline (filter teacher, dedup, stats calc) yang bisa pindah ke `logic.ts`/`queries.ts`.

### students/actions.ts (1259 baris)
Natural groups: CRUD (create/update/delete), biodata (get/update), attendance history, batch import, assign-to-class, profile/role. Pecah by group ke file co-located.

## Strategi (LOW RISK — restructure, bukan rewrite)

**Prinsip:** pindahkan fungsi/helper ke file baru, JANGAN ubah signature/logika. Re-export dari index supaya import existing tak pecah.

### Fase 0: Safety net DULU
- sm-601 (suite merah) ideally dikerjakan dulu ATAU minimal pastikan ada test/E2E yang cover alur meetings + students sebelum pecah. Tanpa guard, refactor besar berisiko regresi senyap.
- Minimal: smoke E2E presensi + siswa hijau sebagai baseline.

### Fase 1: Bedah getMeetingsWithStats
- Identifikasi blok: fetch, filter (teacher/caberawit/pengajar), dedup meeting, hitung stats.
- Ekstrak helper murni → `meetings/logic.ts`. Query → `meetings/queries.ts`.
- actions.ts tinggal orchestration tipis.

### Fase 2: Pecah meetings/actions.ts
Saran struktur:
- `actions/crud.ts` (create/update/delete/getById)
- `actions/list.ts` (getMeetingsByClass/getMeetingsWithStats)
- `actions/access.ts` (getMyAllowedClassesForMeeting)
- `actions/index.ts` re-export semua (backward compat).

### Fase 3: Pecah students/actions.ts
- `actions/crud.ts`, `actions/biodata.ts`, `actions/attendance.ts`, `actions/batch.ts`, `actions/assign.ts`, `actions/index.ts`.

### Fase 4: Konsistenkan pola response
3 file outlier → bungkus return jadi `{success, data, message}` per `docs/claude/server-actions-conventions.md`. HATI-HATI: ini ubah kontrak — update konsumen + test bersamaan (overlap dgn sm-601).

### Fase 5: Verifikasi
- `npm run type-check`, `npm run test:run` (tak nambah fail vs baseline).
- Smoke: /presensi (list+stats+detail), /users/siswa (CRUD+biodata+attendance).
- `grep` import lama masih resolve (via index re-export).

## Risiko & Mitigasi
| Risiko | Mitigasi |
|---|---|
| Regresi senyap saat pecah | Fase 0 guard + pure restructure (no logic change) |
| Import pecah | index re-export semua fn lama |
| Pola response ubah kontrak | Fase 4 update konsumen+test bareng, koordinasi sm-601 |

## Eksekusi
Besar (god file 2105+1259). Audit mendalam getMeetingsWithStats = judgment → **Opus + /code-review ultra worth untuk fase audit**. Eksekusi pecah file = mekanis → Sonnet/Antigravity.

> Saran urutan: sm-601 (guard test) → fase audit (Opus/ultra) → eksekusi pecah (Antigravity).

## CLAUDE.md Check
- [ ] Pattern baru? Tidak (restructure existing)
- [ ] Tabel/route/permission baru? Tidak
