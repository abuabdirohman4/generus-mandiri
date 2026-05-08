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
}

const MateriTrendChart = memo(function MateriTrendChart({
    data,
    isLoading = false,
    className = '',
    semester,
    viewMode
}: MateriTrendChartProps) {
    // Transform data to TrendChart format
    const transformedData = data.map(point => {
        const detailLine = point.target_count === 0
            ? 'Belum ada target'
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
                    ? viewMode === 'per_materi'
                        ? `${point.tuntas_count} dari ${point.target_count} materi tuntas (semua siswa)`
                        : `Rata-rata ${point.tuntas_count} dari ${point.target_count} materi dikuasai per siswa`
                    : undefined
            }
        }
    })

    const unit = viewMode === 'per_materi' ? 'materi tuntas (semua siswa)' : 'rata-rata per siswa'

    return (
        <TrendChart
            data={transformedData}
            title="Trend Pencapaian Materi (Kumulatif)"
            isLoading={isLoading}
            className={className}
            unit={unit}
            emptyMessage="Pilih kelas untuk melihat trend pencapaian"
        />
    )
})

export default MateriTrendChart
