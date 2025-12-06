'use client';

import { useState, useEffect } from 'react';

interface GradeInputProps {
    score?: number | null;
    grade?: string | null;
    description?: string | null;
    onChange: (data: { score?: number; grade?: string; description?: string }) => void;
    readOnly?: boolean;
    compact?: boolean;
}

export default function GradeInput({
    score: initialScore,
    grade: initialGrade,
    description: initialDescription,
    onChange,
    readOnly = false,
    compact = false
}: GradeInputProps) {
    const [score, setScore] = useState<string>(initialScore !== undefined && initialScore !== null ? initialScore.toString() : '');
    const [grade, setGrade] = useState<string>(initialGrade || '');
    const [description, setDescription] = useState<string>(initialDescription || '');

    useEffect(() => {
        setScore(initialScore !== undefined && initialScore !== null ? initialScore.toString() : '');
    }, [initialScore]);

    useEffect(() => {
        setGrade(initialGrade || '');
    }, [initialGrade]);

    useEffect(() => {
        setDescription(initialDescription || '');
    }, [initialDescription]);

    const calculateGrade = (value: number): string => {
        if (value >= 90) return 'A';
        if (value >= 80) return 'B+';
        if (value >= 70) return 'B';
        if (value >= 60) return 'C';
        if (value >= 50) return 'D';
        return 'E';
    };

    const handleScoreChange = (val: string) => {
        if (readOnly) return;

        // Allow empty
        if (val === '') {
            setScore('');
            onChange({ score: undefined, grade, description });
            return;
        }

        const numVal = parseFloat(val);
        if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
            setScore(val);
            // Auto calculate grade if not manually overridden (logic could be stricter, here just suggestion)
            const suggestion = calculateGrade(numVal);
            setGrade(suggestion);

            onChange({ score: numVal, grade: suggestion, description });
        }
    };

    const handleGradeChange = (val: string) => {
        if (readOnly) return;
        setGrade(val);
        // If changing grade letter, parse score if needed? usually score drives grade.
        // Or keep independent.
        const numScore = score === '' ? undefined : parseFloat(score);
        onChange({ score: numScore, grade: val, description });
    };

    const handleDescriptionChange = (val: string) => {
        if (readOnly) return;
        setDescription(val);
        const numScore = score === '' ? undefined : parseFloat(score);
        onChange({ score: numScore, grade, description: val });
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => handleScoreChange(e.target.value)}
                    placeholder="0"
                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={readOnly}
                />
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
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex gap-4">
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
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={readOnly}
                    />
                </div>
                <div className="w-1/3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Predikat
                    </label>
                    <select
                        value={grade}
                        onChange={(e) => handleGradeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Catatan / Deskripsi
                </label>
                <textarea
                    value={description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Catatan perkembangan siswa..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 min-h-[80px] disabled:opacity-50"
                    disabled={readOnly}
                />
            </div>
        </div>
    );
}
