'use client'

export default function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 mb-2 animate-pulse"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
        </div>

        {/* Table Container Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header Skeleton */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
          </div>
          
          {/* Mobile Header Skeleton */}
          <div className="sm:hidden px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
              <div className="flex space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8 animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Desktop Header Skeleton */}
          <div className="hidden sm:block px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
              </div>
              <div className="flex">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-16 flex justify-center">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-8 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Student Rows Skeleton */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 sm:px-6 py-4">
                {/* Mobile Row Skeleton */}
                <div className="sm:hidden">
                  <div className="flex items-center">
                    <div className="flex-1 pr-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
                    </div>
                    <div className="flex space-x-4">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Desktop Row Skeleton */}
                <div className="hidden sm:flex items-center">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-40 mb-1 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="w-16 flex justify-center">
                        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button Skeleton */}
        <div className="mt-8 flex justify-center sm:justify-end">
          <div className="w-full sm:w-auto h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
