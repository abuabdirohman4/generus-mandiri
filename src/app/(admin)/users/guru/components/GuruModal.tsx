"use client";

import { useState, useEffect } from 'react';
import { createTeacher, updateTeacher } from '../actions';
import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';

interface Guru {
  id: string;
  username: string;
  full_name: string;
  email: string;
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
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    daerah_id: '',
    kelompok_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [selectedDaerah, setSelectedDaerah] = useState('');
  const [selectedDesa, setSelectedDesa] = useState('');

  useEffect(() => {
    if (guru) {
      setFormData({
        username: guru.username || '',
        full_name: guru.full_name || '',
        email: guru.email || '',
        daerah_id: guru.daerah_id || '',
        kelompok_id: guru.kelompok_id || ''
      });
      setSelectedDaerah(guru.daerah_id || '');
    } else {
      setFormData({
        username: '',
        full_name: '',
        email: '',
        daerah_id: '',
        kelompok_id: ''
      });
      setSelectedDaerah('');
    }
    setSelectedDesa('');
    setError(undefined);
  }, [guru, isOpen]);

  // Filter lists based on selection
  const filteredDesa = selectedDaerah 
    ? desa.filter(d => d.daerah_id === selectedDaerah)
    : desa;
    
  const filteredKelompok = selectedDesa
    ? kelompok.filter(k => k.desa_id === selectedDesa)
    : kelompok;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDaerahChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedDaerah(value);
    setSelectedDesa('');
    setFormData(prev => ({ ...prev, daerah_id: value, kelompok_id: '' }));
  };
  
  const handleDesaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedDesa(value);
    setFormData(prev => ({ ...prev, kelompok_id: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(undefined);

    try {
      if (guru) {
        await updateTeacher(guru.id, formData);
      } else {
        await createTeacher(formData);
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {guru ? 'Edit Guru' : 'Tambah Guru'}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label htmlFor="daerah">Daerah</Label>
              <select
                id="daerah"
                name="daerah"
                value={selectedDaerah}
                onChange={handleDaerahChange}
                disabled={isLoading}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              >
                <option value="">Pilih Daerah</option>
                {daerah.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="desa">Desa</Label>
              <select
                id="desa"
                name="desa"
                value={selectedDesa}
                onChange={handleDesaChange}
                disabled={isLoading || !selectedDaerah}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              >
                <option value="">Pilih Desa</option>
                {filteredDesa.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-3">
              <Label htmlFor="kelompok_id">Kelompok</Label>
              <select
                id="kelompok_id"
                name="kelompok_id"
                value={formData.kelompok_id}
                onChange={handleChange}
                required
                disabled={isLoading || !selectedDesa}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              >
                <option value="">Pilih Kelompok</option>
                {filteredKelompok.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
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
              {isLoading ? 'Menyimpan...' : (guru ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}