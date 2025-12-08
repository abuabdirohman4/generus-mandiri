'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUserProfile } from '@/stores/userProfileStore';
import {
    getReportTemplates,
    createReportTemplate,
    updateReportTemplate,
    getTemplateSubjects
} from '../../actions';
import { getClasses } from '@/app/(admin)/monitoring/actions/classes';
import { ReportTemplate, ReportSubject, ReportTemplateInput } from '../../types';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPageClient() {
    const { profile: userProfile } = useUserProfile();
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<ReportSubject[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState<ReportTemplateInput>({
        name: '',
        is_active: true,
        subject_ids: []
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Load Templates, Classes, and Subjects in parallel
            const [templatesData, classesData, subjectsRes] = await Promise.all([
                getReportTemplates(undefined, undefined, true),
                getClasses(),
                supabase.from('report_subjects').select('*').order('display_order')
            ]);

            setTemplates(templatesData);
            setClasses(classesData || []);

            if (subjectsRes.error) throw subjectsRes.error;
            setSubjects(subjectsRes.data || []);

        } catch (error: any) {
            console.error('Error loading settings data:', error);
            toast.error('Gagal memuat data pengaturan');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setFormData({
            name: '',
            is_active: true,
            subject_ids: []
        });
        setSelectedTemplate(null);
        setIsEditing(true);
    };

    const handleEdit = async (template: ReportTemplate) => {
        try {
            // Load fresh subjects for this template
            const templateSubjects = await getTemplateSubjects(template.id);

            setFormData({
                name: template.name,
                class_id: template.class_id || undefined,
                academic_year_id: template.academic_year_id || undefined,
                is_active: template.is_active,
                subject_ids: templateSubjects.map(s => s.id)
            });
            setSelectedTemplate(template);
            setIsEditing(true);
        } catch (error) {
            toast.error('Gagal memuat detail template');
        }
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('Nama template harus diisi');
            return;
        }

        try {
            if (selectedTemplate) {
                await updateReportTemplate(selectedTemplate.id, formData);
                toast.success('Template berhasil diperbarui');
            } else {
                await createReportTemplate(formData);
                toast.success('Template berhasil dibuat');
            }
            setIsEditing(false);
            loadData(); // Reload list
        } catch (error: any) {
            toast.error(error.message || 'Gagal menyimpan template');
        }
    };

    const toggleSubject = (subjectId: string) => {
        const currentIds = formData.subject_ids || [];
        if (currentIds.includes(subjectId)) {
            setFormData({
                ...formData,
                subject_ids: currentIds.filter(id => id !== subjectId)
            });
        } else {
            setFormData({
                ...formData,
                subject_ids: [...currentIds, subjectId]
            });
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading settings...</div>;
    }

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedTemplate ? 'Edit Template' : 'Buat Template Baru'}
                    </h2>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        Batal
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nama Template
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                placeholder="Contoh: Rapot Kelas 1 (Umum)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Berlaku Untuk Kelas (Opsional)
                            </label>
                            <select
                                value={formData.class_id || ''}
                                onChange={(e) => setFormData({ ...formData, class_id: e.target.value || undefined })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                                <option value="">Semua Kelas (Global)</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                Kosongkan jika template ini bisa digunakan untuk semua kelas.
                            </p>
                        </div>
                    </div>

                    {/* Subjects Selection */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Mata Pelajaran yang Ditampilkan
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {subjects.map((subject) => (
                                <label
                                    key={subject.id}
                                    className={`
                                        flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                                        ${(formData.subject_ids || []).includes(subject.id)
                                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}
                                    `}
                                >
                                    <input
                                        type="checkbox"
                                        checked={(formData.subject_ids || []).includes(subject.id)}
                                        onChange={() => toggleSubject(subject.id)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {subject.display_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Code: {subject.code}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Simpan Template
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Templates
                </h1>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Buat Template
                </button>
            </div>

            {/* Template List */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                    {template.name}
                                </h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${template.class
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    }`}>
                                    {template.class ? template.class.name : 'Global Template'}
                                </span>
                            </div>
                            <button
                                onClick={() => handleEdit(template)}
                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        </div>

                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            <p>{template.subjects?.length || 0} Mata Pelajaran</p>
                        </div>
                    </div>
                ))}

                {templates.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">Belum ada template rapot</p>
                        <p className="text-sm">Buat template baru untuk mulai generate rapot siswa</p>
                    </div>
                )}
            </div>
        </div>
    );
}
