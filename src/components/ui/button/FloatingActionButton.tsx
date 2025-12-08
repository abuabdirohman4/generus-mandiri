'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// TypeScript Interfaces
export interface FABAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
}

export interface FloatingActionButtonProps {
  actions: FABAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  mainIcon?: React.ReactNode;
  mainLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Color variants for child buttons
const colorVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600',
  secondary: 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600',
  success: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600',
  warning: 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-500',
  danger: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600',
};

// Position variants for main button
const positionVariants = {
  'bottom-right': 'bottom-[80px] md:bottom-6 right-6',
  'bottom-left': 'bottom-[80px] md:bottom-6 left-6',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
};

// Size variants
const sizeVariants = {
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

const childSizeVariants = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
};

export default function FloatingActionButton({
  actions,
  position = 'bottom-right',
  mainIcon,
  mainLabel = 'Actions',
  size = 'md',
  className,
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Calculate position for each child button in radial pattern
  const calculatePosition = (index: number, total: number) => {
    const radius = 90; // Distance from main button in pixels

    // Determine angles based on position
    // We want to expand AWAY from the corner
    let startAngle = 0;
    let endAngle = 90;

    switch (position) {
      case 'bottom-right': // Expand Top & Left
        startAngle = 0; // Left (cos(0)=1 => x=-r)
        endAngle = 90;  // Top (sin(90)=1 => y=-r)
        break;
      case 'bottom-left': // Expand Top & Right
        startAngle = 180; // Right (cos(180)=-1 => x=r)
        endAngle = 90;    // Top
        break;
      case 'top-right': // Expand Bottom & Left
        startAngle = 0;   // Left
        endAngle = -90;   // Bottom (sin(-90)=-1 => y=r)
        break;
      case 'top-left': // Expand Bottom & Right
        startAngle = 180; // Right
        endAngle = 270;   // Bottom (sin(270)=-1 => y=r)
        break;
    }

    // Spread angles evenly
    // If only 1 item, put it in the middle of the range (45 degrees off start)? 
    // Or just put it at 45 deg?
    // Let's spread from start to end.

    // For bottom-right (0 to 90):
    // 1 item: 45
    // 2 items: 0, 90
    // 3 items: 0, 45, 90

    const range = endAngle - startAngle;
    let angle;

    if (total === 1) {
      // If only 1, place inside (bisect)
      angle = startAngle + range / 2;
    } else {
      // Spread evenly inclusive of start and end?
      // Or just distribute?
      // Let's do inclusive
      const step = range / (total - 1);
      angle = startAngle + step * index;
    }

    // Convert polar to Cartesian coordinates
    // Formula: x = -r * cos(theta), y = -r * sin(theta)
    const x = -radius * Math.cos((angle * Math.PI) / 180);
    const y = -radius * Math.sin((angle * Math.PI) / 180);

    return { x, y };
  };

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key to close menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Toggle menu open/close
  const handleMainButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Handle child button click
  const handleActionClick = (action: FABAction) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!action.disabled) {
      action.onClick();
      setIsOpen(false); // Close menu after action
    }
  };

  return (
    <div
      ref={fabRef}
      className={cn('fixed z-50', positionVariants[position], className)}
    >
      {/* Child Action Buttons */}
      {actions.map((action, index) => {
        const pos = calculatePosition(index, actions.length);
        const colorClass = colorVariants[action.color || 'primary'];

        return (
          <div
            key={action.id}
            className="absolute group"
            style={{
              transform: isOpen
                ? `translate(${pos.x}px, ${pos.y}px)`
                : 'translate(0, 0)',
              opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? 'auto' : 'none',
              transition: 'all 0.3s ease-out',
              transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
            }}
          >
            <button
              onClick={handleActionClick(action)}
              disabled={action.disabled}
              aria-label={action.label}
              className={cn(
                'rounded-full shadow-lg text-white',
                'flex items-center justify-center',
                'transition-all duration-200',
                childSizeVariants[size],
                colorClass,
                action.disabled && 'opacity-50 cursor-not-allowed',
                !action.disabled && 'hover:scale-110 hover:shadow-xl'
              )}
            >
              {action.icon}
            </button>

            {/* Tooltip Label */}
            <span
              className={cn(
                'absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg',
                'bg-gray-900 dark:bg-gray-700 text-white text-sm font-medium',
                'whitespace-nowrap shadow-lg',
                'opacity-0 group-hover:opacity-100 pointer-events-none',
                'transition-opacity duration-200',
                // Position tooltip below button
                'top-full mt-2'
              )}
            >
              {action.label}
            </span>
          </div>
        );
      })}

      {/* Main FAB Button */}
      <button
        onClick={handleMainButtonClick}
        aria-label={mainLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(
          'relative rounded-full shadow-lg hover:shadow-xl',
          'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600',
          'text-white',
          'flex items-center justify-center',
          'transition-all duration-300 ease-in-out',
          'hover:scale-105 active:scale-95',
          sizeVariants[size]
        )}
        style={{
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Backdrop Overlay (optional - for better UX) */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
