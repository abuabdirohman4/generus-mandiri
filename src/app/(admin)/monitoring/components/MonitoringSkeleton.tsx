import React from 'react';
import Skeleton from '@/components/ui/skeleton/Skeleton';

export const MonitoringContentSkeleton = () => {
    return (
        <div className="space-y-6">
            {/* Student Info Card Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center space-y-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="text-center space-y-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-8 w-40 rounded" />
                    </div>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="px-4 py-4 flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-2/3" />
                                <Skeleton className="h-4 w-1/3" />
                            </div>
                            <div className="flex gap-3">
                                <Skeleton className="h-10 w-24 rounded" />
                                <Skeleton className="h-10 w-32 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
