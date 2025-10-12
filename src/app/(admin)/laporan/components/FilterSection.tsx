'use client'

import { Dayjs } from 'dayjs'
import InputFilter from '@/components/form/input/InputFilter'
import DatePickerInput from '@/components/form/input/DatePicker'
import WeekPicker from '@/components/form/input/WeekPicker'
import Button from '@/components/ui/button/Button'
import { LaporanFilters } from '../stores/laporanStore'

interface FilterOption {
  value: string
  label: string
}

interface FilterSectionProps {
  filters: LaporanFilters
  periodOptions: FilterOption[]
  classOptions: FilterOption[]
  onFilterChange: (key: string, value: string) => void
  onDateChange: (key: 'startDate' | 'endDate', date: Dayjs | null) => void
  onWeekChange: (weeks: [Dayjs | null, Dayjs | null]) => void
  onResetFilters: () => void
  hasActiveFilters: boolean
  filterCount: number
}

export default function FilterSection({
  filters,
  periodOptions,
  classOptions,
  onFilterChange,
  onDateChange,
  onWeekChange,
  onResetFilters,
  hasActiveFilters,
  filterCount
}: FilterSectionProps) {
  const monthOptions = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ]

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: (currentYear - 5 + i).toString(),
    label: (currentYear - 5 + i).toString()
  }))

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Filter Laporan
        </h2>
        {/* {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filterCount} filter aktif
            </span>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        )} */}
      </div>

      {/* Mode Toggle */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          {/* <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Mode Laporan:
          </span> */}
          <div className="flex w-full bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => onFilterChange('viewMode', 'general')}
              className={`w-full px-4 py-2 text-sm rounded-md transition-colors ${
                filters.viewMode === 'general'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Laporan Umum
            </button>
            <button
              onClick={() => onFilterChange('viewMode', 'detailed')}
              className={`w-full px-4 py-2 text-sm rounded-md transition-colors ${
                filters.viewMode === 'detailed'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Laporan Detail
            </button>
          </div>
        </div>
      </div>
      
      {filters.viewMode === 'general' ? (
        // General Mode Filters
        <div className="space-y-4">
          {/* Class Filter */}
          <div className="grid grid-cols1 gap-x-4">
            <InputFilter
              id="classId"
              label="Kelas"
              value={filters.classId ?? ''}
              onChange={(value) => onFilterChange('classId', value)}
              options={classOptions}
              allOptionLabel="Semua Kelas"
              className="!mb-0"
              widthClassName='!max-w-full'
            />
          </div>

          {/* Month and Year Filter */}
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-x-4">
            <InputFilter
              id="month"
              label="Bulan"
              value={filters.month.toString()}
              onChange={(value) => onFilterChange('month', value)}
              options={monthOptions}
              className="!mb-0"
              widthClassName='!max-w-full'
            />

            <InputFilter
              id="year"
              label="Tahun"
              value={filters.year.toString()}
              onChange={(value) => onFilterChange('year', value)}
              options={yearOptions}
              className="!mb-0"
              widthClassName='!max-w-full'
            />
          </div>
        </div>
      ) : (
        // Detailed Mode Filters - Dynamic based on period
        <div className="space-y-4">
          {/* Period and Class Selection */}
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-x-4">
            <InputFilter
              id="period"
              label="Periode"
              value={filters.period}
              onChange={(value) => onFilterChange('period', value)}
              options={periodOptions}
              className="!mb-0"
              widthClassName="!max-w-full"
            />

            <InputFilter
              id="classId"
              label="Kelas"
              value={filters.classId ?? ''}
              onChange={(value) => onFilterChange('classId', value)}
              options={classOptions}
              allOptionLabel="Semua Kelas"
              className="!mb-0"
              widthClassName="!max-w-full"
            />
          </div>

          {/* Period-specific filters */}
          {filters.period === 'daily' && (
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-x-4">
              <DatePickerInput
                mode="single"
                label="Tanggal Mulai"
                value={filters.startDate}
                onChange={(date) => onDateChange('startDate', date)}
                format="DD/MM/YYYY"
                placeholder="Pilih Tanggal"
              />

              <DatePickerInput
                mode="single"
                label="Tanggal Akhir"
                value={filters.endDate}
                onChange={(date) => onDateChange('endDate', date)}
                format="DD/MM/YYYY"
                placeholder="Pilih Tanggal"
              />
            </div>
          )}

          {filters.period === 'weekly' && (
            <WeekPicker
              label="Rentang Minggu"
              value={[filters.startDate, filters.endDate]}
              onChange={onWeekChange}
            />
          )}

          {filters.period === 'monthly' && (
            <div className="grid grid-cols-3 lg:grid-cols-3 gap-x-4">
              <InputFilter
                id="monthYear"
                label="Tahun"
                value={filters.monthYear?.toString() || ''}
                onChange={(value) => onFilterChange('monthYear', value)}
                options={yearOptions}
                className="mb-0"
              />

              <InputFilter
                id="startMonth"
                label="Bulan Mulai"
                value={filters.startMonth?.toString() || ''}
                onChange={(value) => onFilterChange('startMonth', value)}
                options={monthOptions}
                className="mb-0"
              />

              <InputFilter
                id="endMonth"
                label="Bulan Akhir"
                value={filters.endMonth?.toString() || ''}
                onChange={(value) => onFilterChange('endMonth', value)}
                options={monthOptions}
                className="mb-0"
              />
            </div>
          )}

          {filters.period === 'yearly' && (
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-x-4">
              <InputFilter
                id="startYear"
                label="Tahun Mulai"
                value={filters.startYear?.toString() || ''}
                onChange={(value) => onFilterChange('startYear', value)}
                options={yearOptions}
                className="mb-0"
              />

              <InputFilter
                id="endYear"
                label="Tahun Akhir"
                value={filters.endYear?.toString() || ''}
                onChange={(value) => onFilterChange('endYear', value)}
                options={yearOptions}
                className="mb-0"
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-6 md:mt-4 flex gap-2 w-full md:w-auto">
        <Button 
          onClick={onResetFilters} 
          variant="outline" 
          className="w-full md:w-auto"
          disabled={!hasActiveFilters}
        >
          Reset Filter
        </Button>
      </div>
    </div>
  )
}
