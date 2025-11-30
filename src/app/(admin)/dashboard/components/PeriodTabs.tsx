'use client';

import { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/id';
import DatePickerInput from '@/components/form/input/DatePicker';

// Set Indonesian locale
dayjs.locale('id');

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
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

    // Initialize dateRange from customDateRange prop
    useEffect(() => {
        if (customDateRange && customDateRange.start && customDateRange.end) {
            setDateRange([
                dayjs(customDateRange.start),
                dayjs(customDateRange.end)
            ]);
        }
    }, [customDateRange]);

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

            {/* Custom Date Picker - Always visible when custom is selected */}
            {showCustomPicker && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                        <DatePickerInput
                            mode="single"
                            label="Tanggal Mulai"
                            value={dateRange[0]}
                            onChange={(date) => {
                                const newRange: [Dayjs | null, Dayjs | null] = [date, dateRange[1]];
                                setDateRange(newRange);
                                // Auto-apply when both dates are selected
                                if (date && dateRange[1] && onCustomDateChange) {
                                    onCustomDateChange(
                                        date.format('YYYY-MM-DD'),
                                        dateRange[1].format('YYYY-MM-DD')
                                    );
                                }
                            }}
                            format="DD/MM/YYYY"
                            placeholder="Pilih Tanggal"
                        />

                        <DatePickerInput
                            mode="single"
                            label="Tanggal Akhir"
                            value={dateRange[1]}
                            onChange={(date) => {
                                const newRange: [Dayjs | null, Dayjs | null] = [dateRange[0], date];
                                setDateRange(newRange);
                                // Auto-apply when both dates are selected
                                if (dateRange[0] && date && onCustomDateChange) {
                                    onCustomDateChange(
                                        dateRange[0].format('YYYY-MM-DD'),
                                        date.format('YYYY-MM-DD')
                                    );
                                }
                            }}
                            format="DD/MM/YYYY"
                            placeholder="Pilih Tanggal"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
