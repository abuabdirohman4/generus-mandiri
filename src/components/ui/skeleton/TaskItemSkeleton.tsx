import React from "react";
import Skeleton from "./Skeleton";

interface TaskItemSkeletonProps {
  orderNumber?: number;
  showButton?: boolean;
}

const TaskItemSkeleton: React.FC<TaskItemSkeletonProps> = ({ 
  orderNumber, 
  showButton = true 
}) => {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg mb-3 pl-2 pr-4 py-2 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className='flex gap-2 w-full items-center mr-2'>
        {orderNumber && (
          <span className="font-medium text-lg w-6 text-center select-none">
            {orderNumber}.
          </span>
        )}
        <div className="flex-1">
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
      {showButton && (
        <div className="flex items-center gap-2 mr-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default TaskItemSkeleton;
