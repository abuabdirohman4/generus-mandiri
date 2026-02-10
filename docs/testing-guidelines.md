# Testing Guidelines

## Overview
This project uses **Vitest** as the testing framework. Vitest is a fast, modern test runner designed for Vite projects, with a Jest-compatible API.

## Running Tests

```bash
# Run tests in watch mode (recommended for development)
npm run test

# Run tests once (for CI/CD)
npm run test:run

# Open Vitest UI (interactive test viewer)
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Project Structure

```
src/
├── test/
│   ├── setup.ts              # Global test setup
│   ├── mocks/
│   │   └── supabase.ts       # Supabase client mocks
│   ├── utils/
│   │   └── testHelpers.ts    # Common test utilities
│   └── fixtures/
│       ├── students.ts       # Mock student data
│       └── organizations.ts  # Mock organization data
└── lib/
    └── utils/
        └── __tests__/        # Test files alongside source
            ├── classHelpers.test.ts
            └── batchFetching.test.ts
```

## Writing Tests

### Test File Naming
- Place test files in `__tests__` directory next to the source file
- Name test files with `.test.ts` or `.test.tsx` extension
- Example: `classHelpers.ts` → `__tests__/classHelpers.test.ts`

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '../myModule'

describe('myModule', () => {
  describe('myFunction', () => {
    it('should do something', () => {
      const result = myFunction('input')
      expect(result).toBe('expected output')
    })
  })
})
```

### Testing with Mocks

#### Mocking Supabase Client

```typescript
import { vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '@/test/mocks/supabase'

describe('myServerAction', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
  })

  it('should fetch data from Supabase', async () => {
    // Setup mock response
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: '1', name: 'Test' }],
        error: null,
      }),
    })

    const result = await myServerAction(mockSupabase)
    
    expect(mockSupabase.from).toHaveBeenCalledWith('my_table')
    expect(result).toEqual([{ id: '1', name: 'Test' }])
  })
})
```

#### Using Test Fixtures

```typescript
import { mockStudent, mockStudents } from '@/test/fixtures/students'
import { mockDaerah, mockKelompok } from '@/test/fixtures/organizations'

it('should process student data', () => {
  const result = processStudent(mockStudent)
  expect(result.name).toBe('Ahmad Santoso')
})
```

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
  mockSupabase.from.mockReturnValue({
    select: vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    }),
  })

  const result = await myFunction(mockSupabase)
  
  expect(result.error).toBeDefined()
  expect(result.data).toBeNull()
})
```

## Best Practices

### 1. Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the pattern: "should [expected behavior] when [condition]"

### 2. Test Independence
- Each test should be independent and not rely on other tests
- Use `beforeEach` to reset state between tests
- Clean up after tests using `afterEach` if needed

### 3. Mock External Dependencies
- Always mock Supabase clients in unit tests
- Mock external APIs and services
- Use fixtures for consistent test data

### 4. Test Coverage Goals
- Aim for 80%+ coverage on utility functions
- Focus on testing business logic and edge cases
- Don't test third-party libraries or framework code

### 5. What to Test
✅ **DO test:**
- Pure functions and utilities
- Business logic and data transformations
- Error handling and edge cases
- Complex conditional logic
- Data validation functions

❌ **DON'T test:**
- Third-party library internals
- Simple getters/setters
- Framework-specific code (Next.js internals)
- Trivial functions with no logic

### 6. Assertion Best Practices
```typescript
// Good: Specific assertions
expect(result.name).toBe('Ahmad')
expect(result.age).toBeGreaterThan(18)
expect(result.emails).toHaveLength(2)

// Avoid: Overly broad assertions
expect(result).toBeTruthy() // Too vague
```

## Common Patterns

### Testing Array Operations
```typescript
it('should filter students correctly', () => {
  const filtered = filterStudents(mockStudents, { gender: 'L' })
  
  expect(filtered).toHaveLength(2)
  expect(filtered.every(s => s.gender === 'L')).toBe(true)
})
```

### Testing Object Transformations
```typescript
it('should transform class data', () => {
  const result = transformClass(mockClass)
  
  expect(result).toMatchObject({
    id: 'class-1',
    name: 'Pra Nikah',
  })
})
```

### Testing Conditional Logic
```typescript
it('should return true for Caberawit class', () => {
  expect(isCaberawitClass(caberawitClass)).toBe(true)
})

it('should return false for non-Caberawit class', () => {
  expect(isCaberawitClass(remajaClass)).toBe(false)
})
```

## Debugging Tests

### Using Console Logs
```typescript
it('should debug test', () => {
  console.log('Debug data:', myData)
  expect(myData).toBeDefined()
})
```

### Using Vitest UI
- Run `npm run test:ui` to open interactive test viewer
- View test results, coverage, and console output
- Debug failing tests with detailed error messages

### Checking Coverage
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

## CI/CD Integration

Add to your CI/CD pipeline:
```yaml
- name: Run tests
  run: npm run test:run

- name: Generate coverage
  run: npm run test:coverage
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

## Getting Help

If you encounter issues:
1. Check test output for error messages
2. Use Vitest UI for interactive debugging
3. Review existing tests for patterns
4. Consult this guide and official documentation
