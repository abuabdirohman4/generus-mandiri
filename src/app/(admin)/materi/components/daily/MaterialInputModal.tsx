'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/button/Button';
import { getMonthName, Month, MaterialType, DayMaterialAssignment } from '../../types';
import Modal from '@/components/ui/modal';
import MaterialTypeSelector from './MaterialTypeSelector';
import MaterialItemSelector from './MaterialItemSelector';
import { 
  saveDayMaterialAssignment, 
  getDayMaterialAssignments,
  deleteDayMaterialAssignment 
} from '../../actions';

interface MaterialInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  classMasterId: string;
  semester: number;
  month: number;
  week: number;
  dayOfWeek: number;
  dayName: string;
}

interface AssignmentState {
  material_type_id: string;
  material_type?: MaterialType;
  notes?: string;
  items: Array<{
    material_item_id: string;
    display_order: number;
    custom_content?: string;
  }>;
}

export function MaterialInputModal({
  isOpen,
  onClose,
  classMasterId,
  semester,
  month,
  week,
  dayOfWeek,
  dayName,
}: MaterialInputModalProps) {
  const [assignments, setAssignments] = useState<AssignmentState[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>();
  const [editingAssignmentIndex, setEditingAssignmentIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showAddAssignment, setShowAddAssignment] = useState(false);

  // Load existing assignments
  useEffect(() => {
    if (isOpen && classMasterId) {
      loadExistingAssignments();
    } else {
      // Reset when modal closes
      setAssignments([]);
      setSelectedTypeId(undefined);
      setEditingAssignmentIndex(null);
      setShowAddAssignment(false);
    }
  }, [isOpen, classMasterId, semester, month, week, dayOfWeek]);

  const loadExistingAssignments = async () => {
    try {
      setLoadingData(true);
      const data = await getDayMaterialAssignments({
        class_master_id: classMasterId,
        semester,
        month,
        week,
        day_of_week: dayOfWeek,
      });

      if (data && data.length > 0) {
        const loadedAssignments: AssignmentState[] = data.map((assignment: DayMaterialAssignment) => ({
          material_type_id: assignment.material_type_id,
          material_type: assignment.material_type,
          notes: assignment.notes || undefined,
          items: assignment.items?.map((item: any) => ({
            material_item_id: item.material_item_id,
            display_order: item.display_order,
            custom_content: item.custom_content || undefined,
          })) || [],
        }));
        setAssignments(loadedAssignments);
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleTypeSelect = (materialType: MaterialType | null) => {
    if (!materialType) {
      setSelectedTypeId(undefined);
      return;
    }

    // Check if this type is already assigned
    const existingIndex = assignments.findIndex(a => a.material_type_id === materialType.id);
    if (existingIndex !== -1) {
      // Switch to editing existing assignment
      setEditingAssignmentIndex(existingIndex);
      setSelectedTypeId(materialType.id);
      setShowAddAssignment(false);
    } else {
      // Create new assignment
      const newAssignment: AssignmentState = {
        material_type_id: materialType.id,
        material_type: materialType,
        items: [],
      };
      setAssignments([...assignments, newAssignment]);
      setEditingAssignmentIndex(assignments.length);
      setSelectedTypeId(materialType.id);
      setShowAddAssignment(false);
    }
  };

  const handleItemsChange = (items: Array<{
    material_item_id: string;
    display_order: number;
    custom_content?: string;
  }>) => {
    if (editingAssignmentIndex === null) return;

    const updatedAssignments = [...assignments];
    updatedAssignments[editingAssignmentIndex] = {
      ...updatedAssignments[editingAssignmentIndex],
      items,
    };
    setAssignments(updatedAssignments);
  };

  const handleRemoveAssignment = async (index: number) => {
    const assignment = assignments[index];
    
    // If it's an existing assignment (has been saved), delete from database
    if (assignment.material_type_id) {
      try {
        // We need to find the assignment ID from the loaded data
        const existingAssignments = await getDayMaterialAssignments({
          class_master_id: classMasterId,
          semester,
          month,
          week,
          day_of_week: dayOfWeek,
        });
        
        const existingAssignment = existingAssignments.find(
          (a: DayMaterialAssignment) => a.material_type_id === assignment.material_type_id
        );
        
        if (existingAssignment) {
          await deleteDayMaterialAssignment(existingAssignment.id);
        }
      } catch (error) {
        console.error('Error deleting assignment:', error);
        toast.error('Gagal menghapus assignment');
        return;
      }
    }

    // Remove from state
    const updatedAssignments = assignments.filter((_, i) => i !== index);
    setAssignments(updatedAssignments);
    
    if (editingAssignmentIndex === index) {
      setEditingAssignmentIndex(null);
      setSelectedTypeId(undefined);
    } else if (editingAssignmentIndex !== null && editingAssignmentIndex > index) {
      setEditingAssignmentIndex(editingAssignmentIndex - 1);
    }
  };

  const handleSave = async () => {
    if (assignments.length === 0) {
      toast.error('Minimal satu jenis materi harus dipilih');
      return;
    }

    try {
      setLoading(true);

      // Save all assignments
      for (const assignment of assignments) {
        if (assignment.items.length === 0) {
          toast.warning(`Jenis materi "${assignment.material_type?.name}" belum memiliki item`);
          continue;
        }

        await saveDayMaterialAssignment({
          class_master_id: classMasterId,
          semester,
          month,
          week,
          day_of_week: dayOfWeek,
          material_type_id: assignment.material_type_id,
          notes: assignment.notes,
          items: assignment.items,
        });
      }

      toast.success('Materi berhasil disimpan');
      // Reload assignments to get fresh data
      await loadExistingAssignments();
      onClose();
    } catch (error) {
      console.error('Error saving material:', error);
      toast.error('Gagal menyimpan materi');
    } finally {
      setLoading(false);
    }
  };

  const currentAssignment = editingAssignmentIndex !== null ? assignments[editingAssignmentIndex] : null;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[900px] m-4">
      <div className="w-full max-h-[90vh] flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Input Materi</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {dayName} - Minggu {week} - {getMonthName(month as Month)} - Semester {semester}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] grow">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Existing Assignments */}
              {assignments.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Materi yang Ditambahkan</h3>
                    <button
                      onClick={() => {
                        setShowAddAssignment(true);
                        setEditingAssignmentIndex(null);
                        setSelectedTypeId(undefined);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      + Tambah Materi
                    </button>
                  </div>

                  {/* Assignment Tabs */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {assignments.map((assignment, index) => (
                      <div key={assignment.material_type_id} className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAssignmentIndex(index);
                            setSelectedTypeId(assignment.material_type_id);
                            setShowAddAssignment(false);
                          }}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            editingAssignmentIndex === index
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {assignment.material_type?.name || 'Unknown'}
                          {assignment.items.length > 0 && (
                            <span className="ml-2 text-xs opacity-75">
                              ({assignment.items.length} item)
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveAssignment(index)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Hapus materi"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add/Edit Assignment */}
              {showAddAssignment || editingAssignmentIndex !== null ? (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {editingAssignmentIndex !== null ? 'Edit Materi' : 'Tambah Materi Baru'}
                    </h3>
                    {editingAssignmentIndex === null && (
                      <button
                        onClick={() => {
                          setShowAddAssignment(false);
                          setSelectedTypeId(undefined);
                        }}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Batal
                      </button>
                    )}
                  </div>

                  {/* Material Type Selector */}
                  {editingAssignmentIndex === null && (
                    <div className="mb-6">
                      <MaterialTypeSelector
                        selectedTypeId={selectedTypeId}
                        onSelect={handleTypeSelect}
                      />
                    </div>
                  )}

                  {/* Material Item Selector */}
                  {currentAssignment && (
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                          Catatan (Opsional)
                        </label>
                        <textarea
                          value={currentAssignment.notes || ''}
                          onChange={(e) => {
                            const updated = [...assignments];
                            updated[editingAssignmentIndex!].notes = e.target.value;
                            setAssignments(updated);
                          }}
                          placeholder="Catatan khusus untuk materi ini..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <MaterialItemSelector
                        materialTypeId={currentAssignment.material_type_id}
                        classMasterId={classMasterId}
                        selectedItems={currentAssignment.items}
                        onChange={handleItemsChange}
                      />
                    </div>
                  )}
                </div>
              ) : assignments.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 dark:text-gray-500 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Belum ada materi
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Tambahkan jenis materi untuk mulai mengisi konten
                  </p>
                  <button
                    onClick={() => setShowAddAssignment(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    + Tambah Materi Pertama
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <Button
              onClick={onClose}
              disabled={loading}
              variant="outline"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || loadingData}
              variant="primary"
              loading={loading}
              loadingText="Menyimpan..."
            >
              Simpan
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
