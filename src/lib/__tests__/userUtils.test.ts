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
        let sessionStorageMock: Record<string, ReturnType<typeof vi.fn>>

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

            // Mock sessionStorage
            sessionStorageMock = {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn()
            }
            vi.stubGlobal('sessionStorage', sessionStorageMock)

            // Mock window.location.reload
            vi.stubGlobal('location', { ...window.location, reload: vi.fn() })
        })

        it('clearUserCache should remove all known storages and reload by default', () => {
            clearUserCache()

            expect(localStorage.removeItem).toHaveBeenCalledWith('swr-cache')
            expect(localStorage.removeItem).toHaveBeenCalledWith('user-profile-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('siswa-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('laporan-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('attendance-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('absensi-ui-store')
            expect(localStorage.removeItem).toHaveBeenCalledWith('dashboard-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('materi-storage')
            expect(window.location.reload).toHaveBeenCalled()
        })

        it('clearUserCache(true) should remove all storages and reload', () => {
            clearUserCache(true)

            expect(localStorage.removeItem).toHaveBeenCalledWith('swr-cache')
            expect(localStorage.removeItem).toHaveBeenCalledWith('user-profile-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('siswa-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('laporan-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('attendance-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('absensi-ui-store')
            expect(localStorage.removeItem).toHaveBeenCalledWith('dashboard-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('materi-storage')
            expect(window.location.reload).toHaveBeenCalled()
        })

        it('clearUserCache(false) should remove all storages WITHOUT reload', () => {
            clearUserCache(false)

            expect(localStorage.removeItem).toHaveBeenCalledWith('swr-cache')
            expect(localStorage.removeItem).toHaveBeenCalledWith('user-profile-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('siswa-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('laporan-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('attendance-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('absensi-ui-store')
            expect(localStorage.removeItem).toHaveBeenCalledWith('dashboard-storage')
            expect(localStorage.removeItem).toHaveBeenCalledWith('materi-storage')
            expect(window.location.reload).not.toHaveBeenCalled()
            // Should NOT set suppress flag when not reloading
            expect(sessionStorageMock.setItem).not.toHaveBeenCalledWith('swr-cache-suppress-persist', 'true')
        })

        it('clearUserCache(true) should set suppress-persist flag before reload', () => {
            clearUserCache(true)

            // Should set suppress flag to prevent beforeunload from re-saving stale cache
            expect(sessionStorageMock.setItem).toHaveBeenCalledWith('swr-cache-suppress-persist', 'true')
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
