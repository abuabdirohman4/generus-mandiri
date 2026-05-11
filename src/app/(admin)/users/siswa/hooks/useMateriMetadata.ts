import useSWR from 'swr'
import { useMemo } from 'react'
import { getAcademicYears, getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years'
import { getMaterialCategories } from '@/app/(admin)/materi/actions/categories/actions'

export function useMateriMetadata() {
    const { data: yearsData, isLoading: isLoadingYears } = useSWR('academic-years', getAcademicYears, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false
    })
    
    const { data: activeYear, isLoading: isLoadingActiveYear } = useSWR('active-academic-year', getActiveAcademicYear, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false
    })
    
    const { data: categoriesData, isLoading: isLoadingCategories } = useSWR('material-categories', getMaterialCategories, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false
    })

    const academicYears = useMemo(() => 
        yearsData?.map(y => ({ value: y.id, label: y.name })) ?? [], 
    [yearsData])

    const allCategories = useMemo(() => 
        categoriesData?.map(c => ({ value: c.name, label: c.name })) ?? [], 
    [categoriesData])

    return {
        academicYears,
        allCategories,
        activeYear,
        isLoading: isLoadingYears || isLoadingActiveYear || isLoadingCategories
    }
}
