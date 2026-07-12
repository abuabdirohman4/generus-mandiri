import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMateriDashboardSummary } from '../materiMonitoring'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => {
  const __m: any = {
    createClient: vi.fn(),
}
  __m.createAuthClient = vi.fn(() => __m.createClient?.())
  __m.createAdminAuthClient = vi.fn(() => __m.createAdminClient?.())
  return __m
})

// Mock accessControlServer
vi.mock('@/lib/accessControlServer', () => ({
    canManageMaterials: vi.fn(),
    getCurrentUserProfile: vi.fn(),
}))

function makeChain(returnValue: any = { data: [], error: null }) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.then = (resolve: (v: any) => any, reject?: (e: any) => any) =>
        Promise.resolve(returnValue).then(resolve, reject)
    return chain
}

function makeSupa(returnValue?: any) {
    const chain = makeChain(returnValue)
    return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any
}

describe('getMateriDashboardSummary', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns empty array if profile is missing', async () => {
        const { getCurrentUserProfile } = await import('@/lib/accessControlServer')
        vi.mocked(getCurrentUserProfile).mockResolvedValue(null)

        const result = await getMateriDashboardSummary({ academicYearId: 'year-1', semester: 1 })
        expect(result).toEqual({ success: true, data: [] })
    })

    it('returns empty array if academicYearId is missing', async () => {
        const { getCurrentUserProfile, canManageMaterials } = await import('@/lib/accessControlServer')
        vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'u1', role: 'admin' } as any)
        vi.mocked(canManageMaterials).mockReturnValue(true)

        const result = await getMateriDashboardSummary({ academicYearId: '', semester: 1 })
        expect(result).toEqual({ success: true, data: [] })
    })
})
