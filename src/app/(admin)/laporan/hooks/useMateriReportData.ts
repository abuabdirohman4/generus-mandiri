'use client'

import useSWR from 'swr'
import type { MateriReportFilters, MateriReportData, MateriMonthlyPoint } from '../actions/reports/materiQueries'

interface UseMateriReportDataOptions {
    filters: MateriReportFilters
    enabled?: boolean
    viewMode?: 'per_materi' | 'per_siswa'
    reportMode?: 'monthly' | 'cumulative'
}

export function useMateriReportData({ 
    filters, 
    enabled = true, 
    viewMode = 'per_materi',
    reportMode = 'cumulative'
}: UseMateriReportDataOptions) {
    const shouldFetch = enabled && !!filters.classId && !!filters.academicYearId

    const swrKey = shouldFetch
        ? ['materi-report', filters.classId, filters.academicYearId, filters.semester, filters.categoryId, filters.month, reportMode, viewMode]
        : null

    const { data, error, isLoading, mutate } = useSWR<{ report: MateriReportData, trend: MateriMonthlyPoint[] }>(
        swrKey,
        async () => {
            const { getMateriReport, getMateriTrendData, getMateriMonthlyChartData } = await import('../actions/reports/materiActions')
            
            // Fetch both report data and trend data in parallel
            const [reportData, trendData] = await Promise.all([
                getMateriReport({ ...filters, reportMode, viewMode: viewMode ?? 'per_siswa' }),
                reportMode === 'cumulative' && filters.month
                    ? getMateriTrendData({
                        classId: filters.classId,
                        academicYearId: filters.academicYearId,
                        semester: filters.semester,
                        upToMonth: filters.month,
                        viewMode: viewMode ?? 'per_siswa'
                    })
                    : reportMode === 'monthly' && filters.classId && filters.academicYearId
                        ? getMateriMonthlyChartData({
                            classId: filters.classId,
                            academicYearId: filters.academicYearId,
                            semester: filters.semester,
                          })
                        : Promise.resolve([])
            ])
            
            return { report: reportData, trend: trendData }
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 10000,
        }
    )

    return {
        data: data?.report,
        trendData: data?.trend || [],
        error,
        isLoading: shouldFetch ? isLoading : false,
        mutate,
        hasData: !!data?.report && data.report.rows.length > 0,
    }
}
