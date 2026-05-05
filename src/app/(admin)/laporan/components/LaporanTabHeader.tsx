'use client'

type LaporanTab = 'presensi' | 'materi'

interface LaporanTabHeaderProps {
    activeTab: LaporanTab
    onTabChange: (tab: LaporanTab) => void
}

export default function LaporanTabHeader({ activeTab, onTabChange }: LaporanTabHeaderProps) {
    return (
        <div className="flex gap-0 mb-4 border-b border-gray-200 dark:border-gray-700">
            {(['presensi', 'materi'] as LaporanTab[]).map((tab) => (
                <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                        activeTab === tab
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            ))}
        </div>
    )
}
