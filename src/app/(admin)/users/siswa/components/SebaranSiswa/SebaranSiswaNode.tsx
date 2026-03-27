'use client'

import { useState } from 'react'

interface SebaranSiswaNodeProps {
  name: string
  totalStudents: number
  childCount?: number
  childLabel?: string
  isLeaf?: boolean
  children?: React.ReactNode
}

export default function SebaranSiswaNode({
  name,
  totalStudents,
  childCount,
  childLabel,
  isLeaf = false,
  children,
}: SebaranSiswaNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const isEmpty = totalStudents === 0

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          isEmpty
            ? 'bg-amber-50 dark:bg-amber-900/20'
            : 'bg-white dark:bg-gray-800'
        } ${!isLeaf ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750' : ''}`}
        onClick={() => !isLeaf && setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {!isLeaf && (
            <span className="text-gray-400 text-xs w-4 text-center select-none">
              {expanded ? '▼' : '▶'}
            </span>
          )}
          {isEmpty && (
            <span className="text-amber-500" title="Belum ada siswa">⚠️</span>
          )}
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {name}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          {childCount !== undefined && childLabel && (
            <span>{childCount} {childLabel}</span>
          )}
          <span className={`font-semibold ${isEmpty ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {totalStudents} siswa
          </span>
        </div>
      </div>

      {!isLeaf && expanded && children && (
        <div className="pl-6 pr-2 py-2 space-y-2 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  )
}
