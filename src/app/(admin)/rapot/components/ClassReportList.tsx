 'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getClasses } from '@/app/(admin)/monitoring/actions/classes';
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import { getClassReportsSummary } from '../actions';
import InputFilter from '@/components/form/input/InputFilter';

interface StudentSummary {
    student: {
        id: string;
        name: string;
        nis?: string;
    };
    reportId?: string;
    isGenerated: boolean;
    isPublished: boolean;
    generatedAt?: string;
    averageScore?: number;
}

export default function ClassReportList() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [academicYear, setAcademicYear] = useState<any>(null);
    const [semester, setSemester] = useState<number>(1); // Default, should be dynamic or from active year
    const [students, setStudents] = useState<StudentSummary[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [classesData, activeYear] = await Promise.all([
                getClasses(),
                getActiveAcademicYear()
            ]);

            setClasses(classesData || []);
            setAcademicYear(activeYear);
            if (activeYear) {
                // Determine semester from date or default to active year property if exists?
                // For now assuming active year might key off storage or context, but here we just take active one?
                // Actually `academicYear` usually doesn't have current semester info in DB plainly, 
                // but let's assume semester 1 or 2 is usually context dependent. 
                // I'll default to 1 for now or add a selector if needed.
                // In monitoring page, we likely assume active semester.
            }

            // Auto select first class if available
            if (classesData && classesData.length > 0) {
                setSelectedClassId(classesData[0].id);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedClassId && academicYear) {
            loadStudentData(selectedClassId);
        }
    }, [selectedClassId, academicYear, semester]);

    const loadStudentData = async (classId: string) => {
        if (!academicYear) return;

        try {
            setLoadingStudents(true);
            const data = await getClassReportsSummary(classId, academicYear.id, semester);
            setStudents(data);
        } catch (error) {
            console.error('Error loading students:', error);
            toast.error('Gagal memuat data siswa');
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleViewDetail = (studentId: string) => {
        router.push(`/rapot/${studentId}?semester=${semester}`);
    };

    const classOptions = classes.map(c => ({
        value: c.id,
        label: c.kelompok?.name ? `${c.name} (${c.kelompok.name})` : c.name
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        E-Rapor
                    </h1>
                    {academicYear && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Tahun Ajaran: {academicYear.name} - Semester {semester}
                        </p>
                    )}
                </div>

                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => router.push('/rapot/settings')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                        title="Pengaturan Rapot"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                    <select
                        value={semester}
                        onChange={(e) => setSemester(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                    >
                        <option value={1}>Semester 1</option>
                        <option value={2}>Semester 2</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="max-w-xs">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Pilih Kelas</label>
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        disabled={loading}
                    >
                        {classOptions.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Nama Siswa
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Status Rapot
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Rata-rata
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Aksi
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loadingStudents ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center">
                                    Loading data...
                                </td>
                            </tr>
                        ) : students.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                    Tidak ada jam pelajaran / siswa di kelas ini.
                                </td>
                            </tr>
                        ) : (
                            students.map((item) => (
                                <tr key={item.student.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {item.student.name}
                                        </div>
                                        {item.student.nis && (
                                            <div className="text-sm text-gray-500">
                                                NIS: {item.student.nis}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {item.isGenerated ? (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.isPublished
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                }`}>
                                                {item.isPublished ? 'Terbit' : 'Draft'}
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                Belum Dibuat
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                                        {item.averageScore ? item.averageScore.toFixed(2) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <button
                                            onClick={() => handleViewDetail(item.student.id)}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            {item.isGenerated ? 'Edit / Lihat' : 'Buat Rapot'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
