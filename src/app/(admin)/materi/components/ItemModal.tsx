'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import Label from '@/components/form/Label';
import InputField from '@/components/form/input/InputField';
import InputFilter from '@/components/form/input/InputFilter';
import { MaterialItem, MaterialType } from '../types';
import { createMaterialItem, updateMaterialItem, getMaterialTypes } from '../actions';
import { toast } from 'sonner';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MaterialItem | null;
  defaultTypeId?: string; // Optional: pre-select type when creating from type context
  onSuccess: () => void;
}

export default function ItemModal({ isOpen, onClose, item, defaultTypeId, onSuccess }: ItemModalProps) {
  const [formData, setFormData] = useState({
    material_type_id: '',
    name: '',
    description: '',
    content: '',
  });
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [errors, setErrors] = useState<{
    material_type_id?: string;
    name?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      loadTypes();
      if (item) {
        setFormData({
          material_type_id: item.material_type_id,
          name: item.name,
          description: item.description || '',
          content: item.content || '',
        });
      } else {
        setFormData({
          material_type_id: defaultTypeId || '',
          name: '',
          description: '',
          content: '',
        });
      }
      setGeneralError('');
      setErrors({});
    }
  }, [isOpen, item, defaultTypeId]);

  const loadTypes = async () => {
    try {
      setLoadingTypes(true);
      const data = await getMaterialTypes();
      setTypes(data);
    } catch (error) {
      console.error('Error loading types:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setErrors({});

    // Validation
    const newErrors: typeof errors = {};
    if (!formData.material_type_id) {
      newErrors.material_type_id = 'Jenis materi wajib dipilih';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Nama item materi wajib diisi';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      if (item) {
        await updateMaterialItem(item.id, {
          material_type_id: formData.material_type_id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          content: formData.content.trim() || undefined,
        });
        toast.success('Item materi berhasil diperbarui');
      } else {
        await createMaterialItem({
          material_type_id: formData.material_type_id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          content: formData.content.trim() || undefined,
        });
        toast.success('Item materi berhasil ditambahkan');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving item:', error);
      setGeneralError(error.message || 'Gagal menyimpan item materi');
    } finally {
      setIsLoading(false);
    }
  };

  const typeOptions = types.map(type => ({
    value: type.id,
    label: type.name + (type.category ? ` (${type.category.name})` : ''),
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg m-4">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {item ? 'Edit Item Materi' : 'Tambah Item Materi'}
        </h3>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <InputFilter
              id="material_type_id"
              label="Jenis Materi"
              value={formData.material_type_id}
              onChange={(value) => setFormData({ ...formData, material_type_id: value })}
              options={typeOptions}
              placeholder="Pilih jenis materi"
              required
              error={!!errors.material_type_id}
              hint={errors.material_type_id}
              variant="modal"
            />
          </div>

          <div>
            <Label htmlFor="name">
              Nama Item Materi <span className="text-red-500">*</span>
            </Label>
            <InputField
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama item materi"
              required
              error={!!errors.name}
              hint={errors.name}
            />
          </div>

          <div>
            <Label htmlFor="description">Deskripsi</Label>
            <InputField
              id="description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Masukkan deskripsi (opsional)"
            />
          </div>

          <div>
            <Label htmlFor="content">Konten</Label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Masukkan konten (opsional)"
              rows={4}
              className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 text-gray-800 border-gray-300 focus:ring-brand-500/10 focus:border-brand-500 dark:text-gray-200 dark:border-gray-600"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
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
              disabled={isLoading || loadingTypes}
              loading={isLoading}
              loadingText="Menyimpan..."
              variant="primary"
            >
              {item ? 'Perbarui' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
