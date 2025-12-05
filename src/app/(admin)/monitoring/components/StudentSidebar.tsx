'use client';

import { getProgressColor } from '@/lib/percentages';
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
}

interface Material {
    id: string;
    name: string;
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
    selectedClassName = ''
}: StudentSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Calculate completion percentage for a student (average nilai)
    const getStudentCompletion = (studentId: string): number => {
        if (materials.length === 0) return 0;

        const studentProgress = materials
            .map(m => {
                const key = `${studentId}-${m.id}`;
                return progressData.get(key);
            })
            .filter(p => p?.nilai !== undefined && p.nilai > 0); // Only count scored materials

        if (studentProgress.length === 0) return 0;

        const totalNilai = studentProgress.reduce((sum, p) => sum + (p!.nilai || 0), 0);
        return Math.round(totalNilai / studentProgress.length);
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
                                    const completion = getStudentCompletion(student.id);
                                    const progressColor = getProgressColor(completion);
                                    const isSelected = student.id === selectedStudentId;
                                    const initial = student.name.charAt(0).toUpperCase();

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
                                                w-full text-left p-3 rounded-lg transition-colors
                                                ${isSelected
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold
                                                    ${isSelected ? 'bg-blue-600' : 'bg-gray-400'}
                                                `}>
                                                    {initial}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                                        {student.name}
                                                    </div>
                                                    {/* Commented until NIS ready 
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        NIS: {student.nis || '-'}
                                                    </div>
                                                    */}
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        Progress
                                                    </span>
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {completion}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${progressColor} transition-all duration-300`}
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
