'use client'

import { ReactNode, useState, useMemo, useEffect } from 'react'

interface Column {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  className?: string
  sortable?: boolean
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  renderCell?: (column: Column, item: any, index: number) => ReactNode
  className?: string
  headerClassName?: string
  rowClassName?: string
  onRowClick?: (item: any, index: number) => void
  pagination?: boolean
  searchable?: boolean
  itemsPerPageOptions?: number[]
  defaultItemsPerPage?: number
  searchPlaceholder?: string
}

export default function DataTable({
  columns,
  data,
  renderCell,
  className = '',
  headerClassName = '',
  rowClassName = '',
  onRowClick,
  pagination = true,
  searchable = true,
  itemsPerPageOptions = [5, 10, 25, 50],
  defaultItemsPerPage = 10,
  searchPlaceholder = 'Search...'
}: DataTableProps) {
  // State management
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)

  // Helper function to check if column is sortable
  const isSortable = (column: Column) => {
    if (column.sortable === false) return false
    if (column.key === 'actions' || column.key === 'aksi') return false
    return true
  }

  // Search functionality
  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return data
    }
    
    return data.filter(item => {
      return columns.some(column => {
        const value = item[column.key]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(searchQuery.toLowerCase())
      })
    })
  }, [data, searchQuery, columns, searchable])

  // Sorting functionality
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      
      // Handle null/undefined
      if (aValue == null) return 1
      if (bValue == null) return -1
      
      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortColumn, sortDirection])

  // Pagination calculations
  const totalEntries = sortedData.length
  const totalPages = Math.ceil(totalEntries / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, totalEntries)
  
  // Get current page data
  const currentPageData = useMemo(() => {
    if (!pagination) return sortedData
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return sortedData.slice(start, end)
  }, [sortedData, currentPage, itemsPerPage, pagination])

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortColumn, sortDirection])

  // Event handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      // Toggle through: asc → desc → null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToFirstPage = () => goToPage(1)
  const goToPreviousPage = () => goToPage(currentPage - 1)
  const goToNextPage = () => goToPage(currentPage + 1)
  const goToLastPage = () => goToPage(totalPages)

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, start + maxVisiblePages - 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }
    
    return pages
  }

  const defaultRenderCell = (column: Column, item: any) => {
    return item[column.key] || '-'
  }

  return (
    <div className="space-y-4">
      {/* Search and Items Per Page Controls */}
      {(searchable || pagination) && (
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {/* Items Per Page Selector */}
          {pagination && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <label>Show</label>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <label>entries</label>
            </div>
          )}

          {/* Search Input */}
          {searchable && (
            <div className="relative">
              <input
                type="search"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleSearch}
                className="w-full sm:w-64 px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className={`rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            {/* Table Header */}
            <thead className={`bg-gray-100 dark:bg-gray-700 ${headerClassName}`}>
              <tr>
                {columns.map((column) => {
                  const getAlignmentClass = (align?: string) => {
                    switch (align) {
                      case 'center': return 'text-center'
                      case 'right': return 'text-right'
                      default: return 'text-left'
                    }
                  }
                  
                  return (
                    <th
                      key={column.key}
                      onClick={() => isSortable(column) && handleSort(column.key)}
                      className={`px-2 sm:px-6 py-4 ${getAlignmentClass(column.align)} text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap ${column.width ? `w-${column.width}` : ''} ${column.className || ''} ${isSortable(column) ? 'cursor-pointer select-none hover:bg-gray-200 dark:hover:bg-gray-600' : ''}`}
                    >
                      <div className={`flex items-center gap-2 ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                        {column.label}
                        {isSortable(column) && (
                          <span className="text-gray-400 dark:text-gray-500">
                            {sortColumn === column.key ? (
                              sortDirection === 'asc' ? '↑' : '↓'
                            ) : (
                              '⇅'
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {currentPageData.length > 0 ? (
                currentPageData.map((item, index) => (
                  <tr 
                    key={index} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName}`}
                    onClick={() => onRowClick?.(item, index)}
                  >
                    {columns.map((column) => {
                      const getAlignmentClass = (align?: string) => {
                        switch (align) {
                          case 'center': return 'text-center'
                          case 'right': return 'text-right'
                          default: return 'text-left'
                        }
                      }
                      
                      return (
                        <td
                          key={column.key}
                          className={`px-2 sm:px-6 py-3 sm:py-4 ${getAlignmentClass(column.align)} text-sm text-gray-900 dark:text-white whitespace-nowrap ${column.className || ''}`}
                        >
                          {renderCell ? renderCell(column, item, index) : defaultRenderCell(column, item)}
                        </td>
                      )
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No matching records found' : 'No data available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {pagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {startIndex} to {endIndex} of {totalEntries} entries
          </div>
          
          <div className="flex items-center gap-1">
            {/* First Page */}
            <button
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-l-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              First
            </button>
            
            {/* Previous Page */}
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm border-t border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            {getPageNumbers().map(pageNum => (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`px-3 py-1 text-sm border-t border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:text-white ${
                  currentPage === pageNum 
                    ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600' 
                    : ''
                }`}
              >
                {pageNum}
              </button>
            ))}
            
            {/* Next Page */}
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-sm border-t border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              Next
            </button>
            
            {/* Last Page */}
            <button
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-r-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
