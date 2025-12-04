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
  onSuccess: (itemId?: string) => void;
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
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  // Map classId -> Set of semesters (1 or 2)
  const [classSemesterMappings, setClassSemesterMappings] = useState<Record<string, Set<1 | 2>>>({});

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
        // Reset selections for new item
        setSelectedClasses(new Set());
        // Reset selections for new item
        setSelectedClasses(new Set());
        setClassSemesterMappings({});
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

        // Extract unique class IDs and semesters from mappings
        const classIds = new Set<string>();
        const mappings: Record<string, Set<1 | 2>> = {};

        mappingsData.forEach((m: any) => {
          if (m.class_master_id) {
            classIds.add(m.class_master_id);

            if (m.semester === 1 || m.semester === 2) {
              if (!mappings[m.class_master_id]) {
                mappings[m.class_master_id] = new Set();
              }
              mappings[m.class_master_id].add(m.semester as 1 | 2);
            }
          }
        });

        setSelectedClasses(classIds);
        setClassSemesterMappings(mappings);
      } else {
        // Initialize empty selections for new item
        setSelectedClasses(new Set());
        setClassSemesterMappings({});
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setGeneralError('Gagal memuat data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const handleClassSemesterToggle = (classId: string, semester: 1 | 2) => {
    setClassSemesterMappings(prev => {
      const currentSet = prev[classId] || new Set();
      const newSet = new Set(currentSet);
      if (newSet.has(semester)) {
        newSet.delete(semester);
      } else {
        newSet.add(semester);
      }
      return { ...prev, [classId]: newSet };
    });
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

      // Save mappings - generate from selected classes and semesters
      if (itemId) {
        const mappingsToSave: Array<{ class_master_id: string; semester: number | null }> = [];

        // Combine selected classes and semesters
        selectedClasses.forEach(classId => {
          const semesters = classSemesterMappings[classId];

          if (semesters && semesters.size > 0) {
            // If semesters are selected for this class, add mapping for each semester
            semesters.forEach(semester => {
              mappingsToSave.push({ class_master_id: classId, semester });
            });
          } else {
            // If class is selected but no semester, add mapping with null semester (uncategorized)
            mappingsToSave.push({ class_master_id: classId, semester: null });
          }
        });

        await updateMaterialItemClassMappings(itemId, mappingsToSave);
      }

      onSuccess(itemId);
      onClose();
    } catch (error: any) {
      console.error('Error saving item:', error);
      setGeneralError(error.message || 'Gagal menyimpan item materi');
    } finally {
      setIsLoading(false);
    }
  };

  const typeOptions = types
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(type => ({
      value: type.id,
      label: type.name
      // label: type.name + (type.category ? ` (${type.category.name})` : ''),
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

        <div>
          {loadingData ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Memuat data kelas...</div>
          ) : (
            <div className="space-y-5">
              {/* Class Selection - Grid 2 columns */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Pilih Kelas & Semester</label>
                {classes.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic py-4 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                    Belum ada data kelas
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {classes.map((cls) => {
                      const isSelected = selectedClasses.has(cls.id);
                      const classSemesters = classSemesterMappings[cls.id] || new Set();

                      return (
                        <div
                          key={cls.id}
                          className={`relative flex flex-col gap-2 px-3 py-3 rounded-lg border transition-all ${isSelected
                            ? 'bg-blue-50 border-blue-400 dark:bg-blue-900/20 dark:border-blue-600 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-750'
                            }`}
                        >
                          {/* Class Checkbox */}
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleClassToggle(cls.id)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-500"
                            />
                            <span className={`text-sm flex-1 ${isSelected
                              ? 'text-blue-700 font-medium dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300'
                              }`}>
                              {cls.name}
                            </span>
                          </label>

                          {/* Semester Selection (Only if class is selected) */}
                          {isSelected && (
                            <div className="flex gap-2 ml-6 mt-1">
                              <button
                                type="button"
                                onClick={() => handleClassSemesterToggle(cls.id, 1)}
                                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${classSemesters.has(1)
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                                  }`}
                              >
                                Semester 1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleClassSemesterToggle(cls.id, 2)}
                                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${classSemesters.has(2)
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                                  }`}
                              >
                                Semester 2
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
