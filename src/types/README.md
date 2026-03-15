# Type Definitions (`src/types/`)

Centralized type definitions for Generus Mandiri. All domain types MUST be imported from here — no inline redefinitions.

## Files

| File | Domain | Key Types |
|------|--------|-----------|
| `student.ts` | Students | `StudentBase`, `StudentWithOrg`, `StudentWithClasses`, `StudentBiodata` |
| `user.ts` | User Profiles | `UserProfileBase`, `UserProfileWithOrg`, `UserProfile`, `UserProfileState` |
| `class.ts` | Classes | `Class`, `ClassWithMaster`, `ClassMaster`, `ClassData` |
| `organization.ts` | Org Hierarchy | `Daerah`, `Desa`, `Kelompok` (+ WithStats variants) |
| `material.ts` | Materials | `MaterialCategory`, `MaterialType`, `MaterialItem`, `DayMaterialAssignment` |

## Hierarchy Pattern

All types follow the **Base → Extended → Full** pattern (see `student.ts` as reference):

```
Base (minimal ID + name)
  → Extended (adds FK refs + related data)
    → Full (adds audit timestamps + all relations)
```

## Rules

1. **Import from here** — never redefine inline in action files or components
2. **Re-export for backward compat** — if old code imported from an action file, keep `export type { Foo }` in the old file pointing to the centralized type
3. **No circular deps** — `material.ts` uses inline object shapes for `class_master` references to avoid circular imports
4. **Clean break** — remove old inline definitions as soon as imports are updated

## Import Pattern

```typescript
// ✅ Correct
import type { UserProfile } from '@/types/user'
import type { Class, ClassMaster } from '@/types/class'
import type { Daerah, Desa, Kelompok } from '@/types/organization'
import type { MaterialItem } from '@/types/material'

// ❌ Wrong - don't import from action files
import type { UserProfile } from '@/stores/userProfileStore'
import type { ClassMaster } from '@/app/(admin)/kelas/actions/masters'
```

## Notes

- `user.ts` was aligned with canonical definition from `userProfileStore.ts`
- `class.ts` includes optional `kelompok_id?: string | null` since Supabase returns null for nullable columns
- `ClassMaster.sort_order` is required (from `ClassMasterBase`) to enforce sort ordering
- `material.ts` avoids cross-file imports; `materi/types.ts` re-exports everything from here
