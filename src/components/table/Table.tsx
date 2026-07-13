'use client'

import { ReactNode, useState, useMemo, useEffect, Fragment } from 'react'
import Spinner from '../ui/spinner/Spinner'
import Checkbox from '../form/input/Checkbox'
import { ChevronLeftIcon, ChevronRightIcon } from '@/lib/icons'
import ColumnToggle from './ColumnToggle'

interface Column {
  key: string
  label: ReactNode
  width?: string
  widthMobile?: string
  maxWidth?: string
  maxWidthMobile?: string
  align?: 'left' | 'center' | 'right'
  className?: string
  sortable?: boolean
  leftMargin?: string
  hideable?: boolean
  defaultVisible?: boolean
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  renderCell?: (column: Column, item: any, index: number, isExpanded: boolean) => ReactNode
  className?: string
  headerClassName?: string
  rowClassName?: string | ((item: any, index: number) => string)
  onRowClick?: (item: any, index: number) => void
  pagination?: boolean
  searchable?: boolean
  itemsPerPageOptions?: number[]
  defaultItemsPerPage?: number
  searchPlaceholder?: string
  loadingRowId?: string | null
  loadingColumnKey?: string | null
  spinnerSize?: number
  getRowId?: (item: any, index: number) => string | number
  defaultSortColumn?: string
  defaultSortDirection?: 'asc' | 'desc'
  columnToggle?: ReactNode
  expandable?: boolean
  renderExpandedRow?: (item: any, index: number) => ReactNode
  emptyMessage?: string
  selectable?: boolean
  selectedIds?: Set<string | number>
  onSelectionChange?: (next: Set<string | number>) => void
  renderBulkActions?: (selectedIds: Set<string | number>, clearSelection: () => void) => ReactNode
  manualPagination?: boolean
  totalCount?: number
  page?: number
  onPageChange?: (page: number) => void
  onSearchChange?: (search: string) => void
  onSortChange?: (column: string | null, direction: 'asc' | 'desc' | null) => void
  onItemsPerPageChange?: (size: number) => void
  isLoading?: boolean
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
  searchPlaceholder = 'Search...',
  loadingRowId,
  loadingColumnKey,
  spinnerSize = 16,
  getRowId = (item, index) => item.id || item.student_id || index,
  defaultSortColumn,
  defaultSortDirection = 'asc',
  columnToggle,
  expandable = false,
  renderExpandedRow,
  emptyMessage,
  selectable = false,
  selectedIds,
  onSelectionChange,
  renderBulkActions,
  manualPagination = false,
  totalCount,
  page,
  onPageChange,
  onSearchChange,
  onSortChange,
  onItemsPerPageChange,
  isLoading = false
}: DataTableProps) {
  // State management
  const [internalPage, setInternalPage] = useState(1)
  const currentPage = page !== undefined ? page : internalPage
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(defaultSortColumn || null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(defaultSortColumn ? defaultSortDirection : null)
  const [isMobile, setIsMobile] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState<string | number | null>(null)

  // Internal column visibility state (for hideable columns)
  const [columnVisibility, setColumnVisibilityInternal] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map(c => [c.key, c.defaultVisible !== false]))
  )

  // Re-sync visibility when columns change (key set changes)
  const columnKeysJoined = columns.map(c => c.key).join(',')
  useEffect(() => {
    setColumnVisibilityInternal(prev => {
      const next: Record<string, boolean> = {}
      columns.forEach(c => {
        next[c.key] = c.key in prev ? prev[c.key] : (c.defaultVisible !== false)
      })
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnKeysJoined])

  const hideableColumns = useMemo(() => columns.filter(c => c.hideable), [columns])
  const visibleColumns = useMemo(
    () => columns.filter(c => !c.hideable || columnVisibility[c.key] !== false),
    [columns, columnVisibility]
  )

  // Screen size detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Helper function to check if column is sortable
  const isSortable = (column: Column) => {
    if (column.sortable === false) return false
    if (column.key === 'actions' || column.key === 'aksi') return false
    return true
  }

  // Search functionality
  const filteredData = useMemo(() => {
    if (manualPagination) return data
    if (!searchable || !searchQuery.trim()) {
      return data
    }

    return data.filter(item => {
      return visibleColumns.some(column => {
        const value = item[column.key]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(searchQuery.toLowerCase())
      })
    })
  }, [data, searchQuery, visibleColumns, searchable, manualPagination])

  // Sorting functionality
  const sortedData = useMemo(() => {
    if (manualPagination) return filteredData
    if (!sortColumn || !sortDirection) return filteredData

    return [...filteredData].sort((a, b) => {
      let aValue = a[sortColumn]
      let bValue = b[sortColumn]

      // Handle null/undefined
      if (aValue == null) return 1
      if (bValue == null) return -1

      // Convert percentage strings to numbers for proper sorting
      // Check if both values are percentage strings (e.g., "90%", "100%")
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aIsPercentage = aValue.trim().endsWith('%')
        const bIsPercentage = bValue.trim().endsWith('%')

        if (aIsPercentage && bIsPercentage) {
          // Remove '%' and convert to number
          const aNum = parseFloat(aValue.replace('%', ''))
          const bNum = parseFloat(bValue.replace('%', ''))

          // Handle NaN cases
          if (isNaN(aNum)) return 1
          if (isNaN(bNum)) return -1

          // Compare as numbers
          if (aNum < bNum) return sortDirection === 'asc' ? -1 : 1
          if (aNum > bNum) return sortDirection === 'asc' ? 1 : -1
          return 0
        }
      }

      // String comparison: use localeCompare for case-insensitive, locale-aware sort
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const cmp = aValue.localeCompare(bValue, 'id', { sensitivity: 'base' })
        return sortDirection === 'asc' ? cmp : -cmp
      }

      // Default comparison for numbers/other types
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortColumn, sortDirection, manualPagination])

  // Pagination calculations
  const totalEntries = manualPagination && totalCount !== undefined ? totalCount : sortedData.length
  const totalPages = Math.ceil(totalEntries / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, totalEntries)

  // Get current page data
  const currentPageData = useMemo(() => {
    if (!pagination) return sortedData
    if (manualPagination) return sortedData
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return sortedData.slice(start, end)
  }, [sortedData, currentPage, itemsPerPage, pagination, manualPagination])

  // Reset to first page when search or sort changes
  useEffect(() => {
    if (page === undefined) {
      setInternalPage(1)
    }
  }, [searchQuery, sortColumn, sortDirection, page])

  // Event handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (manualPagination) {
      onSearchChange?.(e.target.value)
      onPageChange?.(1)
    }
  }

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value))
    if (page === undefined) {
      setInternalPage(1)
    }
    if (manualPagination) {
      onItemsPerPageChange?.(Number(e.target.value))
      onPageChange?.(1)
    }
  }

  const handleSort = (columnKey: string) => {
    // Clear expansion when sorting to avoid confusion
    setExpandedRowId(null)
    
    let nextSortColumn = sortColumn
    let nextSortDirection = sortDirection
    
    if (sortColumn === columnKey) {
      // Toggle through: asc → desc → null
      if (sortDirection === 'asc') {
        nextSortDirection = 'desc'
      } else if (sortDirection === 'desc') {
        nextSortColumn = null
        nextSortDirection = null
      }
    } else {
      nextSortColumn = columnKey
      nextSortDirection = 'asc'
    }
    
    setSortColumn(nextSortColumn)
    setSortDirection(nextSortDirection)
    
    if (manualPagination) {
      onSortChange?.(nextSortColumn, nextSortDirection)
    }
  }

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      if (page === undefined) {
        setInternalPage(pageNumber)
      }
      if (manualPagination) {
        onPageChange?.(pageNumber)
      }
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

  // Selection helpers (v1 scope: select-all applies to sortedData, i.e. all filtered results, not just current page)
  const effectiveSelectedIds = selectedIds ?? new Set<string | number>()
  const isRowSelected = (id: string | number) => effectiveSelectedIds.has(id)
  const isAllSelected = sortedData.length > 0 && sortedData.every((item, i) => isRowSelected(getRowId(item, i)))
  const handleToggleRow = (id: string | number) => {
    const next = new Set(effectiveSelectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange?.(next)
  }
  const handleToggleAll = () => {
    if (isAllSelected) {
      onSelectionChange?.(new Set())
    } else {
      onSelectionChange?.(new Set(sortedData.map((item, i) => getRowId(item, i))))
    }
  }

  const defaultRenderCell = (column: Column, item: any) => {
    const value = item[column.key] || '-'

    // If column has width defined, apply truncation with ellipsis
    if (column.width || column.widthMobile) {
      const desktopWidth = column.width

      // Create dynamic classes based on whether desktop width is defined
      const classes = [
        'truncate overflow-hidden whitespace-nowrap',
        desktopWidth ? 'md:whitespace-nowrap' : 'md:whitespace-normal md:overflow-visible'
      ].join(' ')

      return (
        <div
          className={classes}
          title={String(value)}
        >
          {value}
        </div>
      )
    }

    return value
  }

  return (
    <div className="space-y-4">
      {selectable && renderBulkActions && effectiveSelectedIds.size > 0 && (
        <div>{renderBulkActions(effectiveSelectedIds, () => onSelectionChange?.(new Set()))}</div>
      )}
      {/* Toolbar: Show entries | [Kolom] [Search] */}
      {(searchable || pagination || hideableColumns.length > 0) && (() => {
        const columnToggleEl = hideableColumns.length > 0 && !columnToggle ? (
          <ColumnToggle
            columns={hideableColumns.map(c => ({ key: c.key, label: typeof c.label === 'string' ? c.label : c.key }))}
            visibility={columnVisibility as Record<string, boolean>}
            onChange={(v) => setColumnVisibilityInternal(prev => ({ ...prev, ...(v as Record<string, boolean>) }))}
          />
        ) : (columnToggle ?? null)

        const searchEl = searchable ? (
          <div className="relative w-full sm:w-auto">
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearch}
              className="w-full sm:w-64 px-3 py-2 pl-10 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        ) : null

        return (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Row 1 (mobile) / Left (desktop): Show entries + Kolom (mobile only) */}
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              {pagination && (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <label>Show</label>
                  <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="px-3 py-2 border bg-white border-gray-100 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none bg-no-repeat bg-right bg-size-[16px] pr-8 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 8px center'
                    }}
                  >
                    {itemsPerPageOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <label>entries</label>
                </div>
              )}
              {/* Column toggle — visible ONLY on mobile (sm:hidden) */}
              {columnToggleEl && <div className="sm:hidden">{columnToggleEl}</div>}
            </div>

            {/* Row 2 (mobile) / Right (desktop): Kolom (desktop only) + Search */}
            {(columnToggleEl || searchEl) && (
              <div className="flex items-center gap-2">
                {/* Column toggle — visible ONLY on desktop (hidden sm:flex) */}
                {columnToggleEl && <div className="hidden sm:block">{columnToggleEl}</div>}
                {searchEl}
              </div>
            )}
          </div>
        )
      })()}

      {/* Table */}
      <div className={`rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            {/* Table Header */}
            <thead className={`bg-gray-100 dark:bg-gray-700 ${headerClassName}`}>
              <tr>
                {selectable && (
                  <th className="px-2 sm:px-6 py-4 w-12">
                    <Checkbox checked={isAllSelected} onChange={handleToggleAll} />
                  </th>
                )}
                {visibleColumns.map((column) => {
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
                      className={`${column.leftMargin || ''} px-2 sm:px-6 py-4 ${getAlignmentClass(column.align)} text-sm font-semibold text-gray-900 dark:text-white ${column.width || column.widthMobile ? '' : 'whitespace-nowrap'} ${column.className || ''} ${isSortable(column) ? 'cursor-pointer select-none hover:bg-gray-200 dark:hover:bg-gray-600' : ''}`}
                      style={(() => {
                        const baseStyle: React.CSSProperties = {};

                        if (column.widthMobile && isMobile) {
                          baseStyle.width = column.widthMobile;
                          baseStyle.minWidth = column.widthMobile;
                          baseStyle.maxWidth = column.maxWidthMobile || column.widthMobile;
                        } else if (column.width) {
                          baseStyle.width = column.width;
                          baseStyle.minWidth = column.width;
                          baseStyle.maxWidth = column.maxWidth || column.width;
                        } else if (column.maxWidth) {
                          baseStyle.maxWidth = isMobile && column.maxWidthMobile ? column.maxWidthMobile : column.maxWidth;
                        }

                        return baseStyle;
                      })()}
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
              {isLoading ? (
                Array.from({ length: itemsPerPage }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    {selectable && <td className="px-2 sm:px-6 py-3 sm:py-4"><div className="h-4 w-4 bg-gray-200 dark:bg-gray-600 rounded" /></td>}
                    {visibleColumns.map(col => (
                      <td key={col.key} className="px-2 sm:px-6 py-3 sm:py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : currentPageData.length > 0 ? (
                currentPageData.map((item, index) => {
                  const rowId = getRowId(item, index)

                  return (
                    <Fragment key={rowId}>
                      <tr
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${onRowClick || expandable ? 'cursor-pointer' : ''} ${typeof rowClassName === 'function' ? rowClassName(item, index) : rowClassName
                          }`}
                        onClick={() => {
                          if (expandable) {
                            setExpandedRowId(expandedRowId === rowId ? null : rowId)
                          }
                          onRowClick?.(item, index)
                        }}
                      >
                      {selectable && (
                        <td
                          className="px-2 sm:px-6 py-3 sm:py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox checked={isRowSelected(rowId)} onChange={() => handleToggleRow(rowId)} />
                        </td>
                      )}
                      {visibleColumns.map((column) => {
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
                            className={`${column.leftMargin || ''} px-2 sm:px-6 py-3 sm:py-4 ${getAlignmentClass(column.align)} text-sm text-gray-900 dark:text-white ${column.width || column.widthMobile ? '' : 'whitespace-nowrap'} ${column.className || ''}`}
                            style={(() => {
                              const baseStyle: React.CSSProperties = {};

                              if (column.widthMobile && isMobile) {
                                baseStyle.width = column.widthMobile;
                                baseStyle.minWidth = column.widthMobile;
                                baseStyle.maxWidth = column.maxWidthMobile || column.widthMobile;
                              } else if (column.width) {
                                baseStyle.width = column.width;
                                baseStyle.minWidth = column.width;
                                baseStyle.maxWidth = column.maxWidth || column.width;
                              } else if (column.maxWidth) {
                                baseStyle.maxWidth = isMobile && column.maxWidthMobile ? column.maxWidthMobile : column.maxWidth;
                              }

                              return baseStyle;
                            })()}
                          >
                            {(() => {
                              const isLoadingRow = loadingRowId && String(rowId) === String(loadingRowId)
                              const isLoadingCell = isLoadingRow && loadingColumnKey === column.key

                              if (isLoadingCell) {
                                return (
                                  <div className="flex items-center justify-center">
                                    <Spinner size={spinnerSize} />
                                  </div>
                                )
                              }

                              const isExpanded = String(expandedRowId) === String(rowId)
                              return renderCell ? renderCell(column, item, index, isExpanded) : defaultRenderCell(column, item)
                            })()}
                          </td>
                        )
                      })}
                    </tr>

                    {/* Expandable Row */}
                    {expandable && renderExpandedRow && String(expandedRowId) === String(rowId) && (
                      <tr className="bg-gray-50/50 dark:bg-gray-900/30">
                        <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="px-0">
                          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            {renderExpandedRow(item, index)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            ) : (
                <tr>
                  <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No matching records found' : (emptyMessage || 'No data available')}
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
              // onClick={goToFirstPage}
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-l-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              {/* First */}
            </button>

            {/* Previous Page */}
            {/* <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm border-t border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              Previous
            </button> */}

            {/* Page Numbers */}
            {getPageNumbers().map(pageNum => (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`px-3 py-1 text-sm border-t border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:text-white ${currentPage === pageNum
                  ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600'
                  : ''
                  }`}
              >
                {pageNum}
              </button>
            ))}

            {/* Next Page */}
            {/* <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-sm border-t border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              Next
            </button> */}

            {/* Last Page */}
            <button
              onClick={goToNextPage}
              // onClick={goToLastPage}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-r-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              <ChevronRightIcon className="w-5 h-5" />
              {/* Last */}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
