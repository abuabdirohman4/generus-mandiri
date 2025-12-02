import MateriSkeleton from '@/components/ui/skeleton/MateriSkeleton';

export default function Loading() {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-full px-0">
                <div className="px-6 py-6">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>

                <div className="px-6">
                    <MateriSkeleton />
                </div>
            </div>
        </div>
    );
}
