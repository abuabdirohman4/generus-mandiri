'use client';

import { useState, useEffect } from 'react';
import { AcademicYear, AcademicYearInput } from './types';
import {
    getAcademicYears,
    createAcademicYear,
    updateAcademicYear,
    setActiveAcademicYear,
    deleteAcademicYear
} from './actions/academic-years';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';

export default function AcademicYearsPage() {
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; year: AcademicYear | null }>({
        isOpen: false,
        year: null
    });

    useEffect(() => {
        loadYears();
    }, []);

    const loadYears = async () => {
        try {
            setLoading(true);
            const data = await getAcademicYears();
            setYears(data);
        } catch (error: any) {
            toast.error(error.message || 'Gagal memuat data tahun ajaran');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingYear(null);
        setModalOpen(true);
    };

    const handleEdit = (year: AcademicYear) => {
        setEditingYear(year);
        setModalOpen(true);
    };

    const handleSetActive = async (year: AcademicYear) => {
        try {
            await setActiveAcademicYear(year.id);
            toast.success(`Tahun ajaran ${year.name} berhasil diaktifkan`);
            await loadYears();
        } catch (error: any) {
            toast.error(error.message || 'Gagal mengaktifkan tahun ajaran');
        }
    };

    const handleDelete = (year: AcademicYear) => {
        setDeleteConfirm({ isOpen: true, year });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.year) return;

        try {
            await deleteAcademicYear(deleteConfirm.year.id);
            toast.success(`Tahun ajaran ${deleteConfirm.year.name} berhasil dihapus`);
            setDeleteConfirm({ isOpen: false, year: null });
            await loadYears();
        } catch (error: any) {
            toast.error(error.message || 'Gagal menghapus tahun ajaran');
        }
    };

    const handleSuccess = async () => {
        setModalOpen(false);
        setEditingYear(null);
        await loadYears();
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900">
            <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tahun Ajaran</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Kelola tahun ajaran dan periode akademik
                        </p>
                    </div>
                    <Button onClick={handleCreate} variant="primary">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah
                    </Button>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
                        </div>
                    ) : years.length === 0 ? (
                        <div className="p-12 text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Belum ada tahun ajaran</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Mulai dengan menambahkan tahun ajaran pertama
                            </p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Tahun Ajaran
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Periode
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {years.map((year) => (
                                    <tr key={year.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {year.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(year.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                {' - '}
                                                {new Date(year.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {year.is_active ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                    Tidak Aktif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                {!year.is_active && (
                                                    <button
                                                        onClick={() => handleSetActive(year)}
                                                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                                        title="Aktifkan"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(year)}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                    title="Edit"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(year)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    title="Hapus"
                                                    disabled={year.is_active}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Create/Edit Modal */}
                <AcademicYearModal
                    isOpen={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingYear(null);
                    }}
                    year={editingYear}
                    onSuccess={handleSuccess}
                />

                {/* Delete Confirmation */}
                <ConfirmModal
                    isOpen={deleteConfirm.isOpen}
                    onClose={() => setDeleteConfirm({ isOpen: false, year: null })}
                    onConfirm={confirmDelete}
                    title="Hapus Tahun Ajaran"
                    message={`Apakah Anda yakin ingin menghapus tahun ajaran "${deleteConfirm.year?.name}"? Tindakan ini tidak dapat dibatalkan.`}
                    confirmText="Hapus"
                    cancelText="Batal"
                    isDestructive={true}
                />
            </div>
        </div>
    );
}

// Modal Component
interface AcademicYearModalProps {
    isOpen: boolean;
    onClose: () => void;
    year: AcademicYear | null;
    onSuccess: () => void;
}

function AcademicYearModal({ isOpen, onClose, year, onSuccess }: AcademicYearModalProps) {
    const [formData, setFormData] = useState<AcademicYearInput>({
        name: '',
        start_year: new Date().getFullYear(),
        end_year: new Date().getFullYear() + 1,
        start_date: '',
        end_date: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            if (year) {
                setFormData({
                    name: year.name,
                    start_year: year.start_year,
                    end_year: year.end_year,
                    start_date: year.start_date,
                    end_date: year.end_date
                });
            } else {
                const currentYear = new Date().getFullYear();
                setFormData({
                    name: `${currentYear}/${currentYear + 1}`,
                    start_year: currentYear,
                    end_year: currentYear + 1,
                    start_date: `${currentYear}-07-01`,
                    end_date: `${currentYear + 1}-06-30`
                });
            }
            setErrors({});
        }
    }, [isOpen, year]);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) newErrors.name = 'Nama tahun ajaran wajib diisi';
        if (!formData.start_date) newErrors.start_date = 'Tanggal mulai wajib diisi';
        if (!formData.end_date) newErrors.end_date = 'Tanggal selesai wajib diisi';
        if (formData.end_year !== formData.start_year + 1) {
            newErrors.end_year = 'Tahun akhir harus 1 tahun setelah tahun awal';
        }
        if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
            newErrors.end_date = 'Tanggal selesai harus setelah tanggal mulai';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            if (year) {
                await updateAcademicYear(year.id, formData);
                toast.success('Tahun ajaran berhasil diperbarui');
            } else {
                await createAcademicYear(formData);
                toast.success('Tahun ajaran berhasil ditambahkan');
            }
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Gagal menyimpan tahun ajaran');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {year ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nama Tahun Ajaran <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="2024/2025"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tahun Awal <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.start_year}
                            onChange={(e) => {
                                const startYear = parseInt(e.target.value);
                                setFormData({
                                    ...formData,
                                    start_year: startYear,
                                    end_year: startYear + 1,
                                    name: `${startYear}/${startYear + 1}`
                                });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tahun Akhir
                        </label>
                        <input
                            type="number"
                            value={formData.end_year}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tanggal Mulai <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tanggal Selesai <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" onClick={onClose} variant="outline" disabled={loading}>
                        Batal
                    </Button>
                    <Button type="submit" variant="primary" loading={loading} loadingText="Menyimpan...">
                        {year ? 'Perbarui' : 'Simpan'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
