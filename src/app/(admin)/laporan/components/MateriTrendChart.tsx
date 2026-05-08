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
}

const MateriTrendChart = memo(function MateriTrendChart({
    data,
    isLoading = false,
    className = '',
    semester
}: MateriTrendChartProps) {
    // Transform data to TrendChart format
    const transformedData = data.map(point => {
        const totalPossible = point.tercapai ? Number(point.tercapai.split('/')[1]) : 0
        const siswaCount = point.target_count > 0 && totalPossible > 0
            ? Math.round(totalPossible / point.target_count)
            : 0
        const avgPerSiswa = siswaCount > 0
            ? Math.round(point.tuntas_count / siswaCount)
            : 0


        return {
            date: point.month_label,
            fullDate: getMonthName(point.month as any),
            percentage: point.percentage,
            details: {
                targetLabel: `${point.target_count} materi ditargetkan`,
                achievementLabel: siswaCount > 0 
                    ? `Rata-rata ${avgPerSiswa} dari ${point.target_count} materi dikuasai per siswa`
                    : undefined
            }
        }
    })

    return (
        <TrendChart
            data={transformedData}
            title="Trend Pencapaian Materi (Kumulatif)"
            isLoading={isLoading}
            className={className}
            unit="rata-rata per siswa"
            emptyMessage="Pilih kelas untuk melihat trend pencapaian"
        />
    )
})

export default MateriTrendChart
