'use client'

interface AutoSaveStatusProps {
  isAutoSaving: boolean
  lastSaved: Date | null
  className?: string
}

export default function AutoSaveStatus({ 
  isAutoSaving, 
  lastSaved, 
  className = '' 
}: AutoSaveStatusProps) {
  return (
    <div className={`mt-6 flex justify-center sm:justify-end ${className}`}>
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        {isAutoSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Menyimpan...</span>
          </>
        ) : lastSaved ? (
          <>
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Disimpan {lastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </>
        ) : (
          <span>Perubahan akan disimpan otomatis</span>
        )}
      </div>
    </div>
  )
}
