'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import { MaterialItem, ClassMaster } from '../../types';
import { getAllClasses, bulkUpdateMaterialMapping } from '../../actions';
import { syncItemMonthlyTargetsBulk } from '../../actions/monthly-targets/actions';
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import { getSemesterMonths, getMonthName, type Semester, type Month } from '../../types';
import { toast } from 'sonner';

interface BulkMappingUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedItems: MaterialItem[];
    onSuccess: () => void;
}

export default function BulkMappingUpdateModal({ isOpen, onClose, selectedItems, onSuccess }: BulkMappingUpdateModalProps) {
    const [classes, setClasses] = useState<ClassMaster[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
    // Map classId -> Set of semesters (1 or 2)
    const [classSemesterMappings, setClassSemesterMappings] = useState<Record<string, Set<1 | 2>>>({});
    // Map classId -> semester -> Set of months
    const [classSemesterMonthMappings, setClassSemesterMonthMappings] = useState<Record<string, Record<number, Set<Month>>>>({});
    const [mode, setMode] = useState<'replace' | 'add'>('replace');
    const [activeAcademicYearId, setActiveAcademicYearId] = useState<string>('');

    const [isLoading, setIsLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [generalError, setGeneralError] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            loadData();
            // Reset selections
            setSelectedClasses(new Set());
            setClassSemesterMappings({});
            setClassSemesterMonthMappings({});
            setMode('replace');
            setGeneralError('');
        }
    }, [isOpen]);

    const loadData = async () => {
        try {
            setLoadingData(true);
            const classesData = await getAllClasses();
            setClasses(classesData);
            
            const activeYear = await getActiveAcademicYear();
            if (activeYear) {
                setActiveAcademicYearId(activeYear.id);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setGeneralError('Gagal memuat data kelas');
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
                // Also clear month mappings for this semester
                setClassSemesterMonthMappings(prevMonthMap => {
                    const classMonthMap = { ...prevMonthMap[classId] };
                    delete classMonthMap[semester];
                    return { ...prevMonthMap, [classId]: classMonthMap };
                });
            } else {
                newSet.add(semester);
            }
            return { ...prev, [classId]: newSet };
        });
    };

    const handleMonthToggle = (classId: string, semester: 1 | 2, month: Month) => {
        setClassSemesterMonthMappings(prev => {
            const classMap = prev[classId] || {};
            const semesterMap = classMap[semester] || new Set<Month>();
            const newSemesterMap = new Set(semesterMap);
            
            if (newSemesterMap.has(month)) {
                newSemesterMap.delete(month);
            } else {
                newSemesterMap.add(month);
            }
            
            return {
                ...prev,
                [classId]: {
                    ...classMap,
                    [semester]: newSemesterMap
                }
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneralError('');

        if (selectedClasses.size === 0) {
            setGeneralError('Pilih minimal satu kelas');
            return;
        }

        setIsLoading(true);

        try {
            const mappingsToSave: Array<{ class_master_id: string }> = [];

            selectedClasses.forEach(classId => {
                mappingsToSave.push({ class_master_id: classId });
            });

            const itemIds = selectedItems.map(i => i.id);
            await bulkUpdateMaterialMapping(itemIds, mappingsToSave, mode);

            // Save monthly targets
            const monthlyMappings: Array<{ class_master_id: string; semester: number; month: number }> = [];
            Object.entries(classSemesterMonthMappings).forEach(([classId, semesters]) => {
                if (!selectedClasses.has(classId)) return;
                
                Object.entries(semesters).forEach(([semStr, months]) => {
                    const semester = parseInt(semStr);
                    if (!classSemesterMappings[classId]?.has(semester as 1 | 2)) return;
                    
                    months.forEach(month => {
                        monthlyMappings.push({ class_master_id: classId, semester, month });
                    });
                });
            });

            if (monthlyMappings.length > 0 || mode === 'replace') {
                await syncItemMonthlyTargetsBulk(itemIds, monthlyMappings, mode);
            }

            toast.success(`${selectedItems.length} item materi berhasil diperbarui`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error bulk updating:', error);
            setGeneralError(error.message || 'Gagal memperbarui item materi');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg m-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Edit Massal ({selectedItems.length} Item)
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
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Mode Selection */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mode Update</label>
                    <div className="space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="mode"
                                value="replace"
                                checked={mode === 'replace'}
                                onChange={() => setMode('replace')}
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <div>
                                <span className="block text-sm font-medium text-gray-900 dark:text-white">Ganti Semua Mapping</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Menghapus semua penugasan kelas/semester yang ada pada item yang dipilih, lalu menggantinya dengan pilihan di bawah ini.
                                </span>
                            </div>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="mode"
                                value="add"
                                checked={mode === 'add'}
                                onChange={() => setMode('add')}
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <div>
                                <span className="block text-sm font-medium text-gray-900 dark:text-white">Tambah Mapping Baru</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Menambahkan penugasan kelas/semester baru tanpa menghapus yang sudah ada. Jika sudah ada, tidak akan diduplikasi.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                <div>
                    {loadingData ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">Memuat data kelas...</div>
                    ) : (
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Pilih Kelas & Semester Target</label>
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
                                                    <div className="flex flex-col gap-3 ml-6 mt-1">
                                                        {[1, 2].map(sem => {
                                                            const semester = sem as Semester;
                                                            const isSemSelected = classSemesters.has(semester);
                                                            const months = getSemesterMonths(semester);
                                                            const selectedMonths = classSemesterMonthMappings[cls.id]?.[semester] || new Set<Month>();
                                                            
                                                            return (
                                                                <div key={semester} className="flex flex-col gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleClassSemesterToggle(cls.id, semester)}
                                                                        className={`self-start px-3 py-1 text-xs font-medium rounded-full border transition-colors ${isSemSelected
                                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                                                                            }`}
                                                                    >
                                                                        Semester {semester}
                                                                    </button>
                                                                    
                                                                    {isSemSelected && (
                                                                        <div className="flex flex-wrap gap-1.5 ml-2">
                                                                            {months.map(month => {
                                                                                const isMonthSelected = selectedMonths.has(month);
                                                                                return (
                                                                                    <button
                                                                                        key={month}
                                                                                        type="button"
                                                                                        onClick={() => handleMonthToggle(cls.id, semester, month)}
                                                                                        className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${isMonthSelected
                                                                                            ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700'
                                                                                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-750'
                                                                                        }`}
                                                                                    >
                                                                                        {getMonthName(month)}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                        disabled={isLoading || loadingData || selectedClasses.size === 0}
                        loading={isLoading}
                        loadingText="Menyimpan..."
                        variant="primary"
                    >
                        Simpan Perubahan
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
