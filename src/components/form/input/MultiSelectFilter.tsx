'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDownIcon, CheckLineIcon } from '@/lib/icons'
import Label from '../Label'

interface Option {
  value: string
  label: string
}

interface MultiSelectFilterProps {
  id: string
  label: string
  value: string[]  // Array of selected IDs
  onChange: (value: string[]) => void
  options: Option[]
  placeholder?: string
  allOptionLabel?: string  // "Semua Daerah", etc.
  variant?: 'page' | 'modal'
  compact?: boolean
  required?: boolean
  error?: boolean
  hint?: string
  widthClassName?: string
  className?: string
}

export default function MultiSelectFilter({
  id,
  label,
  value = [],
  onChange,
  options,
  placeholder = "Pilih...",
  allOptionLabel,
  variant = 'page',
  compact = false,
  required = false,
  error = false,
  hint,
  widthClassName = "!max-w-full",
  className = ''
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)


  // Determine styling based on variant and compact mode
  const containerClass = variant === 'modal' 
    ? (compact ? 'mb-0' : 'mb-4')
    : 'mb-6'
  
  // Wrapper class for the container
  const wrapperClass = variant === 'modal'
    ? (compact ? 'w-full' : `w-full ${widthClassName}`)
    : `max-w-xs ${widthClassName}`

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm])

  // Get selected options for display
  const selectedOptions = useMemo(() => {
    return options.filter(option => value.includes(option.value))
  }, [options, value])

  // Check if all options are selected
  const allSelected = useMemo(() => {
    return options.length > 0 && value.length === options.length
  }, [options.length, value.length])

  // Compute display value for input
  const displayValue = useMemo(() => {
    if (searchTerm) return searchTerm
    if (selectedOptions.length === 0) return ''
    if (selectedOptions.length <= 3) {
      return selectedOptions.map(opt => opt.label).join(', ')
    }
    return `${selectedOptions.length} dari ${options.length} dipilih`
  }, [searchTerm, selectedOptions, options.length])

  // Handle option selection
  const handleOptionSelect = (optionValue: string) => {
    if (optionValue === 'all') {
      // Toggle all options
      if (allSelected) {
        onChange([])
      } else {
        onChange(options.map(option => option.value))
      }
    } else {
      // Toggle single option
      if (value.includes(optionValue)) {
        onChange(value.filter(v => v !== optionValue))
      } else {
        onChange([...value, optionValue])
      }
    }
    setSearchTerm('')
    setHighlightedIndex(-1)
  }


  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true)
    setSearchTerm('')
  }

  // Handle input blur
  const handleInputBlur = (e: React.FocusEvent) => {
    // Don't close if clicking inside dropdown
    if (dropdownRef.current?.contains(e.relatedTarget as Node)) {
      return
    }
    setIsOpen(false)
    setSearchTerm('')
    setHighlightedIndex(-1)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
        setHighlightedIndex(0)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredOptions.length ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[highlightedIndex].value)
        } else if (highlightedIndex === filteredOptions.length && allOptionLabel) {
          handleOptionSelect('all')
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredOptions])

  const inputClass = cn(
    "w-full px-3 py-2 pr-7 border bg-white border-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
    error && "border-red-300 focus:ring-red-500 focus:border-red-500",
    compact && "px-2 py-1 text-sm pr-7",
    widthClassName
  )


  return (
    <div ref={containerRef} className={`relative ${containerClass} ${className}`}>
      <div className={wrapperClass}>
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        {/* Input field */}
        <div className="relative">
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={displayValue}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={selectedOptions.length === 0 ? placeholder : ''}
            className={inputClass}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <ChevronDownIcon className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </button>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {/* Select All option */}
            {allOptionLabel && (
              <button
                type="button"
                onClick={() => handleOptionSelect('all')}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2",
                  highlightedIndex === filteredOptions.length && "bg-gray-100",
                  compact && "px-2 py-1 text-sm"
                )}
              >
                <div className={cn(
                  "w-4 h-4 border border-gray-300 rounded flex items-center justify-center",
                  allSelected && "bg-blue-500 border-blue-500"
                )}>
                  {allSelected && <CheckLineIcon className="h-4 w-4 -translate-x-0.25 text-white" />}
                </div>
                <span className="text-sm">{allOptionLabel}</span>
              </button>
            )}

            {/* Options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = value.includes(option.value)
                const isHighlighted = index === highlightedIndex

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOptionSelect(option.value)}
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2",
                      isHighlighted && "bg-gray-100",
                      compact && "px-2 py-1 text-sm"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 border border-gray-300 rounded flex items-center justify-center",
                      isSelected && "bg-blue-500 border-blue-500"
                    )}>
                      {isSelected && <CheckLineIcon className="h-4 w-4 -translate-x-0.25 text-white" />}
                    </div>
                    <span className="text-sm">{option.label}</span>
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {searchTerm ? 'Tidak ada hasil ditemukan' : 'Tidak ada opsi tersedia'}
              </div>
            )}
          </div>
        )}

        {/* Hint/Error message */}
        {(hint || error) && (
          <p className={cn(
            "mt-1 text-xs",
            error ? "text-red-600" : "text-gray-500"
          )}>
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
