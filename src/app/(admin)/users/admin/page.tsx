"use client";

import { useState } from 'react';
import { useAdmins } from '@/hooks/useAdmins';
import { useDaerah } from '@/hooks/useDaerah';
import { useDesa } from '@/hooks/useDesa';
import { useKelompok } from '@/hooks/useKelompok';
import AdminTable from './components/AdminTable';
import AdminModal from './components/AdminModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import InputFilter from '@/components/form/input/InputFilter';
import SuperadminTableSkeleton from '@/components/ui/skeleton/SuperadminTableSkeleton';
import Button from '@/components/ui/button/Button';

export default function AdminManagementPage() {
  const { admins, isLoading, error, mutate } = useAdmins();
  const { daerah } = useDaerah();
  const { desa } = useDesa();
  const { kelompok } = useKelompok();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean; admin: any }>({
    isOpen: false,
    admin: null
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; admin: any }>({
    isOpen: false,
    admin: null
  });
  const [filters, setFilters] = useState({
    daerah: '',
    desa: '',
    kelompok: '',
    search: ''
  });

  const handleCreate = () => {
    setEditingAdmin(null);
    setIsModalOpen(true);
  };

  const handleEdit = (admin: any) => {
    setEditingAdmin(admin);
    setIsModalOpen(true);
  };

  const handleResetPassword = (admin: any) => {
    setResetPasswordModal({ isOpen: true, admin });
  };

  const handleDelete = (admin: any) => {
    setDeleteConfirm({ isOpen: true, admin });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAdmin(null);
  };

  const handleResetPasswordClose = () => {
    setResetPasswordModal({ isOpen: false, admin: null });
  };

  const handleDeleteClose = () => {
    setDeleteConfirm({ isOpen: false, admin: null });
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  // Filter admins based on selected filters
  const filteredAdmins = admins?.filter(admin => {
    if (filters.daerah && admin.daerah_id !== filters.daerah) return false;
    if (filters.desa && admin.desa_id !== filters.desa) return false;
    if (filters.kelompok && admin.kelompok_id !== filters.kelompok) return false;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        admin.username?.toLowerCase().includes(searchTerm) ||
        admin.full_name?.toLowerCase().includes(searchTerm) ||
        admin.email?.toLowerCase().includes(searchTerm)
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
          <div className="text-red-500 text-lg font-semibold">Error loading admin</div>
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
                Admin
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Kelola data admin dalam sistem
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
        <AdminTable
          data={filteredAdmins}
          onEdit={handleEdit}
          onResetPassword={handleResetPassword}
          onDelete={handleDelete}
        />

        {/* Modals */}
        <AdminModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          admin={editingAdmin}
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
          admin={resetPasswordModal.admin}
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
          title="Hapus Admin?"
          message={`Apakah Anda yakin ingin menghapus admin "${deleteConfirm.admin?.username}"?`}
          confirmText="Hapus"
          cancelText="Batal"
          isDestructive={true}
          isLoading={false}
        />
      </div>
    </div>
  );
}
