'use client'

import useSWR from 'swr'
import type { MateriReportFilters, MateriReportData } from '../actions/reports/materiQueries'

interface UseMateriReportDataOptions {
    filters: MateriReportFilters
    enabled?: boolean
    viewMode?: 'per_materi' | 'per_siswa'
}

export function useMateriReportData({ filters, enabled = true, viewMode = 'per_materi' }: UseMateriReportDataOptions) {
    const shouldFetch = enabled && !!filters.classId && !!filters.academicYearId

    const swrKey = shouldFetch
        ? ['materi-report', filters.classId, filters.academicYearId, filters.semester, filters.categoryId, filters.month]
        : null

    const { data, error, isLoading, mutate } = useSWR<MateriReportData>(
        swrKey,
        async () => {
            const { getMateriReport } = await import('../actions/reports/materiActions')
            return getMateriReport(filters)
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 10000,
        }
    )

    return {
        data,
        error,
        isLoading: shouldFetch ? isLoading : false,
        mutate,
        hasData: !!data && data.rows.length > 0,
    }
}
