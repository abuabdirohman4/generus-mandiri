import React from "react";
import Skeleton from "./Skeleton";

const WeeklySyncSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Week Navigation */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-8" />
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-5 h-5 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="w-20 h-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklySyncSkeleton;
