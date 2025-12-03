'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import Label from '@/components/form/Label';
import InputField from '@/components/form/input/InputField';
import InputFilter from '@/components/form/input/InputFilter';
import { MaterialItem, MaterialType, ClassMaster } from '../../types';
import {
  createMaterialItem,
  updateMaterialItem,
  getMaterialTypes,
  getAllClasses, // We can reuse this or create a new simple getClasses
  getMaterialItemClassMappings,
  updateMaterialItemClassMappings
} from '../../actions';
import { toast } from 'sonner';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MaterialItem | null;
  defaultTypeId?: string;
  onSuccess: () => void;
}

interface ClassMappingState {
  class_master_id: string;
  semester: number | null; // 1 or 2, null means not selected (unchecked)
}

export default function ItemModal({ isOpen, onClose, item, defaultTypeId, onSuccess }: ItemModalProps) {
  const [formData, setFormData] = useState({
    material_type_id: '',
    name: '',
    description: '',
    content: '',
  });
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [classes, setClasses] = useState<ClassMaster[]>([]);
  const [mappings, setMappings] = useState<Record<string, { semester1: boolean; semester2: boolean }>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [errors, setErrors] = useState<{
    material_type_id?: string;
    name?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      loadData();
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
        // Reset mappings for new item
        setMappings({});
      }
      setGeneralError('');
      setErrors({});
    }
  }, [isOpen, item, defaultTypeId]);

  const loadData = async () => {
    try {
      setLoadingData(true);

      // Load types and classes in parallel
      const [typesData, classesData] = await Promise.all([
        getMaterialTypes(),
        getAllClasses()
      ]);

      setTypes(typesData);
      setClasses(classesData);

      // If editing, load existing mappings
      if (item) {
        const mappingsData = await getMaterialItemClassMappings(item.id);

        // Transform mappings to state format
        const mappingsState: Record<string, { semester1: boolean; semester2: boolean }> = {};

        // Initialize all classes with false
        classesData.forEach(cls => {
          mappingsState[cls.id] = { semester1: false, semester2: false };
        });

        // Update based on fetched mappings
        mappingsData.forEach((m: any) => {
          if (mappingsState[m.class_master_id]) {
            if (m.semester === 1) mappingsState[m.class_master_id].semester1 = true;
            if (m.semester === 2) mappingsState[m.class_master_id].semester2 = true;
          }
        });

        setMappings(mappingsState);
      } else {
        // Initialize empty mappings for new item
        const initialMappings: Record<string, { semester1: boolean; semester2: boolean }> = {};
        classesData.forEach(cls => {
          initialMappings[cls.id] = { semester1: false, semester2: false };
        });
        setMappings(initialMappings);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setGeneralError('Gagal memuat data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleMappingChange = (classId: string, semester: 'semester1' | 'semester2', checked: boolean) => {
    setMappings(prev => ({
      ...prev,
      [classId]: {
        ...prev[classId],
        [semester]: checked
      }
    }));
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
      let itemId = item?.id;

      if (item) {
        await updateMaterialItem(item.id, {
          material_type_id: formData.material_type_id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          content: formData.content.trim() || undefined,
        });
        toast.success('Item materi berhasil diperbarui');
      } else {
        const newItem = await createMaterialItem({
          material_type_id: formData.material_type_id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          content: formData.content.trim() || undefined,
        });
        itemId = newItem.id;
        toast.success('Item materi berhasil ditambahkan');
      }

      // Save mappings
      if (itemId) {
        const mappingsToSave: Array<{ class_master_id: string; semester: number | null }> = [];

        Object.entries(mappings).forEach(([classId, semesters]) => {
          if (semesters.semester1) {
            mappingsToSave.push({ class_master_id: classId, semester: 1 });
          }
          if (semesters.semester2) {
            mappingsToSave.push({ class_master_id: classId, semester: 2 });
          }
        });

        await updateMaterialItemClassMappings(itemId, mappingsToSave);
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
    // label: type.name + (type.category ? ` (${type.category.name})` : ''),
    label: type.name
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg m-4">
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

        {/* <div>
          <Label htmlFor="description">Deskripsi</Label>
          <InputField
            id="description"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Masukkan deskripsi (opsional)"
          />
        </div> */}

        <div>
          <Label htmlFor="content">Konten</Label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Masukkan konten (opsional)"
            rows={8}
            className="w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:placeholder:text-white/30 dark:focus:border-brand-800 text-gray-800 border-gray-300 focus:ring-brand-500/10 focus:border-brand-500 dark:text-gray-200 dark:border-gray-600 resize-y"
          />
        </div>

        <div className="border-t pt-4 mt-4 dark:border-gray-700">
          <Label className="mb-3 block">Mapping Kelas & Semester</Label>

          {loadingData ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Memuat data kelas...</div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {classes.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cls.name}</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mappings[cls.id]?.semester1 || false}
                        onChange={(e) => handleMappingChange(cls.id, 'semester1', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Sem 1</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mappings[cls.id]?.semester2 || false}
                        onChange={(e) => handleMappingChange(cls.id, 'semester2', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Sem 2</span>
                    </label>
                  </div>
                </div>
              ))}
              {classes.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">Belum ada data kelas</div>
              )}
            </div>
          )}
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
            disabled={isLoading || loadingData}
            loading={isLoading}
            loadingText="Menyimpan..."
            variant="primary"
          >
            {item ? 'Perbarui' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
