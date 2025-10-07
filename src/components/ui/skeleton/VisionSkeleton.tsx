import React from "react";
import Skeleton from "./Skeleton";

const VisionSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Desktop Table Layout Skeleton */}
      <div className="overflow-x-auto hidden sm:block">
        <div className="min-w-full border rounded-xl bg-white dark:bg-gray-900">
          {/* Table Header */}
          <div className="bg-gray-100 dark:bg-gray-800 flex">
            <div className="w-64 px-4 py-3">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex-1 px-4 py-3">
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex-1 px-4 py-3">
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          
          {/* Table Rows */}
          {[1, 2, 3, 4, 5, 6, 7].map((_, index) => (
            <div key={index} className="border-t border-gray-200 dark:border-gray-800 flex">
              <div className="w-64 px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex-1 px-4 py-3">
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
              <div className="flex-1 px-4 py-3">
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card Layout Skeleton */}
      <div className="block sm:hidden space-y-4">
        {[1, 2, 3, 4, 5, 6, 7].map((_, index) => (
          <div key={index} className="border rounded-xl bg-white dark:bg-gray-900 p-4">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32 mx-auto" />
              
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
              
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
};

export default VisionSkeleton;
