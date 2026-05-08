'use client'

import React from 'react'

interface LaporanEmptyStateProps {
  title?: string
  description?: string
}

export default function LaporanEmptyState({ 
  title = 'Tidak ada data', 
  description = 'Silakan pilih filter untuk melihat laporan.' 
}: LaporanEmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
      <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  )
}
