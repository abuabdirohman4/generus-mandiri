'use client'

import { useState, useEffect } from 'react'
import { getDayName, DayMaterialAssignment } from '../../types'
import { MaterialInputModal } from './MaterialInputModal'
import { getDayMaterialAssignments } from '../../actions'

interface MaterialContentProps {
  selectedDate: {
    semester: number
    month: number
    week: number
    day: number
  }
  classMasterId?: string
}

export default function MaterialContent({ selectedDate, classMasterId }: MaterialContentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [assignments, setAssignments] = useState<DayMaterialAssignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  // Load new structure assignments
  useEffect(() => {
    if (classMasterId) {
      loadAssignments()
    }
  }, [classMasterId, selectedDate.semester, selectedDate.month, selectedDate.week, selectedDate.day])

  const loadAssignments = async () => {
    if (!classMasterId) return
    
    try {
      setLoadingAssignments(true)
      const data = await getDayMaterialAssignments({
        class_master_id: classMasterId,
        semester: selectedDate.semester,
        month: selectedDate.month,
        week: selectedDate.week,
        day_of_week: selectedDate.day,
      })
      setAssignments(data || [])
    } catch (error) {
      console.error('Error loading assignments:', error)
      setAssignments([])
    } finally {
      setLoadingAssignments(false)
    }
  }
  
  if (loadingAssignments) {
    return <MaterialSkeleton />
  }

  // Safe dayName calculation with fallback for modal
  let dayName = 'Senin'; // Default fallback
  try {
    dayName = getDayName(selectedDate.day as any);
  } catch (error) {
    dayName = 'Senin'; // Fallback
  }

  if (assignments.length === 0 && !loadingAssignments) {
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
  
  // Render new flexible structure
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Materi Hari Ini
            </h2>
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

      {/* Material Cards - New Structure */}
      <div className="grid gap-4">
        {assignments.map((assignment) => {
          const categoryName = assignment.material_type?.category?.name || '';
          const typeName = assignment.material_type?.name || 'Unknown';
          
          return (
            <div key={assignment.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">
                  {categoryName === 'Alim: Baca-Tulis' ? '📖' :
                   categoryName === 'Alim: Hafalan' ? '🧠' :
                   categoryName === 'Faqih' ? '📜' :
                   categoryName === 'Akhlakul Karimah' ? '💎' : '📝'}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {typeName}
                  </h3>
                  {assignment.notes && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {assignment.notes}
                    </p>
                  )}
                </div>
              </div>
              
              {assignment.items && assignment.items.length > 0 ? (
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  <ul className="list-disc list-inside space-y-1">
                    {assignment.items.map((item, index) => (
                      <li key={item.id || index}>
                        {item.custom_content || item.material_item?.name || 'Unknown item'}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  Belum ada item yang dipilih
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {classMasterId && (
        <MaterialInputModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            loadAssignments() // Reload after close
          }}
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
