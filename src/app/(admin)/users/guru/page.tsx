"use client";

import { useGuruPage } from './hooks/useGuruPage';
import GuruTable from './components/GuruTable';
import GuruModal from './components/GuruModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import SettingsModal from './components/SettingsModal';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import DataFilter from '@/components/shared/DataFilter';
import SuperadminTableSkeleton from '@/components/ui/skeleton/SuperadminTableSkeleton';
import Button from '@/components/ui/button/Button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BulkPermissionsModal from './components/BulkPermissionsModal';

export default function GuruManagementPage() {
  const router = useRouter();
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
    formSettingsModal,
    filters,
    openCreateModal,
    openEditModal,
    closeModal,
    openResetPasswordModal,
    closeResetPasswordModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    openFormSettingsModal,
    closeFormSettingsModal,
    handleDelete,
    handleOrganisasiFilterChange,
    mutate,
    selectedTeacherIds,
    setSelectedTeacherIds,
    clearSelection
  } = useGuruPage();
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.role === 'teacher') {
      router.push('/home');
    }
  }, [userProfile, router]);

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
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
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
          cascadeFilters={false}
        />

        {/* Table */}
        <GuruTable
          data={teachers}
          onEdit={openEditModal}
          onResetPassword={openResetPasswordModal}
          onDelete={openDeleteConfirm}
          onConfigureForm={openFormSettingsModal}
          userProfile={userProfile}
          selectable={true}
          selectedIds={selectedTeacherIds as Set<string | number>}
          onSelectionChange={(ids) => setSelectedTeacherIds(ids as Set<string>)}
          renderBulkActions={(ids, clear) => (
            <div className="flex items-center gap-3 px-4 py-2 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700 rounded-lg">
              <span className="text-sm text-brand-700 dark:text-brand-300 font-medium">
                {ids.size} guru dipilih
              </span>
              <Button size="sm" onClick={() => setBulkModalOpen(true)}>
                Atur Permission
              </Button>
              <button
                type="button"
                onClick={clear}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Batal
              </button>
            </div>
          )}
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
          message={(() => {
            const { guru, impact, isLoadingImpact } = deleteConfirm
            const baseName = `Apakah Anda yakin ingin menghapus guru <br> <strong>"${guru?.full_name || guru?.username}"</strong>?`

            if (isLoadingImpact) {
              return `${baseName}<br/><br/><span class="text-gray-400 text-xs">Mengecek dampak penghapusan...</span>`
            }

            if (!impact) return baseName

            const warnings: string[] = []
            if (impact.classes_count > 0)
              warnings.push(`${impact.classes_count} kelas akan kehilangan guru`)
            if (impact.meetings_count > 0)
              warnings.push(`${impact.meetings_count} pertemuan akan kehilangan referensi guru`)
            if (impact.material_progress_count > 0)
              warnings.push(`${impact.material_progress_count} catatan progress materi akan kehilangan referensi guru`)
            if (impact.student_reports_count > 0)
              warnings.push(`${impact.student_reports_count} laporan siswa akan kehilangan referensi guru`)

            if (warnings.length === 0) return baseName

            const warningHtml = warnings.map(w => `• ${w}`).join('<br/>')
            return `${baseName}<br/><br/><span class="text-amber-600 dark:text-amber-400 font-medium">⚠️ Dampak penghapusan:</span><br/><span class="text-gray-600 dark:text-gray-400">${warningHtml}</span>`
          })()}
          confirmText="Hapus"
          cancelText="Batal"
          isDestructive={true}
          isLoading={false}
        />

        <SettingsModal
          isOpen={formSettingsModal.isOpen}
          onClose={closeFormSettingsModal}
          userId={formSettingsModal.guru?.id || ''}
          userName={formSettingsModal.guru?.full_name || ''}
          currentPermissions={formSettingsModal.guru?.permissions}
          onSuccess={() => {
            mutate();
          }}
        />

        <BulkPermissionsModal
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          teacherIds={[...selectedTeacherIds]}
          onSuccess={() => {
            mutate();
            clearSelection();
          }}
        />

      </div>
    </div>
  );
}
