'use client'

import { useEffect, useState } from 'react'
import { 
  SafetyCertificateOutlined, 
  ReloadOutlined, 
  LeftOutlined, 
  RightOutlined, 
  BarsOutlined, 
  TeamOutlined 
} from '@ant-design/icons'
import { getActivityLogs, getLogMetadata, getUserActivitySummary, type GetLogsParams } from './actions'
import AuditTable from './components/AuditTable'
import AuditFilters from './components/AuditFilters'
import OnlinePresence from './components/OnlinePresence'
import UserSummaryTable from './components/UserSummaryTable'
import { toast } from 'sonner'

export default function AuditPage() {
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

  const loadLogs = async (currentParams: GetLogsParams) => {
    setLoading(true)
    try {
      const data = await getActivityLogs(currentParams)
      setLogs(data.logs)
      setTotal(data.total)
    } catch (error) {
      toast.error('Gagal memuat log aktivitas')
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    setSummaryLoading(true)
    try {
      const data = await getUserActivitySummary()
      setUserSummaries(data)
    } catch (error) {
      toast.error('Gagal memuat ringkasan user')
    } finally {
      setSummaryLoading(false)
    }
  }

  const loadMetadata = async () => {
    const meta = await getLogMetadata()
    setMetadata(meta)
  }

  useEffect(() => {
    loadLogs(params)
    loadMetadata()
    loadSummary()
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
    <div className="flex flex-col gap-6 p-4 md:p-8 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Audit System</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pantau semua aktivitas sistem dan keamanan secara real-time</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (activeTab === 'all') loadLogs(params)
            else loadSummary()
          }}
          disabled={loading || summaryLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-all disabled:opacity-50 shadow-sm"
        >
          <ReloadOutlined className={loading || summaryLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Real-time Presence */}
      <OnlinePresence />

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
          {/* Filters */}
          <AuditFilters 
            onFilter={handleFilter} 
            actions={metadata.actions} 
            entityTypes={metadata.entityTypes} 
          />

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <div className="h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
               <p className="text-gray-500 dark:text-gray-400 font-medium">Memuat data aktivitas...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <AuditTable logs={logs} />
              
              {/* Pagination */}
              {totalPages > 1 && (
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
              )}
            </div>
          )}
        </>
      ) : (
        <div className="mt-2">
          {summaryLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <div className="h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
               <p className="text-gray-500 dark:text-gray-400 font-medium">Menganalisis ringkasan aktivitas...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <UserSummaryTable data={userSummaries} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
