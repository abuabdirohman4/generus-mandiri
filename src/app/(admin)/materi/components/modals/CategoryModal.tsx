'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import Label from '@/components/form/Label';
import InputField from '@/components/form/input/InputField';
import { MaterialCategory } from '../../types';
import { createMaterialCategory, updateMaterialCategory } from '../../actions';
import { toast } from 'sonner';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: MaterialCategory | null;
  onSuccess: () => void;
}

export default function CategoryModal({ isOpen, onClose, category, onSuccess }: CategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [errors, setErrors] = useState<{
    name?: string;
    display_order?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          name: category.name,
          description: category.description || '',
          display_order: category.display_order,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          display_order: 0,
        });
      }
      setGeneralError('');
      setErrors({});
    }
  }, [isOpen, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setErrors({});

    // Validation
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Nama kategori wajib diisi';
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
      if (category) {
        await updateMaterialCategory(category.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          display_order: formData.display_order,
        });
        toast.success('Kategori berhasil diperbarui');
      } else {
        await createMaterialCategory({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          display_order: formData.display_order,
        });
        toast.success('Kategori berhasil ditambahkan');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving category:', error);
      setGeneralError(error.message || 'Gagal menyimpan kategori');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md m-4">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {category ? 'Edit Kategori' : 'Tambah Kategori'}
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
            <Label htmlFor="name">
              Nama Kategori <span className="text-red-500">*</span>
            </Label>
            <InputField
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama kategori"
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
              disabled={isLoading}
              loading={isLoading}
              loadingText="Menyimpan..."
              variant="primary"
            >
              {category ? 'Perbarui' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
