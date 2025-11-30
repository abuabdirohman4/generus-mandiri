'use client';

import { useState } from 'react';

export type PeriodType = 'today' | 'week' | 'month' | 'custom';

interface PeriodTabsProps {
    selected: PeriodType;
    onChange: (period: PeriodType) => void;
    customDateRange?: { start: string; end: string };
    onCustomDateChange?: (start: string, end: string) => void;
}

export default function PeriodTabs({
    selected,
    onChange,
    customDateRange,
    onCustomDateChange
}: PeriodTabsProps) {
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [startDate, setStartDate] = useState(customDateRange?.start || '');
    const [endDate, setEndDate] = useState(customDateRange?.end || '');

    const tabs: { value: PeriodType; label: string }[] = [
        { value: 'today', label: 'Hari Ini' },
        { value: 'week', label: 'Minggu Ini' },
        { value: 'month', label: 'Bulan Ini' },
        { value: 'custom', label: 'Custom' }
    ];

    const handleTabClick = (value: PeriodType) => {
        if (value === 'custom') {
            setShowCustomPicker(true);
            onChange(value);
        } else {
            setShowCustomPicker(false);
            onChange(value);
        }
    };

    const handleApplyCustom = () => {
        if (startDate && endDate && onCustomDateChange) {
            onCustomDateChange(startDate, endDate);
            onChange('custom');
            setShowCustomPicker(false);
        }
    };

    return (
        <div className="mb-6">
            {/* Tab Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => handleTabClick(tab.value)}
                        className={`py-2 rounded-lg shadow-sm font-medium transition-colors ${selected === tab.value
                                ? 'bg-brand-500 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Custom Date Picker */}
            {showCustomPicker && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tanggal Mulai
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tanggal Akhir
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={handleApplyCustom}
                            disabled={!startDate || !endDate}
                            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Terapkan
                        </button>
                        <button
                            onClick={() => setShowCustomPicker(false)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
