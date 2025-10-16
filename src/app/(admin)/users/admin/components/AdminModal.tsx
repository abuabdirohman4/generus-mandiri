"use client";

import { useState, useEffect } from 'react';
import { createAdmin, updateAdmin } from '../actions';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import DataFilter from '@/components/shared/DataFilter';
import Label from '@/components/form/Label';
import { useUserProfile } from '@/stores/userProfileStore';
import { useModalOrganisationFilters } from '@/hooks/useModalOrganisationFilters';
import { useDaerah } from '@/hooks/useDaerah';
import { useDesa } from '@/hooks/useDesa';
import { useKelompok } from '@/hooks/useKelompok';
import InputFilter from '@/components/form/input/InputFilter';
import { isAdminKelompok } from '@/lib/userUtils';

interface Admin {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  daerah_id?: string;
  kelompok_id?: string;
  created_at: string;
}

interface Daerah {
  id: string;
  name: string;
}

interface Desa {
  id: string;
  name: string;
  daerah_id: string;
}

interface Kelompok {
  id: string;
  name: string;
  desa_id: string;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin?: Admin | null;
  daerah: Daerah[];
  desa: Desa[];
  kelompok: Kelompok[];
  onSuccess: () => void;
}

export default function AdminModal({ isOpen, onClose, admin, daerah, desa, kelompok, onSuccess }: AdminModalProps) {
  const { profile: userProfile } = useUserProfile();
  const { daerah: daerahList = [] } = useDaerah();
  const { desa: desaList = [] } = useDesa();
  const { kelompok: kelompokList = [] } = useKelompok();
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    role: 'admin',
    daerah_id: '',
    kelompok_id: ''
  });
  const [dataFilters, setDataFilters] = useState({
    daerah: '',
    desa: '',
    kelompok: '',
    kelas: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  
  // Use the modal organisation filters hook
  const {
    selectedDaerah,
    selectedDesa,
    selectedKelompok,
    handleDaerahChange,
    handleDesaChange,
    handleKelompokChange,
    getFormData: getOrgFormData,
    validateForm
  } = useModalOrganisationFilters({
    userProfile,
    daerahList,
    desaList,
    kelompokList,
    initialDaerah: admin?.daerah_id || '',
    initialDesa: '',
    initialKelompok: admin?.kelompok_id || ''
  });

  useEffect(() => {
    if (admin) {
      // Edit mode
      setFormData({
        username: admin.username || '',
        full_name: admin.full_name || '',
        email: admin.email || '',
        role: admin.role || 'admin',
        daerah_id: admin.daerah_id || '',
        kelompok_id: admin.kelompok_id || ''
      });
      setDataFilters({
        daerah: admin.daerah_id || '',
        desa: '',
        kelompok: admin.kelompok_id || '',
        kelas: ''
      });
    } else {
      // Create mode - auto-fill from user profile (not for Superadmin)
      const autoFilledDaerah = userProfile && userProfile.role !== 'superadmin' 
        ? userProfile.daerah_id || ''
        : '';
      const autoFilledDesa = userProfile && userProfile.role !== 'superadmin' 
        ? userProfile.desa_id || ''
        : '';
      const autoFilledKelompok = userProfile && userProfile.role !== 'superadmin' && isAdminKelompok(userProfile)
        ? userProfile.kelompok_id || ''
        : '';
      
      setFormData({
        username: '',
        full_name: '',
        email: '',
        role: 'admin',
        daerah_id: autoFilledDaerah,
        kelompok_id: autoFilledKelompok
      });
      setDataFilters({
        daerah: autoFilledDaerah,
        desa: autoFilledDesa,
        kelompok: autoFilledKelompok,
        kelas: ''
      });
    }
    setError(undefined);
  }, [admin, isOpen, userProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDataFilterChange = (filters: typeof dataFilters) => {
    setDataFilters(filters);
    // Update formData when filters change
    setFormData(prev => ({
      ...prev,
      daerah_id: filters.daerah,
      kelompok_id: filters.kelompok
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(undefined);

    try {
      // Validate required fields
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join(', '));
        setIsLoading(false);
        return;
      }

      // Get organization data from filters
      const orgData = getOrgFormData();
      
      // Combine form data with organization data
      const submitData = {
        ...formData,
        ...orgData
      };

      if (admin) {
        await updateAdmin(admin.id, submitData);
      } else {
        await createAdmin(submitData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] m-4">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {admin ? 'Edit Admin' : 'Tambah Admin'}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <InputField
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Masukkan username"
              required
              error={!!error}
              hint={error || undefined}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="full_name">Nama Lengkap</Label>
            <InputField
              id="full_name"
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Masukkan nama lengkap"
              required
              error={!!error}
              hint={error || undefined}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <InputField
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Masukkan email"
              required
              error={!!error}
              hint={error || undefined}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <InputFilter
              id="role"
              label="Role"
              value={formData.role}
              onChange={(value: string) => setFormData({ ...formData, role: value })}
              options={[
                { value: "admin", label: "Admin" },
              ]}
              required
              disabled={isLoading}
              widthClassName="!max-w-full"
            />
          </div>
          
          <DataFilter
            filters={dataFilters}
            onFilterChange={handleDataFilterChange}
            userProfile={userProfile}
            daerahList={daerahList}
            desaList={desaList}
            kelompokList={kelompokList}
            classList={[]}
            showKelas={false}
            variant="modal"
            compact={true}
            hideAllOption={true}
            requiredFields={{
              daerah: false,
              desa: false,
              kelompok: false // Optional for admin
            }}
          />

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Menyimpan...' : (admin ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}