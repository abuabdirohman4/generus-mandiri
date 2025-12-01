'use client';

import { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/id';
import DatePickerInput from '@/components/form/input/DatePicker';
import InputFilter from '@/components/form/input/InputFilter';

// Set Indonesian locale
dayjs.locale('id');

export type PeriodType = 'today' | 'week' | 'month' | 'custom';

interface PeriodTabsProps {
    selected: PeriodType;
    onChange: (period: PeriodType) => void;
    customDateRange?: { start: string; end: string };
    onCustomDateChange?: (start: string, end: string) => void;
    // New props for dynamic date selectors
    selectedDate?: string;
    onDateChange?: (date: string) => void;
    selectedWeekOffset?: number;
    onWeekOffsetChange?: (offset: number) => void;
    selectedMonth?: string;
    onMonthChange?: (month: string) => void;
}

export default function PeriodTabs({
    selected,
    onChange,
    customDateRange,
    onCustomDateChange,
    selectedDate,
    onDateChange,
    selectedWeekOffset = 0,
    onWeekOffsetChange,
    selectedMonth,
    onMonthChange
}: PeriodTabsProps) {
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

    // Function to check if a date is today or yesterday
    const checkDay = (dateStr: string) => {
        const selected = dayjs(dateStr);
        const today = dayjs();
        const yesterday = dayjs().subtract(1, 'day');

        // Parameter kedua 'day' penting agar jam/menit diabaikan (hanya cek tanggal)
        if (selected.isSame(today, 'day')) {
            return "Hari Ini";
        }

        if (selected.isSame(yesterday, 'day')) {
            return "Kemarin";
        }

        // Jika bukan keduanya, kembalikan tanggal biasa
        return selected.format('dddd, D MMMM'); 
    }

    // Generate week options (current week + 3 past weeks)
    const weekOptions = Array.from({ length: 4 }, (_, i) => {
        const startOfWeek = dayjs().subtract(i, 'week').startOf('week');
        const endOfWeek = dayjs().subtract(i, 'week').endOf('week');
        return {
            value: i.toString(),
            label: `${startOfWeek.format('D MMMM')} - ${endOfWeek.format('D MMMM')}`
        };
    });

    // Generate month options (current month + 11 past months)
    const monthOptions = Array.from({ length: 6 }, (_, i) => {
        const date = dayjs().subtract(i, 'month');
        return {
            value: date.format('YYYY-MM'),
            label: date.format('MMMM YYYY')
        };
    });

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
        // { value: 'custom', label: 'Custom' }
    ];

    const handleTabClick = (value: PeriodType) => {
        if (value === 'custom') {
            setShowCustomPicker(true);
            onChange(value);
        } else {
            setShowCustomPicker(false);
            onChange(value);

            // Reset selectors to default when changing tabs
            if (value === 'today' && onDateChange) {
                onDateChange(dayjs().format('YYYY-MM-DD'));
            } else if (value === 'week' && onWeekOffsetChange) {
                onWeekOffsetChange(0);
            } else if (value === 'month' && onMonthChange) {
                onMonthChange(dayjs().format('YYYY-MM'));
            }
        }
    };

    return (
        <div className="mb-6">
            {/* Tab Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
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

            {/* Date Navigator for "Hari Ini" */}
            {selected === 'today' && onDateChange && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={() => {
                                const prevDate = dayjs(selectedDate || undefined).subtract(1, 'day');
                                onDateChange(prevDate.format('YYYY-MM-DD'));
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 shadow dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="flex-1 text-center">
                            <div className="text-md font-semibold">
                                {checkDay(dayjs(selectedDate || undefined).format('YYYY-MM-DD'))}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                const nextDate = dayjs(selectedDate || undefined).add(1, 'day');
                                onDateChange(nextDate.format('YYYY-MM-DD'));
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 shadow dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Week Selector for "Minggu Ini" */}
            {selected === 'week' && onWeekOffsetChange && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <InputFilter
                        id="weekSelector"
                        label=""
                        value={selectedWeekOffset.toString()}
                        onChange={(value) => onWeekOffsetChange(parseInt(value))}
                        options={weekOptions}
                        variant="modal"
                        compact={true}
                    />
                </div>
            )}

            {/* Month Selector for "Bulan Ini" */}
            {selected === 'month' && onMonthChange && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <InputFilter
                        id="monthSelector"
                        label=""
                        value={selectedMonth || dayjs().format('YYYY-MM')}
                        onChange={(value) => onMonthChange(value)}
                        options={monthOptions}
                        variant="modal"
                        compact={true}
                    />
                </div>
            )}
        </div>
    );
}
