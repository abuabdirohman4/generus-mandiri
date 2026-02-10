import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCurrentUserId, isAdminLegacy, clearUserCache, clearSWRCache } from '../userUtils'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn()
}))

describe('userUtils', () => {
    describe('getCurrentUserId', () => {
        it('should return user id on success', async () => {
            const mockUser = { id: 'user-123' }
            const mockSupabase = {
                auth: {
                    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
                }
            }
            vi.mocked(createClient).mockReturnValue(mockSupabase as any)

            const id = await getCurrentUserId()
            expect(id).toBe('user-123')
        })

        it('should return null on error', async () => {
            const mockSupabase = {
                auth: {
                    getUser: vi.fn().mockRejectedValue(new Error('API Error'))
                }
            }
            vi.mocked(createClient).mockReturnValue(mockSupabase as any)

            const id = await getCurrentUserId()
            expect(id).toBeNull()
        })
    })

    describe('isAdminLegacy', () => {
        it('should return true for admin or superadmin', () => {
            expect(isAdminLegacy('admin')).toBe(true)
            expect(isAdminLegacy('superadmin')).toBe(true)
            expect(isAdminLegacy('teacher')).toBe(false)
            expect(isAdminLegacy(undefined)).toBe(false)
        })
    })

    describe('Cache Clearing', () => {
        beforeEach(() => {
            // Clear all previous mock calls
            vi.clearAllMocks()

            // Mock localStorage
            const localStorageMock = {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn()
            }
            vi.stubGlobal('localStorage', localStorageMock)

            // Mock window.location.reload
            vi.stubGlobal('location', { ...window.location, reload: vi.fn() })
        })

        it('clearUserCache should remove all known storages and reload', () => {
            clearUserCache()

            expect(localStorage.removeItem).toHaveBeenCalledWith('swr-cache')
            expect(localStorage.removeItem).toHaveBeenCalledWith('user-profile-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('attendance-storage')
            expect(window.location.reload).toHaveBeenCalled()
        })

        it('clearSWRCache should remove only SWR related items and NOT reload', () => {
            clearSWRCache()

            expect(localStorage.removeItem).toHaveBeenCalledWith('swr-cache')
            expect(localStorage.removeItem).toHaveBeenCalledWith('swr-cache-timestamp')
            expect(localStorage.removeItem).not.toHaveBeenCalledWith('user-profile-storage')
            expect(window.location.reload).not.toHaveBeenCalled()
        })
    })
})
