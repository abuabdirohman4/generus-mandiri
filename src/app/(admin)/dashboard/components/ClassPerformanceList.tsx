import type { ClassPerformance } from '../actions';

interface ClassPerformanceListProps {
    topClasses: ClassPerformance[];
    bottomClasses: ClassPerformance[];
}

export default function ClassPerformanceList({ topClasses, bottomClasses }: ClassPerformanceListProps) {
    const renderClassList = (classes: ClassPerformance[], isTop: boolean) => {
        if (classes.length === 0) {
            return (
                <div className="text-center py-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Belum ada data
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {classes.map((classData, index) => (
                    <div
                        key={classData.class_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${isTop
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                }`}>
                                {index + 1}
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                    {classData.class_name}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {classData.total_meetings} pertemuan
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-lg font-bold ${classData.attendance_percentage >= 80
                                    ? 'text-green-600 dark:text-green-400'
                                    : classData.attendance_percentage >= 60
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-red-600 dark:text-red-400'
                                }`}>
                                {classData.attendance_percentage}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Performa Kelas (30 Hari Terakhir)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Classes */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                            Top 5 Kelas Terbaik
                        </h4>
                    </div>
                    {renderClassList(topClasses, true)}
                </div>

                {/* Bottom Classes */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                            5 Kelas Perlu Perhatian
                        </h4>
                    </div>
                    {renderClassList(bottomClasses, false)}
                </div>
            </div>
        </div>
    );
}
