'use client'

import { ReactNode } from 'react'

interface Column {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  renderCell?: (column: Column, item: any, index: number) => ReactNode
  className?: string
  headerClassName?: string
  rowClassName?: string
  onRowClick?: (item: any, index: number) => void
}

export default function DataTable({
  columns,
  data,
  renderCell,
  className = '',
  headerClassName = '',
  rowClassName = '',
  onRowClick
}: DataTableProps) {
  const defaultRenderCell = (column: Column, item: any) => {
    return item[column.key] || '-'
  }

  return (
    <div className={`rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead className={`bg-gray-100 dark:bg-gray-700 ${headerClassName}`}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-2 sm:px-6 py-4 text-${column.align || 'left'} text-sm font-semibold text-gray-900 dark:text-white ${column.width ? `w-${column.width}` : ''} ${column.className || ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((item, index) => (
              <tr 
                key={index} 
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName}`}
                onClick={() => onRowClick?.(item, index)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-2 sm:px-6 py-3 sm:py-4 text-${column.align || 'left'} text-sm text-gray-900 dark:text-white ${column.className || ''}`}
                  >
                    {renderCell ? renderCell(column, item, index) : defaultRenderCell(column, item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
