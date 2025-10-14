"use client";

import { useState, useEffect } from 'react';
import { createKelompok, updateKelompok } from '../actions/kelompok';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';

interface Kelompok {
  id: string;
  name: string;
  desa_id: string;
  created_at: string;
}

interface Desa {
  id: string;
  name: string;
  daerah_name?: string;
}

interface KelompokModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelompok?: Kelompok | null;
  desaList: Desa[];
  onSuccess: () => void;
}

export default function KelompokModal({ isOpen, onClose, kelompok, desaList, onSuccess }: KelompokModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    desa_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (kelompok) {
      setFormData({
        name: kelompok.name,
        desa_id: kelompok.desa_id
      });
    } else {
      setFormData({
        name: '',
        desa_id: ''
      });
    }
    setError(undefined);
  }, [kelompok, isOpen]);

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
      if (kelompok) {
        await updateKelompok(kelompok.id, formData);
      } else {
        await createKelompok(formData);
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
          {kelompok ? 'Edit Kelompok' : 'Tambah Kelompok'}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nama Kelompok</Label>
              <InputField
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Masukkan nama kelompok"
                required
                error={!!error}
                hint={error || undefined}
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="desa_id">Desa</Label>
              <select
                id="desa_id"
                name="desa_id"
                value={formData.desa_id}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              >
                <option value="">Pilih Desa</option>
                {desaList.map((desa) => (
                  <option key={desa.id} value={desa.id}>
                    {desa.name} {desa.daerah_name && `(${desa.daerah_name})`}
                  </option>
                ))}
              </select>
            </div>
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
              {isLoading ? 'Menyimpan...' : (kelompok ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
