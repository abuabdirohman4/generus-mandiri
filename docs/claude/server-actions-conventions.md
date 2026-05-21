# Server Action Conventions & Error Handling

All Server Actions in Generus Mandiri MUST follow a standardized response pattern to ensure type safety and consistent UI behavior (toasts, loading states, error display).

---

## 1. Standardized Response Format

Every Server Action MUST return a `ServerActionResult<T>` object (defined in `@/types/common.ts`).

```typescript
import type { ServerActionResult } from '@/types/common'

export async function myAction(data: any): Promise<ServerActionResult<MyData>> {
  try {
    // ... implementation
    return { success: true, data: result }
  } catch (error) {
    const errorInfo = handleApiError(error, 'melakukan aksi', 'Pesan error kustom')
    return { 
      success: false, 
      message: errorInfo.message,
      data: [] // OR null/appropriate empty value for type safety
    }
  }
}
```

### Key Rules:
- **`success`**: Boolean indicating if the operation completed without error.
- **`data`**: The actual payload. **CRITICAL**: Always provide an empty/default value (like `[]` or `null`) even in `success: false` cases to prevent "Property X does not exist on type 'never'" or undefined access errors in the frontend.
- **`message`**: Human-readable error or success message. Use `handleApiError` to generate this consistently.

---

## 2. Error Handling with `handleApiError`

Always use the `handleApiError` utility (from `@/lib/handleApiError`) in the `catch` block.

```typescript
import { handleApiError } from '@/lib/handleApiError'

// ... in catch block
const errorInfo = handleApiError(error, 'menyimpan data', 'Gagal menyimpan data')
return { success: false, message: errorInfo.message }
```

- **Avoid raw error strings**: Don't just return `error.message`.
- **Consistency**: The `error` property in responses has been renamed to `message` across the codebase. NEVER return `{ error: string }`.

---

## 3. Frontend Consumption Pattern

When consuming actions in components or hooks, always check for `success`.

### In Hooks (SWR/Mutation):
```typescript
const fetcher = async () => {
  const result = await getAllItems()
  if (!result.success) throw new Error(result.message || 'Gagal memuat data')
  return result.data // Guaranteed to be defined if success is true
}
```

### In Components (Direct call):
```typescript
const result = await saveAction(data)
if (result.success) {
  toast.success('Berhasil!')
  onSuccess?.()
} else {
  toast.error(result.message || 'Terjadi kesalahan')
}
```

---

## 4. Testing Conventions

Unit tests MUST be updated to accommodate the wrapper object.

```typescript
// OLD
const result = await getAllItems()
expect(result).toEqual(mockData)

// NEW
const result = await getAllItems()
expect(result.success).toBe(true)
expect(result.data).toEqual(mockData)
```

For failed cases:
```typescript
const result = await failingAction()
expect(result.success).toBe(false)
expect(result.message).toContain('Expected error message')
```

---

## 5. Summary of Migrated Actions
- `src/app/(admin)/users/guru/actions/settings/actions.ts` (All actions)
- `src/app/(admin)/users/siswa/actions/students/actions.ts` (`getAllStudents`, `assignStudentsToClass`)
- `src/app/(admin)/users/guru/actions/teachers/actions.ts` (`getTeacherDeleteImpact`, etc.)
