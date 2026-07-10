'use client'

import { useEffect, useRef, useState } from 'react'
import { 
  SafetyCertificateOutlined, 
  LeftOutlined, 
  RightOutlined, 
  BarsOutlined, 
  TeamOutlined 
} from '@ant-design/icons'
import { getActivityLogs, getLogMetadata, getUserActivitySummary, type GetLogsParams } from './actions'
import AuditTable from './components/AuditTable'
import AuditFilters from './components/AuditFilters'
import OnlinePresence from './components/OnlinePresence'
import AppMap from './components/AppMap'
import UserSummaryTable from './components/UserSummaryTable'
import SuperadminTableSkeleton from '@/components/ui/skeleton/SuperadminTableSkeleton'
import { toast } from 'sonner'

export default function TrackingPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'summary'>('all')
  const [logs, setLogs] = useState<any[]>([])
  const [userSummaries, setUserSummaries] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [metadata, setMetadata] = useState<{ actions: string[], entityTypes: string[] }>({
    actions: [],
    entityTypes: []
  })
  const [params, setParams] = useState<GetLogsParams>({
    page: 1,
    limit: 50
  })
  const paramsRef = useRef(params)
  paramsRef.current = params

  const loadLogs = async (currentParams: GetLogsParams, showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const result = await getActivityLogs(currentParams)
      if (result.success) {
        setLogs(result.logs)
        setTotal(result.total)
      } else {
        toast.error(result.message || 'Gagal memuat log aktivitas')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem saat memuat log')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const loadSummary = async (showLoading = true) => {
    if (showLoading) setSummaryLoading(true)
    try {
      const result = await getUserActivitySummary()
      if (result.success) {
        setUserSummaries(result.data)
      } else {
        toast.error(result.message || 'Gagal memuat ringkasan user')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem saat memuat ringkasan')
    } finally {
      if (showLoading) setSummaryLoading(false)
    }
  }

  const loadMetadata = async () => {
    const meta = await getLogMetadata()
    setMetadata(meta)
  }

  // sm-hsp7: logs re-fetch when params (page/filters) change.
  useEffect(() => {
    loadLogs(params)
  }, [params])

  // sm-hsp7: metadata + summary + realtime subscription only run once on mount
  // (was re-running on every params change — every page/filter click was
  // re-fetching 2000-row metadata and re-subscribing the realtime channel).
  // The realtime callback was also unfiltered (fires on every activity_logs
  // INSERT app-wide, since every page navigation logs an 'open_page' row) and
  // uncoalesced — debounced here so a burst of inserts triggers one refresh,
  // not one per event.
  useEffect(() => {
    loadMetadata()
    loadSummary()

    const { createClient } = require('@/lib/supabase/client')
    const supabase = createClient()

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        loadLogs(paramsRef.current, false)
        loadSummary(false)
      }, 3000)
    }

    const channel = supabase.channel('tracking-logs-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        scheduleRefresh
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilter = (newFilters: Partial<GetLogsParams>) => {
    const newParams = { ...params, ...newFilters, page: 1 }
    setParams(newParams)
    loadLogs(newParams)
  }

  const handlePageChange = (newPage: number) => {
    const newParams = { ...params, page: newPage }
    setParams(newParams)
    loadLogs(newParams)
  }

  const totalPages = Math.ceil(total / (params.limit || 50))

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Tracking System</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pantau semua aktivitas sistem dan keamanan secara real-time</p>
            </div>
          </div>
        </div>

        {/* Real-time Presence */}
        <OnlinePresence />

        {/* Denah Aplikasi */}
        <AppMap />

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 w-fit rounded-xl bg-gray-200/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'all' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <BarsOutlined />
            Semua Aktivitas
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'summary' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <TeamOutlined />
            Ringkasan per User
          </button>
        </div>

        {activeTab === 'all' ? (
          <>
            {/* Table */}
            {loading && logs.length === 0 ? (
              <SuperadminTableSkeleton />
            ) : (
              <div className="overflow-hidden">
                <AuditTable logs={logs} />
                
                {/* Pagination */}
                {/* {totalPages > 1 && (
                  <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Menampilkan <span className="font-semibold text-gray-900 dark:text-white">{logs.length}</span> dari <span className="font-semibold text-gray-900 dark:text-white">{total}</span> log
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange((params.page || 1) - 1)}
                        disabled={(params.page || 1) === 1}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-600 dark:text-gray-400"
                      >
                        <LeftOutlined />
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum = i + 1;
                          if (totalPages > 5 && (params.page || 1) > 3) {
                            pageNum = (params.page || 1) - 3 + i;
                          }
                          if (pageNum > totalPages) return null;
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
                                (params.page || 1) === pageNum 
                                ? 'bg-blue-600 text-white' 
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange((params.page || 1) + 1)}
                        disabled={(params.page || 1) === totalPages}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-600 dark:text-gray-400"
                      >
                        <RightOutlined />
                      </button>
                    </div>
                  </div>
                )} */}
              </div>
            )}
          </>
        ) : (
          <>
            {summaryLoading && userSummaries.length === 0 ? (
              <SuperadminTableSkeleton />
            ) : (
              <div className="overflow-hidden">
                <UserSummaryTable data={userSummaries} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
