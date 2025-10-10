'use client'

import Label from '@/components/form/Label'

interface FilterOption {
  value: string
  label: string
}

interface InputFilterProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  allOptionLabel?: string
  disabled?: boolean
  className?: string
}

export default function InputFilter({ 
  id,
  label,
  value,
  onChange,
  options,
  allOptionLabel = 'Semua',
  disabled = false,
  className = ''
}: InputFilterProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="max-w-xs">
        <Label htmlFor={id}>{label}</Label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border bg-white border-gray-100 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none bg-no-repeat bg-right bg-[length:16px] pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 8px center'
          }}
        >
          <option value="">{allOptionLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
