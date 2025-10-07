import React from "react";
import Skeleton from "./Skeleton";

const TwelveWeekGoalsSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-none bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row">
      {/* Left Side - Quest Input Section */}
      <div className="w-full md:w-1/3 md:border-r border-gray-200 dark:border-gray-700 pb-6 md:pb-8 flex flex-col justify-between">
        <div className="text-center !shadow-none !bg-transparent !rounded-none !border-0 p-0">
          <div className="text-xl font-semibold text-gray-900 mt-4 dark:text-white mb-6">
            <Skeleton className="h-6 w-32 mx-auto" />
          </div>
          <div className="space-y-5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((_, idx) => (
              <div key={idx} className="flex items-center gap-2 pl-1 relative rounded">
                <Skeleton className="w-6 h-6 rounded" />
                <Skeleton className="flex-1 h-11 rounded-lg" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 mr-2">
                  <Skeleton className="w-7 h-5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 mx-10 flex">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Right Side - Pairwise Matrix Section */}
      <div className="w-full md:w-2/3 pb-6 md:pb-8 flex flex-col">
        <div className="text-center !shadow-none !bg-transparent !rounded-none !border-0 p-0">
          <div className="text-xl font-semibold text-gray-900 mt-4 dark:text-white mb-6">
            <Skeleton className="h-6 w-32 mx-auto" />
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-full border-collapse border text-xs">
              {/* Table Header */}
              <div className="border-b">
                <div className="flex">
                  <div className="border px-1 py-1 min-w-14 bg-gray-50 w-10 h-12" />
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((_, i) => (
                    <div key={i} className="border px-1 py-1 min-w-14 bg-gray-50 font-bold text-center flex items-center justify-center">
                      <Skeleton className="w-4 h-4 rounded" />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Table Rows */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((_, i) => (
                <div key={i} className="border-b">
                  <div className="flex">
                    <div className="border px-1 py-1 w-10 h-14 bg-gray-50 font-bold text-center flex items-center justify-center">
                      <Skeleton className="w-4 h-4 rounded" />
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((_, j) => (
                      <div key={j} className="border px-1 py-1 text-center flex items-center justify-center min-h-[3.71rem]">
                        {i === j ? (
                          <div className="w-full h-full bg-gray-100" />
                        ) : i < j ? (
                          <div className="flex gap-1 justify-center">
                            <Skeleton className="w-6 h-6 rounded" />
                            <Skeleton className="w-6 h-6 rounded" />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-100" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-2 mx-10 flex gap-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default TwelveWeekGoalsSkeleton;
