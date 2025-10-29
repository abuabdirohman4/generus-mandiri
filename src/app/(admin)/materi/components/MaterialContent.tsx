'use client'

import { LearningMaterial, getDayName, romanNumeral, getMonthName } from '../types'
import MaterialCard from './MaterialCard'

interface MaterialContentProps {
  material: LearningMaterial | null
  isLoading: boolean
  selectedDate: {
    semester: number
    month: number
    week: number
    day: number
  }
}

export default function MaterialContent({ material, isLoading, selectedDate }: MaterialContentProps) {
  if (isLoading) {
    return <MaterialSkeleton />
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
        <p className="text-gray-500 dark:text-gray-400">
          Materi untuk tanggal ini belum tersedia
        </p>
      </div>
    )
  }
  
  const dayName = getDayName(selectedDate.day as any)
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {dayName}, Minggu {romanNumeral(selectedDate.week as any)} - {getMonthName(selectedDate.month as any)}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Semester {selectedDate.semester}
        </p>
      </div>
      
      {/* Material Cards */}
      <div className="grid gap-4">
        {material.content.quran && (
          <MaterialCard 
            icon="📖"
            title="Al-Qur'an"
            content={material.content.quran}
          />
        )}
        
        {material.content.hafalan && (
          <MaterialCard 
            icon="🎯"
            title="Hafalan"
            content={material.content.hafalan}
          />
        )}
        
        {material.content.doa && (
          <MaterialCard 
            icon="🤲"
            title="Do'a"
            content={material.content.doa}
          />
        )}
        
        {material.content.akhlaq && (
          <MaterialCard 
            icon="⭐"
            title="Akhlaqul Karimah"
            content={material.content.akhlaq}
          />
        )}
        
        {material.content.hadits && (
          <MaterialCard 
            icon="📜"
            title="Hadits"
            content={material.content.hadits}
          />
        )}
        
        {material.content.kamis && (
          <MaterialCard 
            icon="☀️"
            title="Kamis"
            content={material.content.kamis}
          />
        )}
        
        {material.content.jumat && (
          <MaterialCard 
            icon="☀️"
            title="Jum'at"
            content={material.content.jumat}
          />
        )}
        
        {material.content.sabtu && (
          <MaterialCard 
            icon="☀️"
            title="Sabtu"
            content={material.content.sabtu}
          />
        )}
      </div>
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
