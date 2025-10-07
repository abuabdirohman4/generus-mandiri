"use client";

import React, { useState, useRef, useEffect } from 'react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

// Info Icon Component
const InfoIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg 
    className={`w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors ${className}`}
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export interface TooltipProps {
  children?: React.ReactNode;
  content: string;
  position?: TooltipPosition;
  maxWidth?: string;
  className?: string;
  trigger?: 'hover' | 'click';
  disabled?: boolean;
  showIcon?: boolean;
  iconClassName?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  maxWidth = '320px',
  className = '',
  trigger = 'hover',
  disabled = false,
  showIcon = false,
  iconClassName = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 8;
        break;
    }

    // Adjust if tooltip goes off screen
    if (left < 8) left = 8;
    if (left + tooltipRect.width > viewportWidth - 8) {
      left = viewportWidth - tooltipRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + tooltipRect.height > viewportHeight - 8) {
      top = viewportHeight - tooltipRect.height - 8;
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    if (trigger === 'hover' && !disabled) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click' && !disabled) {
      setIsVisible(!isVisible);
    }
  };

  const getArrowClasses = () => {
    const baseClasses = "absolute w-0 h-0 border-4 border-transparent";
    
    switch (position) {
      case 'top':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700`;
      case 'bottom':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700`;
      case 'left':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700`;
      case 'right':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700`;
      default:
        return '';
    }
  };

  if (disabled) {
    return <>{children || (showIcon && <InfoIcon className={iconClassName} />)}</>;
  }

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children || (showIcon && <InfoIcon className={iconClassName} />)}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg p-3 shadow-lg transition-all duration-200"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            maxWidth: maxWidth,
            minWidth: '200px'
          }}
        >
          <div className="text-center">
            {content}
          </div>
          <div className={getArrowClasses()}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
