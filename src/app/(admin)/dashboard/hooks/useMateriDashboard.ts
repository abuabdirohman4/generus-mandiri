import useSWR from 'swr'
import { getMateriDashboardSummary } from '../actions/materiMonitoring'
import type { MateriDashboardFilters, ClassMateriSummary } from '../actions/materiMonitoring'

export function useMateriDashboard(
    filters: MateriDashboardFilters,
    enabled: boolean
) {
    const swrKey = enabled && filters.academicYearId
        ? ['materi-dashboard', JSON.stringify(filters)]
        : null

    return useSWR<ClassMateriSummary[]>(
        swrKey,
        () => getMateriDashboardSummary(filters),
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000,  // 5 menit
            keepPreviousData: true,
        }
    )
}
