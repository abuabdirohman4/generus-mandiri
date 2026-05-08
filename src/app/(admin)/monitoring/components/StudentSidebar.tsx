'use client';

import { getProgressColor, getGrade, getStatusColor, getStatusBgColor } from '@/lib/percentages';
import { useState, useMemo } from 'react';

interface Student {
    id: string;
    name: string;
    // nis?: string; // Commented until DB ready
}

interface Progress {
    student_id: string;
    material_item_id: string;
    nilai?: number;
    notes?: string;
    hafal?: boolean;
}

interface Material {
    id: string;
    name: string;
}

interface ClassMetrics {
    avgProgress: number
    avgNilai: number
    totalCount: number
}

interface StudentSidebarProps {
    students: Student[];
    selectedStudentId: string;
    onStudentSelect: (studentId: string) => void;
    progressData: Map<string, Progress>;
    materials: Material[];
    isOpen: boolean;
    onToggle: () => void;
    isLoading?: boolean;
    selectedClassName?: string;
    monthlyPercentages?: Map<string, number>;
    classMetrics?: ClassMetrics | null;
}

export default function StudentSidebar({
    students,
    selectedStudentId,
    onStudentSelect,
    progressData,
    materials,
    isOpen,
    onToggle,
    isLoading = false,
    selectedClassName = '',
    monthlyPercentages,
    classMetrics
}: StudentSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Calculate metrics for a student
    const getStudentMetrics = (studentId: string) => {
        if (materials.length === 0) return { completion: 0, avgNilai: 0, grade: '-' };

        const studentProgress = materials.map(m => {
            const key = `${studentId}-${m.id}`;
            return progressData.get(key);
        });

        // 1. Completion: materials that are "Tuntas" (Pass KKM 70 or marked as Hafal)
        const tuntasCount = studentProgress.filter(p => (p?.nilai !== undefined && p.nilai >= 70) || p?.hafal).length;
        const completion = Math.round((tuntasCount / materials.length) * 100);

        // 2. Average Nilai: only from filled materials
        const scoredProgress = studentProgress.filter(p => p?.nilai !== undefined && p.nilai > 0);
        const totalNilai = scoredProgress.reduce((sum, p) => sum + (p!.nilai || 0), 0);
        const avgNilai = scoredProgress.length > 0 ? Math.round(totalNilai / scoredProgress.length) : 0;

        return { completion, avgNilai };
    };

    // Filter students by search query
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;

        const query = searchQuery.toLowerCase();
        return students.filter(s =>
            s.name.toLowerCase().includes(query)
        );
    }, [students, searchQuery]);

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <div
                className={`
                    fixed lg:relative 
                    inset-y-0 left-0 
                    w-80 bg-white dark:bg-gray-800 
                    border-r border-gray-200 dark:border-gray-700
                    transform transition-transform duration-300 ease-in-out
                    z-99 lg:z-0 
                    flex flex-col
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Pilih Siswa
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedClassName} • {students.length} Siswa
                        </p>
                    </div>
                    <button
                        onClick={onToggle}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Class Summary Panel */}
                {classMetrics && (
                    <div className="px-4 pb-4 pt-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="grid grid-cols-3 gap-2">
                            <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2 text-center border border-transparent`}>
                                <div className={`text-lg font-bold mt-1 ${getStatusColor(classMetrics.avgProgress)}`}>
                                    {classMetrics.avgProgress}%
                                </div>
                                <div className={`text-[10px] font-bold text-gray-500 uppercase tracking-tight mt-1`}>Progress</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2 text-center border border-gray-100 dark:border-gray-700/50">
                                <div className="text-lg font-bold mt-1 text-gray-900 dark:text-white">
                                    {classMetrics.avgNilai > 0 ? classMetrics.avgNilai : '—'}
                                </div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tight mt-1">Nilai</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2 text-center border border-gray-100 dark:border-gray-700/50 flex flex-col items-center justify-center">
                                {(() => {
                                    const { grade, color } = getGrade(classMetrics.avgNilai);
                                    return (
                                        <>
                                            <div className={`text-lg font-black px-2 py-0.5 rounded-lg mb-1 ${grade !== '-' ? color : 'text-gray-400'}`}>
                                                {grade}
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Predikat</div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <svg
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama siswa..."
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>

                {/* Student List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                                            <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-full" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="p-8 text-center">
                            <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {searchQuery ? 'Siswa tidak ditemukan' : 'Tidak ada siswa'}
                            </p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredStudents
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(student => {
                                    const { completion, avgNilai } = getStudentMetrics(student.id);
                                    const progressColor = getProgressColor(completion);
                                    const { grade, color: gradeColor } = getGrade(avgNilai);
                                    const isSelected = student.id === selectedStudentId;
                                    const initial = student.name.charAt(0).toUpperCase();
                                    const monthlyTarget = monthlyPercentages?.get(student.id);
                                    const hasCompletedMonthly = monthlyTarget !== undefined && monthlyTarget >= 100;

                                    return (
                                        <button
                                            key={student.id}
                                            onClick={() => {
                                                onStudentSelect(student.id);
                                                // Close sidebar on mobile after selection
                                                if (window.innerWidth < 768) {
                                                    onToggle();
                                                }
                                            }}
                                            className={`
                                                w-full text-left p-3 rounded-xl transition-all duration-200
                                                ${isSelected
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 shadow-sm'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`
                                                    w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm
                                                    ${isSelected ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}
                                                `}>
                                                    {initial}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                                                        <span className="truncate">{student.name}</span>
                                                        {hasCompletedMonthly && (
                                                            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Metrics Row */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                            Progress
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                            {completion}%
                                                        </span>
                                                    </div>
                                                    
                                                    {avgNilai > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                                {avgNilai}
                                                            </span>
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${gradeColor}`}>
                                                                {grade}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${progressColor} transition-all duration-500 ease-out`}
                                                        style={{ width: `${completion}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
