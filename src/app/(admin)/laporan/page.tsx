'use client'

import { useState, useEffect } from 'react'
import DataTable from '@/components/table/Table'
import AttendancePieChart from '@/components/charts/AttendancePieChart'
import Button from '@/components/ui/button/Button'
import InputFilter from '@/components/form/input/InputFilter'
import DatePickerInput from '@/components/form/input/DatePicker'
import { getAttendanceReport, getClasses, type ReportData, type ReportFilters } from './actions'
import { ATTENDANCE_COLORS } from '@/lib/constants/colors'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale

// Set Indonesian locale
dayjs.locale('id')

interface Class {
  id: string
  name: string
}

export default function LaporanPage() {
  const [filters, setFilters] = useState<{
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
    classId: string
    startDate: Dayjs | null
    endDate: Dayjs | null
  }>({
    period: 'monthly',
    classId: '',
    startDate: null,
    endDate: null
  })
  const [classes, setClasses] = useState<Class[]>([])
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Period options for InputFilter
  const periodOptions = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
    { value: 'yearly', label: 'Tahunan' }
  ]

  // Class options for InputFilter
  const classOptions = classes.map(cls => ({
    value: cls.id,
    label: cls.name
  }))

  // Fetch classes for filter dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesData = await getClasses()
        setClasses(classesData)
      } catch (err) {
        console.error('Error fetching classes:', err)
      }
    }
    fetchClasses()
  }, [])

  // Fetch report data when filters change
  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Convert dayjs objects to strings for API call
        const apiFilters: ReportFilters = {
          period: filters.period,
          classId: filters.classId || undefined,
          startDate: filters.startDate?.format('DD-MM-YYYY') || undefined,
          endDate: filters.endDate?.format('DD-MM-YYYY') || undefined
        }
        const reportData = await getAttendanceReport(apiFilters)
        setData(reportData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch report data')
      } finally {
        setIsLoading(false)
      }
    }
    fetchReportData()
  }, [filters])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({
      period: 'monthly',
      classId: '',
      startDate: null,
      endDate: null
    })
  }

  const columns = [
    {
      key: 'no',
      label: 'No',
      width: '16',
      align: 'center' as const,
    },
    {
      key: 'student_name',
      label: 'Nama Siswa',
      align: 'left' as const,
    },
    {
      key: 'class_name',
      label: 'Kelas',
      align: 'center' as const,
    },
    {
      key: 'total_days',
      label: 'Total Hari',
      align: 'center' as const,
    },
    {
      key: 'hadir',
      label: 'Hadir',
      align: 'center' as const,
    },
    {
      key: 'izin',
      label: 'Izin',
      align: 'center' as const,
    },
    {
      key: 'sakit',
      label: 'Sakit',
      align: 'center' as const,
    },
    {
      key: 'alpha',
      label: 'Alpha',
      align: 'center' as const,
    },
    {
      key: 'attendance_rate',
      label: 'Tingkat Kehadiran',
      align: 'center' as const,
    },
  ]

  const tableData = data?.detailedRecords
    ?.sort((a, b) => a.student_name.localeCompare(b.student_name)) // Sort by student name
    ?.map((record, index) => ({
      no: index + 1,
      student_name: record.student_name,
      class_name: record.class_name,
      total_days: record.total_days,
      hadir: record.hadir,
      izin: record.izin,
      sakit: record.sakit,
      alpha: record.alpha,
      attendance_rate: `${record.attendance_rate}%`,
    })) || []

  if (error) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>Gagal memuat data laporan. Silakan coba lagi nanti.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        {/* <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Laporan Kehadiran
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Analisis dan visualisasi data kehadiran siswa
          </p>
        </div> */}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Filter Laporan
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4">
            <InputFilter
              id="period"
              label="Periode"
              value={filters.period}
              onChange={(value) => handleFilterChange('period', value)}
              options={periodOptions}
              className="mb-0"
            />

            <InputFilter
              id="classId"
              label="Kelas"
              value={filters.classId ?? ''}
              onChange={(value) => handleFilterChange('classId', value)}
              options={classOptions}
              allOptionLabel="Semua Kelas"
              className="mb-0"
            />

            <DatePickerInput
              mode="single"
              label="Tanggal Mulai"
              value={filters.startDate}
              onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
              format="DD/MM/YYYY"
              placeholder="Pilih Tanggal"
            />

            <DatePickerInput
              mode="single"
              label="Tanggal Akhir"
              value={filters.endDate}
              onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
              format="DD/MM/YYYY"
              placeholder="Pilih Tanggal"
            />
          </div>

          <div className="mt-6 md:mt-2 flex justify-end gap-2 w-full md:w-auto">
            <Button onClick={resetFilters} variant="outline" className="w-full md:w-auto">
              Reset Filter
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Memuat data laporan...
            </p>
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            {/* <div className="flex flex-wrap gap-2 md:gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.hadir }}></div>
                <span className="text-gray-600 dark:text-gray-400">{data.summary.hadir} Hadir</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.absen }}></div>
                <span className="text-gray-600 dark:text-gray-400">{data.summary.alpha} Alfa</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.izin }}></div>
                <span className="text-gray-600 dark:text-gray-400">{data.summary.izin} Izin</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.sakit }}></div>
                <span className="text-gray-600 dark:text-gray-400">{data.summary.sakit} Sakit</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-4">
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">T</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.summary.total}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">H</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Hadir
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.summary.hadir}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">I</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Izin
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.summary.izin}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">S</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Sakit
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.summary.sakit}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">A</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Alpha
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.summary.alpha}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div> */}

            {/* Chart and Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Quick Stats */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Statistik Kehadiran
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Tingkat Kehadiran Rata-rata
                    </span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {data.summary.total > 0 
                        ? Math.round((data.summary.hadir / data.summary.total) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Periode Laporan
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {filters.period === 'daily' ? 'Harian' :
                       filters.period === 'weekly' ? 'Mingguan' :
                       filters.period === 'monthly' ? 'Bulanan' : 'Tahunan'}
                    </span>
                  </div>
                  {data.dateRange.start && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Rentang Tanggal
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {data.dateRange.start} - {data.dateRange.end || 'Sekarang'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Chart */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Visualisasi Kehadiran
                </h3>
                <AttendancePieChart data={data.chartData} />
              </div>
            </div>

            {/* Detailed Table */}
            {/* <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Detail Laporan per Siswa
                </h3>
              </div>
              <div className="p-6">
                {tableData.length > 0 ? (
                  <DataTable
                    columns={columns}
                    data={tableData}
                    pagination={true}
                    searchable={true}
                    itemsPerPageOptions={[5, 10, 25, 50]}
                    defaultItemsPerPage={10}
                    searchPlaceholder="Cari siswa..."
                    className="bg-white dark:bg-gray-800"
                    headerClassName="bg-gray-50 dark:bg-gray-700"
                    rowClassName="hover:bg-gray-50 dark:hover:bg-gray-700"
                  />
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      Tidak ada data
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Tidak ada data kehadiran untuk periode yang dipilih.
                    </p>
                  </div>
                )}
              </div>
            </div> */}
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Tidak ada data
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tidak ada data laporan yang tersedia.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
