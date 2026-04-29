'use client'

import { SearchOutlined, CalendarOutlined, FilterOutlined, CloseOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import type { GetLogsParams } from '../actions'

interface AuditFiltersProps {
  onFilter: (params: GetLogsParams) => void
  actions: string[]
  entityTypes: string[]
}

export default function AuditFilters({ onFilter, actions, entityTypes }: AuditFiltersProps) {
  const [params, setParams] = useState<GetLogsParams>({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setParams(prev => ({ ...prev, [name]: value }))
  }

  const handleApply = () => {
    onFilter(params)
  }

  const handleReset = () => {
    const resetParams = {
      action: '',
      entityType: '',
      startDate: '',
      endDate: '',
    }
    setParams(resetParams)
    onFilter(resetParams)
  }

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Action Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Jenis Aksi</label>
          <div className="relative group">
            <FilterOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" />
            <select
              name="action"
              value={params.action}
              onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-2 pl-9 pr-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 appearance-none transition-all"
            >
              <option value="">Semua Aksi</option>
              {actions.map(action => (
                <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Entity Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Jenis Entitas</label>
          <div className="relative group">
            <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" />
            <select
              name="entityType"
              value={params.entityType}
              onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-2 pl-9 pr-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 appearance-none transition-all"
            >
              <option value="">Semua Entitas</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Dari Tanggal</label>
          <div className="relative group">
            <CalendarOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" />
            <input
              type="date"
              name="startDate"
              value={params.startDate}
              onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-2 pl-9 pr-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all dark:scheme-dark"
            />
          </div>
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Sampai Tanggal</label>
          <div className="relative group">
            <CalendarOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" />
            <input
              type="date"
              name="endDate"
              value={params.endDate}
              onChange={handleChange}
              className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-2 pl-9 pr-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all dark:scheme-dark"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
        >
          <CloseOutlined />
          Reset
        </button>
        <button
          onClick={handleApply}
          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          Terapkan Filter
        </button>
      </div>
    </div>
  )
}
