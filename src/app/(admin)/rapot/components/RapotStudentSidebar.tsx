'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';

interface Student {
    id: string;
    name: string;
    // nis?: string;
}

interface StudentReportSummary {
    student_id: string;
    isGenerated: boolean;
    isPublished: boolean;
    averageScore?: number;
}

interface RapotStudentSidebarProps {
    students: Student[];
    reports: StudentReportSummary[];
    selectedStudentId: string;
    onStudentSelect: (studentId: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    loading?: boolean;
    selectedClassName?: string;
}

export default function RapotStudentSidebar({
    students,
    reports,
    selectedStudentId,
    onStudentSelect,
    isOpen,
    onToggle,
    loading = false,
    selectedClassName = ''
}: RapotStudentSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Map reports for easier access
    const reportMap = useMemo(() => {
        return new Map(reports.map(r => [r.student_id, r]));
    }, [reports]);

    // Filter students by search query
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;

        const query = searchQuery.toLowerCase();
        return students.filter(s =>
            s.name.toLowerCase().includes(query)
        );
    }, [students, searchQuery]);

    const getScoreColor = (score?: number) => {
        if (!score) return 'text-gray-500';
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-blue-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

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
                    {/* Settings Button */}
                    <Link
                        href="/rapot/settings"
                        className={`hidden md:flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors`}
                        title="Pengaturan Rapot"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </Link>
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
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        [1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
                                </div>
                            </div>
                        ))
                    ) : filteredStudents.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <p>Tidak ada siswa ditemukan</p>
                        </div>
                    ) : (
                        filteredStudents.map(student => {
                            const report = reportMap.get(student.id);
                            const isSelected = student.id === selectedStudentId;
                            const initial = student.name.charAt(0).toUpperCase();

                            return (
                                <button
                                    key={student.id}
                                    onClick={() => {
                                        onStudentSelect(student.id);
                                        if (window.innerWidth < 768) onToggle();
                                    }}
                                    className={`
                                        w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3
                                        ${isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent'
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shrink-0
                                        ${isSelected ? 'bg-blue-600' : 'bg-gray-400'}
                                    `}>
                                        {initial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 dark:text-white truncate">
                                            {student.name}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            {report?.isGenerated ? (
                                                <span className={`font-medium ${getScoreColor(report.averageScore)}`}>
                                                    Rata-rata: {report.averageScore}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic">
                                                    Belum ada rapot
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {report?.isPublished && (
                                        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Published" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}
