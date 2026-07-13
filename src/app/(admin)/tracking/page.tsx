'use client'

import { useEffect, useRef, useState } from 'react'
import { 
  BarsOutlined, 
  TeamOutlined 
} from '@ant-design/icons'
import { getActivityLogs, getLogMetadata, getUserActivitySummary, type GetLogsParams, type GetUserActivitySummaryParams } from './actions'
import DataFilter from '@/components/shared/DataFilter'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import type { DataFilters } from '@/components/shared/DataFilter'
import AuditTable from './components/AuditTable'
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
  const [summaryFilters, setSummaryFilters] = useState<DataFilters>({
    daerah: [], desa: [], kelompok: [], kelas: []
  })
  const paramsRef = useRef(params)
  paramsRef.current = params

  const { profile: userProfile } = useUserProfile()
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok } = useKelompok()

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

  const loadSummary = async (showLoading = true, filters?: DataFilters) => {
    if (showLoading) setSummaryLoading(true)
    const activeFilters = filters ?? summaryFilters
    const summaryParams: GetUserActivitySummaryParams = {
      daerahId: activeFilters.daerah[0],
      desaId: activeFilters.desa[0],
      kelompokId: activeFilters.kelompok[0],
    }
    try {
      const result = await getUserActivitySummary(summaryParams)
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

    const { createAuthClient } = require('@/lib/supabase/client')

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        loadLogs(paramsRef.current, false)
        loadSummary(false)
      }, 3000)
    }

    const channel = createAuthClient().channel('tracking-logs-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        scheduleRefresh
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      createAuthClient().removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSummaryFilterChange = (filters: DataFilters) => {
    setSummaryFilters(filters)
    loadSummary(true, filters)
  }

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
        <div className="flex items-center my-5 gap-1 p-1 w-fit rounded-xl bg-gray-200/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
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
              </div>
            )}
          </>
        ) : (
          <>
            <DataFilter
              filters={summaryFilters}
              onFilterChange={handleSummaryFilterChange}
              userProfile={userProfile}
              daerahList={daerah || []}
              desaList={desa || []}
              kelompokList={kelompok || []}
              classList={[]}
              showKelas={false}
              showDaerah={userProfile?.role === 'superadmin'}
              showDesa={userProfile?.role === 'superadmin' || (userProfile?.role === 'admin' && !!userProfile?.daerah_id && !userProfile?.desa_id)}
              showKelompok={userProfile?.role === 'superadmin' || userProfile?.role === 'admin'}
            />
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
