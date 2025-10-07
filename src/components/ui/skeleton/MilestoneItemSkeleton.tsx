import React from "react";
import Skeleton from "./Skeleton";

interface MilestoneItemSkeletonProps {
  orderNumber?: number;
  showContainer?: boolean;
  count?: number;
}

const MilestoneItemSkeleton: React.FC<MilestoneItemSkeletonProps> = ({ 
  orderNumber, 
  showContainer = true,
  count = 1 
}) => {
  // If count > 1, render multiple items in a container
  if (count > 1) {
    return (
      <div className="flex flex-col gap-4 justify-center mb-6">
        {Array.from({ length: count }).map((_, idx) => (
          <MilestoneItemSkeleton
            key={`milestone-skeleton-${idx}`}
            orderNumber={idx + 1}
            showContainer={true}
            count={1}
          />
        ))}
      </div>
    );
  }

  // Single item skeleton
  const content = (
    <>
      <span className="font-bold text-lg w-6 text-center select-none text-gray-400">
        {orderNumber ? `${orderNumber}.` : ''}
      </span>
      
      <div className="flex gap-2 w-full">
        <Skeleton className="h-8 w-full rounded px-2 py-2" />
        
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </>
  );

  if (!showContainer) {
    return content;
  }

  return (
    <div className="w-full rounded-lg border px-4 py-3 transition-all duration-150 shadow-sm mb-0 bg-white dark:bg-gray-900 flex items-center cursor-pointer gap-2 group hover:shadow-md border-gray-200 dark:border-gray-700">
      {content}
    </div>
  );
};

export default MilestoneItemSkeleton;
