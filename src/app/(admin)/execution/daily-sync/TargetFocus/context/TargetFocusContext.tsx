'use client';
import React, { createContext, useContext, ReactNode } from 'react';

interface TargetFocusContextType {
  updateTargetOptimistically: (itemId: string, newTarget: number) => void;
}

const TargetFocusContext = createContext<TargetFocusContextType | undefined>(undefined);

interface TargetFocusProviderProps {
  children: ReactNode;
  updateTargetOptimistically: (itemId: string, newTarget: number) => void;
}

export const TargetFocusProvider: React.FC<TargetFocusProviderProps> = ({ 
  children, 
  updateTargetOptimistically 
}) => {
  return (
    <TargetFocusContext.Provider value={{ updateTargetOptimistically }}>
      {children}
    </TargetFocusContext.Provider>
  );
};

export const useTargetFocusContext = () => {
  const context = useContext(TargetFocusContext);
  if (context === undefined) {
    throw new Error('useTargetFocusContext must be used within a TargetFocusProvider');
  }
  return context;
};
