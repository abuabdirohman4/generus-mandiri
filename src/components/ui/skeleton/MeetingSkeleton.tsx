'use client'

export default function MeetingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Date Header Skeleton */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 py-2 mb-3">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
      </div>

      {/* Meeting Items Skeleton */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                </div>
                
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse"></div>

                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-12 animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

