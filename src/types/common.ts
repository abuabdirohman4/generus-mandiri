/**
 * Common shared types for Generus Mandiri
 */

// ─── API & Server Action Responses ───────────────────────────────────────────

/**
 * Standardized response format for Server Actions
 * @template T The type of data being returned
 */
export interface ServerActionResult<T = any> {
  success: boolean
  data?: T
  message?: string
}

/**
 * Standardized response for bulk operations
 */
export interface BulkOperationResult {
  assigned: number
  skipped: string[]
}
