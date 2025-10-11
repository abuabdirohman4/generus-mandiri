'use client'

import { Dayjs } from 'dayjs'
import InputFilter from '@/components/form/input/InputFilter'
import DatePickerInput from '@/components/form/input/DatePicker'
import Button from '@/components/ui/button/Button'
import { LaporanFilters } from '../stores/laporanStore'

interface FilterOption {
  value: string
  label: string
}

interface FilterSectionProps {
  filters: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
    classId: string
    startDate: Dayjs | null
    endDate: Dayjs | null
  }
  periodOptions: FilterOption[]
  classOptions: FilterOption[]
  onFilterChange: (key: string, value: string) => void
  onDateChange: (key: 'startDate' | 'endDate', date: Dayjs | null) => void
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
  onResetFilters,
  hasActiveFilters,
  filterCount
}: FilterSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Filter Laporan
        </h2>
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filterCount} filter aktif
            </span>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4">
        <InputFilter
          id="period"
          label="Periode"
          value={filters.period}
          onChange={(value) => onFilterChange('period', value)}
          options={periodOptions}
          className="mb-0"
        />

        <InputFilter
          id="classId"
          label="Kelas"
          value={filters.classId ?? ''}
          onChange={(value) => onFilterChange('classId', value)}
          options={classOptions}
          allOptionLabel="Semua Kelas"
          className="mb-0"
        />

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

      <div className="mt-6 md:mt-2 flex justify-end gap-2 w-full md:w-auto">
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
