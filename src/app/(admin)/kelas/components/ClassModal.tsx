"use client";

import { useState, useEffect } from 'react';
import { ClassWithMaster, createClassFromMaster, createCustomClass, updateClass } from '../actions/classes';
import { getAllClassMasters } from '../actions/masters';
import { ClassMaster } from '../actions/masters';
import { useUserProfile } from '@/stores/userProfileStore';
import { useDaerah } from '@/hooks/useDaerah';
import { useDesa } from '@/hooks/useDesa';
import { useKelompok } from '@/hooks/useKelompok';
import { isAdminKelompok } from '@/lib/userUtils';
import Modal from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import DataFilter from '@/components/shared/DataFilter';
import Button from '@/components/ui/button/Button';

interface ClassModalProps {
  classItem: ClassWithMaster | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ClassModal({ classItem, onClose, onSuccess }: ClassModalProps) {
  const { profile: userProfile } = useUserProfile();
  const [formData, setFormData] = useState({
    name: '',
    kelompok_id: '',
    masterIds: [] as string[]
  });
  const [masters, setMasters] = useState<ClassMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Filter state
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

  const isEditing = !!classItem;

  useEffect(() => {
    loadMasters();
    if (classItem) {
      // Pre-fill filters when editing
      setFilters({
        daerah: classItem.kelompok?.desa?.daerah_id || '',
        desa: classItem.kelompok?.desa_id || '',
        kelompok: classItem.kelompok_id,
        kelas: ''
      });
      
      setFormData({
        name: classItem.name,
        kelompok_id: classItem.kelompok_id,
        masterIds: classItem.class_master_mappings?.map(mapping => mapping.class_master.id) || []
      });
    } else if (userProfile && isAdminKelompok(userProfile)) {
      // Auto-fill kelompok_id for Admin Kelompok when creating new class
      setFormData(prev => ({
        ...prev,
        kelompok_id: userProfile.kelompok_id || ''
      }));
    }
  }, [classItem, userProfile]);

  // Update kelompok_id when filter changes
  useEffect(() => {
    if (filters.kelompok) {
      handleChange('kelompok_id', filters.kelompok);
    }
  }, [filters.kelompok]);

  const loadMasters = async () => {
    try {
      const data = await getAllClassMasters();
      setMasters(data);
    } catch (error) {
      console.error('Error loading masters:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});


    // Validate required fields
    if (!formData.name.trim()) {
      setErrors({ name: 'Nama kelas harus diisi' });
      setLoading(false);
      return;
    }

    if (!isEditing && !formData.kelompok_id) {
      setErrors({ kelompok_id: 'Kelompok harus dipilih' });
      setLoading(false);
      return;
    }

    try {
      if (isEditing) {
        await updateClass(classItem!.id, { 
          name: formData.name,
          masterIds: formData.masterIds
        });
      } else {
        // Always use createClassFromMaster, allowing empty array for no templates
        await createClassFromMaster(
          formData.kelompok_id,
          formData.masterIds,
          formData.name
        );
      }
      onSuccess?.(); // Call onSuccess callback to refresh data
      onClose();
    } catch (error: any) {
      if (error.message) {
        setErrors({ general: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Edit Kelas' : 'Tambah Kelas'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.general}
          </div>
        )}

        {/* DataFilter - hidden for Admin Kelompok, show readonly text when editing */}
        {userProfile && !isAdminKelompok(userProfile) && (
          <>
            {isEditing ? (
              <div>
                <Label>Kelompok</Label>
                <InputField
                  id="kelompok_readonly"
                  type="text"
                  value={classItem?.kelompok?.name || ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-700"
                />
              </div>
            ) : (
              <DataFilter
                filters={filters}
                onFilterChange={setFilters}
                userProfile={userProfile}
                daerahList={daerahList || []}
                desaList={desaList || []}
                kelompokList={kelompokList || []}
                classList={[]}
                showKelas={false}
                variant="modal"
                hideAllOption={true}
                requiredFields={{ kelompok: true }}
                errors={{ kelompok: errors.kelompok_id }}
              />
            )}
          </>
        )}

        {/* Show kelompok info for Admin Kelompok */}
        {userProfile && isAdminKelompok(userProfile) && !isEditing && (
          <div>
            <Label>Kelompok</Label>
            <InputField
              id="kelompok_info"
              type="text"
              value={userProfile.kelompok?.name || 'Kelompok Anda'}
              disabled
              className="bg-gray-100 dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Kelas akan dibuat untuk kelompok ini
            </p>
          </div>
        )}

        {/* Always show template selection */}
        <div>
          <Label>Master Kelas</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded p-3">
            {masters.map(master => (
              <label key={master.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.masterIds.includes(master.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleChange('masterIds', [...formData.masterIds, master.id]);
                    } else {
                      handleChange('masterIds', formData.masterIds.filter(id => id !== master.id));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {master.name}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Pilih satu atau lebih template, atau biarkan kosong untuk kelas custom
          </p>
        </div>

        <div>
          <Label htmlFor="name">Nama Kelas *</Label>
          <InputField
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Masukkan nama kelas"
            required
            error={!!errors.name}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.name}
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : (isEditing ? 'Update' : 'Simpan')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
