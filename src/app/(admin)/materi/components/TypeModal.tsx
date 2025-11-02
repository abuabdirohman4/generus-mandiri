'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import Label from '@/components/form/Label';
import InputField from '@/components/form/input/InputField';
import InputFilter from '@/components/form/input/InputFilter';
import { MaterialType, MaterialCategory } from '../types';
import { createMaterialType, updateMaterialType, getMaterialCategories } from '../actions';
import { toast } from 'sonner';

interface TypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: MaterialType | null;
  defaultCategoryId?: string; // Optional: pre-select category when creating from category context
  onSuccess: () => void;
}

export default function TypeModal({ isOpen, onClose, type, defaultCategoryId, onSuccess }: TypeModalProps) {
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    display_order: 0,
  });
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [errors, setErrors] = useState<{
    category_id?: string;
    name?: string;
    display_order?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (type) {
        setFormData({
          category_id: type.category_id,
          name: type.name,
          description: type.description || '',
          display_order: type.display_order,
        });
      } else {
        setFormData({
          category_id: defaultCategoryId || '',
          name: '',
          description: '',
          display_order: 0,
        });
      }
      setGeneralError('');
      setErrors({});
    }
  }, [isOpen, type, defaultCategoryId]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await getMaterialCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setErrors({});

    // Validation
    const newErrors: typeof errors = {};
    if (!formData.category_id) {
      newErrors.category_id = 'Kategori wajib dipilih';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Nama jenis materi wajib diisi';
    }
    if (formData.display_order < 0) {
      newErrors.display_order = 'Display order harus >= 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      if (type) {
        await updateMaterialType(type.id, {
          category_id: formData.category_id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          display_order: formData.display_order,
        });
        toast.success('Jenis materi berhasil diperbarui');
      } else {
        await createMaterialType({
          category_id: formData.category_id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          display_order: formData.display_order,
        });
        toast.success('Jenis materi berhasil ditambahkan');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving type:', error);
      setGeneralError(error.message || 'Gagal menyimpan jenis materi');
    } finally {
      setIsLoading(false);
    }
  };

  const categoryOptions = categories.map(cat => ({
    value: cat.id,
    label: cat.name,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md m-4">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {type ? 'Edit Jenis Materi' : 'Tambah Jenis Materi'}
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
              id="category_id"
              label="Kategori"
              value={formData.category_id}
              onChange={(value) => setFormData({ ...formData, category_id: value })}
              options={categoryOptions}
              placeholder="Pilih kategori"
              required
              error={!!errors.category_id}
              hint={errors.category_id}
              variant="modal"
            />
          </div>

          <div>
            <Label htmlFor="name">
              Nama Jenis Materi <span className="text-red-500">*</span>
            </Label>
            <InputField
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama jenis materi"
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
            <Label htmlFor="display_order">
              Display Order <span className="text-red-500">*</span>
            </Label>
            <InputField
              id="display_order"
              name="display_order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              placeholder="0"
              required
              error={!!errors.display_order}
              hint={errors.display_order}
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
              disabled={isLoading || loadingCategories}
              loading={isLoading}
              loadingText="Menyimpan..."
              variant="primary"
            >
              {type ? 'Perbarui' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
