'use client'

interface MaterialCardProps {
  icon: string
  title: string
  content: {
    title?: string
    items: Array<string | {
      title?: string
      arabic?: string
      latin?: string
      meaning?: string
      reference?: string
    }>
  }
}

export default function MaterialCard({ icon, title, content }: MaterialCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      
      <div className="space-y-3">
        {Array.isArray(content.items) ? (
          content.items.map((item, idx) => (
            <div key={idx} className="space-y-2">
              {typeof item === 'string' ? (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{item}</p>
              ) : (
                <>
                  {item.title && (
                    <h4 className="font-medium text-gray-900 dark:text-white">{item.title}</h4>
                  )}
                  {item.arabic && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-right text-xl leading-loose font-arabic" dir="rtl">
                        {item.arabic}
                      </p>
                    </div>
                  )}
                  {item.latin && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      {item.latin}
                    </p>
                  )}
                  {item.meaning && (
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {item.meaning}
                    </p>
                  )}
                  {item.reference && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      📖 {item.reference}
                    </p>
                  )}
                </>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-700 dark:text-gray-300">{content.title || 'No content available'}</p>
        )}
      </div>
    </div>
  )
}
