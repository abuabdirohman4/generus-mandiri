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

export default function ClassesKelompokTab() {
  const { profile: userProfile } = useUserProfile();
  const [classes, setClasses] = useState<ClassWithMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithMaster | null>(null);

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

  const handleDelete = async (classItem: ClassWithMaster) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kelas "${classItem.name}"?`)) {
      return;
    }

    try {
      await deleteClass(classItem.id);
      await loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
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
          // { key: 'is_active', label: 'Status', width: '120px', align: 'center' },
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
            // case 'is_active':
            //   return (
            //     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            //       classItem.is_active 
            //         ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            //         : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            //     }`}>
            //       {classItem.is_active ? 'Aktif' : 'Tidak Aktif'}
            //     </span>
            //   );
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
    </div>
  );
}
