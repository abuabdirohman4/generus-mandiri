'use client'

import { useState, useEffect } from 'react'
import { ClassMaster, Semester, Month, Week, DayOfWeek, LearningMaterial } from '../types'
import SemesterTabs from './SemesterTabs'
import MonthTabs from './MonthTabs'
import WeekTabs from './WeekTabs'
import DayTabs from './DayTabs'
import MaterialContent from './MaterialContent'
import { getLearningMaterial } from '../actions'
import DataFilter from '@/components/shared/DataFilter'

interface MaterialsLayoutProps {
  classMasters: ClassMaster[]
  userProfile: any
}

export default function MaterialsLayout({ classMasters, userProfile }: MaterialsLayoutProps) {
  // Filter state for DataFilter
  const [filters, setFilters] = useState({
    daerah: [] as string[],
    desa: [] as string[],
    kelompok: [] as string[],
    kelas: classMasters.length > 0 ? [classMasters[0].id] : [] as string[]
  })
  
  const [semester, setSemester] = useState<Semester>(1)
  const [month, setMonth] = useState<Month>(1)
  const [week, setWeek] = useState<Week>(1)
  const [day, setDay] = useState<DayOfWeek>(1)
  
  const [material, setMaterial] = useState<LearningMaterial | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Get selected class from filters
  const selectedClass = classMasters.find(cm => filters.kelas.includes(cm.id)) || classMasters[0] || null

  // Fetch material when filters change
  useEffect(() => {
    if (!selectedClass) return

    const fetchMaterial = async () => {
      setIsLoading(true)
      try {
        const data = await getLearningMaterial({
          classMasterId: selectedClass.id,
          semester,
          month,
          week,
          dayOfWeek: day
        })
        setMaterial(data)
      } catch (error) {
        console.error('Error fetching material:', error)
        setMaterial(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMaterial()
  }, [selectedClass, semester, month, week, day])

  // Reset month when semester changes
  const handleSemesterChange = (newSemester: Semester) => {
    setSemester(newSemester)
    setMonth(newSemester === 1 ? 1 : 7) // Reset to first month of semester
  }

  if (!selectedClass) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tidak ada kelas yang tersedia</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* DataFilter for Class Selection */}
      {classMasters.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <DataFilter
            filters={filters}
            onFilterChange={setFilters}
            userProfile={userProfile}
            daerahList={[]}
            desaList={[]}
            kelompokList={[]}
            classList={classMasters.map(cm => ({
              id: cm.id,
              name: cm.name,
              kelompok_id: null
            }))}
            showKelas={true}
            showDaerah={false}
            showDesa={false}
            showKelompok={false}
            variant="modal"
            className="md:grid-cols-1"
          />
        </div>
      )}
      
      {/* Navigation Tabs */}
      <div className="space-y-3">
        {/* Semester Tabs */}
        <SemesterTabs 
          selected={semester}
          onChange={handleSemesterChange}
        />
        
        {/* Month Tabs */}
        <MonthTabs 
          semester={semester}
          selected={month}
          onChange={setMonth}
        />
        
        {/* Week Tabs */}
        <WeekTabs 
          selected={week}
          onChange={setWeek}
        />
        
        {/* Day Tabs */}
        <DayTabs 
          selected={day}
          onChange={setDay}
        />
      </div>
      
      {/* Content Display */}
      <MaterialContent 
        material={material}
        isLoading={isLoading}
        selectedDate={{ semester, month, week, day }}
        classMasterId={selectedClass?.id}
      />
    </div>
  )
}
