'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { fetchMateriReport, fetchMateriReportBySiswa, type MateriReportFilters, type MateriReportData, type MateriSiswaRow } from './materiQueries'

export async function getMateriReport(filters: MateriReportFilters): Promise<MateriReportData> {
    const supabase = await createAdminClient()
    return fetchMateriReport(supabase, filters)
}

export async function getMateriReportBySiswa(filters: MateriReportFilters): Promise<MateriSiswaRow[]> {
    const supabase = await createAdminClient()
    return fetchMateriReportBySiswa(supabase, filters)
}
