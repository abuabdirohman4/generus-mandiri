'use client'

import type { LaporanTab } from '@/stores/laporanStore'

interface TabConfig {
  id: LaporanTab
  label: string
}

interface LaporanTabHeaderProps {
  activeTab: LaporanTab
  onTabChange: (tab: LaporanTab) => void
  tabs: TabConfig[]
}

export default function LaporanTabHeader({ activeTab, onTabChange, tabs }: LaporanTabHeaderProps) {
  return (
    <div className="flex gap-0 mb-4 border-b border-gray-200 dark:border-gray-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab.id
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
