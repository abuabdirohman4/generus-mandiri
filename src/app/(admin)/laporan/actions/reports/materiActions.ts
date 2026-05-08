'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { 
    fetchMateriReport, 
    fetchMateriReportBySiswa, 
    getMateriCumulativeProgress,
    type MateriReportFilters, 
    type MateriReportData, 
    type MateriSiswaRow,
    type MateriMonthlyPoint
} from './materiQueries'

export async function getMateriReport(filters: MateriReportFilters): Promise<MateriReportData> {
    const supabase = await createAdminClient()
    return fetchMateriReport(supabase, filters)
}

export async function getMateriReportBySiswa(filters: MateriReportFilters): Promise<MateriSiswaRow[]> {
    const supabase = await createAdminClient()
    return fetchMateriReportBySiswa(supabase, filters)
}

export async function getMateriTrendData(params: {
    classId: string
    academicYearId: string
    semester: 1 | 2
    upToMonth: number
}): Promise<MateriMonthlyPoint[]> {
    const supabase = await createAdminClient()
    return getMateriCumulativeProgress(supabase, params)
}
