'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { fetchMateriReport, type MateriReportFilters, type MateriReportData } from './materiQueries'

export async function getMateriReport(filters: MateriReportFilters): Promise<MateriReportData> {
    const supabase = await createAdminClient()
    return fetchMateriReport(supabase, filters)
}
