'use client'

import { useState, useEffect } from 'react'
import { DatePicker as AntdDatePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/id'
import { shouldUseMobileUI } from '@/lib/utils'
import Label from '@/components/form/Label'
import InputFilter from '@/components/form/input/InputFilter'

// Set Indonesian locale
dayjs.locale('id')

interface WeekPickerProps {
  value?: [Dayjs | null, Dayjs | null]
  onChange?: (weeks: [Dayjs | null, Dayjs | null]) => void
  className?: string
  disabled?: boolean
  label?: string
  id?: string
  success?: boolean
  error?: boolean
  hint?: string
}

export default function WeekPicker({
  value,
  onChange,
  className = '',
  disabled = false,
  label,
  id,
  success = false,
  error = false,
  hint
}: WeekPickerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [weekYear, setWeekYear] = useState(2025)
  const [weekMonth, setWeekMonth] = useState(10)
  const [startWeek, setStartWeek] = useState(1)
  const [endWeek, setEndWeek] = useState(1)

  useEffect(() => {
    setIsClient(true)
    setIsMobile(shouldUseMobileUI())

    const handleResize = () => {
      setIsMobile(shouldUseMobileUI())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate number of weeks in a month
  const getWeeksInMonth = (year: number, month: number) => {
    const firstDay = dayjs(`${year}-${month.toString().padStart(2, '0')}-01`)
    const lastDay = firstDay.endOf('month')
    const daysInMonth = lastDay.date()
    
    // Calculate weeks: first week + remaining weeks
    const firstWeekDays = 7 - firstDay.day() + 1 // Days in first week
    const remainingDays = daysInMonth - firstWeekDays
    const remainingWeeks = Math.ceil(remainingDays / 7)
    
    return 1 + remainingWeeks // First week + remaining weeks
  }

  // Convert week number to date range
  const getWeekDateRange = (year: number, month: number, weekNumber: number) => {
    const firstDay = dayjs(`${year}-${month.toString().padStart(2, '0')}-01`)
    const firstWeekDays = 7 - firstDay.day() + 1
    
    if (weekNumber === 1) {
      return {
        start: firstDay,
        end: firstDay.add(firstWeekDays - 1, 'day')
      }
    }
    
    const startDay = firstWeekDays + (weekNumber - 2) * 7
    const endDay = Math.min(startDay + 6, firstDay.endOf('month').date())
    
    return {
      start: dayjs(`${year}-${month.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`),
      end: dayjs(`${year}-${month.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`)
    }
  }

  // Update week range when year/month changes
  useEffect(() => {
    const maxWeeks = getWeeksInMonth(weekYear, weekMonth)
    if (startWeek > maxWeeks) setStartWeek(1)
    if (endWeek > maxWeeks) setEndWeek(maxWeeks)
  }, [weekYear, weekMonth, startWeek, endWeek])

  // Convert week numbers to Dayjs range for parent component
  useEffect(() => {
    if (isMobile && onChange) {
      const startRange = getWeekDateRange(weekYear, weekMonth, startWeek)
      const endRange = getWeekDateRange(weekYear, weekMonth, endWeek)
      onChange([startRange.start, endRange.end])
    }
  }, [weekYear, weekMonth, startWeek, endWeek, isMobile, onChange])

  // Don't render anything on server side to avoid hydration mismatch
  if (!isClient) {
    return null
  }

  // Determine input styles based on state (disabled, success, error)
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

  const monthOptions = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ]

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: (currentYear - 5 + i).toString(),
    label: (currentYear - 5 + i).toString()
  }))

  const maxWeeks = getWeeksInMonth(weekYear, weekMonth)
  const weekOptions = Array.from({ length: maxWeeks }, (_, i) => ({
    value: (i + 1).toString(),
    label: `Minggu ${i + 1}`
  }))

  if (isMobile) {
    return (
      <div className="relative">
        {label && <Label>{label}</Label>}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <InputFilter
              id={`${id}-year`}
              label="Tahun"
              value={weekYear.toString()}
              onChange={(value) => setWeekYear(parseInt(value))}
              options={yearOptions}
              className="mb-0"
            />
          </div>
          <div>
            <InputFilter
              id={`${id}-month`}
              label="Bulan"
              value={weekMonth.toString()}
              onChange={(value) => setWeekMonth(parseInt(value))}
              options={monthOptions}
              className="mb-0"
            />
          </div>
          <div>
            <InputFilter
              id={`${id}-start-week`}
              label="Minggu Mulai"
              value={startWeek.toString()}
              onChange={(value) => setStartWeek(parseInt(value))}
              options={weekOptions}
              className="mb-0"
            />
          </div>
          <div>
            <InputFilter
              id={`${id}-end-week`}
              label="Minggu Akhir"
              value={endWeek.toString()}
              onChange={(value) => setEndWeek(parseInt(value))}
              options={weekOptions}
              className="mb-0"
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

  // Desktop: Use Ant Design Week Range Picker
  return (
    <div className="relative">
      {label && <Label htmlFor={id}>{label}</Label>}
      <AntdDatePicker.RangePicker
        value={value as [Dayjs, Dayjs] | null}
        onChange={(dates) => {
          if (onChange) {
            if (dates) {
              onChange([dates[0], dates[1]])
            } else {
              onChange([null, null])
            }
          }
        }}
        picker="week"
        format="YYYY-[W]WW"
        placeholder={['Minggu Mulai', 'Minggu Akhir']}
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
