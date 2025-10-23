"use client";

import { useKelasPage } from '../hooks/useKelasPage';
import { deleteClass } from '../actions/classes';
import { isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils';
import Button from '@/components/ui/button/Button';
import { PencilIcon, TrashBinIcon } from '@/lib/icons';
import ClassModal from './ClassModal';
import KelasTableSkeleton from '@/components/ui/skeleton/KelasTableSkeleton';
import DataTable from '@/components/table/Table';
import TableActions from '@/components/table/TableActions';
import DataFilter from '@/components/shared/DataFilter';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import { toast } from 'sonner';

export default function ClassesKelompokTab() {
  const {
    classes,
    isLoading,
    mutate,
    userProfile,
    daerah,
    desa,
    kelompok,
    isModalOpen,
    editingClass,
    deleteConfirm,
    filters,
    openCreateModal,
    openEditModal,
    closeModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    setFilters
  } = useKelasPage();


  const confirmDelete = async () => {
    if (!deleteConfirm.classItem) return;

    try {
      await deleteClass(deleteConfirm.classItem.id);
      await mutate(); // Refresh data using SWR mutate
      closeDeleteConfirm();
      toast.success('Kelas berhasil dihapus');
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Gagal menghapus kelas');
    }
  };

  const handleModalClose = () => {
    closeModal();
    mutate(); // Refresh data after modal operations
  };

  if (isLoading) {
    return <KelasTableSkeleton />;
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Kelas Kelompok
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Kelola implementasi kelas per kelompok
          </p>
        </div>
      </div>

      {/* Data Filter - hidden for Admin Kelompok */}
      {userProfile && !isAdminKelompok(userProfile) && (
        <DataFilter
          filters={filters}
          onFilterChange={setFilters}
          userProfile={userProfile}
          daerahList={daerah || []}
          desaList={desa || []}
          kelompokList={kelompok || []}
          classList={[]}
          showKelas={false}
        />
      )}

      {/* Classes Table */}
      <DataTable
        columns={[
          { key: 'name', label: 'Nama Kelas', sortable: true },
          { key: 'kelompok_name', label: 'Kelompok', sortable: true },
          { key: 'combined_classes', label: 'Gabungan Kelas', widthMobile: '150px', sortable: true },
          { key: 'actions', label: 'Aksi', width: '100px', align: 'center' as const }
        ]}
            data={classes.map(classItem => ({
              ...classItem,
              kelompok_name: classItem.kelompok?.name || '-',
              combined_classes: classItem.class_master_mappings?.length 
                ? classItem.class_master_mappings.map(mapping => mapping.class_master.name).join(', ')
                : '-'
            }))}
        renderCell={(column, classItem) => {
          switch (column.key) {
            case 'name':
              return (
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {classItem.name}
                  </div>
                </div>
              );
            case 'kelompok_name':
              return (
                <div className="text-sm text-gray-900 dark:text-white">
                  {classItem.kelompok_name}
                </div>
              );
            case 'combined_classes':
              return (
                <div className="text-sm text-gray-900 dark:text-white">
                  {classItem.combined_classes}
                </div>
              );
            case 'actions':
              return (
                <TableActions
                  actions={[
                    {
                      id: 'edit',
                      icon: PencilIcon,
                      onClick: () => openEditModal(classItem),
                      title: 'Edit',
                      color: 'blue'
                    },
                    {
                      id: 'delete',
                      icon: TrashBinIcon,
                      onClick: () => openDeleteConfirm(classItem),
                      title: 'Hapus',
                      color: 'red'
                    }
                  ]}
                />
              );
            default:
              return null;
          }
        }}
        searchPlaceholder="Cari kelas..."
        defaultItemsPerPage={10}
      />

      {/* Modal */}
      {isModalOpen && (
        <ClassModal
          classItem={editingClass}
          onClose={handleModalClose}
          onSuccess={mutate}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        title="Hapus Kelas"
        message={`Apakah Anda yakin ingin menghapus kelas "${deleteConfirm.classItem?.name}"?`}
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
        isLoading={false}
      />
    </>
  );
}
