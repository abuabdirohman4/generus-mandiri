'use client';

import { useState, useEffect } from 'react';
import { GradingFormat } from '../templates/types';

interface GradeInputProps {
    value: {
        score?: number;
        grade?: string;
        is_memorized?: boolean;
        description?: string;
    };
    onChange: (data: { score?: number; grade?: string; is_memorized?: boolean; description?: string }) => void;
    format: GradingFormat;
    readOnly?: boolean;
    compact?: boolean;
}

export default function GradeInput({
    value,
    onChange,
    format,
    readOnly = false,
    compact = false
}: GradeInputProps) {
    const [score, setScore] = useState<string>(value.score !== undefined && value.score !== null ? value.score.toString() : '');
    const [grade, setGrade] = useState<string>(value.grade || '');
    const [isMemorized, setIsMemorized] = useState<boolean>(value.is_memorized || false);
    const [description, setDescription] = useState<string>(value.description || '');

    useEffect(() => {
        setScore(value.score !== undefined && value.score !== null ? value.score.toString() : '');
    }, [value.score]);

    useEffect(() => {
        setGrade(value.grade || '');
    }, [value.grade]);

    useEffect(() => {
        setIsMemorized(value.is_memorized || false);
    }, [value.is_memorized]);

    useEffect(() => {
        setDescription(value.description || '');
    }, [value.description]);

    const calculateGrade = (val: number): string => {
        if (val >= 90) return 'A';
        if (val >= 80) return 'B+';
        if (val >= 70) return 'B';
        if (val >= 60) return 'C';
        if (val >= 50) return 'D';
        return 'E';
    };

    const handleScoreChange = (val: string) => {
        if (readOnly) return;

        if (val === '') {
            setScore('');
            onChange({ ...value, score: undefined, grade: format === 'score' ? undefined : grade });
            return;
        }

        const numVal = parseFloat(val);
        if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
            setScore(val);

            // Auto calculate grade for 'both' format
            let newGrade = grade;
            if (format === 'both') {
                newGrade = calculateGrade(numVal);
                setGrade(newGrade);
            }

            onChange({ ...value, score: numVal, grade: newGrade });
        }
    };

    const handleGradeChange = (val: string) => {
        if (readOnly) return;
        setGrade(val);
        onChange({ ...value, grade: val });
    };

    const handleMemorizedChange = (checked: boolean) => {
        if (readOnly) return;
        setIsMemorized(checked);
        onChange({ ...value, is_memorized: checked });
    };

    const handleDescriptionChange = (val: string) => {
        if (readOnly) return;
        setDescription(val);
        onChange({ ...value, description: val });
    };

    // Compact View (for tables)
    if (compact) {
        if (format === 'hafal') {
            return (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={isMemorized}
                        onChange={(e) => handleMemorizedChange(e.target.checked)}
                        disabled={readOnly}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                </div>
            )
        }

        return (
            <div className="flex items-center gap-2">
                {(format === 'score' || format === 'both') && (
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={score}
                        onChange={(e) => handleScoreChange(e.target.value)}
                        placeholder="0"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-center"
                        disabled={readOnly}
                    />
                )}

                {(format === 'grade' || format === 'both') && (
                    <select
                        value={grade}
                        onChange={(e) => handleGradeChange(e.target.value)}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={readOnly}
                    >
                        <option value="">-</option>
                        <option value="A">A</option>
                        <option value="B+">B+</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                    </select>
                )}
            </div>
        );
    }

    // Full View (not used much in table but good for fallback)
    return (
        <div className="space-y-3">
            <div className="flex gap-4">
                {(format === 'score' || format === 'both') && (
                    <div className="w-1/3">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Nilai (0-100)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={score}
                            onChange={(e) => handleScoreChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            disabled={readOnly}
                        />
                    </div>
                )}

                {(format === 'grade' || format === 'both') && (
                    <div className="w-1/3">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Predikat
                        </label>
                        <select
                            value={grade}
                            onChange={(e) => handleGradeChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            disabled={readOnly}
                        >
                            <option value="">Pilih...</option>
                            <option value="A">A (Sangat Baik)</option>
                            <option value="B+">B+ (Baik Sekali)</option>
                            <option value="B">B (Baik)</option>
                            <option value="C">C (Cukup)</option>
                            <option value="D">D (Kurang)</option>
                            <option value="E">E (Sangat Kurang)</option>
                        </select>
                    </div>
                )}

                {format === 'hafal' && (
                    <div className="w-1/3 flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isMemorized}
                                onChange={(e) => handleMemorizedChange(e.target.checked)}
                                disabled={readOnly}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Sudah Hafal
                            </span>
                        </label>
                    </div>
                )}
            </div>

            {format !== 'hafal' && (
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Catatan / Deskripsi
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        placeholder="Catatan perkembangan..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 focus:ring-2 focus:ring-blue-500 min-h-[60px] disabled:opacity-50"
                        disabled={readOnly}
                    />
                </div>
            )}
        </div>
    );
}
