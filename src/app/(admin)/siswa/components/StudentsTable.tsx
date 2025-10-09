'use client'

import { useState } from 'react'
import DataTable from '@/components/table/Table'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'
import { PencilIcon, TrashBinIcon } from '@/lib/icons'

interface Student {
  id: string
  name: string
  gender: string | null
  class_id: string
  created_at: string
  updated_at: string
  classes: {
    id: string
    name: string
  } | null
}

interface StudentsTableProps {
  students: Student[]
  userRole: string | null
  onEdit: (student: Student) => void
  onDelete: (studentId: string) => void
  userProfile: { role: string; class_id: string | null; class_name: string | null } | null | undefined
}

export default function StudentsTable({ 
  students, 
  userRole, 
  onEdit, 
  onDelete, 
  userProfile 
}: StudentsTableProps) {
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    studentId: string
    studentName: string
  }>({
    isOpen: false,
    studentId: '',
    studentName: ''
  })

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
  // Conditional columns based on user role
  const baseColumns = [
    {
      key: 'name',
      label: 'Nama',
      align: 'left' as const,
    },
    {
      key: 'gender',
      label: 'Jenis Kelamin',
      align: 'center' as const,
    },
  ]

  const classColumn = {
    key: 'class_name',
    label: 'Kelas',
    align: 'center' as const,
  }

  const actionsColumn = {
    key: 'actions',
    label: 'Aksi',
    align: 'center' as const,
    width: '24',
  }

  const columns = userProfile?.role === 'admin' 
    ? [...baseColumns, classColumn, actionsColumn]
    : [...baseColumns, actionsColumn]

  const tableData = students
    .sort((a, b) => a.name.localeCompare(b.name)) // Sort by name
    .map((student) => ({
      name: student.name,
      gender: student.gender || '-',
      class_name: student.classes?.name || '-',
      actions: student.id, // We'll use this in renderCell
    }))

  const renderCell = (column: any, item: any, index: number) => {
    if (column.key === 'actions') {
      return (
        <div className="flex gap-4 justify-center items-center">
          <button
            onClick={() => onEdit(students.find(s => s.id === item.actions)!)}
            className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => handleDeleteClick(item.actions, students.find(s => s.id === item.actions)?.name || '')}
              className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              title="Hapus"
            >
              <TrashBinIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      )
    }
    return item[column.key] || '-'
  }

  return (
    <>
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

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Hapus Siswa"
        message={`Apakah Anda yakin ingin menghapus siswa "${deleteModal.studentName}"?`}
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
      />
    </>
  )
}
