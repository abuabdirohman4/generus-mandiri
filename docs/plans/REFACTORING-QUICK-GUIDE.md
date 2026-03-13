# Quick Refactoring Guide - Remaining Files

**Date:** 2026-03-09
**Pattern:** 3-layer architecture (sm-d15 standard)
**Reference:** `src/app/(admin)/absensi/actions/meetings/`

---

### Claude Chat
- testing-standard-documentation
- close-beads-issue-commit

## Files to Refactor (Priority Order)

### 1. materi/actions.ts (1,097 lines) - PRIORITY 1

**Domains Identified:** 3 domains
1. **categories** - Material category CRUD
2. **types** - Material type CRUD
3. **items** - Material items + class mappings + day assignments

**Target Structure:**
```
src/app/(admin)/materi/actions/
├── categories/
│   ├── queries.ts      (~100 lines)
│   ├── logic.ts        (~50 lines)
│   └── actions.ts      (~150 lines)
├── types/
│   ├── queries.ts      (~100 lines)
│   ├── logic.ts        (~50 lines)
│   └── actions.ts      (~150 lines)
├── items/
│   ├── queries.ts      (~200 lines)
│   ├── logic.ts        (~100 lines)
│   └── actions.ts      (~300 lines)
└── index.ts           (re-exports)
```

**Key Functions:**
- Categories: create, update, delete, get
- Types: create, update, delete, get
- Items: create, update, delete, get, class mappings, day assignments

---

### 2. rapot/templates/actions.ts (1,010 lines) - PRIORITY 2

**Domains Identified:** 2 domains
1. **templates** - Report card template CRUD
2. **fields** - Template field management

**Target Structure:**
```
src/app/(admin)/rapot/templates/actions/
├── templates/
│   ├── queries.ts
│   ├── logic.ts
│   └── actions.ts
├── fields/
│   ├── queries.ts
│   ├── logic.ts
│   └── actions.ts
└── index.ts
```

---

### 3. users/guru/actions.ts (830 lines) - PRIORITY 3

**Domains Identified:** 2 domains
1. **teachers** - Teacher CRUD
2. **assignments** - Class assignments

**Target Structure:**
```
src/app/(admin)/users/guru/actions/
├── teachers/
│   ├── queries.ts
│   ├── logic.ts
│   └── actions.ts
├── assignments/
│   ├── queries.ts
│   ├── logic.ts
│   └── actions.ts
└── index.ts
```

---

### 4. dashboard/actions.ts (828 lines) - PRIORITY 4

**Domains Identified:** 2 domains
1. **metrics** - Dashboard statistics
2. **monitoring** - Class monitoring data

**Target Structure:**
```
src/app/(admin)/dashboard/actions/
├── metrics/
│   ├── queries.ts
│   ├── logic.ts
│   └── actions.ts
├── monitoring/
│   ├── queries.ts
│   ├── logic.ts
│   └── actions.ts
└── index.ts
```

---

### 5. rapot/actions.ts (621 lines) - PRIORITY 5 ✅ COMPLETE

**Domains Identified:** 1 domain
1. **rapot** - Report card data CRUD (18 functions)

**Target Structure:**
```
src/app/(admin)/rapot/actions/
├── rapot/
│   ├── queries.ts           (22 query functions)
│   ├── logic.ts             (26 pure functions)
│   ├── actions.ts           (18 server actions)
│   └── __tests__/
│       ├── queries.test.ts  (18 tests - PASSING)
│       └── logic.test.ts    (52 tests - PASSING)
└── index.ts
```

**Completed:** 2026-03-12
**Test Coverage:** 70 tests total (18 queries + 52 logic)
**Build Status:** ✅ Passing
**Type Check:** ✅ Passing

---

### 6. users/admin/actions.ts (264 lines) - PRIORITY 6

**Domains Identified:** 1 domain
1. **admin** - Admin user management

**Target Structure:**
```
src/app/(admin)/users/admin/actions/
├── admin/
│   ├── queries.ts
│   ├── logic.ts
│   └── actions.ts
└── index.ts
```

---

## Standard Refactoring Steps (For ALL Files)

### Step 1: Analyze Current File (5 min)
```bash
# Count functions
grep "^export async function" <file>.ts | wc -l

# Identify domains by grouping similar functions
grep "^export async function" <file>.ts
```

### Step 2: Create Domain Folders (Per Domain)

**For each domain, create 3 files:**

#### **queries.ts** (Layer 1)
```typescript
// NO 'use server' directive
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchXById(supabase: SupabaseClient, id: string) {
  return await supabase.from('table').select('*').eq('id', id).single()
}

export async function insertX(supabase: SupabaseClient, data: any) {
  return await supabase.from('table').insert(data).select().single()
}

// Pattern: Accept supabase as first param, return { data, error }
```

#### **logic.ts** (Layer 2)
```typescript
// NO 'use server' directive

export function validateXData(data: any): { ok: boolean, error?: string } {
  if (!data.field) return { ok: false, error: 'Field required' }
  return { ok: true }
}

export function calculateXStats(items: any[]): any {
  // Pure business logic
  return { total: items.length }
}

// Pattern: Pure functions, NO database, NO 'use server'
```

#### **actions.ts** (Layer 3)
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { fetchXById, insertX } from './queries'
import { validateXData } from './logic'

export async function createX(data: any) {
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Validation (Layer 2)
  const validation = validateXData(data)
  if (!validation.ok) return { success: false, error: validation.error }

  // DB Query (Layer 1)
  const { data: result, error } = await insertX(supabase, data)
  if (error) return { success: false, error: error.message }

  revalidatePath('/path')
  return { success: true, data: result }
}

// Pattern: Thin orchestrator, HAS 'use server'
```

### Step 3: Create index.ts
```typescript
// Re-export all server actions
export {
  createX,
  updateX,
  deleteX,
  getX
} from './domain1/actions'

export {
  createY,
  updateY
} from './domain2/actions'
```

### Step 4: Update Imports in Components
```typescript
// OLD:
import { createX } from '@/app/(admin)/feature/actions'

// NEW: Same! (backward compatible via index.ts)
import { createX } from '@/app/(admin)/feature/actions'
```

### Step 5: Delete Old File
```bash
git rm src/app/\(admin\)/feature/actions.ts
```

### Step 6: Create Tests (__tests__ folder)

**For EACH domain, create tests for queries.ts and logic.ts:**

#### **__tests__/queries.test.ts**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { fetchXById, insertX } from '../queries'

describe('X Queries', () => {
  describe('fetchXById', () => {
    it('should query table with correct id', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect })
      } as any

      await fetchXById(mockSupabase, 'test-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('table_name')
      expect(mockSelect).toHaveBeenCalled()
    })
  })

  describe('insertX', () => {
    it('should insert data and return result', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new' }, error: null })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert })
      } as any

      const result = await insertX(mockSupabase, { name: 'Test' })

      expect(mockSupabase.from).toHaveBeenCalledWith('table_name')
      expect(mockInsert).toHaveBeenCalledWith({ name: 'Test' })
      expect(result.data).toEqual({ id: 'new' })
    })
  })
})
```

#### **__tests__/logic.test.ts**
```typescript
import { describe, it, expect } from 'vitest'
import { validateXData, calculateXStats } from '../logic'

describe('X Business Logic', () => {
  describe('validateXData', () => {
    it('should return ok for valid data', () => {
      const result = validateXData({ name: 'Test', field: 'value' })
      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error when field is missing', () => {
      const result = validateXData({ name: 'Test' })
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Field required')
    })

    it('should return error for empty name', () => {
      const result = validateXData({ name: '', field: 'value' })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('name')
    })
  })

  describe('calculateXStats', () => {
    it('should calculate correct stats for items', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }]
      const stats = calculateXStats(items)
      expect(stats.total).toBe(3)
    })

    it('should handle empty array', () => {
      const stats = calculateXStats([])
      expect(stats.total).toBe(0)
    })
  })
})
```

**Testing Pattern:**
- ✅ **queries.test.ts**: Mock Supabase client, verify function calls
- ✅ **logic.test.ts**: Pure function tests, NO mocks needed
- ❌ **actions.test.ts**: SKIP (integration tests, optional)

**Reference Tests:**
- `src/app/(admin)/absensi/actions/meetings/__tests__/queries.test.ts`
- `src/app/(admin)/absensi/actions/meetings/__tests__/logic.test.ts`

### Step 7: Verify
```bash
npm run type-check
npm run test
npm run build
```

---

## Prompt Template for Antigravity

Use this for EACH domain in EACH file:

```
Context:
- Refactoring [FILE_PATH] ([LINES] lines)
- Following 3-layer pattern from sm-d15
- Reference: src/app/(admin)/absensi/actions/meetings/

Task: Create [DOMAIN]/queries.ts (Layer 1)

Requirements:
1. NO 'use server' directive
2. Extract all [DOMAIN]-related query functions
3. Change to: export async function name(supabase: SupabaseClient, ...)
4. Return { data, error } pattern
5. Import types from @/types/[domain]

Functions to extract:
- fetch[Domain]ById
- fetch[Domain]s
- insert[Domain]
- update[Domain]
- delete[Domain]

After completion:
- Run: npm run type-check
- Confirm: "queries.ts created, show logic.ts task"

---

Task: Create [DOMAIN]/__tests__/queries.test.ts

Requirements:
1. Import queries from '../queries'
2. Mock Supabase client with vi.fn()
3. Test each query function
4. Verify: table name, function calls, return values

Reference: src/app/(admin)/absensi/actions/meetings/__tests__/queries.test.ts

After completion:
- Run: npm run test [domain]/__tests__/queries.test.ts
- All tests pass
- Confirm: "queries tests created, show logic tests task"

---

Task: Create [DOMAIN]/__tests__/logic.test.ts

Requirements:
1. Import logic functions from '../logic'
2. NO mocks needed (pure functions)
3. Test validation: valid cases + error cases
4. Test calculations: normal + edge cases (empty, null)
5. Comprehensive coverage (all branches)

Reference: src/app/(admin)/absensi/actions/meetings/__tests__/logic.test.ts

After completion:
- Run: npm run test [domain]/__tests__/logic.test.ts
- All tests pass (aim for 10+ tests per domain)
- Confirm: "logic tests created, move to next domain"
```

---

## Checklist Per File

- [ ] Analyze file - identify domains
- [ ] Create domain folders
- [ ] For each domain:
  - [ ] queries.ts (Layer 1)
  - [ ] logic.ts (Layer 2)
  - [ ] actions.ts (Layer 3)
  - [ ] **__tests__/queries.test.ts** (Layer 1 tests)
  - [ ] **__tests__/logic.test.ts** (Layer 2 tests)
- [ ] Create index.ts (re-exports)
- [ ] Update component imports (if needed)
- [ ] Delete old file
- [ ] **Run tests: npm run test**
- [ ] type-check passes
- [ ] build succeeds
- [ ] Commit changes

---

## Time Estimates (Including Tests)

| File | Domains | Code | Tests | Total |
|------|---------|------|-------|-------|
| materi (1,097) | 3 | 3h | 1.5h | 4-5h |
| rapot/templates (1,010) | 2 | 2h | 1h | 3h |
| guru (830) | 2 | 2h | 1h | 3h |
| dashboard (828) | 2 | 2h | 1h | 3h |
| rapot (621) | 1-2 | 1.5h | 0.5h | 2h |
| admin (264) | 1 | 1h | 0.5h | 1.5h |

**Total:** ~16-22 hours for all 6 files (with tests)

**Test Breakdown:**
- queries.test.ts: ~15-20 min per domain (mock Supabase)
- logic.test.ts: ~20-30 min per domain (pure functions, comprehensive coverage)

---

## Tips for Antigravity Execution

1. **One domain at a time** - Don't try to do all 5 files (queries/logic/actions/tests) at once
2. **Test-driven approach** - Create tests RIGHT AFTER each layer:
   - Create queries.ts → Create queries.test.ts → Verify tests pass
   - Create logic.ts → Create logic.test.ts → Verify tests pass
3. **Verify after each file** - Run type-check AND tests after creating each file
4. **Copy-paste from reference** - Use absensi/actions/meetings/ as template
5. **Test coverage matters** - Aim for 10+ tests per domain (validation + edge cases)
6. **Keep context window clean** - Close tabs after each domain complete
7. **Manual quality gates** - Check file structure matches reference

**Testing is NOT optional** - Same quality standard as absensi/siswa/laporan refactoring!

---

## Next Steps

1. Start with **materi/actions.ts** (biggest, 3 domains)
2. Use this guide as reference
3. Execute one domain at a time in Antigravity
4. Verify after each domain
5. Move to next file after completion

Good luck! 🚀
