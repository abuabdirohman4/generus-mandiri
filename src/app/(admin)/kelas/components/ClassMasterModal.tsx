"use client";

import { useState, useEffect } from 'react';
import { ClassMaster, createClassMaster, updateClassMaster } from '../actions/masters';
import Modal from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';

interface ClassMasterModalProps {
  master: ClassMaster | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ClassMasterModal({ master, onClose, onSuccess }: ClassMasterModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sort_order: 0
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!master;

  useEffect(() => {
    if (master) {
      setFormData({
        name: master.name,
        description: master.description || '',
        sort_order: master.sort_order
      });
    }
  }, [master]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (isEditing) {
        await updateClassMaster(master!.id, formData);
      } else {
        await createClassMaster(formData);
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
      title={isEditing ? 'Edit Master Kelas' : 'Tambah Master Kelas'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.general}
          </div>
        )}

        <div>
          <Label htmlFor="name">Nama Kelas *</Label>
          <InputField
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Masukkan nama kelas"
            required
            error={!!errors.name}
          />
        </div>

        <div>
          <Label htmlFor="description">Deskripsi</Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Masukkan deskripsi kelas"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <Label htmlFor="sort_order">Urutan *</Label>
          <InputField
            id="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
            placeholder="Masukkan urutan"
            required
            error={!!errors.sort_order}
          />
        </div>


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
