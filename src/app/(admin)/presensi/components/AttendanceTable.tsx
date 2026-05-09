'use client'

import { useState, useMemo, useEffect } from 'react'

interface Student {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
  kelompok_name?: string
  desa_name?: string
}

interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
  }
}

interface AttendanceTableProps {
  students: Student[]
  attendance: AttendanceData
  onStatusChange: (studentId: string, status: 'H' | 'I' | 'S' | 'A') => void
  className?: string
  canEditStudent?: (studentId: string) => boolean
  showKelompokColumn?: boolean
  showDesaColumn?: boolean
  columnToggle?: React.ReactNode
}

export default function AttendanceTable({ 
  students, 
  attendance, 
  onStatusChange, 
  className = '',
  canEditStudent,
  showKelompokColumn = false,
  showDesaColumn = false,
  columnToggle
}: AttendanceTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<'kelompok' | 'desa' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  useEffect(() => {
    setCurrentPage(1)
  }, [students, searchQuery, sortColumn, sortDirection])

  const processedStudents = useMemo(() => {
    let result = students.filter(s => s.id && s.id.trim() !== '')

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s => s.name.toLowerCase().includes(q))
    }

    result = [...result].sort((a, b) => {
      if (sortColumn === 'kelompok') {
        const aVal = a.kelompok_name || ''
        const bVal = b.kelompok_name || ''
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (sortColumn === 'desa') {
        const aVal = a.desa_name || ''
        const bVal = b.desa_name || ''
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return a.name.localeCompare(b.name)
    })

    return result
  }, [students, searchQuery, sortColumn, sortDirection])

  const totalEntries = processedStudents.length
  const totalPages = Math.ceil(totalEntries / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, totalEntries)

  const pagedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return processedStudents.slice(start, start + itemsPerPage)
  }, [processedStudents, currentPage, itemsPerPage])

  const handleSort = (column: 'kelompok' | 'desa') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

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

  return (
    <div className="space-y-4">
      {/* Search and Items Per Page Controls */}
      {(students.length > 20 || students.length > 25 || columnToggle) && (
        <div className="flex flex-col md:flex-row justify-between gap-4">
          {/* Items Per Page Selector + Column Toggle */}
          <div className="flex items-center justify-between md:justify-start gap-3">
            {students.length > 25 && (
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <label>Show</label>
                <select
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-3 py-2 border bg-white border-gray-100 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none bg-no-repeat bg-right bg-size-[16px] pr-8"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 8px center'
                  }}
                >
                  {[10, 25, 50, 100].map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <label>entries</label>
              </div>
            )}
            {columnToggle && <div className={`${students.length > 25 ? 'ml-2' : ''}`}>{columnToggle}</div>}
          </div>

          {/* Search Input */}
          {students.length > 20 && (
            <div className="relative">
              <input
                type="search"
                placeholder="Cari nama siswa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full md:w-64 px-3 py-2 pl-10 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
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

      <div className={`rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            {/* Table Header */}
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-2 sm:px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Nama
                </th>
                <th className="px-1 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                  Hadir
                </th>
                <th className="px-1 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                  Izin
                </th>
                <th className="px-1 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                  Sakit
                </th>
                <th className="px-1 pr-2 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                  Alfa
                </th>
                {showKelompokColumn && (
                  <th
                    className="px-2 sm:px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer select-none whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => handleSort('kelompok')}
                  >
                    <div className="flex items-center gap-1">
                      Kelompok
                      <span className="text-gray-400 dark:text-gray-500">
                        {sortColumn === 'kelompok' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </div>
                  </th>
                )}
                {showDesaColumn && (
                  <th
                    className="px-2 sm:px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer select-none whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => handleSort('desa')}
                  >
                    <div className="flex items-center gap-1">
                      Desa
                      <span className="text-gray-400 dark:text-gray-500">
                        {sortColumn === 'desa' ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {pagedStudents.length > 0 ? (
                pagedStudents.map((student, index) => (
                  <tr key={student.id || `student-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {/* Student Info */}
                    <td className="px-2 sm:px-6 py-3 sm:py-4 min-w-35 sm:min-w-0">
                      <div className="whitespace-normal">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {student.name}
                        </div>
                        {attendance[student.id]?.reason && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Alasan: {attendance[student.id].reason}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Status Radio Buttons */}
                    {(['H', 'I', 'S', 'A'] as const).map((status, index) => {
                      const isDisabled = canEditStudent ? !canEditStudent(student.id) : false
                      return (
                        <td key={status} className={`px-1 py-3 sm:py-4 text-center ${index === 3 ? 'pr-2' : ''}`}>
                          <label className={`flex items-center justify-center ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                              type="radio"
                              name={`status-${student.id}`}
                              value={status}
                              checked={attendance[student.id]?.status === status}
                              onChange={() => onStatusChange(student.id, status)}
                              disabled={isDisabled}
                              className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                          </label>
                        </td>
                      )
                    })}
                    {showKelompokColumn && (
                      <td className="px-2 sm:px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {student.kelompok_name || '—'}
                      </td>
                    )}
                    {showDesaColumn && (
                      <td className="px-2 sm:px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {student.desa_name || '—'}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={showKelompokColumn && showDesaColumn ? 7 : (showKelompokColumn || showDesaColumn ? 6 : 5)} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'Tidak ada siswa yang cocok dengan pencarian' : 'Tidak ada data siswa'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {startIndex} to {endIndex} of {totalEntries} entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-l-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {getPageNumbers().map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1 text-sm border-t border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:text-white ${currentPage === pageNum
                  ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600'
                  : ''
                  }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-r-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
