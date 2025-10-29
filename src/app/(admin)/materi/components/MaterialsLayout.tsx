'use client'

import { useState, useEffect } from 'react'
import { ClassMaster, Semester, Month, Week, DayOfWeek, LearningMaterial } from '../types'
import SemesterTabs from './SemesterTabs'
import MonthTabs from './MonthTabs'
import WeekTabs from './WeekTabs'
import DayTabs from './DayTabs'
import MaterialContent from './MaterialContent'
import { getLearningMaterial } from '../actions'

interface MaterialsLayoutProps {
  classMasters: ClassMaster[]
  userProfile: any
}

export default function MaterialsLayout({ classMasters, userProfile }: MaterialsLayoutProps) {
  const [selectedClass, setSelectedClass] = useState<ClassMaster | null>(classMasters[0] || null)
  const [semester, setSemester] = useState<Semester>(1)
  const [month, setMonth] = useState<Month>(1)
  const [week, setWeek] = useState<Week>(1)
  const [day, setDay] = useState<DayOfWeek>(1)
  
  const [material, setMaterial] = useState<LearningMaterial | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
      {/* Class Selector (if multiple) */}
      {classMasters.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pilih Kelas
          </label>
          <select
            value={selectedClass.id}
            onChange={(e) => {
              const classMaster = classMasters.find(cm => cm.id === e.target.value)
              if (classMaster) setSelectedClass(classMaster)
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {classMasters.map((classMaster) => (
              <option key={classMaster.id} value={classMaster.id}>
                {classMaster.name}
              </option>
            ))}
          </select>
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
      />
    </div>
  )
}
