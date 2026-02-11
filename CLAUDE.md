# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- ⏳ Database migration (transfer_requests table) - TODO
- ⏳ Server actions (createTransferRequest, approveTransferRequest) - TODO
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
- **Configurable**: Admin can grant permissions per teacher in `/users/guru` page
- **Superadmin & Admin**: Always have all permissions (hardcoded)

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
