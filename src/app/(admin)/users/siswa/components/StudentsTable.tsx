'use client'

import { useState } from 'react'
import Link from 'next/link'
import DataTable from '@/components/table/Table'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'
import { PencilIcon, TrashBinIcon, EyeIcon, ReportIcon } from '@/lib/icons'
import { Student } from '@/hooks/useStudents'
import { isAdminLegacy, isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils'

interface StudentsTableProps {
  students: Student[]
  userRole: string | null
  onEdit: (student: Student) => void
  onDelete: (studentId: string) => void
  userProfile: { 
    role: string; 
    classes?: Array<{ id: string; name: string }> 
  } | null | undefined
}

export default function StudentsTable({ 
  students, 
  userRole, 
  onEdit, 
  onDelete, 
  userProfile 
}: StudentsTableProps) {
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null)
  const [clickedColumn, setClickedColumn] = useState<'name' | 'actions' | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    studentId: string
    studentName: string
  }>({
    isOpen: false,
    studentId: '',
    studentName: ''
  })
  
  const handleStudentClick = (studentId: string, column: 'name' | 'actions') => {
    setLoadingStudentId(studentId)
    setClickedColumn(column)
  }

  const handleDeleteClick = (studentId: string, studentName: string) => {
    setDeleteModal({
      isOpen: true,
      studentId,
      studentName
    })
  }

  const handleDeleteConfirm = () => {
    onDelete(deleteModal.studentId)
    setDeleteModal({
      isOpen: false,
      studentId: '',
      studentName: ''
    })
  }

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      studentId: '',
      studentName: ''
    })
  }
  // Build columns based on user role
  const buildColumns = (userProfile: any) => {
    const baseColumns = [
      { key: 'name', label: 'Nama', widthMobile: '200px', align: 'left' as const },
      { key: 'gender', label: 'Jenis Kelamin', align: 'center' as const },
    ];
    
    const orgColumns = [];
    
    // Only show org columns for admin users
    if (isAdminLegacy(userProfile?.role)) {
      // Superadmin sees all
      if (userProfile?.role === 'superadmin') {
        orgColumns.push(
          { key: 'daerah_name', label: 'Daerah', align: 'center' as const },
          { key: 'desa_name', label: 'Desa', align: 'center' as const },
          { key: 'kelompok_name', label: 'Kelompok', align: 'center' as const },
          { key: 'class_name', label: 'Kelas', align: 'center' as const }
        );
      }
      // Admin Daerah
      else if (isAdminDaerah(userProfile)) {
        orgColumns.push(
          { key: 'desa_name', label: 'Desa', align: 'center' as const },
          { key: 'kelompok_name', label: 'Kelompok', align: 'center' as const },
          { key: 'class_name', label: 'Kelas', align: 'center' as const }
        );
      }
      // Admin Desa
      else if (isAdminDesa(userProfile)) {
        orgColumns.push(
          { key: 'kelompok_name', label: 'Kelompok', align: 'center' as const },
          { key: 'class_name', label: 'Kelas', align: 'center' as const }
        );
      }
      // Admin Kelompok - only Kelas
      else if (isAdminKelompok(userProfile)) {
        orgColumns.push(
          { key: 'class_name', label: 'Kelas', align: 'center' as const }
        );
      }
    }
    
    // Teacher with multiple classes: show class_name column
    if (userProfile?.role === 'teacher' && userProfile.classes && userProfile.classes.length > 1) {
      orgColumns.push(
        { key: 'class_name', label: 'Kelas', align: 'center' as const }
      );
    }
    
    return [
      ...baseColumns,
      ...orgColumns,
      { key: 'actions', label: 'Aksi', align: 'center' as const, width: '24' }
    ];
  };

  const columns = buildColumns(userProfile);

  const tableData = students
    .sort((a, b) => a.name.localeCompare(b.name)) // Sort by name
    .map((student) => ({
      id: student.id,
      name: student.name,
      gender: student.gender || '-',
      class_name: student.class_name || '-',
      daerah_name: student.daerah_name || '-',
      desa_name: student.desa_name || '-',
      kelompok_name: student.kelompok_name || '-',
      actions: student.id, // We'll use this in renderCell
    }))

  const renderCell = (column: any, item: any, index: number) => {
    if (column.key === 'actions') {
      const student = students.find(s => s.id === item.actions)!;
      
      return (
        <div className="flex gap-4 justify-center items-center">
          {/* View Action - Link to student detail */}
          <Link 
            href={`/users/siswa/${student.id}`}
            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors"
            title="Lihat Detail"
            onClick={() => handleStudentClick(student.id, 'actions')}
          >
            <ReportIcon className="w-6 h-6" />
          </Link>
          
          {/* Edit Action */}
          <button
            onClick={() => onEdit(student)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          
          {/* Delete Action - only for admin */}
          {(userRole === 'admin' || userRole === 'superadmin') && (
            <button
              onClick={() => handleDeleteClick(item.actions, student?.name || '')}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Hapus"
            >
              <TrashBinIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      );
    }
    
    // Handle name column - make it clickable
    if (column.key === 'name') {
      const student = students.find(s => s.id === item.actions)!
      return (
        <Link 
          href={`/users/siswa/${student.id}`}
          className="hover:text-blue-600 hover:underline"
          onClick={() => handleStudentClick(student.id, 'name')}
        >
          {item.name}
        </Link>
      )
    }
    
    // Handle organizational columns
    if (['daerah_name', 'desa_name', 'kelompok_name', 'class_name'].includes(column.key)) {
      return item[column.key] || '-';
    }
    
    return item[column.key] || '-'
  }

  return (
    <>
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

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Hapus Siswa"
        message={`Apakah Anda yakin ingin menghapus siswa <br> "${deleteModal.studentName}"?`}
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
      />
    </>
  )
}
