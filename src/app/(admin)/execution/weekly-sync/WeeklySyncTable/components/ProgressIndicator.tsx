"use client";

import React from 'react';

import type { ProgressIndicatorProps } from '../types';

export default function ProgressIndicator({ progress, slotNumber }: ProgressIndicatorProps) {
  const getProgressColorBg = (percentage: number) => {
    if (percentage < 80) return 'stroke-red-500';
    if (percentage < 100) return 'stroke-yellow-500';
    return 'stroke-green-500';
  };

  // Calculate circle progress (0-100)
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress.percentage / 100) * circumference;

  return (
    <div className="space-y-3">
      {/* Progress Circle */}
      <div className="flex justify-center">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`${getProgressColorBg(progress.percentage)} transition-all duration-500 ease-in-out`}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">
              {progress.percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Linear progress bar (optional - can be removed if not needed) */}
      {/* <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
        <div 
          className={`h-1.5 rounded-full transition-all duration-300 ${
            progress.percentage < 80 ? 'bg-red-500' : 
            progress.percentage < 100 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div> */}
    </div>
  );
}
