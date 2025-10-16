"use client";

import { useState, useEffect, useMemo } from 'react';
import { createAdmin, updateAdmin } from '../actions';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import PasswordInput from '@/components/form/input/PasswordInput';
import DataFilter from '@/components/shared/DataFilter';
import Label from '@/components/form/Label';
import { useUserProfile } from '@/stores/userProfileStore';
import { useModalOrganisationFilters } from '@/hooks/useModalOrganisationFilters';
import { useDaerah } from '@/hooks/useDaerah';
import { useDesa } from '@/hooks/useDesa';
import { useKelompok } from '@/hooks/useKelompok';
import InputFilter from '@/components/form/input/InputFilter';
import { isAdminKelompok } from '@/lib/userUtils';

// Helper function to determine available admin levels based on user role
const getAvailableAdminLevels = (userProfile: any) => {
  if (!userProfile) return [];
  
  if (userProfile.role === 'superadmin') {
    return ['daerah', 'desa', 'kelompok'];
  }
  
  // Check if user is Admin Daerah
  if (userProfile.role === 'admin' && userProfile.daerah_id && !userProfile.desa_id && !userProfile.kelompok_id) {
    return ['desa', 'kelompok'];
  }
  
  // Check if user is Admin Desa
  if (userProfile.role === 'admin' && userProfile.desa_id && !userProfile.kelompok_id) {
    return ['kelompok'];
  }
  
  return []; // Admin Kelompok - cannot create any admins
};

interface Admin {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  daerah_id?: string;
  desa_id?: string;
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
    password: '',
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
  const [adminLevel, setAdminLevel] = useState<'daerah' | 'desa' | 'kelompok'>('daerah');
  const [generalError, setGeneralError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    full_name?: string;
    password?: string;
    daerah?: string;
    desa?: string;
    kelompok?: string;
  }>({});

  // Computed filtered lists based on user role and selections
  const filteredLists = useMemo(() => {
    const isSuperadmin = userProfile?.role === 'superadmin';
    
    // For Superadmin - no filtering needed
    if (isSuperadmin) {
      return {
        daerahList: daerahList,
        desaList: desaList,
        kelompokList: kelompokList
      };
    }
    
    // For Admin Daerah
    if (userProfile?.daerah_id && !userProfile?.desa_id) {
      return {
        daerahList: daerahList.filter(d => d.id === userProfile.daerah_id),
        desaList: desaList.filter(d => d.daerah_id === userProfile.daerah_id),
        kelompokList: dataFilters.desa 
          ? kelompokList.filter(k => k.desa_id === dataFilters.desa)
          : kelompokList.filter(k => {
              const desa = desaList.find(d => d.id === k.desa_id);
              return desa?.daerah_id === userProfile.daerah_id;
            })
      };
    }
    
    // For Admin Desa
    if (userProfile?.desa_id) {
      return {
        daerahList: daerahList.filter(d => d.id === userProfile.daerah_id),
        desaList: desaList.filter(d => d.id === userProfile.desa_id),
        kelompokList: kelompokList.filter(k => k.desa_id === userProfile.desa_id)
      };
    }
    
    return {
      daerahList: daerahList,
      desaList: desaList,
      kelompokList: kelompokList
    };
  }, [userProfile, daerahList, desaList, kelompokList, dataFilters.desa]);
  
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
      // Edit mode - remove _admin suffix for editing, no password pre-fill
      const usernameWithoutSuffix = admin.username?.replace(/_admin$/, '') || '';
      
      // Auto-detect admin level based on existing data
      if (admin.kelompok_id) {
        setAdminLevel('kelompok');
      } else if (admin.desa_id) {
        setAdminLevel('desa');
      } else {
        setAdminLevel('daerah');
      }
      
      setFormData({
        username: usernameWithoutSuffix,
        full_name: admin.full_name || '',
        password: '', // Empty for edit mode
        role: admin.role || 'admin',
        daerah_id: admin.daerah_id || '',
        kelompok_id: admin.kelompok_id || ''
      });
      setDataFilters({
        daerah: admin.daerah_id || '',
        desa: admin.desa_id || '',
        kelompok: admin.kelompok_id || '',
        kelas: ''
      });
    } else {
      // Create mode - set default level based on user role
      const availableLevels = getAvailableAdminLevels(userProfile);
      if (availableLevels.length > 0) {
        setAdminLevel(availableLevels[0] as 'daerah' | 'desa' | 'kelompok');
      }
      
      // Auto-fill organizational fields based on user role
      const isSuperadmin = userProfile?.role === 'superadmin';
      const autoFilledDaerah = !isSuperadmin ? userProfile?.daerah_id || '' : '';
      const autoFilledDesa = !isSuperadmin ? userProfile?.desa_id || '' : '';
      const autoFilledKelompok = !isSuperadmin && userProfile && isAdminKelompok(userProfile)
        ? userProfile.kelompok_id || ''
        : '';
      
      setFormData({
        username: '',
        full_name: '',
        password: '',
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
    setErrors({});
    setGeneralError('');
  }, [admin, isOpen, userProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/_admin$/, ''); // Remove if user types it
    setFormData(prev => ({ ...prev, username: value }));
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
    setErrors({});
    setGeneralError('');

    try {
      // Generate final username with _admin suffix
      const finalUsername = `${formData.username}_admin`;
      const generatedEmail = `${formData.username}@generus.com`;
      
      // Determine requirements based on admin level
      const needsDesa = adminLevel !== 'daerah';
      const needsKelompok = adminLevel === 'kelompok';
      
      // Validate required fields
      const newErrors: typeof errors = {};
      
      if (!formData.username.trim()) {
        newErrors.username = 'Username harus diisi';
      }
      if (!formData.full_name.trim()) {
        newErrors.full_name = 'Nama lengkap harus diisi';
      }
      if (!formData.password && !admin) { // Required for create, optional for edit
        newErrors.password = 'Password harus diisi';
      }
      if (!dataFilters.daerah) {
        newErrors.daerah = 'Daerah harus dipilih';
      }
      if (needsDesa && !dataFilters.desa) {
        newErrors.desa = 'Desa harus dipilih untuk Admin Desa/Kelompok';
      }
      if (needsKelompok && !dataFilters.kelompok) {
        newErrors.kelompok = 'Kelompok harus dipilih untuk Admin Kelompok';
      }
      
      // If errors exist, stop and show them
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsLoading(false);
        return;
      }

      // Prepare submit data
      const submitData = {
        username: finalUsername,
        full_name: formData.full_name,
        email: generatedEmail,
        password: formData.password || undefined, // Optional for edit
        role: formData.role,
        daerah_id: dataFilters.daerah,
        desa_id: needsDesa ? dataFilters.desa : null,
        kelompok_id: needsKelompok ? dataFilters.kelompok : null
      };

      if (admin) {
        await updateAdmin(admin.id, submitData);
      } else {
        await createAdmin(submitData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      // Parse error to set field-specific or general errors
      if (err instanceof Error) {
        const message = err.message;
        
        // Check if it's a field-specific error
        if (message.includes('Username')) {
          setErrors({ username: message });
        } else if (message.includes('Nama')) {
          setErrors({ full_name: message });
        } else if (message.includes('Password')) {
          setErrors({ password: message });
        } else if (message.includes('Daerah')) {
          setErrors({ daerah: message });
        } else if (message.includes('Desa')) {
          setErrors({ desa: message });
        } else if (message.includes('Kelompok')) {
          setErrors({ kelompok: message });
        } else {
          // General error (auth errors, network errors, etc.)
          setGeneralError(message);
        }
      }
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error Display */}
          {generalError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{generalError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGeneralError('')}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Admin Level Selection */}
          <div>
            <Label>Level Admin</Label>
            <div className="flex gap-4 mt-2">
              {getAvailableAdminLevels(userProfile).includes('daerah') && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="daerah"
                    checked={adminLevel === 'daerah'}
                    onChange={(e) => setAdminLevel(e.target.value as 'daerah' | 'desa' | 'kelompok')}
                    disabled={isLoading}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Admin Daerah</span>
                </label>
              )}
              {getAvailableAdminLevels(userProfile).includes('desa') && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="desa"
                    checked={adminLevel === 'desa'}
                    onChange={(e) => setAdminLevel(e.target.value as 'daerah' | 'desa' | 'kelompok')}
                    disabled={isLoading}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Admin Desa</span>
                </label>
              )}
              {getAvailableAdminLevels(userProfile).includes('kelompok') && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="kelompok"
                    checked={adminLevel === 'kelompok'}
                    onChange={(e) => setAdminLevel(e.target.value as 'daerah' | 'desa' | 'kelompok')}
                    disabled={isLoading}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Admin Kelompok</span>
                </label>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center gap-2">
              <InputField
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleUsernameChange}
                placeholder="Masukkan nama"
                required
                error={!!errors.username}
                hint={errors.username}
                disabled={isLoading}
                className="flex-1"
              />
              <span className="text-gray-500 font-medium">_admin</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Username akan menjadi: {formData.username}_admin
            </p>
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
              error={!!errors.full_name}
              hint={errors.full_name}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="password">
              Password {admin && <span className="text-sm text-gray-500">(kosongkan jika tidak diubah)</span>}
            </Label>
            <PasswordInput
              id="password"
              name="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder={admin ? "Kosongkan jika tidak diubah" : "Masukkan password"}
              required={!admin} // Required for create, optional for edit
              error={!!errors.password}
              hint={errors.password}
              disabled={isLoading}
            />
          </div>
          
          
          <DataFilter
            filters={dataFilters}
            onFilterChange={handleDataFilterChange}
            userProfile={userProfile}
            daerahList={filteredLists.daerahList}
            desaList={filteredLists.desaList}
            kelompokList={filteredLists.kelompokList}
            classList={[]}
            showKelas={false}
            showDaerah={userProfile?.role === 'superadmin'}  // Hide for non-Superadmin
            showDesa={adminLevel !== 'daerah' && (userProfile?.role === 'superadmin' || !userProfile?.desa_id)}  // Hide for Admin Desa
            showKelompok={adminLevel === 'kelompok'}
            variant="modal"
            compact={true}
            hideAllOption={true}
            errors={errors} // Pass errors to DataFilter
            requiredFields={{
              daerah: true,
              desa: adminLevel !== 'daerah', // Required if not Admin Daerah
              kelompok: adminLevel === 'kelompok' // Required only for Admin Kelompok
            }}
            filterLists={filteredLists}  // Pass filtered lists
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