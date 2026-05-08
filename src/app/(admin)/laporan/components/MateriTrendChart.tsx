'use client'

import { memo } from 'react'
import { TrendChart } from '@/components/charts'
import { getMonthName } from '@/app/(admin)/materi/types'
import type { MateriMonthlyPoint } from '../actions/reports/materiQueries'

interface MateriTrendChartProps {
    data: MateriMonthlyPoint[]
    isLoading?: boolean
    className?: string
    semester: 1 | 2
    viewMode: 'per_materi' | 'per_siswa'
    reportMode?: 'cumulative' | 'monthly'
}

const MateriTrendChart = memo(function MateriTrendChart({
    data,
    isLoading = false,
    className = '',
    semester,
    viewMode,
    reportMode = 'cumulative'
}: MateriTrendChartProps) {
    const title = reportMode === 'monthly'
        ? 'Pencapaian Materi per Bulan'
        : 'Trend Pencapaian Materi (Kumulatif)'

    const unit = reportMode === 'monthly'
        ? 'rata-rata per siswa'
        : viewMode === 'per_materi'
            ? 'materi tuntas (semua siswa)'
            : 'rata-rata per siswa'

    // Transform data to TrendChart format
    const transformedData = data.map(point => {
        const detailLine = point.target_count === 0
            ? 'Belum ada target'
            : reportMode === 'monthly'
                ? `Rata-rata ${point.tuntas_count} dari ${point.target_count} materi dikuasai`
                : viewMode === 'per_materi'
                    ? `${point.tuntas_count} dari ${point.target_count} materi tuntas (semua siswa)`
                    : `Rata-rata ${point.tuntas_count} dari ${point.target_count} materi per siswa`

        return {
            date: point.month_label,
            fullDate: `${getMonthName(point.month as any)}`,
            percentage: point.percentage,
            details: {
                targetLabel: point.target_count > 0 
                    ? `${point.target_count} materi ditargetkan`
                    : 'Belum ada target',
                achievementLabel: point.target_count > 0
                    ? detailLine
                    : undefined
            }
        }
    })

    return (
        <TrendChart
            data={transformedData}
            title={title}
            isLoading={isLoading}
            className={className}
            unit={unit}
            emptyMessage="Pilih kelas untuk melihat trend pencapaian"
        />
    )
})

export default MateriTrendChart
