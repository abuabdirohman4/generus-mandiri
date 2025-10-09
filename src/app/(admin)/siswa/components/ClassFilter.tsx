'use client'

import Label from '@/components/form/Label'

interface Class {
  id: string
  name: string
}

interface ClassFilterProps {
  userProfile: { role: string; class_id: string | null; class_name: string | null } | null | undefined
  classes: Class[]
  selectedClassFilter: string
  onClassFilterChange: (value: string) => void
}

export default function ClassFilter({ 
  userProfile, 
  classes, 
  selectedClassFilter, 
  onClassFilterChange 
}: ClassFilterProps) {
  if (userProfile?.role !== 'admin') {
    return null
  }

  return (
    <div className="mb-6">
      <div className="max-w-xs">
        <Label htmlFor="classFilter">Filter Kelas</Label>
        <select
          id="classFilter"
          value={selectedClassFilter}
          onChange={(e) => onClassFilterChange(e.target.value)}
          className="w-full px-3 py-2 border bg-white border-gray-100 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none bg-no-repeat bg-right bg-[length:16px] pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 8px center'
          }}
        >
          <option value="">Semua Kelas</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
