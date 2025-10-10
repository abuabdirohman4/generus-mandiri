'use client'

import { useState, useEffect } from 'react'
import { GridIcon } from '@/lib/icons'

export type ViewMode = 'list' | 'card' | 'chart'

interface ViewModeToggleProps {
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
  className?: string
}

export default function ViewModeToggle({ 
  currentMode, 
  onModeChange, 
  className = '' 
}: ViewModeToggleProps) {
  const [mounted, setMounted] = useState(false)

  // Persist view mode preference
  useEffect(() => {
    setMounted(true)
    const savedMode = localStorage.getItem('attendance-view-mode') as ViewMode
    if (savedMode && ['list', 'card', 'chart'].includes(savedMode)) {
      onModeChange(savedMode)
    }
  }, [onModeChange])

  const handleModeChange = (mode: ViewMode) => {
    onModeChange(mode)
    localStorage.setItem('attendance-view-mode', mode)
  }

  if (!mounted) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    )
  }

  const modes: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    {
      mode: 'list',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      label: 'List View'
    },
    {
      mode: 'card',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="4" y="4" width="7" height="7" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <rect x="13" y="4" width="7" height="7" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <rect x="4" y="13" width="7" height="7" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <rect x="13" y="13" width="7" height="7" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      label: 'Card View'
    },
    // {
    //   mode: 'chart',
    //   icon: (
    //     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    //     </svg>
    //   ),
    //   label: 'Chart View'
    // }
  ]

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {modes.map(({ mode, icon, label }) => (
        <button
          key={mode}
          onClick={() => handleModeChange(mode)}
          className={`
            p-2 rounded-lg transition-colors duration-200
            ${currentMode === mode
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
            }
          `}
          title={label}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
