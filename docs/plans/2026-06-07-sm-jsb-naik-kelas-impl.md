# Implementation Plan: sm-jsb — Fitur Naik Kelas (Grade Promotion)

**Tanggal:** 2026-06-07 (revisi 2)
**Issue:** sm-jsb (P1, feature) · GH-#24
**Design doc (referensi awal):** `docs/plans/2026-04-03-naik-kelas-design.md` — **SUDAH DIREVISI oleh plan ini**, lihat "Perubahan dari Design Doc" di bawah.
**Scope:** 1 issue utuh. Solo dev, mode Direct (Claude Code).

---

## Keputusan Final (terkonfirmasi user 2026-06-07)

1. **Academic year (Opsi A):** Naik-kelas enroll ke `academic_year` yang **aktif saat eksekusi**. Admin WAJIB bikin tahun baru (mis. `2026/2027`) + set-active via `/tahun-ajaran` (fitur existing) SEBELUM jalankan. Naik-kelas TIDAK bikin academic_year sendiri. Wizard tampilkan tahun aktif di header + warning kalau masih tahun lama.
2. **Toggle storage:** Reuse `app_settings` (key=`grade_promotion_enabled`). TIDAK ada DDL untuk app_settings.
3. **Kelas tujuan = kolom eksplisit `class_masters.promote_to_class_master_id`** (Opsi B). NULL = stopper (tidak naik). **TIDAK pakai tebakan sort_order+1.** Sejalan keputusan project [[class-category-via-sort-order-rejected]].
4. **Tabel `grade_promotion_mappings` DIBATALKAN.** Halaman `/settings/grade-promotion-mappings` DIBATALKAN. Mapping tujuan ada di kolom class_masters (CRUD via halaman `/kelas` existing kalau perlu, atau seed migration).
5. **Stopper (promote_to = NULL):** Pra Nikah 4, Orang Tua, Pengurus. Pra Nikah 4 → Orang Tua dilakukan **individual via edit siswa** (bukan batch), karena tergantung status nikah per orang.
6. **UI per role:**
   - **Admin (daerah/desa/kelompok) + Guru hierarki (desa/daerah)** → pilih per **class_master** (19 standar, minus stopper). Sistem auto-pasang siswa ke kelas tujuan **di kelompok masing-masing**, se-scope user.
   - **Guru biasa** (`teacher_classes` ada isinya) → pilih dari **kelas yang dia ajar** (class aktual).
7. **Hanya 1 tabel baru:** `grade_promotion_logs` (audit immutable).

---

## Perubahan dari Design Doc (2026-04-03)

| Design doc lama | Plan ini (final) |
|---|---|
| Tabel `grade_promotion_mappings` | ❌ DIBATALKAN — ganti kolom `class_masters.promote_to_class_master_id` |
| Halaman `/settings/grade-promotion-mappings` | ❌ DIBATALKAN |
| `suggestTargetClass` nebak via sort_order+1 | ✅ Baca kolom `promote_to_class_master_id` (eksplisit) |
| Step 1 "dropdown kelas sesuai scope" (ambigu) | ✅ Admin/guru-hierarki = class_master; guru biasa = class aktual; filter scope eksplisit |
| 3 tabel baru (app_settings, mappings, logs) | ✅ 1 tabel baru (logs); app_settings reuse; mappings batal |

---

## State DB Terverifikasi (2026-06-07 via MCP)

| Objek | Status |
|---|---|
| `app_settings` (id, key, value jsonb, updated_by, updated_at) | ✅ ADA. 1 row passing_score. Reuse, no DDL. |
| `grade_promotion_logs` | ❌ BIKIN (Task 1) |
| `class_masters.promote_to_class_master_id` | ❌ BIKIN kolom (Task 1) |
| `academic_years` | ✅ 1 row aktif: 2025/2026 (2025-07-01→2026-06-30) |
| `student_enrollments` | ✅ kolom: student_id, class_id, academic_year_id, **semester (int NOT NULL, no default)**, enrollment_date (default CURRENT_DATE), status (default 'active'), notes. **UNIQUE (student_id, academic_year_id, semester)** |
| `student_classes` | ✅ student_id, class_id, created_at. **RLS OFF** (pre-existing, lihat catatan keamanan) |
| `students` | ✅ class_id, kelompok_id, status, deleted_at |
| `class_masters` | ✅ 19 row. Kolom: id, name, category_group, sort_order |
| `classes` | ✅ 664 row di 39 kelompok |
| `class_master_mappings` | ✅ 663 row (junction class → class_master) |

**class_masters data (sort_order : name : category_group):**
```
1 Kelas Paud caberawit   →promote Kelas 1
2 Kelas 1    caberawit   →promote Kelas 2
3 Kelas 2    caberawit   →promote Kelas 3
4 Kelas 3    caberawit   →promote Kelas 4
5 Kelas 4    caberawit   →promote Kelas 5
6 Kelas 5    caberawit   →promote Kelas 6
7 Kelas 6    caberawit   →promote SMP 1
8 SMP 1      muda_mudi   →promote SMP 2
9 SMP 2      muda_mudi   →promote SMP 3
10 SMP 3     muda_mudi   →promote SMA 1
11 SMA 1     muda_mudi   →promote SMA 2
12 SMA 2     muda_mudi   →promote SMA 3
13 SMA 3     muda_mudi   →promote Pra Nikah 1
14 Pra Nikah 1 muda_mudi →promote Pra Nikah 2
15 Pra Nikah 2 muda_mudi →promote Pra Nikah 3
16 Pra Nikah 3 muda_mudi →promote Pra Nikah 4
17 Pra Nikah 4 muda_mudi →promote NULL (STOPPER)
18 Orang Tua  orang_tua  →promote NULL (STOPPER)
19 Pengurus   null       →promote NULL (STOPPER)
```

---

## ⚠️ Catatan Keamanan (pre-existing, bukan dari issue ini)

Advisor Supabase: `teacher_classes`, `student_classes`, `report_template_classes` RLS OFF → terekspos anon key. Naik-kelas nulis ke `student_classes`. **Bukan blocker**, tapi catat: kalau nanti enable RLS di tabel itu, server action naik-kelas (pakai admin client) tetap aman, tapi client read perlu policy. Jangan auto-enable.

---

## Pola Existing yang Di-reuse

| Kebutuhan | File | Catatan |
|---|---|---|
| Bikin/set-active academic_year | `tahun-ajaran/actions/academic-years.ts` | `getActiveAcademicYear()`, `setActiveAcademicYear()` |
| Bulk enroll | `tahun-ajaran/actions/enrollments.ts` | `bulkEnrollStudents()` upsert onConflict `student_id,academic_year_id,semester` |
| Permission client | `src/lib/userUtils.ts` | `isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok, isTeacher` |
| Permission/scope server | `src/lib/accessControlServer.ts` | `getCurrentUserProfile()`, `getDataFilter(profile)` |
| Hierarchical teacher detection | `docs/claude/architecture-patterns.md` §Hierarchical Teacher | guru desa/daerah: role=teacher + desa_id/daerah_id, teacher_classes kosong → perlakuan = admin |
| Sort kelas | `users/siswa/actions/classes.ts` | 2-query by `class_master.sort_order`. JANGAN nested join PostgREST. |
| Kategori kelas | `src/lib/utils/classHelpers.ts` | category_group |
| Activity logging | `src/lib/activityLogger.ts` | `logActivity(...)` |
| Sidebar nav | `src/components/layouts/AppSidebar.tsx` | `allNavItems[]` + filter ~line 436 |
| Settings cards | `src/app/(admin)/settings/page.tsx` | `settingsCategories[]` |

---

## Permission Matrix

| Role | Toggle | Jalankan Naik Kelas | Step 1 tampilkan |
|---|---|---|---|
| Superadmin | ✅ | ✅ semua scope | class_master (19 − stopper) |
| Admin Daerah | ✅ | ✅ se-daerah | class_master |
| Admin Desa | ❌ | ✅ se-desa | class_master |
| Admin Kelompok | ❌ | ✅ se-kelompok | class_master |
| Guru Daerah/Desa (hierarki) | ❌ | ✅ se-scope | class_master |
| Guru biasa | ❌ | ✅ kelasnya | class aktual yg dia ajar |

`validatePromotionPermission(profile, action)`:
- `action='toggle'` → `isSuperAdmin(p) || isAdminDaerah(p)`
- `action='promote'` → semua role. Scope difilter pakai `getDataFilter(profile)`.

---

## Arsitektur Folder (3-layer, ikut sm-d15)

```
src/app/(admin)/naik-kelas/
  page.tsx                              # server guard (cek toggle) → render wizard
  PromotionClient.tsx                   # client wizard container
  actions/
    settings/
      queries.ts                        # fetchPromotionEnabled, upsertPromotionEnabled
      actions.ts                        # getPromotionEnabled, togglePromotionEnabled
      __tests__/actions.test.ts
    classes/
      queries.ts                        # fetchPromotableClassMasters, fetchTeacherClasses, fetchClassesInScope
      logic.ts                          # filterPromotableMasters, resolveTargetClassInKelompok
      actions.ts                        # getPromotionSourceOptions(profile), getStudentsToPromote(sourceId)
      __tests__/logic.test.ts
    promotion/
      queries.ts                        # upsertEnrollments, updateStudentClassId, upsertStudentClass, insertPromotionLog
      logic.ts                          # preparePromotionData, validatePromotionPermission
      actions.ts                        # executeGradePromotion
      __tests__/logic.test.ts
    index.ts
  components/
    PromotionWizard.tsx
    ClassSelector.tsx        # step 1
    StudentPromotionTable.tsx# step 2 (grouped per kelompok, override + exclude)
    ConfirmationStep.tsx     # step 3
    ResultStep.tsx           # step 4

src/app/(admin)/settings/grade-promotion/
  page.tsx                   # toggle UI (superadmin/admin daerah guard)
  PromotionToggleClient.tsx

src/types/promotion.ts
src/hooks/usePromotionEnabled.ts        # SWR utk sidebar

tests/e2e/naik-kelas/
  toggle.spec.ts
  permissions.spec.ts
  promotion-flow.spec.ts
  audit.spec.ts
```

---

## TASK-BY-TASK (TDD: RED → GREEN → REFACTOR)

### Task 1 — DB Migration

Migration `create_grade_promotion` via Supabase MCP `apply_migration`:

```sql
-- 1. kolom tujuan eksplisit di class_masters
ALTER TABLE class_masters
  ADD COLUMN promote_to_class_master_id uuid REFERENCES class_masters(id) ON DELETE SET NULL;

-- 2. seed promote_to per sort_order (kecuali 3 stopper terakhir = NULL)
UPDATE class_masters cm
SET promote_to_class_master_id = nxt.id
FROM class_masters nxt
WHERE nxt.sort_order = cm.sort_order + 1
  AND cm.sort_order <= 16;   -- 1..16 dapat tujuan; 17(PraNikah4),18(OrangTua),19(Pengurus) tetap NULL

-- 3. tabel audit immutable
CREATE TABLE grade_promotion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid REFERENCES academic_years(id),
  from_class_id uuid REFERENCES classes(id),
  to_class_id uuid REFERENCES classes(id),
  student_id uuid REFERENCES students(id),
  promoted_by uuid REFERENCES profiles(id),
  promoted_at timestamptz DEFAULT now(),
  notes text
);

ALTER TABLE grade_promotion_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_read" ON grade_promotion_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "logs_insert" ON grade_promotion_logs FOR INSERT TO authenticated WITH CHECK (true);
-- sengaja tanpa UPDATE/DELETE policy → immutable
```

**Verifikasi:**
```sql
-- seed benar: 16 punya tujuan, 3 NULL
SELECT cm.name, cm.sort_order, t.name AS promote_to
FROM class_masters cm LEFT JOIN class_masters t ON t.id = cm.promote_to_class_master_id
ORDER BY cm.sort_order;
-- expect: PraNikah4/OrangTua/Pengurus promote_to = NULL, sisanya terisi

SELECT polname, cmd FROM pg_policies WHERE tablename='grade_promotion_logs';
-- hanya SELECT + INSERT
```

> Server actions naik-kelas pakai `createAdminClient()` (bypass RLS), validasi permission manual di Layer 2 — konsisten pola hierarchical teacher.

---

### Task 2 — Types (`src/types/promotion.ts`)

`grep -rn "Promotion" src/types/` dulu. Bikin:
```typescript
/** Grade Promotion types — sm-jsb */
export interface PromotionEnabledValue { enabled: boolean; enabled_by: string | null; enabled_at: string | null }

export interface PromotionSourceOption {        // step 1 item
  kind: 'class_master' | 'class'                // admin/hierarki = class_master, guru biasa = class
  id: string                                    // class_master_id ATAU class_id
  name: string                                  // "Kelas 1" atau "Kelas 1 - Nambo"
  to_name: string | null                        // nama kelas tujuan (untuk display)
  promotable: boolean                           // false kalau stopper (tidak ditampilkan)
}

export interface PromotionStudentRow {          // step 2
  student_id: string
  student_name: string
  kelompok_id: string
  kelompok_name: string
  from_class_id: string
  from_class_name: string
  to_class_id: string | null                    // hasil resolve di kelompok yg sama; null = tak ada kelas tujuan di kelompok
  to_class_name: string | null
  excluded: boolean
}

export interface PromotionPayload {
  academic_year_id: string
  semester: number
  rows: { student_id: string; from_class_id: string; to_class_id: string }[]
}
export interface PromotionResult { success: string[]; failed: { studentId: string; error: string }[] }
export interface PromotionLog { id: string; academic_year_id: string; from_class_id: string; to_class_id: string; student_id: string; promoted_by: string | null; promoted_at: string; notes: string | null }
```

---

### Task 3 — Toggle (settings) — TDD

`actions/settings/queries.ts`:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
export async function fetchPromotionEnabled(s: SupabaseClient) {
  return await s.from('app_settings').select('value').eq('key','grade_promotion_enabled').maybeSingle()
}
export async function upsertPromotionEnabled(s: SupabaseClient, value: object, userId: string) {
  return await s.from('app_settings').upsert(
    { key:'grade_promotion_enabled', value, updated_by:userId, updated_at:new Date().toISOString() },
    { onConflict:'key' }).select().single()
}
```
`actions/settings/actions.ts` ('use server'): `getPromotionEnabled()` → `{success,data:{enabled},message}`; `togglePromotionEnabled(enabled)` → cek `isSuperAdmin||isAdminDaerah`, upsert, revalidate `/settings/grade-promotion` + `/naik-kelas`.

**TEST (RED):** non-admin toggle → success=false. superadmin → upsert dipanggil.

---

### Task 4 — Source options + resolve target — TDD (logic kritis)

`actions/classes/logic.ts` (pure):
```typescript
/** filter class_master yang punya tujuan (promote_to != null) */
export function filterPromotableMasters(masters: {id:string;name:string;promote_to_class_master_id:string|null}[]) {
  return masters.filter(m => m.promote_to_class_master_id !== null)
}

/** cari class_id tujuan dalam kelompok yg SAMA dgn kelas asal.
 * input: target class_master_id + daftar (class_id, class_master_id, kelompok_id) di kelompok itu */
export function resolveTargetClassInKelompok(
  targetMasterId: string | null,
  kelompokId: string,
  classesInKelompok: {class_id:string; class_master_id:string; kelompok_id:string}[]
): string | null {
  if (!targetMasterId) return null
  const hit = classesInKelompok.find(c => c.kelompok_id===kelompokId && c.class_master_id===targetMasterId)
  return hit?.class_id ?? null
}
```
**TEST (RED) minimal:**
- filterPromotableMasters buang yang promote_to null (3 stopper)
- resolveTargetClassInKelompok: target null → null; tak ada kelas tujuan di kelompok → null; ada → class_id benar; kelompok beda → tidak ketuker

`actions/classes/queries.ts`: `fetchPromotableClassMasters`, `fetchTeacherClasses(teacherId)`, `fetchClassesInScope(filter)` (2-query sort pattern, JANGAN nested join).

`actions/classes/actions.ts`:
- `getPromotionSourceOptions()` → cek profile: admin/hierarki → class_master list (promotable); guru biasa → kelas yg diajar. Return `PromotionSourceOption[]`.
- `getStudentsToPromote(source)` → ambil siswa dalam scope yg kelasnya match source class_master (atau class aktual untuk guru). Per siswa, resolve `to_class_id` di kelompoknya. Return `PromotionStudentRow[]` (grouped-able per kelompok di UI).

---

### Task 5 — executeGradePromotion — TDD

`actions/promotion/logic.ts`:
```typescript
export function preparePromotionData(payload: PromotionPayload) {
  const valid = payload.rows.filter(r => r.to_class_id)
  const enrollments = valid.map(r => ({
    student_id: r.student_id, class_id: r.to_class_id,
    academic_year_id: payload.academic_year_id, semester: payload.semester, status:'active' as const,
  }))
  return { valid, enrollments }
}
export function validatePromotionPermission(profile, action:'toggle'|'promote'): boolean { /* matrix */ }
```
`actions/promotion/queries.ts`: `upsertEnrollments` (onConflict student_id,academic_year_id,semester), `updateStudentClassId`, `upsertStudentClass`, `insertPromotionLog`.

`actions/promotion/actions.ts` `executeGradePromotion(payload)`:
1. `getCurrentUserProfile()` → `validatePromotionPermission(p,'promote')`
2. `getActiveAcademicYear()` → kalau payload.academic_year_id != active → tolak/warning (UI sudah warn; server tetap pakai active sebagai sumber kebenaran)
3. `preparePromotionData(payload)`
4. loop per siswa (partial success): upsert enrollment → update students.class_id → upsert student_classes → insert grade_promotion_logs → push success/failed
5. `logActivity({action:'grade_promotion',...})`
6. revalidate `/naik-kelas`, return `{success,data:PromotionResult,message}`

**TEST (RED):** preparePromotionData buang row tanpa to_class_id; validatePromotionPermission per role.

---

### Task 6 — UI Wizard (`/naik-kelas`)

- `page.tsx` (server): `getPromotionEnabled()` → kalau off, render 403/redirect `/home`.
- `PromotionWizard.tsx`: state 4 step. Header tampilkan **academic_year aktif** + **warning kalau aktif masih tahun lama** (bandingkan dgn `new Date()` — kalau end_date < hari ini atau nama tahun = tahun lalu).
- Step1 `ClassSelector`: `getPromotionSourceOptions()`.
- Step2 `StudentPromotionTable`: `getStudentsToPromote()`, **grouped per kelompok** (collapsible), checkbox exclude + dropdown override `to_class_id`. Highlight row yg `to_class_id=null` (tak ada kelas tujuan di kelompok → warning).
- Step3 `ConfirmationStep`: ringkas (X naik, Y exclude, Z kelompok).
- Step4 `ResultStep`: PromotionResult success/failed.

---

### Task 7 — Settings card + Sidebar

**7a. Settings:** tambah category "Naik Kelas" di `settings/page.tsx` → item `/settings/grade-promotion`. Subpage = toggle (guard superadmin/admin daerah).

**7b. Sidebar:** NavItem `{name:"Naik Kelas", path:"/naik-kelas", requirePromotionEnabled:true}`. Tambah flag `requirePromotionEnabled?:boolean` di tipe NavItem + filter logic. Sidebar pakai hook `usePromotionEnabled()` (SWR key `'promotion-enabled'`, fetcher `getPromotionEnabled()`, revalidateOnFocus:false). Filter: `if (item.requirePromotionEnabled && !promotionEnabled) return false`.

---

### Task 8 — E2E (`tests/e2e/naik-kelas/`)

Skenario (multi-role, lihat `tests/MULTI_ROLE_TESTING.md`):
- toggle on → menu muncul; off → /naik-kelas 403
- admin desa tidak bisa toggle
- admin daerah: step1 tampil class_master, step2 grouped per kelompok, happy path enroll
- guru biasa: step1 cuma kelasnya (scope isolation)
- stopper tidak muncul di step1
- exclude + override jalan
- audit trail tersimpan di grade_promotion_logs

> PostgREST `.select()` string tak ter-type-check → E2E wajib validasi runtime [[postgrest-select-not-typechecked]].

---

## Urutan Eksekusi

```
Task1 DB → Task2 types → Task3 toggle ┐
                        → Task4 source/resolve → Task5 execute → Task6 wizard → Task7 sidebar → Task8 E2E
```

## Verifikasi Akhir
```bash
npm run test:run     # unit PASS (filter, resolve, prepare, validate, toggle)
npm run type-check   # no error
npm run test:e2e     # naik-kelas specs
```
Manual smoke: bikin 2026/2027 + active → toggle on → menu muncul → wizard admin (class_master, grouped) → cek student_enrollments + grade_promotion_logs terisi.

---

## CLAUDE.md Check
- [ ] Pattern baru: kolom `promote_to_class_master_id` + flag sidebar `requirePromotionEnabled` (toggle-gated nav) → dokumentasikan `docs/claude/architecture-patterns.md`
- [ ] Tabel DB: `grade_promotion_logs` baru + kolom class_masters → update Key Tables CLAUDE.md
- [ ] Route baru: `/naik-kelas`, `/settings/grade-promotion` → update App Router Structure
- [ ] Permission: toggle-gated feature via app_settings → dokumentasikan
- [ ] Update setelah implementasi selesai

---

## Commit message
```
feat(naik-kelas): batch grade promotion wizard + toggle

- DB: class_masters.promote_to_class_master_id (eksplisit, stopper=NULL) + grade_promotion_logs (immutable RLS)
- Toggle "Mode Naik Kelas" via app_settings (superadmin/admin daerah)
- Wizard /naik-kelas 4-step: pilih kelas → preview grouped per kelompok → konfirmasi → hasil
- Admin/guru-hierarki pilih per class_master (auto-pasang per kelompok); guru biasa per kelasnya
- Sidebar menu toggle-gated, E2E skenario kritis

Closes #24

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
