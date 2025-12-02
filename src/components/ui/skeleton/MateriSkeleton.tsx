import React from 'react';
import Skeleton from './Skeleton';

export const MateriSidebarSkeleton = () => {
    return (
        <div className="fixed lg:relative inset-y-0 left-0 z-50 md:z-0 w-80 bg-white rounded-lg border border-gray-200 flex flex-col h-[calc(100vh-8rem)]">
            {/* Header Skeleton */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-6 w-32" />
                </div>

                {/* View Mode Toggle Skeleton */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <div className="flex-1 px-3 py-2">
                        <Skeleton className="h-5 w-full" />
                    </div>
                    <div className="flex-1 px-3 py-2">
                        <Skeleton className="h-5 w-full" />
                    </div>
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-2">
                            <Skeleton className="w-5 h-5 rounded" />
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-8 ml-auto" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MateriContentSkeleton = () => {
    return (
        <div className="space-y-6">
            {/* Search Bar Skeleton */}
            <div className="hidden md:block sticky top-0 z-10 bg-white dark:bg-gray-800">
                <Skeleton className="h-12 w-full rounded-lg" />
            </div>

            {/* Table Skeleton */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4"><Skeleton className="h-4 w-24" /></div>
                        <div className="col-span-3"><Skeleton className="h-4 w-20" /></div>
                        <div className="col-span-3"><Skeleton className="h-4 w-24" /></div>
                        <div className="col-span-2"><Skeleton className="h-4 w-16" /></div>
                    </div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="px-6 py-4">
                            <div className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-4">
                                    <Skeleton className="h-5 w-3/4 mb-1" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                                <div className="col-span-3"><Skeleton className="h-5 w-24" /></div>
                                <div className="col-span-3"><Skeleton className="h-5 w-32" /></div>
                                <div className="col-span-2 flex gap-2">
                                    <Skeleton className="h-8 w-8 rounded" />
                                    <Skeleton className="h-8 w-8 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile Cards Skeleton */}
            <div className="md:hidden space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="w-3/4 space-y-2">
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <Skeleton className="h-4 w-24" />
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-8 rounded" />
                                <Skeleton className="h-8 w-8 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function MateriSkeleton() {
    return (
        <div className="flex h-[calc(100vh-8rem)] relative gap-6">
            {/* Sidebar Skeleton */}
            <div className="hidden lg:block">
                <MateriSidebarSkeleton />
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 overflow-hidden">
                {/* Mobile Header Skeleton */}
                <div className="lg:hidden mb-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm border-gray-200 dark:border-gray-700 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <Skeleton className="h-6 w-40" />
                    </div>
                </div>

                <div className="pb-12 py-0 md:pb-0 md:px-6 h-full overflow-y-auto">
                    <MateriContentSkeleton />
                </div>
            </div>
        </div>
    );
}
