"use client";

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/stores/userProfileStore';
import { getAllClassesByKelompok, deleteClass } from '../actions/classes';
import { ClassWithMaster } from '../actions/classes';
import { isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils';
import { useDaerah } from '@/hooks/useDaerah';
import { useDesa } from '@/hooks/useDesa';
import { useKelompok } from '@/hooks/useKelompok';
import Button from '@/components/ui/button/Button';
import { PencilIcon, TrashBinIcon, UsersIcon } from '@/lib/icons';
import ClassModal from './ClassModal';
import KelasTableSkeleton from '@/components/ui/skeleton/KelasTableSkeleton';
import DataTable from '@/components/table/Table';
import TableActions from '@/components/table/TableActions';
import DataFilter from '@/components/shared/DataFilter';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';

export default function ClassesKelompokTab() {
  const { profile: userProfile } = useUserProfile();
  const [classes, setClasses] = useState<ClassWithMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassWithMaster | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add filter state
  const [filters, setFilters] = useState({
    daerah: '',
    desa: '',
    kelompok: '',
    kelas: ''
  });

  // Fetch organisasi data
  const { daerah: daerahList } = useDaerah();
  const { desa: desaList } = useDesa();
  const { kelompok: kelompokList } = useKelompok();

  const canManage = userProfile ? (
    isSuperAdmin(userProfile) || 
    isAdminDaerah(userProfile) || 
    isAdminDesa(userProfile) || 
    isAdminKelompok(userProfile)
  ) : false;

  useEffect(() => {
    loadClasses();
  }, [filters]); // Re-load when filters change

  const loadClasses = async () => {
    try {
      setLoading(true);
      const data = await getAllClassesByKelompok();
      
      // Apply client-side filtering based on selected organisasi
      const filtered = data.filter(classItem => {
        if (filters.kelompok && classItem.kelompok_id !== filters.kelompok) return false;
        if (filters.desa && classItem.kelompok?.desa_id !== filters.desa) return false;
        if (filters.daerah && classItem.kelompok?.desa?.daerah_id !== filters.daerah) return false;
        return true;
      });
      
      setClasses(filtered);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingClass(null);
    setShowModal(true);
  };

  const handleEdit = (classItem: ClassWithMaster) => {
    setEditingClass(classItem);
    setShowModal(true);
  };

  const handleDelete = (classItem: ClassWithMaster) => {
    setClassToDelete(classItem);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!classToDelete) return;

    try {
      setDeleting(true);
      await deleteClass(classToDelete.id);
      await loadClasses();
      setShowDeleteModal(false);
      setClassToDelete(null);
    } catch (error) {
      console.error('Error deleting class:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setClassToDelete(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingClass(null);
    loadClasses();
  };

  if (loading) {
    return <KelasTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Kelas Kelompok
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Kelola implementasi kelas per kelompok
          </p>
        </div>
        {canManage && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            Tambah Kelas
          </Button>
        )}
      </div>

      {/* Data Filter - hidden for Admin Kelompok */}
      {userProfile && !isAdminKelompok(userProfile) && (
        <DataFilter
          filters={filters}
          onFilterChange={setFilters}
          userProfile={userProfile}
          daerahList={daerahList || []}
          desaList={desaList || []}
          kelompokList={kelompokList || []}
          classList={[]}
          showKelas={false}
        />
      )}

      {/* Classes Table */}
      <DataTable
        columns={[
          { key: 'name', label: 'Nama Kelas', sortable: true },
          { key: 'kelompok_name', label: 'Kelompok', sortable: true },
          { key: 'combined_classes', label: 'Gabungan Kelas', sortable: true },
          ...(canManage ? [{ key: 'actions', label: 'Aksi', width: '100px', align: 'center' as const }] : [])
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
                  <UsersIcon className="w-5 h-5 text-gray-400 mr-3" />
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
                      onClick: () => handleEdit(classItem),
                      title: 'Edit',
                      color: 'blue'
                    },
                    {
                      id: 'delete',
                      icon: TrashBinIcon,
                      onClick: () => handleDelete(classItem),
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
      {showModal && (
        <ClassModal
          classItem={editingClass}
          onClose={handleModalClose}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Hapus Kelas"
        message={`Apakah Anda yakin ingin menghapus kelas "${classToDelete?.name}"?`}
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
        isLoading={deleting}
      />
    </div>
  );
}
