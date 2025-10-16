"use client";

import { useGuruPage } from './hooks/useGuruPage';
import GuruTable from './components/GuruTable';
import GuruModal from './components/GuruModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import DataFilter from '@/components/shared/DataFilter';
import SuperadminTableSkeleton from '@/components/ui/skeleton/SuperadminTableSkeleton';
import Button from '@/components/ui/button/Button';

export default function GuruManagementPage() {
  const {
    teachers,
    daerah,
    desa,
    kelompok,
    userProfile,
    isLoading,
    error,
    isModalOpen,
    editingGuru,
    resetPasswordModal,
    deleteConfirm,
    filters,
    openCreateModal,
    openEditModal,
    closeModal,
    openResetPasswordModal,
    closeResetPasswordModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    handleOrganisasiFilterChange,
    mutate
  } = useGuruPage();

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
              onClick={openCreateModal}
              className="px-4 py-2"
            >
              Tambah
            </Button>
          </div>
        </div>

        {/* Filter */}
        <DataFilter
          filters={{
            daerah: filters.daerah,
            desa: filters.desa,
            kelompok: filters.kelompok,
            kelas: filters.kelas
          }}
          onFilterChange={handleOrganisasiFilterChange}
          userProfile={userProfile}
          daerahList={daerah || []}
          desaList={desa || []}
          kelompokList={kelompok || []}
          classList={[]}
          showKelas={false}
        />

        {/* Table */}
        <GuruTable
          data={teachers}
          onEdit={openEditModal}
          onResetPassword={openResetPasswordModal}
          onDelete={openDeleteConfirm}
        />

        {/* Modals */}
        <GuruModal
          isOpen={isModalOpen}
          onClose={closeModal}
          guru={editingGuru}
          daerah={daerah || []}
          desa={desa || []}
          kelompok={kelompok || []}
          onSuccess={() => {
            mutate();
            closeModal();
          }}
        />

        <ResetPasswordModal
          isOpen={resetPasswordModal.isOpen}
          onClose={closeResetPasswordModal}
          guru={resetPasswordModal.guru}
          onSuccess={() => {
            closeResetPasswordModal();
          }}
        />

        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={closeDeleteConfirm}
          onConfirm={handleDelete}
          title="Hapus Guru?"
          message={`Apakah Anda yakin ingin menghapus guru "${deleteConfirm.guru?.username}"?`}
          confirmText="Hapus"
          cancelText="Batal"
          isDestructive={true}
          isLoading={false}
        />
      </div>
    </div>
  );
}
