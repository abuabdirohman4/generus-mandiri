'use client'

import DataTable from '@/components/table/Table'

interface TableData {
  no: number
  student_name: string
  class_name: string
  total_days: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendance_rate: string
}

interface DataTableProps {
  tableData: TableData[]
}

export default function DataTableComponent({ tableData }: DataTableProps) {
  const columns = [
    // {
    //   key: 'no',
    //   label: 'No',
    //   width: '16',
    //   align: 'center' as const,
    // },
    {
      key: 'student_name',
      label: 'Nama Siswa',
      align: 'left' as const,
    },
    {
      key: 'attendance_rate',
      label: 'Tingkat Kehadiran',
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
      key: 'class_name',
      label: 'Kelas',
      align: 'center' as const,
    },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
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
    </div>
  )
}
