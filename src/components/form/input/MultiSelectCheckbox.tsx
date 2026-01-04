'use client'

import React, { useState, useEffect } from 'react'

interface MultiSelectCheckboxProps {
  label: string | React.ReactNode
  items: { id: string; label: string }[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  disabled?: boolean
  maxHeight?: string
  hint?: string
  className?: string
  isLoading?: boolean
  error?: boolean
  showSearch?: boolean
  searchPlaceholder?: string
}

export default function MultiSelectCheckbox({
  label,
  items,
  selectedIds,
  onChange,
  disabled = false,
  maxHeight = '10rem',
  hint,
  className = '',
  isLoading = false,
  error = false,
  showSearch = false,
  searchPlaceholder = 'Cari...'
}: MultiSelectCheckboxProps) {
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filtered items based on search query
  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Update select all state when selectedIds or items change
  useEffect(() => {
    if (items.length === 0) {
      setIsAllSelected(false)
      return
    }

    const selectedCount = selectedIds.length
    const totalCount = items.length

    // Only show as selected if ALL items are selected
    setIsAllSelected(selectedCount === totalCount)
  }, [selectedIds, items.length])

  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all
      onChange([])
    } else {
      // Select all
      onChange(items.map(item => item.id))
    }
  }

  const handleItemToggle = (itemId: string) => {
    if (selectedIds.includes(itemId)) {
      // Remove from selection
      onChange(selectedIds.filter(id => id !== itemId))
    } else {
      // Add to selection
      onChange([...selectedIds, itemId])
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {selectedIds.length > 0 && !isLoading && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {selectedIds.length} terpilih
          </span>
        )}
      </div>

      {showSearch && !isLoading && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            disabled={disabled}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div
        className={`space-y-2 border rounded-lg p-3 overflow-y-auto ${error
          ? 'border-red-500 dark:border-red-500'
          : 'border-gray-200 dark:border-gray-600'
          }`}
        style={{ maxHeight }}
      >
        {isLoading ? (
          /* Loading Skeleton */
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center animate-pulse">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="ml-2 h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Select All Option */}
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                disabled={disabled || items.length === 0}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Pilih Semua ({items.length})
              </span>
            </label>

            {/* Individual Items */}
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <label key={item.id} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleItemToggle(item.id)}
                    disabled={disabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {item.label}
                  </span>
                </label>
              ))
            ) : searchQuery ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">
                Tidak ada hasil ditemukan
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">
                Tidak ada data
              </p>
            )}
          </>
        )}
      </div>

      {hint && !isLoading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
    </div>
  )
}

