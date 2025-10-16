"use client";

import React from 'react';

interface Action {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  title: string;
  color: 'blue' | 'yellow' | 'red' | 'green' | 'indigo';
}

interface TableActionsProps {
  actions: Action[];
}

export default function TableActions({ actions }: TableActionsProps) {
  const colorClasses = {
    blue: 'text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300',
    yellow: 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300',
    red: 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300',
    green: 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300',
    indigo: 'text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300',
  };

  return (
    <div className="flex gap-4 justify-center items-center">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className={`transition-colors ${colorClasses[action.color]}`}
          title={action.title}
        >
          <action.icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
}
