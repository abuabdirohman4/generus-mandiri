# Testing Guidelines

## Unit Testing Strategy

**Status**: ✅ Testing infrastructure implemented with Vitest. See this document for complete usage guidelines.

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

**Phase 5: CI/CD Integration** (Optional)
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
- **sm-37l** ✅ CLOSED: Document unit testing strategy in CLAUDE.md
- **sm-6gn** ✅ CLOSED: Write tests for utility functions (Priority 1)
- **sm-8yf** ⏳ IN PROGRESS: Student management with approval-based transfer (TDD foundation complete)

**Dependencies**: sm-37l and sm-6gn depend on sm-qrt (setup completed)
