'use client'

import { useState, useEffect } from 'react'
import { DatePicker as AntdDatePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/id'
import { shouldUseMobileUI } from '@/lib/utils'
import Label from '@/components/form/Label'

// Set Indonesian locale
dayjs.locale('id')

interface DatePickerInputProps {
  value?: Dayjs | null
  onChange?: (date: Dayjs | null) => void
  format?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  label?: string
  mode?: 'single'
  id?: string
  success?: boolean
  error?: boolean
  hint?: string
}

interface RangeDatePickerInputProps {
  value?: [Dayjs | null, Dayjs | null]
  onChange?: (dates: [Dayjs | null, Dayjs | null]) => void
  format?: string
  placeholder?: [string, string]
  className?: string
  disabled?: boolean
  label?: string
  mode: 'range'
  id?: string
  success?: boolean
  error?: boolean
  hint?: string
}

type DatePickerComponentProps = DatePickerInputProps | RangeDatePickerInputProps

export default function DatePickerInput(props: DatePickerComponentProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setIsMobile(shouldUseMobileUI())

    const handleResize = () => {
      setIsMobile(shouldUseMobileUI())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Don't render anything on server side to avoid hydration mismatch
  if (!isClient) {
    return null
  }

  const {
    value,
    onChange,
    format = 'DD/MM/YYYY',
    placeholder,
    className = '',
    disabled = false,
    label,
    id,
    mode = 'single',
    success = false,
    error = false,
    hint
  } = props

  // Convert dayjs to YYYY-MM-DD for native input
  const formatForNativeInput = (date: Dayjs | null): string => {
    return date ? date.format('YYYY-MM-DD') : ''
  }

  // Convert YYYY-MM-DD to dayjs
  const parseFromNativeInput = (dateString: string): Dayjs | null => {
    return dateString ? dayjs(dateString) : null
  }

  // Determine input styles based on state (disabled, success, error) - same as InputField
  const getInputClasses = (additionalClasses = '') => {
    let inputClasses = `h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${className} ${additionalClasses}`;

    // Add styles for the different states
    if (disabled) {
      inputClasses += ` text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
    } else if (error) {
      inputClasses += ` text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10  dark:text-error-400 dark:border-error-500`;
    } else if (success) {
      inputClasses += ` text-success-500 border-success-400 focus:ring-success-500/10 focus:border-success-300  dark:text-success-400 dark:border-success-500`;
    } else {
      inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
    }

    return inputClasses;
  }

  // Single date picker
  if (mode === 'single') {
    const singleProps = props as DatePickerInputProps

    if (isMobile) {
      return (
        <div className="relative">
          {label && <Label htmlFor={id}>{label}</Label>}
          <input
            id={id}
            type="date"
            value={formatForNativeInput(singleProps.value || null)}
            onChange={(e) => {
              const newDate = parseFromNativeInput(e.target.value)
              singleProps.onChange?.(newDate)
            }}
            disabled={disabled}
            className={getInputClasses()}
            placeholder={placeholder as string | undefined}
          />
          {/* Optional Hint Text */}
          {hint ? <p
              className={`mt-1.5 text-xs ${
                error
                  ? "text-error-500"
                  : success
                  ? "text-success-500"
                  : "text-gray-500"
              }`}
            >
              {hint}
            </p> : null}
        </div>
      )
    }

    return (
      <div className="relative">
        {label && <Label htmlFor={id}>{label}</Label>}
        <AntdDatePicker
          value={singleProps.value}
          onChange={singleProps.onChange}
          format={format}
          placeholder={placeholder as string | undefined}
          disabled={disabled}
          className={`w-full ${getInputClasses()}`}
          id={id}
        />
        {/* Optional Hint Text */}
        {hint ? <p
            className={`mt-1.5 text-xs ${
              error
                ? "text-error-500"
                : success
                ? "text-success-500"
                : "text-gray-500"
            }`}
          >
            {hint}
          </p> : null}
      </div>
    )
  }

  // Range date picker
  if (mode === 'range') {
    const rangeProps = props as RangeDatePickerInputProps

    if (isMobile) {
      return (
        <div className="relative">
          {label && <Label>{label}</Label>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="date"
                value={formatForNativeInput(rangeProps.value?.[0] || null)}
                onChange={(e) => {
                  const newStartDate = parseFromNativeInput(e.target.value)
                  const newValue: [Dayjs | null, Dayjs | null] = [
                    newStartDate,
                    rangeProps.value?.[1] || null
                  ]
                  rangeProps.onChange?.(newValue)
                }}
                disabled={disabled}
                className={getInputClasses()}
                placeholder={rangeProps.placeholder?.[0] || 'Tanggal mulai'}
              />
            </div>
            <div>
              <input
                type="date"
                value={formatForNativeInput(rangeProps.value?.[1] || null)}
                onChange={(e) => {
                  const newEndDate = parseFromNativeInput(e.target.value)
                  const newValue: [Dayjs | null, Dayjs | null] = [
                    rangeProps.value?.[0] || null,
                    newEndDate
                  ]
                  rangeProps.onChange?.(newValue)
                }}
                disabled={disabled}
                className={getInputClasses()}
                placeholder={rangeProps.placeholder?.[1] || 'Tanggal akhir'}
              />
            </div>
          </div>
          {/* Optional Hint Text */}
          {hint ? <p
              className={`mt-1.5 text-xs ${
                error
                  ? "text-error-500"
                  : success
                  ? "text-success-500"
                  : "text-gray-500"
              }`}
            >
              {hint}
            </p> : null}
        </div>
      )
    }

    return (
      <div className="relative">
        {label && <Label>{label}</Label>}
        <AntdDatePicker.RangePicker
          value={rangeProps.value as [Dayjs, Dayjs] | null}
          onChange={(dates, dateStrings) => {
            if (rangeProps.onChange) {
              if (dates) {
                rangeProps.onChange([dates[0], dates[1]])
              } else {
                rangeProps.onChange([null, null])
              }
            }
          }}
          format={format}
          placeholder={rangeProps.placeholder}
          disabled={disabled}
          className={`w-full ${getInputClasses()}`}
        />
        {/* Optional Hint Text */}
        {hint ? <p
            className={`mt-1.5 text-xs ${
              error
                ? "text-error-500"
                : success
                ? "text-success-500"
                : "text-gray-500"
            }`}
          >
            {hint}
          </p> : null}
      </div>
    )
  }

  return null
}
