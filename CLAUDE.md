# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MANDATORY: Test-Driven Development (TDD)

**ALL new features, business logic, and permission systems MUST be developed using TDD.**

### Why TDD is Mandatory in This Project

- ✅ **Zero bugs on first implementation** - Tests catch issues before production
- ✅ **Clear requirements** - Tests serve as executable specifications
- ✅ **Safe refactoring** - Change code with confidence
- ✅ **Better design** - TDD forces modular, testable code
- ✅ **Documentation** - Tests show how code should be used
- ✅ **Time savings** - Less debugging, fewer production bugs

**Real Example**: `studentPermissions.ts` (sm-8yf)
- 🔴 Wrote 66 tests first (~10 min)
- 🟢 Implemented 10 functions (~15 min)
- 🔵 Refactored (~5 min)
- ✅ Result: 126/126 tests passing, 100% coverage, **0 bugs**, ~30 minutes total

### When to Use TDD (ALWAYS for these cases)

**✅ REQUIRED for:**
1. **New business logic** - Calculations, validations, rules
2. **Permission systems** - Any access control or authorization
3. **Data transformations** - Filtering, mapping, aggregations
4. **Complex algorithms** - Attendance stats, report generation
5. **Integration points** - API interactions, database queries
6. **Critical features** - Student management, class eligibility

**❌ SKIP TDD for:**
- Simple UI components with no logic (pure presentational)
- Trivial getters/setters
- Configuration files
- Type definitions

### TDD Workflow: RED → GREEN → REFACTOR

**Step 1: 🔴 RED - Write Failing Tests First (~5-10 min)**

```typescript
// 1. Create test file: src/lib/myFeature.test.ts
import { describe, it, expect } from 'vitest'
import { myFunction } from './myFeature'

describe('myFeature', () => {
  it('should handle basic case', () => {
    expect(myFunction(input)).toBe(expectedOutput)
  })

  it('should handle edge case: null', () => {
    expect(myFunction(null)).toBe(defaultValue)
  })

  it('should throw error for invalid input', () => {
    expect(() => myFunction(invalidInput)).toThrow('Invalid input')
  })
})
```

**Run tests** → All should FAIL (red) ✅ This is good!

**Step 2: 🟢 GREEN - Implement Minimal Code (~10-15 min)**

```typescript
// 2. Create implementation: src/lib/myFeature.ts
export function myFunction(input: InputType): OutputType {
  // Write MINIMAL code to make tests pass
  if (!input) return defaultValue
  if (isInvalid(input)) throw new Error('Invalid input')
  return processInput(input)
}
```

**Run tests** → All should PASS (green) ✅

**Step 3: 🔵 REFACTOR - Clean Up Code (~2-5 min)**

```typescript
// 3. Improve without breaking tests
export function myFunction(input: InputType): OutputType {
  validateInput(input) // Extract validation
  return transformInput(input) // Extract transformation
}

function validateInput(input: InputType): void {
  if (!input) throw new Error('Input required')
  if (isInvalid(input)) throw new Error('Invalid input')
}
```

**Run tests** → All should STILL PASS ✅

### TDD Checklist for New Features

Before starting ANY new feature, answer these questions:

- [ ] Does this feature have business logic? → **Write tests first**
- [ ] Does this involve permissions/access control? → **Write tests first**
- [ ] Does this transform or validate data? → **Write tests first**
- [ ] Can this feature break other parts of the system? → **Write tests first**
- [ ] Will this be reused in multiple places? → **Write tests first**

If you answered YES to any question → **Use TDD!**

### TDD Commands

```bash
# Start TDD workflow
npm run test:watch  # Auto-run tests on file save

# Check coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

### Example: Adding New Permission Feature

**Scenario**: Add "can_edit_grades" permission for teachers

**🔴 RED: Write tests first**
```typescript
// src/lib/gradePermissions.test.ts
describe('canEditGrades', () => {
  it('should allow admin to edit any grades', () => {
    const admin = { role: 'admin' }
    expect(canEditGrades(admin, anyStudent)).toBe(true)
  })

  it('should allow teacher with permission', () => {
    const teacher = {
      role: 'teacher',
      permissions: { can_edit_grades: true }
    }
    expect(canEditGrades(teacher, student)).toBe(true)
  })

  it('should deny teacher without permission', () => {
    const teacher = { role: 'teacher' }
    expect(canEditGrades(teacher, student)).toBe(false)
  })
})
```

**🟢 GREEN: Implement function**
```typescript
// src/lib/gradePermissions.ts
export function canEditGrades(user: User, student: Student): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'teacher') {
    return user.permissions?.can_edit_grades === true
  }
  return false
}
```

**🔵 REFACTOR: Extract common logic**
```typescript
export function canEditGrades(user: User, student: Student): boolean {
  return hasPermission(user, 'can_edit_grades')
}

function hasPermission(user: User, permission: string): boolean {
  if (isAdmin(user)) return true
  return user.permissions?.[permission] === true
}
```

### Common TDD Mistakes to Avoid

❌ **Writing implementation first** → You'll write code that's hard to test
✅ **Write tests first** → Code will be naturally testable

❌ **Testing implementation details** → Tests break on refactoring
✅ **Test behavior/outcomes** → Tests stay valid during refactoring

❌ **One giant test** → Hard to debug failures
✅ **Many small tests** → Clear failure messages

❌ **Skipping edge cases** → Bugs in production
✅ **Test nulls, empties, boundaries** → Robust code

❌ **Not running tests frequently** → Late feedback
✅ **Run tests after every change** → Immediate feedback

### TDD Resources in This Project

- **Test examples**: `src/lib/__tests__/studentPermissions.test.ts` (66 tests, best practice)
- **Test utilities**: `src/test/mocks/supabase.ts`
- **Test setup**: `vitest.config.ts`, `src/test/setup.ts`
- **Coverage reports**: Run `npm run test:coverage` to see coverage HTML

### Enforcement

**Before submitting ANY PR with new features:**
1. ✅ Tests written BEFORE implementation
2. ✅ All tests passing (`npm run test`)
3. ✅ Coverage ≥90% for new code (`npm run test:coverage`)
4. ✅ No TypeScript errors (`npm run type-check`)

**Code review will reject PRs that:**
- ❌ Add business logic without tests
- ❌ Add permissions without tests
- ❌ Have <70% coverage for new code

---

## CRITICAL: MCP Connection Check

**BEFORE running ANY Supabase operations** (migrations, queries, etc.), you MUST:

1. **Check MCP Connection Status** using `mcp__generus-mandiri-v2__list_tables` or `mcp__better-planner__list_tables`
2. **If connection fails**:
   - ❌ **DO NOT** ask user to restart Claude Code
   - ✅ **INFORM** user: "MCP Supabase belum terkoneksi. Silakan aktifkan MCP di settings Claude Code."
   - ✅ Continue with other tasks that don't require database access
3. **If connection succeeds**: Proceed with database operations normally

**Why This Matters**:
- MCP can be activated/deactivated without restart
- Avoids confusion about "connection errors"
- User knows exactly what to do (enable MCP in settings)

**Example Check**:
```typescript
// Try to list tables to verify connection
const result = await mcp__generus-mandiri-v2__list_tables({ schemas: ["public"] })
// If successful, MCP is connected ✅
// If error, inform user to enable MCP ❌
```

---

## Type/Interface Management Guidelines

**CRITICAL**: Avoid type fragmentation by centralizing type definitions.

### Rules for Type Definitions

1. ✅ **Centralize Shared Types** in `src/types/` directory
   - Database entities (Student, Class, User, etc.)
   - API request/response types
   - Shared business logic types

2. ❌ **NEVER Duplicate Type Definitions** across files
   - Before creating a type, search: `grep -r "interface MyType" src/` or `grep -r "type MyType" src/`
   - If type exists, import it—don't recreate

3. ✅ **Use Type Hierarchy** for complex entities (extends pattern)
   ```typescript
   // Example: Student types (src/types/student.ts)
   export interface StudentBase { id, name, gender, status }
   export interface StudentWithOrg extends StudentBase { daerah_id, desa_id, kelompok_id }
   export interface StudentWithClasses extends StudentWithOrg { classes, class_id }
   export interface StudentBiodata extends StudentWithClasses { all biodata fields }
   ```

4. ✅ **Re-export for Backward Compatibility** when migrating types
   ```typescript
   // Old location (for backward compatibility)
   export type { StudentBiodata } from '@/types/student'
   ```

5. ✅ **Name Consistently**: Use descriptive, hierarchical names
   - ✅ `UserBase`, `UserWithRole`, `UserProfile`
   - ❌ `User1`, `User2`, `UserV2`

6. ⚠️ **Local Types Are OK For**:
   - Component-specific props
   - Form data (internal to component)
   - Internal state management

7. ⚠️ **Centralize Types For**:
   - Database entities
   - API request/response
   - Shared across 2+ files
   - Used in multiple modules

### Type Location Structure

```
src/
├── types/              # Centralized types (NEW)
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

### Check Before Creating Types

**Before adding `interface MyType` or `type MyType`**:

1. **Search for existing definitions**:
   ```bash
   grep -r "interface MyType" src/
   grep -r "type MyType" src/
   ```

2. **If type exists**:
   - ✅ Import it: `import type { MyType } from '@/types/...'`
   - ❌ Don't recreate/duplicate

3. **If type needs extension**:
   - ✅ Use `extends`: `interface MyTypeExtended extends MyType { ... }`
   - ❌ Don't copy-paste fields

4. **If type doesn't exist and is shared**:
   - Create in `src/types/[entity].ts`
   - Export with clear hierarchy
   - Document in comments

### Migration Strategy for Existing Duplicates

1. **Identify**: Find duplicate types using grep
2. **Create Central**: Add to `src/types/[entity].ts`
3. **Update Imports**: Change all imports to use central type
4. **Backward Compat**: Keep old file with re-exports
5. **Deprecate**: Add comment pointing to new location
6. **Verify**: Run `npm run type-check` and all tests

### Example: Student Type Centralization (sm-8yf)

**Problem**: 3 different `Student` interfaces caused type mismatches
- `studentPermissions.ts` (with `full_name`)
- `actions.ts` (with `name`)
- `types.ts` (StudentBiodata)

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

---

## Project Overview

**Generus Mandiri** is a Next.js 15 school management system for LDII (Lembaga Dakwah Islam Indonesia) religious education programs. It manages students (generus), teachers, classes, attendance tracking, academic reports, report cards (rapot), and educational materials (materi) with role-based access control. It uses Supabase for PostgreSQL database, authentication, and Row Level Security (RLS).

**Organizational Structure**: The system follows a 3-level hierarchy:
- **Daerah** (Region) - Top level organizational unit
- **Desa** (Village) - Mid level under Daerah
- **Kelompok** (Group) - Bottom level under Desa

Each admin level (admin_daerah, admin_desa, admin_kelompok) has access restricted to their organizational scope and below.

## Development Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:3000

# Build & Type Checking
npm run build            # Production build
npm run type-check       # Run TypeScript compiler without emitting files

# Code Quality
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without writing
npm run fix:all          # Format and type-check in sequence

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once (for CI/CD)
npm run test:ui          # Open Vitest UI (interactive test viewer)
npm run test:coverage    # Generate coverage report
```

## Unit Testing Strategy

**Status**: ✅ Testing infrastructure implemented with Vitest. See [Testing Guidelines](docs/testing-guidelines.md) for usage.

### Testing Stack

- **Vitest** - Fast unit test runner (Vite-powered, better Next.js 15 compatibility than Jest)
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom matchers for DOM assertions
- **@testing-library/user-event** - User interaction simulation
- **msw** (Mock Service Worker) - API mocking for Supabase calls (Phase 3+)

**Why Vitest over Jest?**
- ⚡ Faster execution (uses Vite's transformation pipeline)
- 🔄 Better Next.js 15 + React 19 compatibility
- 📦 Less configuration needed
- ✅ Compatible with Jest ecosystem (@testing-library, etc.)
- 🎯 Native ESM and TypeScript support

### Priority Testing Strategy

Focus on **high-value, low-complexity** code first. Test what matters most:

**Priority 1: Pure Utility Functions** ⭐⭐⭐ (START HERE)
```
src/lib/utils/classHelpers.ts          → Business logic for class eligibility
src/lib/accessControlServer.ts         → Permission checks (CRITICAL for security)
src/lib/utils/attendanceCalculation.ts → Stats calculation
src/lib/utils/batchFetching.ts         → Data batching logic
src/lib/userUtils.ts                   → Role checking functions
src/lib/utils.ts                       → Common utilities (cn, device detection)
```

**Why Start Here?**
- ✅ Pure functions with predictable inputs/outputs
- ✅ No Supabase/API mocking needed
- ✅ High business value (bugs = wrong reports/permissions)
- ✅ Easy to write, fast to run (~2-3 hours to cover all)
- ✅ Good foundation for Test-Driven Development (TDD)

**Priority 2: Zustand Stores** ⭐⭐
```
src/stores/userProfileStore.ts
src/app/(admin)/absensi/stores/attendanceStore.ts
```
- Test state transitions and computed values
- Mock localStorage with `vi.mock()`
- Focus on complex state logic, skip simple getters/setters

**Priority 3: Server Actions** ⭐ (Requires MSW setup)
```
src/app/(admin)/absensi/actions.ts
src/app/(admin)/laporan/actions.ts
```
- Mock Supabase responses with MSW
- Test error handling and validation
- Focus on critical flows: auth, data mutations

**Priority 4: React Components** (Consider E2E instead)
- Start with presentational components (no API calls)
- Skip trivial components (pure UI without logic)
- E2E tests (Playwright) may provide better ROI for integration flows

### Coverage Goals

**Recommended Targets**:
- **Utility Functions**: 90-100% (pure logic, easy to test)
- **Access Control**: 95-100% (critical for security)
- **Server Actions**: 70-85% (happy path + error cases)
- **Components**: 60-75% (integration/E2E may be better)
- **Overall Project**: 70%+ (don't chase 100%, diminishing returns)

**Focus Areas** (High Risk = Must Test):
- ✅ Permission/access control logic
- ✅ Attendance calculation logic
- ✅ Class eligibility rules (ASAD, Sambung Desa restrictions)
- ✅ Data filtering by organizational hierarchy
- ✅ Batch fetching logic (prevent data loss from query limits)

### Setup Instructions

**1. Install Dependencies**:
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**2. Create `vitest.config.ts`** in project root:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'vitest.setup.ts',
        '**/*.config.{ts,js}',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**3. Create `vitest.setup.ts`** in project root:
```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock window.matchMedia (for responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

**4. Update `package.json`**:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

**5. Update `tsconfig.json`** (add to compilerOptions.types):
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### Example Test Files

**Example 1: Testing Pure Utility (classHelpers.ts)**
```typescript
// src/lib/utils/classHelpers.test.ts
import { describe, it, expect } from 'vitest'
import { isCaberawitClass, isTeacherClass, isSambungDesaEligible } from './classHelpers'

describe('classHelpers', () => {
  describe('isCaberawitClass', () => {
    it('should return true for PAUD category', () => {
      const classData = {
        class_master_mappings: [
          {
            class_master: {
              category: { code: 'PAUD', name: 'PAUD' },
            },
          },
        ],
      }
      expect(isCaberawitClass(classData)).toBe(true)
    })

    it('should return true for CABERAWIT category', () => {
      const classData = {
        class_master_mappings: [
          {
            class_master: {
              category: { code: 'CABERAWIT', name: 'Caberawit' },
            },
          },
        ],
      }
      expect(isCaberawitClass(classData)).toBe(true)
    })

    it('should return false for non-PAUD category', () => {
      const classData = {
        class_master_mappings: [
          {
            class_master: {
              category: { code: 'REMAJA', name: 'Remaja' },
            },
          },
        ],
      }
      expect(isCaberawitClass(classData)).toBe(false)
    })

    it('should handle missing mappings', () => {
      expect(isCaberawitClass({ class_master_mappings: [] })).toBe(false)
      expect(isCaberawitClass({})).toBe(false)
    })

    it('should handle array format from Supabase', () => {
      const classData = {
        class_master_mappings: [
          {
            class_master: [
              {
                category: { code: 'PAUD' },
              },
            ],
          },
        ],
      }
      expect(isCaberawitClass(classData)).toBe(true)
    })
  })

  describe('isTeacherClass', () => {
    it('should detect Pengajar class from name (case-insensitive)', () => {
      expect(isTeacherClass({ name: 'Kelas Pengajar A' })).toBe(true)
      expect(isTeacherClass({ name: 'pengajar' })).toBe(true)
      expect(isTeacherClass({ name: 'PENGAJAR SENIOR' })).toBe(true)
    })

    it('should return false for non-Pengajar class', () => {
      expect(isTeacherClass({ name: 'Remaja A' })).toBe(false)
      expect(isTeacherClass({ name: 'Pra Nikah' })).toBe(false)
    })

    it('should handle missing name', () => {
      expect(isTeacherClass({})).toBe(false)
    })
  })

  describe('isSambungDesaEligible', () => {
    it('should exclude PAUD classes', () => {
      const paudClass = {
        name: 'PAUD A',
        class_master_mappings: [
          {
            class_master: { category: { code: 'PAUD' } },
          },
        ],
      }
      expect(isSambungDesaEligible(paudClass)).toBe(false)
    })

    it('should exclude Pengajar classes', () => {
      const pengajarClass = { name: 'Pengajar A' }
      expect(isSambungDesaEligible(pengajarClass)).toBe(false)
    })

    it('should allow eligible classes (non-PAUD, non-Pengajar)', () => {
      const eligibleClass = {
        name: 'Remaja A',
        class_master_mappings: [
          {
            class_master: { category: { code: 'REMAJA' } },
          },
        ],
      }
      expect(isSambungDesaEligible(eligibleClass)).toBe(true)
    })

    it('should exclude classes that are both PAUD AND Pengajar', () => {
      const doubleExcludeClass = {
        name: 'PAUD Pengajar',
        class_master_mappings: [
          {
            class_master: { category: { code: 'PAUD' } },
          },
        ],
      }
      expect(isSambungDesaEligible(doubleExcludeClass)).toBe(false)
    })
  })
})
```

**Example 2: Testing Access Control (CRITICAL)**
```typescript
// src/lib/accessControlServer.test.ts
import { describe, it, expect } from 'vitest'
import { canAccessFeature, getDataFilter, canManageMaterials } from './accessControlServer'

describe('accessControlServer', () => {
  describe('canAccessFeature', () => {
    it('should allow superadmin all features', () => {
      const superadmin = {
        id: '1',
        full_name: 'Super Admin',
        role: 'superadmin',
      }
      expect(canAccessFeature(superadmin, 'anything')).toBe(true)
      expect(canAccessFeature(superadmin, 'unknown_feature')).toBe(true)
    })

    it('should allow admin specific features only', () => {
      const admin = {
        id: '2',
        full_name: 'Admin',
        role: 'admin',
        daerah_id: 'daerah1',
      }
      expect(canAccessFeature(admin, 'dashboard')).toBe(true)
      expect(canAccessFeature(admin, 'organisasi')).toBe(true)
      expect(canAccessFeature(admin, 'users')).toBe(true)
      expect(canAccessFeature(admin, 'manage_class_masters')).toBe(true)
      expect(canAccessFeature(admin, 'manage_classes')).toBe(true)
      expect(canAccessFeature(admin, 'invalid_feature')).toBe(false)
    })

    it('should deny teacher access to admin features', () => {
      const teacher = {
        id: '3',
        full_name: 'Teacher',
        role: 'teacher',
      }
      expect(canAccessFeature(teacher, 'dashboard')).toBe(false)
      expect(canAccessFeature(teacher, 'organisasi')).toBe(false)
    })

    it('should deny student access', () => {
      const student = {
        id: '4',
        full_name: 'Student',
        role: 'student',
      }
      expect(canAccessFeature(student, 'dashboard')).toBe(false)
    })
  })

  describe('getDataFilter', () => {
    it('should return empty filter for superadmin (access all)', () => {
      const superadmin = {
        id: '1',
        full_name: 'Admin',
        role: 'superadmin',
      }
      expect(getDataFilter(superadmin)).toEqual({})
    })

    it('should return organizational filter for admin_daerah', () => {
      const adminDaerah = {
        id: '2',
        full_name: 'Admin Daerah',
        role: 'admin',
        daerah_id: 'daerah1',
        desa_id: null,
        kelompok_id: null,
      }
      expect(getDataFilter(adminDaerah)).toEqual({
        daerah_id: 'daerah1',
        desa_id: null,
        kelompok_id: null,
      })
    })

    it('should return organizational filter for admin_desa', () => {
      const adminDesa = {
        id: '3',
        full_name: 'Admin Desa',
        role: 'admin',
        daerah_id: 'daerah1',
        desa_id: 'desa1',
        kelompok_id: null,
      }
      expect(getDataFilter(adminDesa)).toEqual({
        daerah_id: 'daerah1',
        desa_id: 'desa1',
        kelompok_id: null,
      })
    })

    it('should return organizational filter for admin_kelompok', () => {
      const adminKelompok = {
        id: '4',
        full_name: 'Admin Kelompok',
        role: 'admin',
        daerah_id: 'daerah1',
        desa_id: 'desa1',
        kelompok_id: 'kelompok1',
      }
      expect(getDataFilter(adminKelompok)).toEqual({
        daerah_id: 'daerah1',
        desa_id: 'desa1',
        kelompok_id: 'kelompok1',
      })
    })

    it('should return null for non-admin roles', () => {
      const teacher = {
        id: '5',
        full_name: 'Teacher',
        role: 'teacher',
      }
      expect(getDataFilter(teacher)).toBeNull()
    })
  })

  describe('canManageMaterials', () => {
    it('should allow users with can_manage_materials flag', () => {
      const user = {
        id: '1',
        full_name: 'User',
        role: 'teacher',
        can_manage_materials: true,
      }
      expect(canManageMaterials(user)).toBe(true)
    })

    it('should deny users without can_manage_materials flag', () => {
      const user = {
        id: '2',
        full_name: 'User',
        role: 'teacher',
        can_manage_materials: false,
      }
      expect(canManageMaterials(user)).toBe(false)
    })

    it('should deny when flag is undefined', () => {
      const user = {
        id: '3',
        full_name: 'User',
        role: 'teacher',
      }
      expect(canManageMaterials(user)).toBe(false)
    })

    it('should handle null profile', () => {
      expect(canManageMaterials(null)).toBe(false)
    })
  })
})
```

**Example 3: Testing Zustand Store**
```typescript
// src/app/(admin)/absensi/stores/attendanceStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAttendanceStore } from './attendanceStore'

describe('attendanceStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAttendanceStore.setState({
      attendanceLogs: [],
      selectedDate: new Date().toISOString().split('T')[0],
    })
  })

  it('should initialize with default state', () => {
    const state = useAttendanceStore.getState()
    expect(state.attendanceLogs).toEqual([])
    expect(state.selectedDate).toBeDefined()
  })

  it('should update attendance logs', () => {
    const logs = [{ student_id: '1', date: '2025-02-10', status: 'H' }]

    useAttendanceStore.getState().setAttendanceLogs(logs)

    expect(useAttendanceStore.getState().attendanceLogs).toEqual(logs)
  })

  it('should update selected date', () => {
    const newDate = '2025-03-15'

    useAttendanceStore.getState().setSelectedDate(newDate)

    expect(useAttendanceStore.getState().selectedDate).toBe(newDate)
  })
})
```

### Testing Best Practices

**DO** ✅:
- Test business logic thoroughly (calculations, validations, permissions)
- Test edge cases (null/undefined, empty arrays, boundary conditions)
- Use descriptive test names: `should return true when user is superadmin`
- Group related tests with `describe` blocks
- Mock only external dependencies (Supabase, localStorage, API calls)
- Keep tests focused and independent
- Test error handling and validation
- Use TypeScript in tests (same safety as production code)

**DON'T** ❌:
- Test implementation details (private methods, internal state)
- Test third-party libraries (trust they work)
- Write tests that depend on execution order
- Mock everything (test real logic when possible)
- Test trivial code (simple getters without logic)
- Duplicate tests (one test per distinct behavior)
- Skip edge cases (they cause most bugs!)

### Gradual Adoption Roadmap

**Phase 1: Foundation** (sm-qrt, sm-37l) - **✅ COMPLETED**
1. ✅ Install Vitest + testing utilities (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitest/coverage-v8`)
2. ✅ Create `vitest.config.ts` + `src/test/setup.ts`
3. ✅ Update `package.json` scripts (`test`, `test:run`, `test:ui`, `test:coverage`)
4. ✅ Create test utilities and mocks (`src/test/mocks/supabase.ts`)
5. ✅ Configure TypeScript types in `tsconfig.json`
6. ✅ Document strategy in CLAUDE.md
7. ✅ Create example tests:
   - `src/lib/utils/__tests__/classHelpers.test.ts` (15 tests, 100% coverage)
   - `src/lib/utils/__tests__/batchFetching.test.ts` (6 tests, 100% coverage)
8. ✅ Verify setup: All tests passing (21/21 ✓)

**Test Files Created in Phase 1**:
- ✅ `classHelpers.ts` - 100% statements, 90% branches, 100% functions
- ✅ `batchFetching.ts` - 100% coverage across all metrics

**Phase 2: Quick Wins** (sm-6gn) - **✅ COMPLETED**
1. ✅ Test `accessControlServer.ts` (14 test cases) - **HIGH PRIORITY**
   - `canAccessFeature()` for each role
   - `getDataFilter()` organizational filters
   - `canManageMaterials()` permission checks
   - `isMaterialCoordinator()` role checks
2. ✅ Test `attendanceCalculation.ts` (12 test cases)
   - `findMatchingClass()` multi-class meeting logic
   - `isStudentEnrolled()` enrollment validation
   - `filterAttendanceByMeetingClass()` strict enrollment check
   - `calculateAttendanceRate()` and `calculateAttendanceStats()` accuracy
3. ✅ Test `userUtils.ts` (5 test cases)
   - `getCurrentUserId()` with mocked Supabase
   - `isAdminLegacy()` role checking
   - `clearUserCache()` and `clearSWRCache()` cache management
4. ✅ Test `utils.ts` (8 test cases)
   - `cn()` class name merging
   - Device detection helpers (isMac, isDesktop, isMobile, isIOS, isTouchDevice, shouldUseMobileUI)
5. ✅ Run coverage: `npm run test:coverage`
6. 🎉 **Achieved!** Total: 60 tests passing, ~90-100% coverage on Priority 1 utilities

**Test Files Created in Phase 2**:
- ✅ `accessControlServer.ts` - 14 tests (role-based access, org filters, permissions)
- ✅ `attendanceCalculation.ts` - 12 tests (multi-class logic, stats accuracy)
- ✅ `userUtils.ts` - 5 tests (auth, cache management)
- ✅ `utils.ts` - 8 tests (Tailwind merge, device detection)

**Phase 3: TDD for New Features** (sm-8yf) - **✅ COMPLETED**
1. ✅ Created `studentPermissions.ts` with approval-based transfer workflow (66 tests total)
   - Foundation tests (38 tests): Archive, Transfer, Soft Delete, Hard Delete permissions
   - Approval workflow tests (28 tests): Request, Review, Auto-approval logic
2. ✅ TDD Benefits Realized:
   - 🔴 RED → 🟢 GREEN → 🔵 REFACTOR cycle in ~32 minutes total
   - All 126/126 tests passing (no bugs on first implementation)
   - Clear requirements from test-first design
   - Production-ready approval workflow logic

**Test Files Created in Phase 3**:
- ✅ `studentPermissions.ts` - 66 tests, 100% coverage
  * Permission checks: canArchiveStudent, canTransferStudent, canSoftDeleteStudent, canHardDeleteStudent
  * Transfer boundaries: getTransferableDaerahIds, getTransferableDesaIds, getTransferableKelompokIds
  * Approval workflow: canRequestTransfer, canReviewTransferRequest, needsApproval, isOrganizationInUserHierarchy

**Phase 4: Expand Coverage** (Future) - **Ongoing**
- Set up MSW for server action testing
- Test Zustand stores
- Consider E2E tests (Playwright) for critical user flows
- Add tests for new features using TDD approach

**Phase 4: CI/CD Integration** (Optional)
- Run tests on every PR
- Block merge if tests fail
- Track coverage trends over time
- Set coverage thresholds (e.g., min 70%)

### Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (interactive, see which tests pass/fail)
npm run test:ui

# Run specific test file
npm run test src/lib/utils/classHelpers.test.ts

# Run tests matching pattern
npm run test -- --grep "classHelpers"
```

### CI/CD Integration (Optional)

Add to `.github/workflows/test.yml`:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check
      - run: npm run test:coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
```

### Test Files Reference

**Existing Test Files** (Phase 1 - Completed):
- `src/lib/utils/__tests__/classHelpers.test.ts` - 15 tests, 100% coverage ✅
- `src/lib/utils/__tests__/batchFetching.test.ts` - 6 tests, 100% coverage ✅
- `src/test/mocks/supabase.ts` - Reusable Supabase client mock
- `src/test/setup.ts` - Global test setup (cleanup, mocks)

**Completed Test Files** (All Phases):
- ✅ `src/lib/utils/__tests__/classHelpers.test.ts` - 15 tests, 100% coverage
- ✅ `src/lib/utils/__tests__/batchFetching.test.ts` - 6 tests, 100% coverage
- ✅ `src/lib/__tests__/accessControlServer.test.ts` - 14 tests
- ✅ `src/lib/utils/__tests__/attendanceCalculation.test.ts` - 12 tests
- ✅ `src/lib/__tests__/userUtils.test.ts` - 5 tests, 100% coverage
- ✅ `src/lib/__tests__/utils.test.ts` - 8 tests, 91% coverage
- ✅ `src/lib/__tests__/studentPermissions.test.ts` - 66 tests, 100% coverage
- ✅ `src/test/mocks/supabase.ts` - Reusable Supabase client mock
- ✅ `src/test/setup.ts` - Global test setup (cleanup, mocks)

**Total**: 126 tests passing, 7 test files

### TDD Best Practices (Learned from sm-8yf)

**When to Use TDD**:
- ✅ New features with complex business logic
- ✅ Permission systems and security-critical code
- ✅ Functions with multiple edge cases
- ✅ Code that will be reused in many places

**TDD Workflow** (RED-GREEN-REFACTOR):
1. 🔴 **RED**: Write failing tests first (~5-10 min)
   - Define interfaces and function signatures
   - Write comprehensive test cases covering all scenarios
   - Run tests to verify they fail
2. 🟢 **GREEN**: Implement minimal code to pass tests (~10-15 min)
   - Focus on making tests pass, not perfection
   - Implement all functions at once
   - Run tests to verify all pass
3. 🔵 **REFACTOR**: Clean up code (~2-5 min)
   - Extract duplicated logic
   - Improve naming and structure
   - Run tests to ensure no breaking changes

**Example**: Student permissions (sm-8yf)
- 🔴 Wrote 66 tests first (test file: 571 lines)
- 🟢 Implemented 10 functions (source file: 406 lines)
- ✅ Result: 126/126 tests passing, 100% coverage, 0 bugs
- ⏱️ Time: ~32 minutes total

### Related Beads

- **sm-qrt** ✅ CLOSED: Setup unit testing infrastructure with Vitest
- **sm-37l** ✅ CLOSED: Document unit testing strategy in CLAUDE.md (this document)
- **sm-6gn** ✅ CLOSED: Write tests for utility functions (Priority 1)
- **sm-8yf** ⏳ IN PROGRESS: Student management with approval-based transfer (TDD foundation complete)

**Dependencies**: sm-37l and sm-6gn depend on sm-qrt (setup completed)

## Architecture Overview

### App Router Structure

The app uses Next.js 15 App Router with two main layout groups:

1. **`(full-width-pages)`** - Unauthenticated pages (signin, signup, errors)
2. **`(admin)`** - Authenticated pages:
   - `/home` - Dashboard with quick actions
   - `/absensi` - Attendance management with meeting types
   - `/laporan` - Reports and analytics
   - `/users/siswa`, `/users/guru`, `/users/admin` - User management
   - `/kelas` - Class and class master management
   - `/organisasi` - Organization hierarchy management
   - `/rapot` - Report card generation and templates
   - `/materi` - Educational materials management
   - `/settings` - PWA settings, cache management, profile

Protected routes are under `src/app/(admin)/`. Each feature has its own directory with co-located:
- `page.tsx` - Route component
- `actions.ts` - Server actions for mutations
- `hooks/` - SWR data fetching hooks
- `stores/` - Zustand state management
- `components/` - Feature-specific components

### Database & Supabase

**Database**: `generus-mandiri-v2` on Supabase

**Key Tables**:
- `profiles` - User accounts with role-based access (superadmin, admin, teacher, student)
- `students` - Student records with biodata
- `classes` - Class definitions (linked to kelompok level)
- `class_masters` - Master class types (Pra Nikah, Remaja, Orang Tua, etc.) with categories
- `class_master_mappings` - Junction table linking classes to master classes (many-to-many)
- `meetings` - Class meetings/sessions with support for multiple classes (`class_ids` array)
- `attendance_logs` - Daily attendance (H/I/S/A status) with composite key (student_id, date)
- `student_classes` - Junction table for student-class many-to-many
- `teacher_classes` - Junction table for teacher-class many-to-many
- `daerah`, `desa`, `kelompok` - Organizational hierarchy (Region > Village > Group)
- `rapot_templates` - Report card templates with customizable sections
- `rapot_data` - Generated report cards for students
- `materials` - Educational materials (materi) with TipTap rich text content

**Supabase Client Usage**:
- `createClient()` from `@/lib/supabase/client` - Browser client for client components
- `createClient()` from `@/lib/supabase/server` - Server client for server actions (uses cookies)
- `createAdminClient()` from `@/lib/supabase/server` - Service role client to bypass RLS (admin operations only)

### Access Control

**Role Hierarchy**:
```
superadmin (global access)
  └─ admin
      ├─ admin_daerah (region level)
      ├─ admin_desa (village level)
      └─ admin_kelompok (group level)
teacher (assigned classes only)
student (own data only)
```

**CRITICAL ACCESS CONTROL RULES**:
- **Client Components/Hooks**: ALWAYS use `import { isSuperAdmin, isAdminDaerah, ... } from '@/lib/userUtils'`
- **Server Actions**: ALWAYS use `import { canAccessFeature, getDataFilter, getCurrentUserProfile } from '@/lib/accessControlServer'`
- **NEVER** import directly from `@/lib/accessControl.ts`

**Key Functions**:
- `isSuperAdmin(profile)`, `isAdminDaerah(profile)`, `isAdminDesa(profile)`, `isAdminKelompok(profile)`, `isTeacher(profile)`
- `canAccessFeature(profile, feature)` - Check feature-level access
- `getDataFilter(profile)` - Get filter object based on user's organizational level
- `shouldShowDaerahFilter(profile)`, `shouldShowDesaFilter(profile)`, etc. - UI visibility helpers

### State Management

**Zustand Stores** (persisted to localStorage):
- `userProfileStore` - Current user profile with organizational hierarchy and assigned classes
- `sidebarStore`, `themeStore`, `languageStore` - UI preferences
- `attendanceStore`, `absensiUIStore` - Attendance management state
- `siswaStore`, `kelasStore`, `guruStore`, `adminStore` - Feature-specific states
- `laporanStore`, `organisasiStore` - Reports and organization management

**CRITICAL Store Patterns**:
- **Dynamic Defaults**: NEVER hardcode dates/months in helper functions for production use
  ```typescript
  // ❌ BAD - Hardcoded for dummy data
  const getCurrentMonth = () => 10 // October
  const getCurrentYear = () => 2025

  // ✅ GOOD - Dynamic system date
  const getCurrentMonth = () => new Date().getMonth() + 1 // 1-12
  const getCurrentYear = () => new Date().getFullYear()
  ```
- **Store Initialization**: Default values should use helper functions, not hardcoded values
- **Filter Defaults**: Monthly/yearly filters should default to current period for better UX

**SWR Configuration**:
- 2-minute deduping interval (can be customized per hook)
- Revalidates on focus and reconnect (can be disabled per hook)
- localStorage-based persistent cache (survives page refresh)
- Cache cleared on login/logout via `clearUserCache()` (with page reload)
- Centralized SWR keys in `@/lib/swr.ts` for consistency (e.g., `meetingFormSettingsKeys`, `studentKeys`, `classKeys`)

### Data Fetching Patterns

**Pattern 1**: Server Action + SWR Hook
```typescript
// In actions.ts
export async function getAllStudents(classId?: string): Promise<Student[]> {
  'use server'
  const supabase = await createClient()
  // Query with RLS
}

// In hooks or components
export function useStudents({ classId }: Options) {
  const { data, mutate } = useSWR(key, () => getAllStudents(classId))
  return { students: data, mutate }
}
```

**Pattern 2**: Direct Server Action for Mutations
```typescript
async function handleSubmit(data) {
  const result = await saveAttendance(data)
  if (result.success) {
    mutate() // Revalidate SWR cache
    revalidatePath('/absensi') // Server-side cache
  }
}
```

**Pattern 3**: Prefetch + Custom SWR Configuration (for optimal performance)
```typescript
// Example: Meeting form settings with long cache and no revalidation on focus
// In hook (src/app/(admin)/absensi/hooks/useMeetingFormSettings.ts)
export function useMeetingFormSettings(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? meetingFormSettingsKeys.settings(userId) : null,
    async () => {
      const result = await getMeetingFormSettings(userId)
      return result.success && result.data ? result.data : DEFAULT_SETTINGS
    },
    {
      revalidateOnFocus: false, // Settings rarely change
      dedupingInterval: 5 * 60 * 1000, // 5 minutes cache
      fallbackData: DEFAULT_SETTINGS, // Show immediately
    }
  )
  return { settings: data || DEFAULT_SETTINGS, isLoading, error, mutate }
}

// In page (prefetch for optimal modal performance)
export default function AbsensiPage() {
  const { profile } = useUserProfile()
  useMeetingFormSettings(profile?.id) // Prefetch before modal opens
  // ...
}

// After mutation, invalidate cache
await mutate(meetingFormSettingsKeys.settings(userId))
```

### UI Components

**Reusable Components**: Located in `src/components/`
- Use existing components for buttons, modals, inputs, delete confirmations
- For icons, use those in `public/icons` & `src/lib/icons.ts` (or add new ones there)

**Key Component Groups**:
- `components/ui/` - Base UI components (button, modal, dropdown, skeleton, pagination)
- `components/form/input/` - Form inputs
- `components/layouts/` - App header, sidebar, bottom navigation
- `components/charts/` - Recharts-based visualizations
- `components/shared/DataFilter.tsx` - Centralized filter component (see Filter Guidelines below)

**Filter Guidelines - DataFilter Component**:
- **IMPORTANT**: When adding new filter types, consider adding them to `DataFilter.tsx` if they will be reused across multiple pages
- **Current filters in DataFilter**: Daerah, Desa, Kelompok, Class, Gender, Meeting Type, Month/Year
- **When to add to DataFilter**:
  - ✅ Filter will be used in 2+ pages (e.g., Status filter used in Siswa, Guru, Laporan)
  - ✅ Filter follows standard dropdown/select pattern
  - ✅ Filter needs organizational hierarchy (daerah → desa → kelompok)
- **When NOT to add to DataFilter**:
  - ❌ Page-specific filter (only used once)
  - ❌ Complex custom UI (date range picker, multi-step)
  - ❌ Tightly coupled to page state
- **Props pattern**:
  ```typescript
  <DataFilter
    filters={filters}
    onFilterChange={handleFilterChange}
    userProfile={userProfile}
    // Data lists
    daerahList={daerah}
    desaList={desa}
    kelompokList={kelompok}
    classList={classes}
    // Feature flags
    showKelas={true}
    showGender={true}
    showStatus={true}  // NEW: For student/teacher status
    cascadeFilters={false}  // Disable cascade for multi-select
  />
  ```
- **Adding new filter type**:
  1. Add prop: `showXxx?: boolean`
  2. Add data prop: `xxxList?: Array<{id, name}>`
  3. Add to filters interface: `xxx?: string`
  4. Add dropdown in DataFilter component
  5. Update all pages using DataFilter (optional prop, backward compatible)
  6. Document in CLAUDE.md

**Mobile UI Patterns**:
- **Floating Action Buttons**: For primary actions on pages with long scrollable content
  - Use `fixed sm:static bottom-20 sm:bottom-0 left-4 right-4 z-50 shadow-lg sm:shadow-none`
  - `bottom-20` accommodates bottom navigation (64-72px height)
  - Desktop reverts to static positioning
  - Example: Save button in meeting attendance detail page (`src/app/(admin)/absensi/[meetingId]/page.tsx`)

### Special Utilities

**Class Helpers** (`@/lib/utils/classHelpers.ts`):
- `isCaberawitClass(classData)` - Check if PAUD/Caberawit class (via category code/name)
- `isTeacherClass(classData)` - Check if teacher training class (via class name contains 'pengajar')
- `isSambungDesaEligible(classData)` - Check if class is eligible for Sambung Desa meetings (excludes Pengajar and Caberawit classes)
- **Usage**: These helpers are used in `meetingTypes.ts` to determine which meeting types are available to teachers based on their class assignments

**Common Utils** (`@/lib/utils.ts`):
- `cn(...classes)` - Merge Tailwind classes (clsx + tailwind-merge)
- `isMac()`, `isDesktop()`, `isMobile()`, `isTouchDevice()`, `isIOS()`, `shouldUseMobileUI()`

**User Utils** (`@/lib/userUtils.ts`):
- `getCurrentUserId()` - Get current user ID for SWR cache keys
- `clearUserCache()` - Full logout cache clear (with reload)
- `clearSWRCache()` - Soft cache clear (no reload, for login flow)

**Batch Fetching** (`@/lib/utils/batchFetching.ts`):
- `fetchAttendanceLogsInBatches(supabaseClient, meetingIds)` - Fetch attendance logs in batches of 10 to avoid database query limits
- **CRITICAL**: Use this for large datasets (e.g., reports, attendance with many meetings) to prevent data loss from query limits
- Already implemented in:
  - `src/app/(admin)/absensi/actions.ts` - For attendance page
  - `src/app/(admin)/laporan/actions.ts` - For reports page
  - `src/app/(admin)/materi/actions.ts` - For materials page
- Pattern:
  ```typescript
  // 1. Fetch meetings first to get meeting IDs
  const { data: meetings } = await supabase.from('meetings').select('id, date')
  const meetingIds = meetings.map(m => m.id)

  // 2. Use batch fetching for attendance logs
  const { data: attendanceLogs, error } = await fetchAttendanceLogsInBatches(
    adminClient,
    meetingIds
  )

  // 3. Enrich with additional data (students, dates, etc.)
  // ... map and join data
  ```

## Important Conventions

### Attendance System
- Status codes: H (Hadir/Present), I (Izin/Excused), S (Sakit/Sick), A (Alpha/Absent)
- Composite key: (student_id, date) for upsert operations
- Auto-save with debouncing
- Meetings can span multiple classes via `class_ids` array
- **Special Permission Rule**: Teachers who teach PAUD/Kelas 1-6 (Caberawit) can edit attendance for Pengajar (teacher training) class meetings
  - Implemented in `src/app/(admin)/absensi/[meetingId]/page.tsx` (lines 240-243)
  - Uses `isPengajarMeeting && teacherCaberawit` check
  - Requires `class_master_mappings` to be loaded in user profile for `isCaberawitClass()` detection

### Student Lifecycle Management

**Student Status System** (`students.status` field):
- `active` - Currently studying (default for new students)
- `graduated` - Completed program successfully
- `inactive` - Not active (transferred out, on leave, etc.)

**Archive vs Soft Delete - CRITICAL DIFFERENCE**:
- **Archive** (`status: graduated/inactive`):
  - Student data is **VALID** but no longer active
  - Use for: Graduated students, transferred out, long-term leave
  - **Appears in historical reports** (data is legitimate)
  - Hidden from active student lists and attendance
  - Can be unarchived (status → `active`)

- **Soft Delete** (`deleted_at` timestamp):
  - Student data is **INVALID/ERROR**
  - Use for: Wrong entries, duplicates, test data
  - **Hidden from ALL views** including historical reports
  - Can be restored within retention period
  - Treated as data correction, not lifecycle event

**Student Management Actions**:
1. **Archive**: Set `status` to `graduated` or `inactive` (keeps history)
2. **Transfer**: Move to different org/class with approval-based workflow (see below)
3. **Soft Delete**: Mark as deleted (restorable)
4. **Hard Delete**: Permanent removal (superadmin only, GDPR compliance)

### Approval-Based Transfer Workflow

**Overview**: Students can be transferred across organizational boundaries with an approval system. Transfers within the same organization are auto-approved, while cross-boundary transfers require approval from the destination admin.

**Transfer Request Status Flow**:
```
[Created] → pending
    ↓
    ├─→ Auto-approved (same org) → approved → executed
    │
    └─→ Needs approval (cross-boundary) → pending
            ↓
            ├─→ [Reviewer: Approve] → approved → executed
            │
            ├─→ [Reviewer: Reject] → rejected (can re-submit)
            │
            └─→ [Requester: Cancel] → cancelled
```

**Auto-Approval Rules**:
- ✅ **Same Kelompok** (class change only) → Auto-approved
- ✅ **Superadmin transfers** → Auto-approved (bypass)
- ⏳ **Different Kelompok, Same Desa** → Needs approval from Admin Kelompok (target)
- ⏳ **Different Desa, Same Daerah** → Needs approval from Admin Desa (target)
- ⏳ **Different Daerah** → Needs approval from Admin Daerah (target)

**Permission Functions** (see `src/lib/studentPermissions.ts`):
- `canRequestTransfer(user, student)` - Check if user can create transfer request
- `canReviewTransferRequest(user, request)` - Check if user can approve/reject
- `needsApproval(requester, request)` - Determine if approval needed
- `isOrganizationInUserHierarchy(user, org)` - Check reviewer authority

**Key Features**:
- 📦 **Bulk transfers**: Transfer multiple students in one request
- 🔔 **In-app notifications**: Badge count for pending requests
- 🔄 **Re-submission**: Rejected requests can be re-submitted
- ♾️ **No expiration**: Requests stay pending until reviewed
- 🔍 **Audit trail**: Full history in `transfer_requests` table

**Implementation Status**:
- ✅ Permission logic implemented and tested (66 tests, 100% coverage)
- ✅ Database migration applied (transfer_requests table + triggers)
- ✅ Server actions implemented (src/app/(admin)/users/siswa/actions/management.ts)
  - createTransferRequest, approveTransferRequest, rejectTransferRequest
  - cancelTransferRequest, getPendingTransferRequests, getMyTransferRequests
  - archiveStudent, unarchiveStudent, restoreStudent
- ⏳ UI components (TransferRequestModal, PendingRequestsSection) - TODO

**Teacher Permissions** (`profiles.permissions` JSONB):
```json
{
  "can_archive_students": false,
  "can_transfer_students": false,
  "can_soft_delete_students": false,
  "can_hard_delete_students": false
}
```
- **Default**: Teachers have NO student management permissions
- **Configurable**: Admin can grant permissions per teacher in `/users/guru` page (via SettingsModal)
- **Superadmin & Admin**: Always have all permissions (hardcoded)

**CRITICAL: Permission Implementation Checklist**

When implementing permission-based features, follow these steps to avoid common pitfalls:

1. **✅ Query `permissions` field from database**
   ```typescript
   // In AdminLayoutProvider.tsx (line 50)
   .select(`
     id,
     full_name,
     role,
     permissions,  // ← MUST include this!
     ...
   `)
   ```
   **Common Bug**: Forgetting to select `permissions` field → permissions always `undefined` → buttons never appear

2. **✅ Use correct permission check functions**
   ```typescript
   // Client-side: Use dedicated permission functions
   import {
     canArchiveStudent,
     canTransferStudent,
     canSoftDeleteStudent,
     canHardDeleteStudent
   } from '@/lib/studentPermissions'

   // NOT just role checks like `isAdmin`
   ```

3. **✅ Check permissions in page-level logic**
   ```typescript
   // In page.tsx (e.g., src/app/(admin)/users/siswa/page.tsx)
   const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'

   // Permission checks for each action
   const canArchive = isAdmin || userProfile?.permissions?.can_archive_students === true
   const canTransfer = isAdmin || userProfile?.permissions?.can_transfer_students === true
   const canSoftDelete = isAdmin || userProfile?.permissions?.can_soft_delete_students === true

   // Pass to components
   <StudentsTable
     onArchive={canArchive ? handleArchiveClick : undefined}
     onTransfer={canTransfer ? handleTransferClick : undefined}
     userProfile={userProfile}
   />
   ```

4. **✅ Validate permissions in server actions** (defense in depth)
   ```typescript
   // In actions.ts
   export async function archiveStudent(studentId: string) {
     'use server'
     const user = await getCurrentUserProfile()
     const student = await getStudent(studentId)

     if (!canArchiveStudent(user, student)) {
       throw new Error('Permission denied')
     }

     // Perform action...
   }
   ```

5. **✅ Conditional rendering in components**
   ```typescript
   // In StudentsTable.tsx
   {canArchiveStudent(userProfile, student) && onArchive && student.status === 'active' && (
     <button onClick={() => onArchive(student)}>
       Archive
     </button>
   )}
   ```

6. **✅ Modal permission checks**
   ```typescript
   // In DeleteStudentModal.tsx
   const canSoftDelete = isAdmin || userProfile?.permissions?.can_soft_delete_students === true
   const canHardDelete = userProfile?.role === 'superadmin' // ONLY superadmin

   {canSoftDelete && !studentDeletedAt && (
     <Button onClick={onSoftDelete}>Hapus (Data Tersimpan)</Button>
   )}

   {canHardDelete && studentDeletedAt && (
     <Button onClick={onHardDelete}>Hapus Permanen ⚠️</Button>
   )}
   ```

**Common Bugs & Solutions**:

| Bug | Symptom | Solution |
|-----|---------|----------|
| `permissions` field not queried | Buttons never appear for teachers with permissions | Add `permissions` to AdminLayoutProvider query (line 50) |
| Using `isAdmin` instead of permission check | Teachers can't access features even with permissions | Use `canArchive`, `canTransfer` variables in page |
| Not passing `onArchive` prop | `onArchive === false` in component | Check page-level condition and pass callback |
| Hard Delete shown to non-superadmin | Teachers see "Hapus Permanen" button | Check `canHardDelete` (ONLY superadmin) |
| Permission not validated in server action | Security vulnerability | Always check `canArchiveStudent()` etc. in actions |

**Related Files**:
- Permission logic: `src/lib/studentPermissions.ts` (66 tests, 100% coverage)
- UI checks: `src/app/(admin)/users/siswa/components/StudentsTable.tsx` (lines 329-435)
- Page logic: `src/app/(admin)/users/siswa/page.tsx` (lines 59-63, 414-416)
- Server actions: `src/app/(admin)/users/siswa/actions/management.ts`
- Settings UI: `src/app/(admin)/users/guru/components/SettingsModal.tsx` (lines 232-306)
- Profile query: `src/components/layouts/AdminLayoutProvider.tsx` (line 50)
- Delete modal: `src/app/(admin)/users/siswa/components/DeleteStudentModal.tsx` (lines 31-42)

**Testing**: All permission functions have 100% test coverage. See `src/lib/__tests__/studentPermissions.test.ts` for examples.

**Business Rules**:
- Archived students (graduated/inactive) don't appear in:
  - Active student lists
  - Attendance forms (can't take attendance)
  - Class assignment modals
- Archived students **DO appear** in:
  - Historical reports (valid data for past periods)
  - Alumni/graduated views (filter by `status = 'graduated'`)
  - Statistics for their active period
- Query pattern: `WHERE status = 'active'` for active lists, `WHERE status != 'deleted'` for historical reports

### Meeting Types & Class Eligibility

**Available Meeting Types**:
- `ASAD` - ASAD meetings (available to all except PAUD and Pengajar classes)
- `PEMBINAAN` - Regular class meetings
- `SAMBUNG_KELOMPOK` - Group-level meetings
- `SAMBUNG_DESA` - Village-level meetings
- `SAMBUNG_DAERAH` - Regional-level meetings
- `SAMBUNG_PUSAT` - Central-level meetings

**Meeting Type Access Rules** (`src/lib/constants/meetingTypes.ts`):
- **Superadmin**: All meeting types
- **Admin Daerah**: All meeting types including ASAD
- **Admin Desa**: SAMBUNG_DESA only (no ASAD, no PEMBINAAN)
- **Admin Kelompok**: ASAD, PEMBINAAN, SAMBUNG_KELOMPOK, SAMBUNG_PUSAT
- **Teachers**: Dynamic based on class assignments
  - **PAUD-only teachers**: PEMBINAAN only
  - **Pengajar-only teachers**: PEMBINAAN only
  - **Other teachers**: PEMBINAAN + ASAD (if not PAUD/Pengajar)
  - **Sambung-capable teachers**: PEMBINAAN + SAMBUNG types (if class has `is_sambung_capable`)
  - **Exclude-pembinaan teachers**: SAMBUNG types only (if class has `exclude_pembinaan`)

**ASAD Meeting Type Restrictions**:
- **Purpose**: General attendance tracking for ASAD activities
- **Excluded Classes**:
  - PAUD classes (category code/name = 'PAUD')
  - Pengajar classes (class name contains 'pengajar')
- **Implementation**: Uses `isTeacherClass()` helper and category code checks
- **Teacher Eligibility**: Teachers must have at least one non-PAUD, non-Pengajar class to create ASAD meetings

**Sambung Desa Meeting Restrictions**:
- Use master classes (Pra Nikah, Remaja, Orang Tua) to select target classes
- **CRITICAL**: Must exclude Pengajar and Caberawit (PAUD/Kelas 1-6) classes
- Use `isSambungDesaEligible(classData)` helper when converting master classes to actual classes
- Example in `CreateMeetingModal.tsx`:
  ```typescript
  const getActualClassIdsFromMasterClasses = (masterClassIds, kelompokIds, allClasses) => {
    return allClasses
      .filter(cls => {
        // Must be in selected kelompok
        if (!kelompokIds.includes(cls.kelompok_id)) return false

        // Must have selected master class
        const hasMasterClass = cls.class_master_mappings.some(m =>
          masterClassIds.includes(m.class_master?.id)
        )
        if (!hasMasterClass) return false

        // CRITICAL: Exclude Pengajar and Caberawit
        return isSambungDesaEligible(cls)
      })
      .map(cls => cls.id)
  }
  ```

**Meeting Visibility**:
- Teachers only see meetings where they teach at least one of the meeting's classes
- **Class Master Mappings**: Junction table `class_master_mappings` links actual classes to master classes

### Multi-class Support
- Teachers can be assigned to multiple classes via `teacher_classes` junction table
- Students can be in multiple classes via `student_classes` junction table
- Profile loads all assigned classes for teachers with complete data:
  - `kelompok_id` and `kelompok` for organizational filtering
  - `class_master_mappings` with full hierarchy (class_master → category) for class type detection
- This enables `isCaberawitClass()` to work correctly on user profile classes

### Filtering & Reporting Conventions

**CRITICAL: Class Filter Logic**
- When filtering attendance/reports by class, **ALWAYS filter by meeting's class**, NOT student's enrolled class
- ❌ **WRONG**: Check if student is enrolled in selected class (`log.students.class_id`)
- ✅ **CORRECT**: Check if meeting was for selected class (`meeting.class_id` or `meeting.class_ids`)
- **Why**: Students can be enrolled in multiple classes. Filtering by student enrollment shows attendance from ALL meetings across ALL their classes, not just the selected class.
- **Example Bug**: Selecting "Pra Nikah" + "Pembinaan" showed student "Reta" whose "Pembinaan" meeting was actually for "Pengajar" class, not "Pra Nikah"
- **Correct Implementation** (see `src/app/(admin)/laporan/actions.ts:448-467`):
  ```typescript
  // Apply class filter - check MEETING's class, not student's class
  if (filters.classId) {
    const classIds = filters.classId.split(',')
    filteredLogs = filteredLogs.filter((log: any) => {
      const meeting = meetingMap.get(log.meeting_id)
      if (!meeting) return false

      // Check if meeting is for the selected class
      if (classIds.includes(meeting.class_id)) return true

      // Check class_ids array for multi-class meetings
      if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
        return meeting.class_ids.some((id: string) => classIds.includes(id))
      }

      return false
    })
  }
  ```

**Meeting Type Filter for Reporting**
- Reports page shows meeting types based on user role:
  - **Admins**: See ALL meeting types for filtering (to view all data)
  - **Teachers**: See only their available meeting types (types they can create)
- Uses `forceShowAllMeetingTypes={isAdmin(userProfile)}` prop on DataFilter component
- **Why**: Separates concerns of "what can I create" vs "what can I filter by"
  - Meeting creation pages: Use role-restricted types (teacher can only create certain types)
  - Reporting/filtering pages: 
    - Admins can filter by any type to view all organizational data
    - Teachers can only filter by types they're allowed to create
- **Implementation**: `src/components/shared/DataFilter.tsx` + `src/app/(admin)/laporan/components/FilterSection.tsx`

### Cache Management
- Use `revalidatePath()` after mutations in server actions
- Call `mutate()` on SWR hooks after client-side updates
- Both logout AND login use `clearUserCache()` to remove all persistent state and reload the page
  - This ensures clean slate and prevents stale cache issues (e.g., wrong percentages, old account data)
  - `clearSWRCache()` is only used for token refresh (no page reload needed)
- For targeted cache invalidation (e.g., after saving settings), use `mutate(specificKey)` from SWR
  - Example: `mutate(meetingFormSettingsKeys.settings(userId))` after updating user's meeting form settings

### Security
- All sensitive operations must be in server actions with permission checks
- Use RLS at database level for defense in depth
- Admin client (`createAdminClient()`) only for cross-organizational admin operations
- Validate user permissions before any data modification

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional:
```
NEXT_PUBLIC_USE_DUMMY_DATA=false
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
```

## Path Aliases

TypeScript path alias configured: `@/*` maps to `src/*`

Always use `@/` imports for consistency:
```typescript
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/userUtils'
```

## Key Technologies

- **Next.js 15** with App Router (React Server Components)
- **React 19** with TypeScript 5
- **Tailwind CSS 4** with PostCSS
- **Supabase** (PostgreSQL + Auth + RLS)
- **SWR** for data fetching with persistent cache
- **Zustand** for client state management (persisted to localStorage)
- **Ant Design (antd)** for some UI components
- **Recharts** for data visualization
- **@react-pdf/renderer** for PDF generation (report cards)
- **PWA** support with manifest and service workers
- **TipTap** for rich text editing (educational materials)
- **dnd-kit** for drag-and-drop interfaces
- **Sonner** for toast notifications
- **Flatpickr** for date/time pickers
