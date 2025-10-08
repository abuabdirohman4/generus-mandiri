'use client'

interface SummaryCardProps {
  title: string
  subtitle?: string
  percentage?: number
  percentageLabel?: string
  className?: string
  children?: React.ReactNode
}

export default function SummaryCard({
  title,
  subtitle,
  percentage,
  percentageLabel = 'Kehadiran',
  className = '',
  children
}: SummaryCardProps) {
  return (
    <div className={`rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-3 ${className}`}>
      <div className="bg-white dark:bg-gray-800 flex items-center justify-between px-2 sm:px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {subtitle}
            </div>
          )}
        </div>
        {percentage !== undefined && (
          <div className="text-center">
            <div className="text-sm">{percentageLabel}</div>
            <div className="font-bold text-blue-600 dark:text-blue-400">
              {percentage}%
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
