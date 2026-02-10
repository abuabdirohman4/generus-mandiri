import { vi } from 'vitest'

/**
 * Mock Supabase client for testing
 * Provides type-safe mocks for common Supabase operations
 */

export const createMockSupabaseClient = () => {
    // Create a chainable mock query builder
    const createQueryBuilder = () => {
        const builder: any = {}

        builder.select = vi.fn().mockReturnValue(builder)
        builder.insert = vi.fn().mockReturnValue(builder)
        builder.update = vi.fn().mockReturnValue(builder)
        builder.delete = vi.fn().mockReturnValue(builder)
        builder.eq = vi.fn().mockReturnValue(builder)
        builder.in = vi.fn().mockReturnValue(builder)
        builder.order = vi.fn().mockReturnValue(builder)
        builder.limit = vi.fn().mockReturnValue(builder)
        builder.single = vi.fn().mockResolvedValue({ data: null, error: null })
        builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

        return builder
    }

    const mockFrom = vi.fn(() => createQueryBuilder())

    const mockAuth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi
            .fn()
            .mockResolvedValue({ data: { session: null }, error: null }),
        signIn: vi.fn().mockResolvedValue({ data: null, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
    }

    return {
        from: mockFrom,
        auth: mockAuth,
        // Helper to reset all mocks
        _reset: () => {
            mockFrom.mockClear()
        },
    }
}

/**
 * Mock successful query response
 */
export const mockSuccessResponse = <T>(data: T) => ({
    data,
    error: null,
})

/**
 * Mock error response
 */
export const mockErrorResponse = (message: string) => ({
    data: null,
    error: { message, details: '', hint: '', code: '' },
})
