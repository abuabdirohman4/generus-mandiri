# Type/Interface Management Guidelines

**CRITICAL**: Avoid type fragmentation by centralizing type definitions.

---

## Rules for Type Definitions

1. **Centralize Shared Types** in `src/types/` directory
   - Database entities (Student, Class, User, etc.)
   - API request/response types
   - Shared business logic types

2. **NEVER Duplicate Type Definitions** across files
   - Before creating a type, search: `grep -r "interface MyType" src/` or `grep -r "type MyType" src/`
   - If type exists, import it—don't recreate

3. **Use Type Hierarchy** for complex entities (extends pattern)
   ```typescript
   // Example: Student types (src/types/student.ts)
   export interface StudentBase { id, name, gender, status }
   export interface StudentWithOrg extends StudentBase { daerah_id, desa_id, kelompok_id }
   export interface StudentWithClasses extends StudentWithOrg { classes, class_id }
   export interface StudentBiodata extends StudentWithClasses { all biodata fields }
   ```

4. **Re-export for Backward Compatibility** when migrating types
   ```typescript
   // Old location (for backward compatibility)
   export type { StudentBiodata } from '@/types/student'
   ```

5. **Name Consistently**: Use descriptive, hierarchical names
   - `UserBase`, `UserWithRole`, `UserProfile`
   - NOT `User1`, `User2`, `UserV2`

6. **Local Types Are OK For**:
   - Component-specific props
   - Form data (internal to component)
   - Internal state management

7. **Centralize Types For**:
   - Database entities
   - API request/response
   - Shared across 2+ files
   - Used in multiple modules

---

## Type Location Structure

```
src/
├── types/              # Centralized types
│   ├── student.ts     # Student hierarchy
│   ├── user.ts        # User/Profile types
│   ├── class.ts       # Class/ClassMaster types
│   └── README.md      # Type documentation
├── app/
│   └── (admin)/
│       └── users/
│           └── siswa/
│               └── types.ts  # Re-exports from @/types/student
└── lib/
    └── studentPermissions.ts # Imports from @/types/student
```

---

## Check Before Creating Types

**Before adding `interface MyType` or `type MyType`**:

1. **Search for existing definitions**:
   ```bash
   grep -r "interface MyType" src/
   grep -r "type MyType" src/
   ```

2. **If type exists**:
   - Import it: `import type { MyType } from '@/types/...'`
   - Don't recreate/duplicate

3. **If type needs extension**:
   - Use `extends`: `interface MyTypeExtended extends MyType { ... }`
   - Don't copy-paste fields

4. **If type doesn't exist and is shared**:
   - Create in `src/types/[entity].ts`
   - Export with clear hierarchy
   - Document in comments

---

## Example: Student Type Centralization

**Problem**: 3 different `Student` interfaces caused type mismatches

**Solution**: Created `src/types/student.ts` with hierarchy
```typescript
// src/types/student.ts - Single source of truth
export interface StudentBase { ... }
export interface StudentWithOrg extends StudentBase { ... }
export interface StudentWithClasses extends StudentWithOrg { ... }
export interface StudentBiodata extends StudentWithClasses { ... }

// All modules import from here
import type { StudentWithOrg } from '@/types/student'
```

**Related Issue**: See `sm-5nw` for comprehensive type audit
