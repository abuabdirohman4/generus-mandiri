'use client'

import InputFilter from '@/components/form/input/InputFilter'

interface LaporanTimeFilterProps {
  month: number        // 1-12
  year: number         // e.g. 2026
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  semester?: 1 | 2
  academicYear?: string
}

const MONTHS = [
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },   { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },     { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },    { value: '8', label: 'Agustus' },
  { value: '9', label: 'September'},{ value: '10', label: 'Oktober' },
  { value: '11', label: 'November'},{ value: '12', label: 'Desember' },
]

// Tahun: N-2 sampai N+1 dari tahun sekarang
function getYearOptions() {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current, current + 1].map(y => ({
    value: String(y), label: String(y)
  }))
}

export default function LaporanTimeFilter({ month, year, onMonthChange, onYearChange, semester, academicYear }: LaporanTimeFilterProps) {
  return (
    <>
      <InputFilter
        id="laporanMonthFilter"
        label="Bulan"
        value={String(month)}
        onChange={(v) => onMonthChange(Number(v))}
        options={MONTHS}
        widthClassName="!max-w-full"
        compact
      />
      <InputFilter
        id="laporanYearFilter"
        label="Tahun"
        value={String(year)}
        onChange={(v) => onYearChange(Number(v))}
        options={getYearOptions()}
        widthClassName="!max-w-full"
        compact
      />
      {(semester !== undefined || academicYear) && (
        <span className="col-span-2 text-xs text-gray-500 dark:text-gray-400 -mt-1 font-medium">
          {semester !== undefined ? `Semester ${semester}` : ''}
          {semester !== undefined && academicYear ? ' • ' : ''}
          {academicYear ? `Tahun Ajaran ${academicYear}` : ''}
        </span>
      )}
    </>
  )
}
