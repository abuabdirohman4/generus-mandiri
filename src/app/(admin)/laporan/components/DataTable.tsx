'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import DataTable from '@/components/table/Table'
import { useLaporan } from '../stores/laporanStore'
import { ReportIcon } from '@/lib/icons'
import type { UserProfile } from '@/stores/userProfileStore'

interface TableData {
  no: number
  student_id: string
  student_name: string
  class_name: string
  kelompok_name?: string
  desa_name?: string
  daerah_name?: string
  total_days: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendance_rate: string
}

interface DataTableProps {
  tableData: TableData[]
  userProfile?: UserProfile | null
}

export default function DataTableComponent({ tableData, userProfile }: DataTableProps) {
  console.log('tableData', tableData);
  const { filters } = useLaporan()
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null)
  const [clickedColumn, setClickedColumn] = useState<'actions' | 'student_name' | null>(null)

  const handleStudentClick = (studentId: string, column: 'actions' | 'student_name') => {
    setLoadingStudentId(studentId)
    setClickedColumn(column)
  }

  // Build dynamic columns based on user role
  const buildColumns = (userProfile: UserProfile | null) => {
    const baseColumns = [
      {
        key: 'actions',
        label: 'Detail',
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
    ]

    // Add organizational columns based on role
    const orgColumns = []

    const isSuperAdmin = userProfile?.role === 'superadmin'
    const isAdminDaerah = userProfile?.role === 'admin' && userProfile?.daerah_id && !userProfile?.desa_id
    const isAdminDesa = userProfile?.role === 'admin' && userProfile?.desa_id && !userProfile?.kelompok_id

    const isTeacherDaerah = userProfile?.role === 'teacher' && userProfile?.daerah_id && !userProfile?.desa_id && !userProfile?.kelompok_id
    const isTeacherDesa = userProfile?.role === 'teacher' && userProfile?.desa_id && !userProfile?.kelompok_id

    if (isSuperAdmin) {
      orgColumns.push(
        { key: 'daerah_name', label: 'Daerah', align: 'center' as const },
        { key: 'desa_name', label: 'Desa', align: 'center' as const },
        { key: 'kelompok_name', label: 'Kelompok', align: 'center' as const }
      )
    } else if (isAdminDaerah || isTeacherDaerah) {
      orgColumns.push(
        { key: 'desa_name', label: 'Desa', align: 'center' as const },
        { key: 'kelompok_name', label: 'Kelompok', align: 'center' as const }
      )
    } else if (isAdminDesa || isTeacherDesa) {
      orgColumns.push(
        { key: 'kelompok_name', label: 'Kelompok', align: 'center' as const }
      )
    }

    // Always add class column at the end
    orgColumns.push({ key: 'class_name', label: 'Kelas', align: 'center' as const })

    return [...baseColumns, ...orgColumns]
  }

  const columns = useMemo(() => buildColumns(userProfile ?? null), [userProfile])

  const renderCell = (column: any, item: any) => {
    if (column.key === 'student_name') {
      return (
        <Link 
          href={`/users/siswa/${item.student_id}?month=${filters.month}&year=${filters.year}&from=laporan`}
          className="hover:text-blue-600 hover:underline"
          onClick={() => handleStudentClick(item.student_id, 'student_name')}
        >
          {item.student_name}
        </Link>
      )
    }
    
    if (column.key === 'actions') {
      return (
        <Link 
          href={`/users/siswa/${item.student_id}?month=${filters.month}&year=${filters.year}&from=laporan`}
          className="text-yellow-600 hover:text-yellow-800 block"
          onClick={() => handleStudentClick(item.student_id, 'actions')}
        >
          <ReportIcon className="w-6 h-6 mx-auto" />
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
            loadingRowId={loadingStudentId}
            loadingColumnKey={clickedColumn}
            spinnerSize={16}
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
