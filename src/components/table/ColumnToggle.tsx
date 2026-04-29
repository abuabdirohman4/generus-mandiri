'use client';

import { useState, useRef, useEffect } from 'react';

interface ColumnToggleProps<TKey extends string> {
    columns: Array<{ key: TKey; label: string }>;
    visibility: Record<TKey, boolean>;
    onChange: (visibility: Partial<Record<TKey, boolean>>) => void;
}

export default function ColumnToggle<TKey extends string>({ columns, visibility, onChange }: ColumnToggleProps<TKey>) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const visibleCount = columns.filter(c => visibility[c.key]).length;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 min-w-35 text-sm rounded-lg border transition-colors ${open
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-750'
                    }`}
                title="Atur kolom yang ditampilkan"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <span>Kolom</span>
                {visibleCount < columns.length && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                        {visibleCount}/{columns.length}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-35">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">
                        Tampilkan Kolom
                    </p>
                    <div className="space-y-1.5">
                        {columns.map(col => (
                            <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={visibility[col.key]}
                                    onChange={(e) => onChange({ [col.key]: e.target.checked } as Partial<Record<TKey, boolean>>)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                    {col.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
