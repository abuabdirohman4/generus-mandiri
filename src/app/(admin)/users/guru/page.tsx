"use client";

import { useState } from 'react';
import { useTeachers } from '@/hooks/useTeachers';
import { useDaerah } from '@/hooks/useDaerah';
import { useDesa } from '@/hooks/useDesa';
import { useKelompok } from '@/hooks/useKelompok';
import GuruTable from './components/GuruTable';
import GuruModal from './components/GuruModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import InputFilter from '@/components/form/input/InputFilter';
import SuperadminTableSkeleton from '@/components/ui/skeleton/SuperadminTableSkeleton';
import Button from '@/components/ui/button/Button';

export default function GuruManagementPage() {
  const { teachers, isLoading, error, mutate } = useTeachers();
  const { daerah } = useDaerah();
  const { desa } = useDesa();
  const { kelompok } = useKelompok();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean; teacher: any }>({
    isOpen: false,
    teacher: null
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; teacher: any }>({
    isOpen: false,
    teacher: null
  });
  const [filters, setFilters] = useState({
    daerah: '',
    desa: '',
    kelompok: '',
    search: ''
  });

  const handleCreate = () => {
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const handleEdit = (teacher: any) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleResetPassword = (teacher: any) => {
    setResetPasswordModal({ isOpen: true, teacher });
  };

  const handleDelete = (teacher: any) => {
    setDeleteConfirm({ isOpen: true, teacher });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  const handleResetPasswordClose = () => {
    setResetPasswordModal({ isOpen: false, teacher: null });
  };

  const handleDeleteClose = () => {
    setDeleteConfirm({ isOpen: false, teacher: null });
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  // Filter teachers based on selected filters
  const filteredTeachers = teachers?.filter(teacher => {
    if (filters.daerah && teacher.daerah_id !== filters.daerah) return false;
    if (filters.desa && teacher.desa_id !== filters.desa) return false;
    if (filters.kelompok && teacher.kelompok_id !== filters.kelompok) return false;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        teacher.username?.toLowerCase().includes(searchTerm) ||
        teacher.full_name?.toLowerCase().includes(searchTerm) ||
        teacher.email?.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  }) || [];

  if (isLoading) {
    return <SuperadminTableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold">Error loading guru</div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Guru
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Kelola data guru dalam sistem
              </p>
            </div>
            <Button
              onClick={handleCreate}
              className="px-4 py-2"
            >
              Tambah
            </Button>
          </div>
        </div>

        {/* Filter */}
        <InputFilter
          id="daerah-filter"
          label="Filter Daerah"
          value={filters.daerah}
          onChange={(daerahId) => handleFilterChange({ ...filters, daerah: daerahId, desa: '', kelompok: '' })}
          options={daerah?.map(d => ({ value: d.id, label: d.name })) || []}
          allOptionLabel="Semua Daerah"
        />

        {/* Table */}
        <GuruTable
          data={filteredTeachers}
          onEdit={handleEdit}
          onResetPassword={handleResetPassword}
          onDelete={handleDelete}
        />

        {/* Modals */}
        <GuruModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          guru={editingTeacher}
          daerah={daerah || []}
          desa={desa || []}
          kelompok={kelompok || []}
          onSuccess={() => {
            mutate();
            handleModalClose();
          }}
        />

        <ResetPasswordModal
          isOpen={resetPasswordModal.isOpen}
          onClose={handleResetPasswordClose}
          guru={resetPasswordModal.teacher}
          onSuccess={() => {
            handleResetPasswordClose();
          }}
        />

        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={handleDeleteClose}
          onConfirm={async () => {
            // Handle delete logic here
            mutate();
            handleDeleteClose();
          }}
          title="Hapus Guru?"
          message={`Apakah Anda yakin ingin menghapus guru "${deleteConfirm.teacher?.username}"?`}
          confirmText="Hapus"
          cancelText="Batal"
          isDestructive={true}
          isLoading={false}
        />
      </div>
    </div>
  );
}
