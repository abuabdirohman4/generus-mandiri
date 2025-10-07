import React from "react";
import Skeleton from "./Skeleton";

const MainQuestsSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-2 md:px-0">
      <div className="mb-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-evenly w-full md:w-auto">
            <div className="flex min-w-max md:min-w-max w-full md:w-auto">
              {[1, 2, 3].map((_, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 -mb-px font-medium border-b-2 transition-colors duration-200 whitespace-nowrap text-sm md:text-base md:px-4 flex-1 md:flex-none"
                >
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quest Content */}
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            {/* Quest Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>

            {/* Quest Description */}
            <div className="mb-6">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6 mb-2" />
              <Skeleton className="h-4 w-4/6" />
            </div>

            {/* Progress Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>

            {/* Milestones Section */}
            <div className="mb-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((_, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <Skeleton className="w-5 h-5 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="w-6 h-6 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks Section */}
            <div className="mb-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((_, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Skeleton className="w-5 h-5 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="w-6 h-6 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
              <Skeleton className="h-10 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainQuestsSkeleton;
