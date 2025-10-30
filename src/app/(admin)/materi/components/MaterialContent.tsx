'use client'

import { useState } from 'react'
import { LearningMaterial, getDayName, romanNumeral, getMonthName } from '../types'
import { MaterialInputModal } from './MaterialInputModal'

// Helper function to safely access content properties
function getContentTitle(content: string | { title?: string; items?: string[] } | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content.title || '';
}

function getContentText(content: string | { title?: string; items?: string[] } | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content.items)) return content.items.join(', ');
  return content.items || '';
}

interface MaterialContentProps {
  material: LearningMaterial | null
  isLoading: boolean
  selectedDate: {
    semester: number
    month: number
    week: number
    day: number
  }
  classMasterId?: string
}

export default function MaterialContent({ material, isLoading, selectedDate, classMasterId }: MaterialContentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  if (isLoading) {
    return <MaterialSkeleton />
  }

  // Safe dayName calculation with fallback for modal
  let dayName = 'Senin'; // Default fallback
  try {
    dayName = getDayName(selectedDate.day as any);
  } catch (error) {
    dayName = 'Senin'; // Fallback
  }
  
  if (!material) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Belum ada materi
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Materi untuk tanggal ini belum tersedia
        </p>
        {classMasterId && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            📝 Input Materi
          </button>
        )}
        
        {/* Modal for empty state */}
        {classMasterId && (
          <MaterialInputModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            classMasterId={classMasterId}
            semester={selectedDate.semester}
            month={selectedDate.month}
            week={selectedDate.week}
            dayOfWeek={selectedDate.day}
            dayName={dayName}
          />
        )}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Materi Hari Ini
              {/* {dayName}, Minggu {romanNumeral(selectedDate.week as any)} - {getMonthName(selectedDate.month as any)} */}
            </h2>
            {/* <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Semester {selectedDate.semester}
            </p> */}
          </div>
          {classMasterId && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
            >
              ✏️ Edit
            </button>
          )}
        </div>
      </div>
      
      {/* Material Cards */}
      <div className="grid gap-4">
        {material.content.quran && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📖</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getContentTitle(material.content.quran) || 'Al-Qur\'an'}
              </h3>
            </div>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getContentText(material.content.quran)}
            </div>
          </div>
        )}
        
        {material.content.hafalan && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎯</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getContentTitle(material.content.hafalan) || 'Hafalan'}
              </h3>
            </div>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getContentText(material.content.hafalan)}
            </div>
          </div>
        )}
        
        {material.content.doa && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🤲</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getContentTitle(material.content.doa) || 'Do\'a'}
              </h3>
            </div>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getContentText(material.content.doa)}
            </div>
          </div>
        )}
        
        {material.content.akhlaq && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⭐</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getContentTitle(material.content.akhlaq) || 'Akhlaqul Karimah'}
              </h3>
            </div>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getContentText(material.content.akhlaq)}
            </div>
          </div>
        )}
        
        {material.content.hadits && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📜</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getContentTitle(material.content.hadits) || 'Hadits'}
              </h3>
            </div>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getContentText(material.content.hadits)}
            </div>
          </div>
        )}
        
        {material.content.kamis && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">☀️</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getContentTitle(material.content.kamis) || 'Kamis'}
              </h3>
            </div>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getContentText(material.content.kamis)}
            </div>
          </div>
        )}
        
        {material.content.jumat && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">☀️</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getContentTitle(material.content.jumat) || 'Jum\'at'}
              </h3>
            </div>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getContentText(material.content.jumat)}
            </div>
          </div>
        )}
        
        {material.content.sabtu && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">☀️</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getContentTitle(material.content.sabtu) || 'Sabtu'}
              </h3>
            </div>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getContentText(material.content.sabtu)}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal */}
      {classMasterId && (
        <MaterialInputModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          classMasterId={classMasterId}
          semester={selectedDate.semester}
          month={selectedDate.month}
          week={selectedDate.week}
          dayOfWeek={selectedDate.day}
          dayName={dayName}
        />
      )}
    </div>
  )
}

function MaterialSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4 mt-2"></div>
      </div>
      
      {/* Card Skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
