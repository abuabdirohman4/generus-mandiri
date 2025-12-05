'use client'

export default function StudentDetailSkeleton() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-6 text-center">
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-2"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
        </div>

        {/* Monthly Stats Skeleton */}
        <div className="rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden px-2 mb-3">
          <div className="bg-white dark:bg-gray-800 flex items-center justify-between px-2 sm:px-4 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1 mx-auto"></div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Calendar Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square max-w-[60px] mx-auto w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
