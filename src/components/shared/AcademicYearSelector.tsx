'use client';

import { useState, useEffect } from 'react';
import { getAcademicYears } from '@/app/(admin)/tahun-ajaran/actions/academic-years';
import InputFilter from '@/components/form/input/InputFilter';

interface AcademicYearSelectorProps {
    selectedYearId: string;
    selectedSemester: 1 | 2;
    onYearChange: (yearId: string) => void;
    onSemesterChange: (semester: 1 | 2) => void;
    showSemester?: boolean;
    variant?: 'page' | 'modal';
    compact?: boolean;
    className?: string;
}

export default function AcademicYearSelector({
    selectedYearId,
    selectedSemester,
    onYearChange,
    onSemesterChange,
    showSemester = true,
    variant = 'modal',
    compact = true,
    className = ''
}: AcademicYearSelectorProps) {
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAcademicYears();
    }, []);

    const loadAcademicYears = async () => {
        try {
            setLoading(true);
            const years = await getAcademicYears();
            setAcademicYears(years);
        } catch (error) {
            console.error('Failed to load academic years:', error);
        } finally {
            setLoading(false);
        }
    };

    const semesterOptions = [
        { value: '1', label: 'Semester 1' },
        { value: '2', label: 'Semester 2' }
    ];

    const yearOptions = academicYears.map(year => ({
        value: year.id,
        label: year.name
    }));

    if (loading) {
        return (
            <div className={`flex gap-4 ${className}`}>
                <div className="flex-1 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                {showSemester && (
                    <div className="w-40 animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`flex gap-4 ${className}`}>
            <div className="flex-1">
                <InputFilter
                    id="academic-year"
                    label="Tahun Ajaran"
                    value={selectedYearId}
                    onChange={onYearChange}
                    options={yearOptions}
                    placeholder="Pilih Tahun Ajaran"
                    variant={variant}
                    compact={compact}
                />
            </div>

            {showSemester && (
                <div className="w-40">
                    <InputFilter
                        id="semester"
                        label="Semester"
                        value={selectedSemester.toString()}
                        onChange={(value) => onSemesterChange(parseInt(value) as 1 | 2)}
                        options={semesterOptions}
                        variant={variant}
                        compact={compact}
                    />
                </div>
            )}
        </div>
    );
}
