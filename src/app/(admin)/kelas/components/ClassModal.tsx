"use client";

import { useState, useEffect } from 'react';
import { ClassWithMaster, createClassFromMaster, createCustomClass, updateClass } from '../actions/classes';
import { getAllClassMasters } from '../actions/masters';
import { ClassMaster } from '../actions/masters';
import Modal from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import InputFilter from '@/components/form/input/InputFilter';
import Button from '@/components/ui/button/Button';

interface ClassModalProps {
  classItem: ClassWithMaster | null;
  onClose: () => void;
}

export default function ClassModal({ classItem, onClose }: ClassModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    kelompok_id: '',
    class_master_id: '',
    is_from_template: true
  });
  const [masters, setMasters] = useState<ClassMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!classItem;

  useEffect(() => {
    loadMasters();
    if (classItem) {
      setFormData({
        name: classItem.name,
        kelompok_id: classItem.kelompok_id,
        class_master_id: classItem.class_master_id || '',
        is_from_template: !!classItem.class_master_id
      });
    }
  }, [classItem]);

  const loadMasters = async () => {
    try {
      const data = await getAllClassMasters();
      setMasters(data);
    } catch (error) {
      console.error('Error loading masters:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (isEditing) {
        await updateClass(classItem!.id, { name: formData.name });
      } else {
        if (formData.is_from_template) {
          await createClassFromMaster(
            formData.kelompok_id,
            formData.class_master_id,
            formData.name
          );
        } else {
          await createCustomClass(formData.kelompok_id, formData.name);
        }
      }
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

  const masterOptions = masters.map(master => ({
    value: master.id,
    label: master.name
  }));

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Edit Kelas' : 'Tambah Kelas'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.general}
          </div>
        )}

        {!isEditing && (
          <div>
            <Label>Kelompok *</Label>
            <InputFilter
              id="kelompok"
              label=""
              options={[]}
              value={formData.kelompok_id}
              onChange={(value: string) => handleChange('kelompok_id', value)}
              placeholder="Pilih kelompok"
              error={!!errors.kelompok_id}
            />
          </div>
        )}

        {!isEditing && (
          <div>
            <Label>Jenis Kelas</Label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="class_type"
                  checked={formData.is_from_template}
                  onChange={() => handleChange('is_from_template', true)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Dari Template
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="class_type"
                  checked={!formData.is_from_template}
                  onChange={() => handleChange('is_from_template', false)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Custom
                </span>
              </label>
            </div>
          </div>
        )}

        {!isEditing && formData.is_from_template && (
          <div>
            <Label>Template Kelas *</Label>
            <InputFilter
              id="class_master"
              label=""
              options={masterOptions}
              value={formData.class_master_id}
              onChange={(value) => handleChange('class_master_id', value)}
              placeholder="Pilih template kelas"
              error={!!errors.class_master_id}
            />
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
          >
            {loading ? 'Menyimpan...' : (isEditing ? 'Update' : 'Simpan')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
