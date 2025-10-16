"use client";

import { useState, useEffect } from 'react';
import { createDesa, updateDesa } from '../actions/desa';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import InputFilter from '@/components/form/input/InputFilter';
import Label from '@/components/form/Label';
import { useUserProfile } from '@/stores/userProfileStore';
import { shouldShowDaerahFilter } from '@/lib/accessControl';

interface Desa {
  id: string;
  name: string;
  daerah_id: string;
  created_at: string;
}

interface Daerah {
  id: string;
  name: string;
}

interface DesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  desa?: Desa | null;
  daerahList: Daerah[];
  onSuccess: () => void;
}

export default function DesaModal({ isOpen, onClose, desa, daerahList, onSuccess }: DesaModalProps) {
  const { profile: userProfile } = useUserProfile();
  const [formData, setFormData] = useState({
    name: '',
    daerah_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  
  // Determine if daerah filter should be shown
  const showDaerahFilter = userProfile ? shouldShowDaerahFilter(userProfile) : true;

  useEffect(() => {
    if (desa) {
      setFormData({
        name: desa.name,
        daerah_id: desa.daerah_id
      });
    } else {
      setFormData({
        name: '',
        daerah_id: ''
      });
    }
    setError(undefined);
  }, [desa, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(undefined);

    try {
      if (desa) {
        await updateDesa(desa.id, formData);
      } else {
        await createDesa(formData);
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
          {desa ? 'Edit Desa' : 'Tambah Desa'}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nama Desa</Label>
              <InputField
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Masukkan nama desa"
                required
                error={!!error}
                hint={error || undefined}
                disabled={isLoading}
              />
            </div>
            
            {showDaerahFilter && (
              <div>
                <InputFilter
                  id="daerah_id"
                  label="Daerah"
                  value={formData.daerah_id}
                  onChange={(value) => setFormData(prev => ({ ...prev, daerah_id: value }))}
                  options={daerahList.map(daerah => ({ value: daerah.id, label: daerah.name }))}
                  variant="modal"
                  compact={true}
                  required={true}
                />
              </div>
            )}
          </div>

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
              {isLoading ? 'Menyimpan...' : (desa ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
