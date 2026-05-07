import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useMateriDashboard } from '../useMateriDashboard'
import * as actions from '../../actions/materiMonitoring'
import React from 'react'

vi.mock('../../actions/materiMonitoring', () => ({
    getMateriDashboardSummary: vi.fn(),
}))

describe('useMateriDashboard', () => {
    it('does not fetch if disabled', () => {
        const { result } = renderHook(() => useMateriDashboard({ academicYearId: 'y1', semester: 1 }, false))
        expect(actions.getMateriDashboardSummary).not.toHaveBeenCalled()
        expect(result.current.data).toBeUndefined()
    })

    it('does not fetch if academicYearId is missing', () => {
        const { result } = renderHook(() => useMateriDashboard({ academicYearId: '', semester: 1 }, true))
        expect(actions.getMateriDashboardSummary).not.toHaveBeenCalled()
        expect(result.current.data).toBeUndefined()
    })
})
