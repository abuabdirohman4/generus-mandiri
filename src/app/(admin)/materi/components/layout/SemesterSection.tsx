'use client';

import { MaterialItem, MaterialType } from '../../types';

interface SemesterSectionProps {
    classId: string;
    semester: 1 | 2 | null;
    items: MaterialItem[];
    isExpanded: boolean;
    onToggle: () => void;
    getTypesForSemester: (classId: string, semester: 1 | 2 | null) => MaterialType[];
    getItemCountForType: (classId: string, typeId: string, semester: 1 | 2 | null) => number;
    onTypeClick: (classId: string, typeId: string, semester: 1 | 2 | null) => void;
    selectedTypeId: string | null;
    selectedSemester: 1 | 2 | null;
    isUncategorized?: boolean;
}

export const SemesterSection = ({
    classId,
    semester,
    items,
    isExpanded,
    onToggle,
    getTypesForSemester,
    getItemCountForType,
    onTypeClick,
    selectedTypeId,
    selectedSemester,
    isUncategorized = false
}: SemesterSectionProps) => {
    const types = getTypesForSemester(classId, semester);

    const icon = isUncategorized ? '⚠️' : '📅';
    const label = isUncategorized
        ? 'Belum Dikategorikan'
        : `Semester ${semester}`;
    const colorClass = isUncategorized
        ? 'text-amber-600 dark:text-amber-500'
        : 'text-gray-700 dark:text-gray-300';

    return (
        <div>
            {/* Semester Header */}
            <div
                onClick={onToggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isExpanded
                        ? 'bg-gray-50 dark:bg-gray-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    } ${colorClass}`}
            >
                {/* Chevron */}
                <svg
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>

                {/* Icon */}
                <span>{icon}</span>

                {/* Label */}
                <span className="flex-1 text-sm font-medium">{label}</span>

                {/* Count */}
                <span className={`text-xs px-2 py-0.5 rounded ${isUncategorized
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                    {items.length}
                </span>
            </div>

            {/* Types (nested) */}
            {isExpanded && types.length > 0 && (
                <div className="ml-5 mt-1 space-y-1">
                    {types
                        .sort((a, b) => a.display_order - b.display_order)
                        .map(type => {
                            const count = getItemCountForType(classId, type.id, semester);
                            const isSelected = selectedTypeId === type.id && selectedSemester === semester;

                            return (
                                <div
                                    key={type.id}
                                    onClick={() => onTypeClick(classId, type.id, semester)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    {/* List Icon */}
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>

                                    {/* Type Name */}
                                    <span className="flex-1 text-sm">{type.name}</span>

                                    {/* Count */}
                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                        {count}
                                    </span>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
};
