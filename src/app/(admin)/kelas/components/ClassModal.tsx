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
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox';

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
  const [mastersLoading, setMastersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Filter state
  const [filters, setFilters] = useState({
    daerah: [] as string[],
    desa: [] as string[],
    kelompok: [] as string[],
    kelas: [] as string[]
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
        daerah: classItem.kelompok?.desa?.daerah_id ? [classItem.kelompok.desa.daerah_id] : [],
        desa: classItem.kelompok?.desa_id ? [classItem.kelompok.desa_id] : [],
        kelompok: classItem.kelompok_id ? [classItem.kelompok_id] : [],
        kelas: []
      });
      
      setFormData({
        name: classItem.name,
        kelompok_id: classItem.kelompok_id,
        masterIds: classItem.class_master_mappings?.map(mapping => mapping.class_master.id) || []
      });
    } else if (userProfile && isAdminKelompok(userProfile)) {
      // Auto-fill kelompok_id for Admin Kelompok when creating new class
      const kelompokId = userProfile.kelompok_id || '';
      
      // Set filters juga agar dropdown dan formData sync
      setFilters(prev => ({
        ...prev,
        kelompok: kelompokId ? [kelompokId] : []
      }));
      
      setFormData(prev => ({
        ...prev,
        kelompok_id: kelompokId
      }));
    }
  }, [classItem, userProfile]);

  // Auto-select kelompok if only one is available
  useEffect(() => {
    if (!isEditing && !classItem && userProfile && kelompokList) {
      let availableKelompok = kelompokList;
      
      if (userProfile.desa_id) {
        // Admin Desa: only show kelompok from their desa
        availableKelompok = kelompokList.filter((k: any) => k.desa_id === userProfile.desa_id);
      } else if (userProfile.daerah_id) {
        // Admin Daerah: filter by selected desa (if any)
        if (filters.desa.length > 0) {
          availableKelompok = kelompokList.filter((k: any) => filters.desa.includes(k.desa_id));
        } else {
          // No desa selected yet, don't auto-select kelompok
          availableKelompok = [];
        }
      } else {
        // Superadmin: filter by selected desa (if any)
        if (filters.desa.length > 0) {
          availableKelompok = kelompokList.filter((k: any) => filters.desa.includes(k.desa_id));
        } else {
          // No desa selected yet, don't auto-select kelompok
          availableKelompok = [];
        }
      }
      
      // Auto-select if only 1 kelompok available AND not already selected
      if (availableKelompok.length === 1 && filters.kelompok.length === 0) {
        setFilters(prev => ({
          ...prev,
          kelompok: [availableKelompok[0].id]
        }));
      }
    }
  }, [isEditing, classItem, userProfile, kelompokList, filters.desa, filters.kelompok.length]);

  // Update kelompok_id when filter changes
  useEffect(() => {
    if (filters.kelompok && filters.kelompok.length > 0) {
      setFormData(prev => ({ ...prev, kelompok_id: filters.kelompok[0] }));
      // Clear error jika ada
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.kelompok_id;
        return newErrors;
      });
    }
  }, [filters.kelompok]);

  const loadMasters = async () => {
    setMastersLoading(true);
    try {
      const data = await getAllClassMasters();
      setMasters(data);
    } catch (error) {
      console.error('Error loading masters:', error);
    } finally {
      setMastersLoading(false);
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

    if (!isEditing && formData.masterIds.length === 0) {
      setErrors({ masterIds: 'Pilih minimal satu master kelas' });
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

        <div>
          <Label htmlFor="name">Nama Kelas<span className="text-red-500 ml-1">*</span></Label>
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

        <div>
          <MultiSelectCheckbox
            label={
              <>
                Master Kelas<span className="text-red-500 ml-1">*</span>
              </>
            }
            items={masters.map(m => ({ id: m.id, label: m.name }))}
            selectedIds={formData.masterIds}
            onChange={(ids) => {
              handleChange('masterIds', ids);
              // Clear error when user selects a master
              if (errors.masterIds) {
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.masterIds;
                  return newErrors;
                });
              }
            }}
            disabled={loading}
            isLoading={mastersLoading}
            error={!!errors.masterIds}
            hint="Pilih satu atau lebih master kelas"
            maxHeight="10rem"
          />
          {errors.masterIds && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errors.masterIds}
            </p>
          )}
        </div>

        <DataFilter
          filters={filters}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            // Sync immediately
            if (newFilters.kelompok && newFilters.kelompok.length > 0) {
              setFormData(prev => ({ ...prev, kelompok_id: newFilters.kelompok[0] }));
              // Clear error
              setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.kelompok_id;
                return newErrors;
              });
            } else {
              setFormData(prev => ({ ...prev, kelompok_id: '' }));
            }
          }}
          userProfile={userProfile}
          daerahList={daerahList || []}
          desaList={desaList || []}
          kelompokList={kelompokList || []}
          classList={[]}
          showKelas={false}
          variant="modal"
          hideAllOption={true}
          requiredFields={{
            daerah: true,
            desa: true,
            kelompok: true
          }}
          errors={{ kelompok: errors.kelompok_id }}
        />

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
            loading={loading}
            loadingText="Menyimpan..."
          >
            {isEditing ? 'Update' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
