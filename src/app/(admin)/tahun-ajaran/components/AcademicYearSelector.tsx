'use client';

import { useState, useEffect } from 'react';
import { AcademicYear } from '../types';
import { getAcademicYears } from '../actions/academic-years';

interface AcademicYearSelectorProps {
    selectedYearId?: string;
    selectedSemester?: 1 | 2;
    onYearChange: (yearId: string) => void;
    onSemesterChange: (semester: 1 | 2) => void;
    showSemester?: boolean;
    className?: string;
}

export default function AcademicYearSelector({
    selectedYearId,
    selectedSemester = 1,
    onYearChange,
    onSemesterChange,
    showSemester = true,
    className = ''
}: AcademicYearSelectorProps) {
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadYears();
    }, []);

    const loadYears = async () => {
        try {
            const data = await getAcademicYears();
            setYears(data);

            // Auto-select active year if no selection
            if (!selectedYearId && data.length > 0) {
                const activeYear = data.find(y => y.is_active) || data[0];
                onYearChange(activeYear.id);
            }
        } catch (error) {
            console.error('Error loading years:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`flex gap-3 ${className}`}>
                <div className="flex-1 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                {showSemester && (
                    <div className="w-40 animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`flex gap-3 ${className}`}>
            {/* Year Selector */}
            <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tahun Ajaran
                </label>
                <select
                    value={selectedYearId || ''}
                    onChange={(e) => onYearChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                    {years.length === 0 ? (
                        <option value="">Belum ada tahun ajaran</option>
                    ) : (
                        years.map(year => (
                            <option key={year.id} value={year.id}>
                                {year.name} {year.is_active && '(Aktif)'}
                            </option>
                        ))
                    )}
                </select>
            </div>

            {/* Semester Selector */}
            {showSemester && (
                <div className="w-40">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Semester
                    </label>
                    <select
                        value={selectedSemester}
                        onChange={(e) => onSemesterChange(Number(e.target.value) as 1 | 2)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value={1}>Semester 1</option>
                        <option value={2}>Semester 2</option>
                    </select>
                </div>
            )}
        </div>
    );
}
