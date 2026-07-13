# Persist Custom Field Values ke DB — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simpan nilai field kustom per siswa per template ke tabel `student_custom_field_values` sehingga user tidak perlu input ulang saat cetak ulang.

**Architecture:** Tabel baru `student_custom_field_values` (student_id + template_id + value). Server action `upsertCustomFieldValue` dipanggil debounced dari `QrCardsTab` saat user mengetik. Load otomatis saat template dipilih. Data hanya relevan per template — tidak per acara (Opsi A).

**Tech Stack:** Next.js 15, TypeScript, Supabase MCP, SWR, 3-layer pattern (queries/logic/actions)

---

## Task 1: DB Migration — Tabel student_custom_field_values

**Step 1: Jalankan migration via MCP `apply_migration`**

```sql
CREATE TABLE IF NOT EXISTS student_custom_field_values (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES id_card_templates(id) ON DELETE CASCADE,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(student_id, template_id)
);

CREATE INDEX idx_scfv_template_id ON student_custom_field_values(template_id);
CREATE INDEX idx_scfv_student_id ON student_custom_field_values(student_id);
```

**Step 2: RLS — hanya admin/superadmin bisa baca+tulis (sama dengan id_card_templates)**

```sql
ALTER TABLE student_custom_field_values ENABLE ROW LEVEL SECURITY;

-- Admin bisa baca semua (pakai adminClient di server action, RLS bypass)
-- Tabel ini hanya diakses via server actions dengan createAdminClient()
-- Cukup deny all di RLS, akses via service role
CREATE POLICY "deny_all_direct" ON student_custom_field_values
  FOR ALL USING (false);
```

**Step 3: Verifikasi**

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'student_custom_field_values'
ORDER BY ordinal_position;
```

Expected: 5 kolom (id, student_id, template_id, value, updated_at).

---

## Task 2: Server Actions — queries + actions untuk custom field values

**Files:**
- Create: `src/app/(admin)/users/siswa/qr-cards/actions/customField/queries.ts`
- Create: `src/app/(admin)/users/siswa/qr-cards/actions/customField/actions.ts`

### queries.ts

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchCustomFieldValues(
  supabase: SupabaseClient,
  templateId: string
): Promise<{ student_id: string; value: string }[]> {
  const { data, error } = await supabase
    .from('student_custom_field_values')
    .select('student_id, value')
    .eq('template_id', templateId)

  if (error) throw error
  return data ?? []
}

export async function upsertCustomFieldValue(
  supabase: SupabaseClient,
  studentId: string,
  templateId: string,
  value: string
): Promise<void> {
  const { error } = await supabase
    .from('student_custom_field_values')
    .upsert(
      { student_id: studentId, template_id: templateId, value, updated_at: new Date().toISOString() },
      { onConflict: 'student_id,template_id' }
    )

  if (error) throw error
}

export async function deleteCustomFieldValuesForTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<void> {
  const { error } = await supabase
    .from('student_custom_field_values')
    .delete()
    .eq('template_id', templateId)

  if (error) throw error
}
```

### actions.ts

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { canManageIdCardTemplate } from '@/lib/accessControl'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import {
  fetchCustomFieldValues,
  upsertCustomFieldValue,
} from './queries'

async function checkAccess() {
  const profile = await getCurrentUserProfile()
  if (!canManageIdCardTemplate(profile)) {
    throw new Error('Unauthorized')
  }
  return await createAdminClient()
}

export async function getCustomFieldValuesAction(templateId: string) {
  try {
    const supabase = await checkAccess()
    const rows = await fetchCustomFieldValues(supabase, templateId)
    // Return as Record<studentId, value> for easy lookup
    const map: Record<string, string> = {}
    for (const row of rows) {
      map[row.student_id] = row.value
    }
    return { success: true, data: map }
  } catch (err: any) {
    return { success: false, message: err.message, data: {} as Record<string, string> }
  }
}

export async function upsertCustomFieldValueAction(
  studentId: string,
  templateId: string,
  value: string
) {
  try {
    const supabase = await checkAccess()
    await upsertCustomFieldValue(supabase, studentId, templateId, value)
    return { success: true, data: null }
  } catch (err: any) {
    return { success: false, message: err.message, data: null }
  }
}
```

---

## Task 3: Unit test queries.ts

**File:** `src/app/(admin)/users/siswa/qr-cards/actions/customField/queries.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { fetchCustomFieldValues, upsertCustomFieldValue } from './queries'

function makeMockSupabase(returnData: any = [], returnError: any = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: returnError }),
  }
  const from = vi.fn(() => ({
    ...chain,
    select: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
    })),
  }))
  return { from } as any
}

describe('fetchCustomFieldValues', () => {
  it('returns mapped rows for template', async () => {
    const supabase = makeMockSupabase([
      { student_id: 'abc', value: 'Grup A' },
      { student_id: 'def', value: 'Grup B' },
    ])
    const result = await fetchCustomFieldValues(supabase, 'template-1')
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe('Grup A')
  })

  it('returns empty array when no data', async () => {
    const supabase = makeMockSupabase(null)
    const result = await fetchCustomFieldValues(supabase, 'template-1')
    expect(result).toEqual([])
  })

  it('throws on error', async () => {
    const supabase = makeMockSupabase(null, { message: 'DB error' })
    await expect(fetchCustomFieldValues(supabase, 't1')).rejects.toThrow('DB error')
  })
})

describe('upsertCustomFieldValue', () => {
  it('calls upsert with correct conflict target', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: null })
    const supabase = { from: vi.fn(() => ({ upsert: upsertFn })) } as any
    await upsertCustomFieldValue(supabase, 'student-1', 'template-1', 'Grup A')
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: 'student-1', value: 'Grup A' }),
      { onConflict: 'student_id,template_id' }
    )
  })
})
```

**Run test:**
```bash
npm run test:run -- src/app/\(admin\)/users/siswa/qr-cards/actions/customField/queries.test.ts
```

Expected: 4 tests pass.

---

## Task 4: Update QrCardsTab — load dari DB + debounced save

**File:** `src/app/(admin)/users/siswa/components/QrCardsTab.tsx`

### Step 1: Import actions baru

Tambah di bagian import:
```typescript
import { getCustomFieldValuesAction, upsertCustomFieldValueAction } from '../qr-cards/actions/customField/actions'
```

### Step 2: Tambah useRef untuk debounce timer

Setelah `const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})`:

```typescript
const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
```

### Step 3: Load nilai dari DB saat template dipilih

Ganti useEffect reset yang ada:
```typescript
// SEBELUM:
useEffect(() => {
  setCustomFieldValues({})
}, [selectedTemplateId])

// SESUDAH:
useEffect(() => {
  setCustomFieldValues({})
  if (!selectedTemplateId || !activeTemplate?.show_custom_field) return
  getCustomFieldValuesAction(selectedTemplateId).then(res => {
    if (res.success && res.data) {
      setCustomFieldValues(res.data)
    }
  })
}, [selectedTemplateId, activeTemplate?.show_custom_field])
```

### Step 4: Debounced save saat user mengetik

Ganti `onChange` di renderCell custom_field:
```typescript
// SEBELUM:
onChange={e => setCustomFieldValues(prev => ({ ...prev, [item.id]: e.target.value }))}

// SESUDAH:
onChange={e => {
  const val = e.target.value
  setCustomFieldValues(prev => ({ ...prev, [item.id]: val }))
  // Debounce save: 800ms setelah berhenti mengetik
  clearTimeout(debounceTimers.current[item.id])
  debounceTimers.current[item.id] = setTimeout(() => {
    upsertCustomFieldValueAction(item.id, selectedTemplateId, val)
  }, 800)
}}
```

### Step 5: Cleanup debounce timers on unmount

Tambah useEffect:
```typescript
useEffect(() => {
  const timers = debounceTimers.current
  return () => {
    Object.values(timers).forEach(clearTimeout)
  }
}, [])
```

---

## Task 5: Verifikasi end-to-end

**Step 1:** Start dev server `npm run dev`

**Step 2:** Buka tab QR Cards, pilih template dengan `show_custom_field = true`

**Step 3:** Isi nilai keterangan untuk 2-3 siswa → tunggu 1 detik

**Step 4:** Query DB untuk verifikasi data tersimpan:
```sql
SELECT s.name, scfv.value, scfv.updated_at
FROM student_custom_field_values scfv
JOIN students s ON s.id = scfv.student_id
ORDER BY scfv.updated_at DESC
LIMIT 5;
```

**Step 5:** Refresh halaman, pilih template yang sama → nilai harus muncul kembali (load dari DB)

**Step 6:** Ubah nilai → save ulang → verifikasi upsert (bukan insert baru)

---

## Catatan Implementasi

- **Tidak ada RLS user-level** — tabel ini hanya diakses via `createAdminClient()` di server action, cukup deny_all di RLS. Ini konsisten dengan `id_card_templates`.
- **Debounce 800ms** — cukup responsif, tidak spam DB saat user masih mengetik.
- **Load kondisional** — hanya load kalau template punya `show_custom_field = true`, tidak perlu fetch kalau field tidak tampil.
- **Tidak perlu SWR hook** — data ini hanya dibaca sekali per template-switch, tidak perlu revalidasi otomatis.
- **`useRef` untuk timers** — bukan `useState`, agar perubahan timer tidak trigger re-render.

## CLAUDE.md Check
- [x] Tabel baru `student_custom_field_values` → tambah ke Key Tables di CLAUDE.md setelah implementasi
- [ ] Tidak ada route/page baru
- [ ] Tidak ada permission pattern baru (reuse `canManageIdCardTemplate`)
- [ ] Tidak ada arsitektur baru (ikut 3-layer pattern yang sudah ada)
