import React from 'react';
import { ChevronDownIcon } from '@/lib/icons';

interface CollapsibleCardProps {
  children: React.ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
  contentClassName?: string;
}

const CollapsibleCard = ({
  children,
  isCollapsed,
  onToggle,
  className = '',
  contentClassName = '',
}: CollapsibleCardProps) => {
  return (
    <div className={`relative ${className}`}>
      {/* Collapse Arrow - positioned absolutely */}
      <div className="absolute top-5 right-6 z-10">
        <button
          className="p-1 text-gray-500 hover:text-gray-900 transition-all duration-300 rounded-full hover:text-gray-700 hover:shadow-md hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <div className={`transition-transform duration-300 ease-in-out ${
            isCollapsed ? 'rotate-0' : 'rotate-180'
          }`}>
            <ChevronDownIcon className="w-5 h-5" />
          </div>
        </button>
      </div>
      
      {/* Content with smooth height animation */}
      <div 
        className={`border-b rounded-b-lg border-gray-200 transition-all duration-500 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-16' : 'max-h-[2000px]'
        }`}
        style={{transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-in-out'}}
      >
        <div className={`transition-transform duration-300 ease-in-out`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleCard;
