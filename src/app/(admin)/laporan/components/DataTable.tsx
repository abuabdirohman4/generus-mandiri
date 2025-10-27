'use client'

import Link from 'next/link'
import DataTable from '@/components/table/Table'
import { useLaporan } from '../stores/laporanStore'
import { ReportIcon } from '@/lib/icons'

interface TableData {
  no: number
  student_id: string
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
  const { filters } = useLaporan()
  
  const columns = [
    {
      key: 'actions',
      label: 'Aksi',
      align: 'center' as const,
      width: '24'
    },
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

  const renderCell = (column: any, item: any) => {
    if (column.key === 'student_name') {
      return (
        <Link 
          href={`/users/siswa/${item.student_id}?month=${filters.month}&year=${filters.year}&from=laporan`}
          className="hover:text-blue-600 hover:underline"
        >
          {item.student_name}
        </Link>
      )
    }
    
    if (column.key === 'actions') {
      return (
        <Link 
          href={`/users/siswa/${item.student_id}?month=${filters.month}&year=${filters.year}&from=laporan`}
          className="text-yellow-600 hover:text-yellow-800"
        >
          <ReportIcon className="w-6 h-6 mx-auto" />
          {/* <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg> */}
        </Link>
      )
    }
    
    return item[column.key] || '-'
  }

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
            renderCell={renderCell}
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
