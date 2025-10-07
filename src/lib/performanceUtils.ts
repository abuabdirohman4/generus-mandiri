import React from 'react';

// 🚀 OPTIMIZED: Utility functions for better performance

export const getPriorityColor = (priorityScore: number): string => {
  if (priorityScore >= 80) return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
  if (priorityScore >= 60) return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
  if (priorityScore >= 40) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
  return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
};

export const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) return 'bg-green-500';
  if (percentage >= 75) return 'bg-blue-500';
  if (percentage >= 50) return 'bg-yellow-500';
  if (percentage >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};

// 🚀 OPTIMIZED: Debounced functions for better performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 🚀 OPTIMIZED: Throttled functions for better performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 🚀 OPTIMIZED: Performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      const duration = end - start;
      
      if (duration > 100) { // Only log if component takes more than 100ms
        console.warn(`${componentName} took ${duration.toFixed(2)}ms to render`);
      }
    };
  }, [componentName]);
};

// 🚀 OPTIMIZED: Memory usage monitoring
export const useMemoryMonitor = () => {
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Memory usage:', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      });
    }
  }, []);
};

// 🚀 OPTIMIZED: Mobile detection - Server-side safe
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Return false during SSR to prevent hydration mismatch
  return mounted ? isMobile : false;
};

// 🚀 OPTIMIZED: Data processing utilities
export const processGoalItems = (items: any[], isMobile: boolean = false) => {
  const maxLength = isMobile ? 30 : 50;
  
  return items.map(item => ({
    ...item,
    displayTitle: item.title.length > maxLength 
      ? item.title.substring(0, maxLength) + '...' 
      : item.title,
    isCompleted: item.status === 'DONE',
    priorityColor: getPriorityColor(item.priority_score || 0)
  }));
};

export const processProgressData = (progress: any) => {
  if (!progress || Object.keys(progress).length === 0) return {};
  
  return Object.entries(progress).reduce((acc, [key, data]: [string, any]) => {
    acc[key] = {
      ...data,
      displayPercentage: Math.round(data.percentage),
      progressColor: getProgressColor(data.percentage),
      isComplete: data.percentage === 100
    };
    return acc;
  }, {} as any);
};

export const processRulesData = (rules: any[]) => {
  if (!rules || rules.length === 0) return [];
  
  return rules.map(rule => ({
    ...rule,
    displayText: rule.rule_text.length > 100 
      ? rule.rule_text.substring(0, 100) + '...' 
      : rule.rule_text,
    isEmpty: rule.rule_text.trim() === ''
  }));
};
