"use client";

import { useClassMastersPage } from '../hooks/useClassMastersPage';
import { deleteClassMaster } from '../actions/masters';
import { isSuperAdmin } from '@/lib/userUtils';
import Button from '@/components/ui/button/Button';
import { PencilIcon, TrashBinIcon } from '@/lib/icons';
import ClassMasterModal from './ClassMasterModal';
import KelasSkeleton from '@/components/ui/skeleton/KelasSkeleton';
import DataTable from '@/components/table/Table';
import TableActions from '@/components/table/TableActions';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import { toast } from 'sonner';

export default function ClassMastersTab() {
  const {
    masters,
    isLoading,
    mutate,
    userProfile,
    isModalOpen,
    editingMaster,
    deleteConfirm,
    openCreateModal,
    openEditModal,
    closeModal,
    openDeleteConfirm,
    closeDeleteConfirm
  } = useClassMastersPage();


  const confirmDelete = async () => {
    if (!deleteConfirm.master) return;

    try {
      await deleteClassMaster(deleteConfirm.master.id);
      await mutate(); // Refresh data using SWR mutate
      closeDeleteConfirm();
      toast.success('Master kelas berhasil dihapus');
    } catch (error) {
      console.error('Error deleting master:', error);
      toast.error('Gagal menghapus master kelas');
    }
  };

  const handleModalClose = () => {
    closeModal();
    mutate(); // Refresh data after modal operations
  };

  if (isLoading) {
    return <KelasSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Master Kelas
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Kelola kelas yang tersedia
          </p>
        </div>
      </div>

      {/* Masters Table */}
      <DataTable
        columns={[
          { key: 'sort_order', label: 'No.', align: 'center' },
          { key: 'name', label: 'Nama Kelas', sortable: true },
          { key: 'description', label: 'Deskripsi' },
          { key: 'actions', label: 'Aksi', width: '120px', align: 'center' as const }
        ]}
        data={masters}
        renderCell={(column, master) => {
          switch (column.key) {
            case 'sort_order':
              return (
                <span className="text-sm text-gray-900 dark:text-white">
                  {master.sort_order}
                </span>
              );
            case 'name':
              return (
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {master.name}
                </div>
              );
            case 'description':
              return (
                <div className="text-sm text-gray-900 dark:text-white">
                  {master.description || '-'}
                </div>
              );
            case 'actions':
              return (
                <TableActions
                  actions={[
                    {
                      id: 'edit',
                      icon: PencilIcon,
                      onClick: () => openEditModal(master),
                      title: 'Edit',
                      color: 'blue'
                    },
                    {
                      id: 'delete',
                      icon: TrashBinIcon,
                      onClick: () => openDeleteConfirm(master),
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
        searchPlaceholder="Cari Master Kelas..."
        defaultItemsPerPage={10}
      />

      {/* Modal */}
      {isModalOpen && (
        <ClassMasterModal
          master={editingMaster}
          onClose={handleModalClose}
          onSuccess={mutate}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        title="Hapus Master Kelas"
        message={`Apakah Anda yakin ingin menghapus template "${deleteConfirm.master?.name}"?`}
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
        isLoading={false}
      />
    </div>
  );
}
