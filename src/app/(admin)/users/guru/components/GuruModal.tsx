"use client";

import { useState, useEffect, useMemo } from 'react';
import { createTeacher, updateTeacher, getTeacherClasses, updateTeacherClasses } from '../actions';
import { useKelas } from '@/hooks/useKelas';
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
import { isAdminKelompok, isAdminDesa, isAdminDaerah } from '@/lib/userUtils';
import Button from '@/components/ui/button/Button';
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox';

interface Guru {
  id: string;
  username: string;
  full_name: string;
  email: string;
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

interface GuruModalProps {
  isOpen: boolean;
  onClose: () => void;
  guru?: Guru | null;
  daerah: Daerah[];
  desa: Desa[];
  kelompok: Kelompok[];
  onSuccess: () => void;
}

export default function GuruModal({ isOpen, onClose, guru, daerah, desa, kelompok, onSuccess }: GuruModalProps) {
  const { profile: userProfile } = useUserProfile();
  const { daerah: daerahList = [] } = useDaerah();
  const { desa: desaList = [] } = useDesa();
  const { kelompok: kelompokList = [] } = useKelompok();
  const { kelas: allClasses = [] } = useKelas();
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    daerah_id: '',
    kelompok_id: '',
    classIds: [] as string[]
  });
  const [dataFilters, setDataFilters] = useState({
    daerah: [] as string[],
    desa: [] as string[],
    kelompok: [] as string[],
    kelas: [] as string[]
  });
  const [selectedKelompokFilters, setSelectedKelompokFilters] = useState<string[]>([]);
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
        daerahList: daerahList.filter((d: any) => d.id === userProfile.daerah_id),
        desaList: desaList.filter((d: any) => d.daerah_id === userProfile.daerah_id),
        kelompokList: dataFilters.desa.length > 0
          ? kelompokList.filter((k: any) => dataFilters.desa.includes(k.desa_id))
          : kelompokList.filter((k: any) => {
              const desa = desaList.find((d: any) => d.id === k.desa_id);
              return desa?.daerah_id === userProfile.daerah_id;
            })
      };
    }
    
    // For Admin Desa
    if (userProfile?.desa_id) {
      return {
        daerahList: daerahList.filter((d: any) => d.id === userProfile.daerah_id),
        desaList: desaList.filter((d: any) => d.id === userProfile.desa_id),
        kelompokList: kelompokList.filter((k: any) => k.desa_id === userProfile.desa_id)
      };
    }
    
    // For Admin Kelompok
    if (userProfile?.kelompok_id) {
      const kelompok = kelompokList.find((k: any) => k.id === userProfile.kelompok_id);
      const desa = desaList.find((d: any) => d.id === kelompok?.desa_id);
      
      return {
        daerahList: daerahList.filter((d: any) => d.id === desa?.daerah_id),
        desaList: desaList.filter((d: any) => d.id === kelompok?.desa_id),
        kelompokList: kelompokList.filter((k: any) => k.id === userProfile.kelompok_id)
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
    initialDaerah: guru?.daerah_id || '',
    initialDesa: '',
    initialKelompok: guru?.kelompok_id || ''
  });

  useEffect(() => {
    if (!isOpen) return; // Don't run when modal is closed
    
    const loadData = async () => {
      if (guru) {
        // Load teacher's assigned classes
        try {
          const teacherClasses = await getTeacherClasses(guru.id);
          const classIds = teacherClasses.map(tc => tc.class_id);
          
          setFormData({
            username: guru.username || '',
            full_name: guru.full_name || '',
            password: '', // Empty for edit mode
            daerah_id: guru.daerah_id || '',
            kelompok_id: guru.kelompok_id || '',
            classIds: classIds
          });
        } catch (error) {
          console.error('Error loading teacher classes:', error);
          setFormData({
            username: guru.username || '',
            full_name: guru.full_name || '',
            password: '', // Empty for edit mode
            daerah_id: guru.daerah_id || '',
            kelompok_id: guru.kelompok_id || '',
            classIds: []
          });
        }
        
        setDataFilters({
          daerah: guru.daerah_id ? [guru.daerah_id] : [],
          desa: guru.desa_id ? [guru.desa_id] : [],
          kelompok: guru.kelompok_id ? [guru.kelompok_id] : [],
          kelas: []
        });
      } else {
        // Create mode - auto-fill organizational fields based on user role
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
          daerah_id: autoFilledDaerah,
          kelompok_id: autoFilledKelompok,
          classIds: []
        });
        setDataFilters({
          daerah: autoFilledDaerah ? [autoFilledDaerah] : [],
          desa: autoFilledDesa ? [autoFilledDesa] : [],
          kelompok: autoFilledKelompok ? [autoFilledKelompok] : [],
          kelas: []
        });
      }
      setErrors({});
      setGeneralError('');
    };
    
    loadData();
  }, [guru, isOpen, userProfile]);

  // Initialize selectedKelompokFilters when modal opens or userProfile changes
  useEffect(() => {
    if (!isOpen) return;
    
    const canAssignCrossKelompok = userProfile?.role === 'superadmin' || 
                                    (userProfile && isAdminDesa(userProfile)) || 
                                    (userProfile && isAdminDaerah(userProfile));
    
    if (canAssignCrossKelompok) {
      // In edit mode, pre-select the guru's kelompok so classes are immediately visible
      setSelectedKelompokFilters(guru?.kelompok_id ? [guru.kelompok_id] : []);
    } else {
      setSelectedKelompokFilters([]);
    }
  }, [isOpen, userProfile, filteredLists.kelompokList, guru?.kelompok_id]);

  // Get all classes in admin scope (before kelompok filter)
  const allClassesInScope = useMemo(() => {
    if (!allClasses || allClasses.length === 0) return [];
    
    const isSuperadmin = userProfile?.role === 'superadmin';
    const isAdminDaerah = userProfile?.role === 'admin' && userProfile?.daerah_id && !userProfile?.desa_id;
    const isAdminDesa = userProfile?.role === 'admin' && userProfile?.desa_id && !userProfile?.kelompok_id;
    
    // Superadmin: all classes
    if (isSuperadmin) {
      return allClasses;
    }
    
    // Admin Daerah: all classes in their daerah
    if (isAdminDaerah) {
      return allClasses.filter(cls => {
        const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
        const desa = Array.isArray(kelompok?.desa) ? kelompok.desa[0] : kelompok?.desa;
        return desa?.daerah_id === userProfile.daerah_id;
      });
    }
    
    // Admin Desa: all classes in their desa
    if (isAdminDesa) {
      return allClasses.filter(cls => {
        const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
        return kelompok?.desa_id === userProfile.desa_id;
      });
    }
    
    return [];
  }, [allClasses, userProfile]);

  // Filter classes based on admin scope (cross-kelompok support)
  const availableClasses = useMemo(() => {
    if (!allClasses || allClasses.length === 0) return [];
    
    const isSuperadmin = userProfile?.role === 'superadmin';
    const isAdminDaerah = userProfile?.role === 'admin' && userProfile?.daerah_id && !userProfile?.desa_id;
    const isAdminDesa = userProfile?.role === 'admin' && userProfile?.desa_id && !userProfile?.kelompok_id;
    const isAdminKelompok = userProfile?.role === 'admin' && userProfile?.kelompok_id;
    
    // Superadmin: filter by selectedKelompokFilters - if empty, show no classes
    if (isSuperadmin) {
      if (selectedKelompokFilters.length === 0) {
        return [];
      }
      return allClasses.filter(cls => selectedKelompokFilters.includes(cls.kelompok_id));
    }
    
    // Admin Daerah: filter by selectedKelompokFilters - if empty, show no classes
    if (isAdminDaerah) {
      if (selectedKelompokFilters.length === 0) {
        return [];
      }
      
      let filtered = allClasses.filter(cls => {
        const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
        const desa = Array.isArray(kelompok?.desa) ? kelompok.desa[0] : kelompok?.desa;
        return desa?.daerah_id === userProfile.daerah_id;
      });
      
      // Apply kelompok filter
      filtered = filtered.filter(cls => selectedKelompokFilters.includes(cls.kelompok_id));
      
      return filtered;
    }
    
    // Admin Desa: filter by selectedKelompokFilters - if empty, show no classes
    if (isAdminDesa) {
      if (selectedKelompokFilters.length === 0) {
        return [];
      }
      
      let filtered = allClasses.filter(cls => {
        const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
        return kelompok?.desa_id === userProfile.desa_id;
      });
      
      // Apply kelompok filter
      filtered = filtered.filter(cls => selectedKelompokFilters.includes(cls.kelompok_id));
      
      return filtered;
    }
    
    // Admin Kelompok: show classes from their kelompok + any already assigned classes (even from other kelompok)
    // This allows them to see and unassign classes that were assigned by Admin Desa/Daerah
    if (isAdminKelompok) {
      const myKelompokClasses = allClasses.filter(cls => cls.kelompok_id === userProfile.kelompok_id);
      // Also include classes that are currently assigned (even if from other kelompok)
      const assignedClassIds = formData.classIds;
      const assignedClasses = allClasses.filter(cls => assignedClassIds.includes(cls.id));
      // Combine and deduplicate
      const combined = [...myKelompokClasses, ...assignedClasses];
      const uniqueClasses = combined.filter((cls, index, self) => 
        index === self.findIndex(c => c.id === cls.id)
      );
      return uniqueClasses;
    }
    
    // Fallback: if kelompok filter is selected, show classes from that kelompok
    if (dataFilters.kelompok.length > 0) {
      return allClasses.filter(cls => cls.kelompok_id === dataFilters.kelompok[0]);
    }
    
    return [];
  }, [allClasses, userProfile, dataFilters.kelompok, formData.classIds, selectedKelompokFilters]);

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
      daerah_id: filters.daerah.length > 0 ? filters.daerah[0] : '',
      kelompok_id: filters.kelompok.length > 0 ? filters.kelompok[0] : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setGeneralError('');

    try {
      // Generate email from username
      const generatedEmail = `${formData.username}@generus.com`;
      
      // Validate required fields
      const newErrors: typeof errors = {};
      
      if (!formData.username.trim()) {
        newErrors.username = 'Username harus diisi';
      }
      if (!formData.full_name.trim()) {
        newErrors.full_name = 'Nama lengkap harus diisi';
      }
      if (!formData.password && !guru) { // Required for create, optional for edit
        newErrors.password = 'Password harus diisi';
      }
      if (!dataFilters.daerah) {
        newErrors.daerah = 'Daerah harus dipilih';
      }
      if (!dataFilters.kelompok) {
        newErrors.kelompok = 'Kelompok harus dipilih';
      }
      
      // If errors exist, stop and show them
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsLoading(false);
        return;
      }

      // Prepare submit data
      const submitData = {
        username: formData.username,
        full_name: formData.full_name,
        email: generatedEmail,
        password: formData.password || undefined, // Optional for edit
        daerah_id: dataFilters.daerah.length > 0 ? dataFilters.daerah[0] : '',
        desa_id: dataFilters.desa.length > 0 ? dataFilters.desa[0] : null,
        kelompok_id: dataFilters.kelompok.length > 0 ? dataFilters.kelompok[0] : ''
      };

      if (guru) {
        await updateTeacher(guru.id, submitData);
        await updateTeacherClasses(guru.id, formData.classIds);
      } else {
        const result = await createTeacher(submitData);
        if (result.teacher?.id && formData.classIds.length > 0) {
          await updateTeacherClasses(result.teacher.id, formData.classIds);
        }
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
          {guru ? 'Edit Guru' : 'Tambah Guru'}
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
              error={!!errors.username}
              hint={errors.username}
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
              error={!!errors.full_name}
              hint={errors.full_name}
              disabled={isLoading}
            />
          </div>

          {/* Class Selection - show for all admins */}
          {(() => {
            const canAssignCrossKelompok = userProfile?.role === 'superadmin' || 
                            (userProfile && isAdminDesa(userProfile)) || 
                            (userProfile && isAdminDaerah(userProfile));
            const isAdminKelompokUser = userProfile && isAdminKelompok(userProfile);
            
            // Always show section if there are classes or if user can assign
            if (availableClasses.length === 0 && !canAssignCrossKelompok && !isAdminKelompokUser) return null;
            
            return (
              <div>
                <Label>Kelas yang Diajar</Label>
                
                {/* Multi-checkbox Kelompok Filter - only for Admin Desa/Daerah/Superadmin */}
                {canAssignCrossKelompok && filteredLists.kelompokList.length > 0 && (
                  <div className="mb-3">
                    <MultiSelectCheckbox
                      label=""
                      items={filteredLists.kelompokList.map((k: any) => ({ id: k.id, label: k.name }))}
                      selectedIds={selectedKelompokFilters}
                      onChange={setSelectedKelompokFilters}
                      disabled={isLoading}
                      maxHeight="8rem"
                      hint="Pilih satu atau lebih kelompok untuk menampilkan kelas dari kelompok tersebut."
                      className="mb-2"
                    />
                  </div>
                )}
                
                {availableClasses.length > 0 ? (
                  <>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded p-3">
                      {availableClasses.map(cls => {
                        const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
                        const kelompokName = kelompok?.name || 'Tidak diketahui';
                        
                        // Determine display name based on user role and selected kelompok count
                        let displayName: string;
                        if (isAdminKelompokUser) {
                          // Admin Kelompok: always show without kelompok name
                          displayName = cls.name;
                        } else if (canAssignCrossKelompok) {
                          // Admin Desa/Daerah/Superadmin: conditional based on selected kelompok count
                          displayName = selectedKelompokFilters.length === 1
                            ? cls.name
                            : `${cls.name} (${kelompokName})`;
                        } else {
                          // Fallback: show with kelompok name
                          displayName = `${cls.name} (${kelompokName})`;
                        }
                        
                        // For Admin Kelompok: only enable checkbox if class is from their kelompok
                        const isFromMyKelompok = isAdminKelompokUser && cls.kelompok_id === userProfile?.kelompok_id;
                        const isCheckboxDisabled = isAdminKelompokUser && !isFromMyKelompok;
                        const isCurrentlyAssigned = formData.classIds.includes(cls.id);
                        
                        // Allow uncheck if already assigned (even if from other kelompok - user can remove it)
                        // But prevent checking new classes from other kelompok
                        const canToggle = !isAdminKelompokUser || isFromMyKelompok || isCurrentlyAssigned;
                        
                        return (
                          <label key={cls.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.classIds.includes(cls.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    classIds: [...prev.classIds, cls.id]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    classIds: prev.classIds.filter(id => id !== cls.id)
                                  }));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              disabled={isLoading || !canToggle}
                              title={isCheckboxDisabled ? 'Hanya bisa assign kelas dari kelompok Anda' : undefined}
                            />
                            <span className={`ml-2 text-sm ${isCheckboxDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                              {displayName}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {canAssignCrossKelompok && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Pilih satu atau lebih kelas yang akan diajar oleh guru ini. Anda dapat memilih kelas dari semua kelompok di {userProfile && isAdminDesa(userProfile) ? 'desa' : userProfile && isAdminDaerah(userProfile) ? 'daerah' : ''} Anda.
                      </p>
                    )}
                    {isAdminKelompokUser && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Anda hanya dapat menambahkan atau menghapus kelas dari kelompok Anda sendiri.
                      </p>
                    )}
                  </>
                ) : (
                  // Show message only if truly no classes exist, not just because kelompok filter is empty
                  allClassesInScope.length === 0 ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded p-3">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Belum ada kelas {userProfile && isAdminDesa(userProfile) ? 'di desa ini' : userProfile && isAdminDaerah(userProfile) ? 'di daerah ini' : userProfile && isAdminKelompokUser ? 'di kelompok ini' : 'yang tersedia'}. Silakan buat kelas terlebih dahulu di halaman Kelas.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Pilih kelompok terlebih dahulu untuk menampilkan daftar kelas.
                      </p>
                    </div>
                  )
                )}
              </div>
            );
          })()}
          
          <div>
            <Label htmlFor="password">
              Password {guru && <span className="text-sm text-gray-500">(kosongkan jika tidak diubah)</span>}
            </Label>
            <PasswordInput
              id="password"
              name="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder={guru ? "Kosongkan jika tidak diubah" : "Masukkan password"}
              required={!guru} // Required for create, optional for edit
              error={!!errors.password}
              hint={errors.password}
              disabled={isLoading}
            />
          </div>
          
          <div className="md:col-span-3">
            <DataFilter
              filters={dataFilters}
              onFilterChange={handleDataFilterChange}
              userProfile={userProfile}
              daerahList={filteredLists.daerahList}
              desaList={filteredLists.desaList}
              kelompokList={filteredLists.kelompokList}
              classList={[]}
              showKelas={false}
              showDaerah={userProfile?.role === 'superadmin'}
              showDesa={userProfile?.role === 'superadmin' || (!userProfile?.desa_id && !!userProfile?.daerah_id)}
              showKelompok={true}
              variant="modal"
              compact={true}
              hideAllOption={true}
              errors={errors} // Pass errors to DataFilter
              requiredFields={{
                daerah: true,
                desa: true,
                kelompok: true
              }}
              filterLists={filteredLists}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="outline"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              loading={isLoading}
              loadingText="Menyimpan..."
            >
              {guru ? 'Update' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}