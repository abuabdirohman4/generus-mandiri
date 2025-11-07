'use client'

import { useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { updateMeeting, deleteMeeting } from '../actions'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'
import DropdownMenu from '@/components/ui/dropdown/DropdownMenu'
import CreateMeetingModal from './CreateMeetingModal'
import Spinner from '@/components/ui/spinner/Spinner'
import { ATTENDANCE_COLORS } from '@/lib/constants/colors'
import { getStatusBgColor, getStatusColor } from '@/lib/percentages'
import MeetingSkeleton from '@/components/ui/skeleton/MeetingSkeleton'
import { useUserProfile } from '@/stores/userProfileStore'
import { isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/accessControl'
import { getMeetingTypeLabel } from '@/lib/constants/meetingTypes'
import MeetingTypeBadge from './MeetingTypeBadge'
import { useClasses } from '@/hooks/useClasses'
import { invalidateAllMeetingsCache } from '../utils/cache'
import { useKelompok } from '@/hooks/useKelompok'
import { useDesa } from '@/hooks/useDesa'
import { useDaerah } from '@/hooks/useDaerah'

// Set Indonesian locale
dayjs.locale('id')

// Helper function to format meeting location based on user role
const formatMeetingLocation = (meeting: any, userProfile: any, classesData: any[], kelompokData: any[], desaData: any[], daerahData: any[]) => {
  if (!meeting.classes) return ''
  
  const isSuperAdminUser = isSuperAdmin(userProfile)
  const isAdminDaerahUser = isAdminDaerah(userProfile)
  const isAdminDesaUser = isAdminDesa(userProfile)
  const isAdminKelompokUser = isAdminKelompok(userProfile)
  const isTeacherUser = userProfile?.role === 'teacher'
  
  // If meeting has multiple classes (class_ids array), format differently
  if (meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.length > 1) {
    // Get all class details with kelompok/desa/daerah
    const classDetails = meeting.class_ids
      .map((classId: string) => {
        const classData = classesData.find(c => c.id === classId)
        if (!classData) return null
        
        const kelompok = kelompokData.find(k => k.id === classData.kelompok_id)
        const desa = kelompok ? desaData.find(d => d.id === kelompok.desa_id) : null
        const daerah = desa ? daerahData.find(da => da.id === desa.daerah_id) : null
        
        return {
          id: classId,
          kelompok_id: classData.kelompok_id,
          kelompok_name: kelompok?.name || null,
          desa_id: kelompok?.desa_id || null,
          desa_name: desa?.name || null,
          daerah_id: desa?.daerah_id || null,
          daerah_name: daerah?.name || null
        }
      })
      .filter(Boolean)
    
    // Group by level and get unique names
    const kelompokNames = [...new Set(classDetails.map((c: any) => c.kelompok_name).filter(Boolean))].sort()
    const desaNames = [...new Set(classDetails.map((c: any) => c.desa_name).filter(Boolean))].sort()
    const daerahNames = [...new Set(classDetails.map((c: any) => c.daerah_name).filter(Boolean))].sort()
    
    const parts: string[] = []
    
    // Superadmin: Show Daerah, Desa, Kelompok
    if (isSuperAdminUser) {
      if (daerahNames.length > 0) {
        parts.push(daerahNames.join(' & '))
      }
      if (desaNames.length > 0) {
        parts.push(desaNames.join(' & '))
      }
      if (kelompokNames.length > 0) {
        parts.push(kelompokNames.join(' & '))
      }
    }
    // Admin Daerah: Show Desa, Kelompok
    else if (isAdminDaerahUser) {
      if (desaNames.length > 0) {
        parts.push(desaNames.join(' & '))
      }
      if (kelompokNames.length > 0) {
        parts.push(kelompokNames.join(' & '))
      }
    }
    // Admin Desa: Show Kelompok only
    else if (isAdminDesaUser) {
      if (kelompokNames.length > 0) {
        parts.push(kelompokNames.join(' & '))
      }
    }
    // Admin Kelompok or Teacher: Show nothing
    else {
      return ''
    }
  }
  
  // Single class or fallback to original logic
  const parts: string[] = []
  
  // Superadmin: Show Daerah, Desa, Kelompok, Class
  if (isSuperAdminUser) {
    if (meeting.classes.kelompok?.desa?.daerah?.name) {
      parts.push(meeting.classes.kelompok.desa.daerah.name)
    }
    if (meeting.classes.kelompok?.desa?.name) {
      parts.push(meeting.classes.kelompok.desa.name)
    }
    if (meeting.classes.kelompok?.name) {
      parts.push(meeting.classes.kelompok.name)
    }
  }
  // Admin Daerah: Show Desa, Kelompok, Class
  else if (isAdminDaerahUser) {
    if (meeting.classes.kelompok?.desa?.name) {
      parts.push(meeting.classes.kelompok.desa.name)
    }
    if (meeting.classes.kelompok?.name) {
      parts.push(meeting.classes.kelompok.name)
    }
  }
  // Admin Desa: Show Kelompok, Class
  else if (isAdminDesaUser) {
    if (meeting.classes.kelompok?.name) {
      parts.push(meeting.classes.kelompok.name)
    }
  }
  // Admin Kelompok or Teacher: Show nothing
  else {
    return ''
  }
  
  return parts.join(', ')
}

// Helper function to count unique kelompok in a meeting
const countUniqueKelompok = (meeting: any, classesData: any[], kelompokData: any[]): number => {
  if (!meeting.class_ids || !Array.isArray(meeting.class_ids) || meeting.class_ids.length === 0) {
    return 0
  }
  
  const kelompokIds = new Set<string>()
  
  // First, try to use meeting.allClasses if available (from backend, bypasses RLS)
  if (meeting.allClasses && Array.isArray(meeting.allClasses) && meeting.allClasses.length > 0) {
    meeting.allClasses.forEach((classData: any) => {
      if (classData.kelompok_id) {
        kelompokIds.add(classData.kelompok_id)
      }
    })
  } else {
    // Fallback: try to get kelompok_id from classesData or meeting.classes
    meeting.class_ids.forEach((classId: string) => {
      // Try to get kelompok_id from classesData first
      const classData = classesData.find(c => c.id === classId)
      if (classData && classData.kelompok_id) {
        kelompokIds.add(classData.kelompok_id)
      } else {
        // Fallback: try to get from meeting.classes if it's an array with multiple classes
        // This handles cases where classesData might be filtered by RLS
        if (Array.isArray(meeting.classes)) {
          const meetingClass = meeting.classes.find((c: any) => c.id === classId)
          if (meetingClass?.kelompok_id) {
            kelompokIds.add(meetingClass.kelompok_id)
          }
        } else if (meeting.classes?.id === classId && meeting.classes?.kelompok_id) {
          kelompokIds.add(meeting.classes.kelompok_id)
        }
      }
    })
  }
  
  return kelompokIds.size
}

const listGroupedClasses = (meeting: any, userProfile: any, classesData: any[], kelompokData: any[]) => {
  const isTeacherUser = userProfile?.role === 'teacher'
  const isAdminKelompokUser = isAdminKelompok(userProfile)
  
  if (!meeting.classes) return ''
  
  // If meeting has multiple classes (class_ids array)
  if (meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.length > 1) {
    // Get all class details with kelompok
    // First, try to use meeting.allClasses if available (from backend, bypasses RLS)
    let classDetails: any[] = []
    
    if (meeting.allClasses && Array.isArray(meeting.allClasses) && meeting.allClasses.length > 0) {
      classDetails = meeting.allClasses.map((classData: any) => ({
        id: classData.id,
        name: classData.name,
        kelompok_id: classData.kelompok_id,
        kelompok_name: classData.kelompok?.name || null
      }))
    } else {
      // Fallback: try to get from classesData or meeting.classes
      classDetails = meeting.class_ids
        .map((classId: string) => {
          // Try classesData first
          let classData = classesData.find(c => c.id === classId)
          let kelompok = null
          
          if (classData) {
            kelompok = kelompokData.find(k => k.id === classData.kelompok_id)
          } else {
            // Fallback: try to get from meeting.classes if it's an array
            if (Array.isArray(meeting.classes)) {
              const meetingClass = meeting.classes.find((c: any) => c.id === classId)
              if (meetingClass) {
                classData = meetingClass
                // Get kelompok from meeting.classes directly if available
                if (meetingClass.kelompok) {
                  kelompok = Array.isArray(meetingClass.kelompok) 
                    ? meetingClass.kelompok[0] 
                    : meetingClass.kelompok
                } else if (meetingClass.kelompok_id) {
                  kelompok = kelompokData.find(k => k.id === meetingClass.kelompok_id)
                }
              }
            } else if (meeting.classes?.id === classId) {
              classData = meeting.classes
              if (meeting.classes.kelompok) {
                kelompok = Array.isArray(meeting.classes.kelompok) 
                  ? meeting.classes.kelompok[0] 
                  : meeting.classes.kelompok
              } else if (meeting.classes.kelompok_id) {
                kelompok = kelompokData.find(k => k.id === meeting.classes.kelompok_id)
              }
            }
          }
          
          if (!classData) return null
          
          return {
            id: classId,
            name: classData.name,
            kelompok_id: classData.kelompok_id,
            kelompok_name: kelompok?.name || null
          }
        })
        .filter(Boolean)
    }
    
    // Group by class name
    const groupedByClassName = classDetails.reduce((acc: any, classDetail: any) => {
      if (!acc[classDetail.name]) {
        acc[classDetail.name] = []
      }
      acc[classDetail.name].push(classDetail)
      return acc
    }, {})
    
    // Check if there are classes with same name but different kelompok
    const hasDuplicateNames = Object.values(groupedByClassName).some((classes: any) => classes.length > 1)
    
    if (hasDuplicateNames) {
      // Format: "Kelas 1: Warlob 1, Warlob 2"
      return Object.entries(groupedByClassName)
        .map(([className, classes]: [string, any]) => {
          if (classes.length > 1) {
            // Same class name, different kelompok
            const kelompokNames = classes
              .map((c: any) => c.kelompok_name)
              .filter(Boolean)
              .join(', ')
            return `${className}: ${kelompokNames}`
          } else {
            // Single class, just show name
            return className
          }
        })
        .join(', ')
    } else {
      // No duplicate names, just show class names
      return classDetails.map((c: any) => c.name).join(', ')
    }
  }
  
  // Single class or fallback
  if (meeting.class_names && meeting.class_names.length > 1) {
    return meeting.class_names.join(', ')
  } else {
    // For teacher: only show class name if they teach more than one class
    if (isTeacherUser) {
      const teacherClassCount = userProfile?.classes?.length || 0
      if (teacherClassCount > 1) {
        // Check if teacher teaches classes from different kelompok
        const teacherKelompokIds = new Set<string>()
        userProfile?.classes?.forEach((cls: any) => {
          // Try to get kelompok_id from classesData
          const classData = classesData.find(c => c.id === cls.id)
          if (classData?.kelompok_id) {
            teacherKelompokIds.add(classData.kelompok_id)
          }
        })
        
        // If teacher teaches classes from different kelompok, show kelompok name
        if (teacherKelompokIds.size > 1) {
          // Get kelompok name from meeting.classes or kelompokData
          let kelompokName: string | null = null
          
          if (meeting.classes?.kelompok) {
            const kelompok = Array.isArray(meeting.classes.kelompok) 
              ? meeting.classes.kelompok[0] 
              : meeting.classes.kelompok
            kelompokName = kelompok?.name || null
          } else if (meeting.classes?.kelompok_id) {
            const kelompok = kelompokData.find(k => k.id === meeting.classes.kelompok_id)
            kelompokName = kelompok?.name || null
          }
          
          if (kelompokName) {
            return `${meeting.classes.name} (${kelompokName})`
          }
        }
        
        return meeting.classes.name
      } else {
        return '' // Teacher with only one class: don't show (it's redundant)
      }
    }
    // For other: show class name
    else {
      return meeting.classes.name
    }
  }
}

// Helper function to check if user can edit/delete meeting
const canEditOrDeleteMeeting = (meeting: any, userProfile: any): boolean => {
  if (!userProfile) return false
  
  // Superadmin can edit/delete all meetings
  if (isSuperAdmin(userProfile)) return true
  
  // Meeting creator can edit/delete
  if (meeting.teacher_id === userProfile.id) return true
  
  // Admin hierarchy check
  const meetingKelompokId = meeting.classes?.kelompok_id
  const meetingDesaId = meeting.classes?.kelompok?.desa_id
  const meetingDaerahId = meeting.classes?.kelompok?.desa?.daerah_id
  
  // Admin Daerah: can edit meetings in their daerah
  if (isAdminDaerah(userProfile)) {
    return meetingDaerahId === userProfile.daerah_id
  }
  
  // Admin Desa: can edit meetings in their desa
  if (isAdminDesa(userProfile)) {
    return meetingDesaId === userProfile.desa_id
  }
  
  // Admin Kelompok: can edit meetings in their kelompok
  if (isAdminKelompok(userProfile)) {
    return meetingKelompokId === userProfile.kelompok_id
  }
  
  // Teacher can only edit their own meetings
  return false
}

interface Meeting {
  id: string
  class_id: string
  class_ids?: string[]
  class_names?: string[]
  teacher_id: string
  title: string
  date: string
  topic?: string
  description?: string
  student_snapshot: string[]
  created_at: string
  meeting_type_code?: string | null
  classes: {
    id: string
    name: string
    kelompok_id?: string
    kelompok?: {
      id: string
      name: string
      desa_id?: string
      desa?: {
        id: string
        name: string
        daerah_id?: string
        daerah?: {
          id: string
          name: string
        }
      }
    }
    class_master_mappings?: Array<{
      class_master?: {
        category?: {
          is_sambung_capable: boolean
        }
      }
    }>
  }
  attendancePercentage: number
  totalStudents: number
  presentCount: number
  absentCount: number
  sickCount: number
  excusedCount: number
}

interface MeetingListProps {
  meetings: Meeting[]
  onEdit?: (meeting: Meeting) => void
  onDelete?: (meetingId: string) => void
  className?: string
  isLoading?: boolean
}

export default function MeetingList({ 
  meetings, 
  onEdit, 
  onDelete, 
  className = '',
  isLoading = false
}: MeetingListProps) {
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null)
  const [loadingMeetingId, setLoadingMeetingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    meetingId: string
    meetingTitle: string
  }>({
    isOpen: false,
    meetingId: '',
    meetingTitle: ''
  })

  const { profile: userProfile } = useUserProfile()
  const { classes: classesData } = useClasses()
  const { kelompok: kelompokData } = useKelompok()
  const { desa: desaData } = useDesa()
  const { daerah: daerahData } = useDaerah()

  // Group meetings by date
  const groupedMeetings = meetings.reduce((acc, meeting) => {
    const date = dayjs(meeting.date).format('YYYY-MM-DD')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(meeting)
    return acc
  }, {} as Record<string, Meeting[]>)

  const handleEdit = async (meeting: Meeting) => {
    if (onEdit) {
      onEdit(meeting)
    } else {
      setEditingMeeting(meeting)
      setShowEditModal(true)
    }
  }

  const handleDeleteClick = (meetingId: string, meetingTitle: string) => {
    setDeleteModal({
      isOpen: true,
      meetingId,
      meetingTitle
    })
  }

  const handleDeleteConfirm = async () => {
    setDeletingMeetingId(deleteModal.meetingId)
    try {
      const result = await deleteMeeting(deleteModal.meetingId)
      if (result.success) {
        toast.success('Pertemuan berhasil dihapus')
        // Invalidate all meetings cache so other users see the deletion
        await invalidateAllMeetingsCache()
        if (onDelete) {
          onDelete(deleteModal.meetingId)
        }
      } else {
        toast.error('Gagal menghapus pertemuan: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting meeting:', error)
      toast.error('Terjadi kesalahan saat menghapus pertemuan')
    } finally {
      setDeletingMeetingId(null)
      setDeleteModal({
        isOpen: false,
        meetingId: '',
        meetingTitle: ''
      })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      meetingId: '',
      meetingTitle: ''
    })
  }

  const handleMeetingClick = (meetingId: string) => {
    setLoadingMeetingId(meetingId)
    // The Link component will handle navigation
    // Loading state will be cleared when component unmounts or page changes
  }

  // Show skeleton while loading
  if (isLoading) {
    return <MeetingSkeleton />
  }

  // Show empty state only when not loading and no meetings
  if (meetings.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Belum ada pertemuan
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Klik tombol + untuk membuat pertemuan pertama
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        {Object.entries(groupedMeetings)
          .sort(([a], [b]) => b.localeCompare(a)) // Sort dates descending
          .map(([date, dateMeetings]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="bg-gray-50 dark:bg-gray-800 py-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {dayjs(date).format('dddd, DD MMMM YYYY')}
                </h3>
              </div>

              {/* Meetings for this date */}
              <div className="space-y-2">
                {dateMeetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/absensi/${meeting.id}`}
                    className="block"
                    onClick={() => handleMeetingClick(meeting.id)}
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative">
                      <div className="p-4">
                        {/* Row 1: Title (left) + Percentage & Menu (right) */}
                        <div className="flex items-start justify-between">
                          <h4 className="text-lg mt-1 font-semibold text-gray-900 dark:text-white">
                            {meeting.meeting_type_code && (
                              <MeetingTypeBadge 
                                meetingTypeCode={meeting.meeting_type_code}
                                isSambungCapable={meeting.classes?.class_master_mappings?.[0]?.class_master?.category?.is_sambung_capable}
                              />
                            )}
                            {meeting.meeting_type_code && meeting.title ? ": " : ""}
                            {meeting.title}
                          </h4>
                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBgColor(meeting.attendancePercentage)} ${getStatusColor(meeting.attendancePercentage)}`}>
                              {meeting.attendancePercentage}%
                            </div>
                            {canEditOrDeleteMeeting(meeting, userProfile) ? (
                              <DropdownMenu
                                items={[
                                  {
                                    label: 'Edit Info',
                                    onClick: () => {
                                      setEditingMeeting(meeting)
                                      setShowEditModal(true)
                                    },
                                    icon: (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    )
                                  },
                                  {
                                    label: 'Hapus',
                                    variant: 'danger',
                                    onClick: () => handleDeleteClick(meeting.id, meeting.title),
                                    icon: (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    )
                                  }
                                ]}
                              />
                            ) : null}
                          </div>
                        </div>

                        {/* Row 2: Location */}
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatMeetingLocation(meeting, userProfile, classesData || [], kelompokData || [], desaData || [], daerahData || [])}
                        </div>
                        
                        {/* Row 3: Class names / location */}
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {(() => {
                            const uniqueKelompokCount = countUniqueKelompok(meeting, classesData || [], kelompokData || [])
                            return uniqueKelompokCount > 1 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mr-2 mt-1">
                                {uniqueKelompokCount} Kelompok
                              </span>
                            ) : meeting.class_ids && meeting.class_ids.length > 1 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mr-2 mt-1">
                                {meeting.class_ids.length} Kelas
                              </span>
                            )
                          })()}
                          {listGroupedClasses(meeting, userProfile, classesData || [], kelompokData || [])}
                        </div>

                        {/* Optional topic */}
                        {/* {meeting.topic && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {meeting.topic}
                          </p>
                        )} */}

                        {/* Row 4: Attendance stats */}
                        <div className="flex flex-wrap gap-2 md:gap-3 text-xs mt-2">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.hadir }}></div>
                            <span className="text-gray-600 dark:text-gray-400">{meeting.presentCount} Hadir</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.absen }}></div>
                            <span className="text-gray-600 dark:text-gray-400">{meeting.absentCount} Alfa</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.izin }}></div>
                            <span className="text-gray-600 dark:text-gray-400">{meeting.excusedCount} Izin</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.sakit }}></div>
                            <span className="text-gray-600 dark:text-gray-400">{meeting.sickCount} Sakit</span>
                          </div>
                        </div>
                      </div>

                      {/* Loading Overlay */}
                      {loadingMeetingId === meeting.id && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center z-10">
                          <div className="flex flex-col items-center gap-2">
                            <Spinner size={24} />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Memuat...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Hapus Pertemuan"
        message={`Apakah Anda yakin ingin menghapus pertemuan ini?`}
        confirmText="Hapus"
        cancelText="Batal"
        isDestructive={true}
        isLoading={deletingMeetingId === deleteModal.meetingId}
      />

      {/* Edit Modal */}
      <CreateMeetingModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingMeeting(null)
        }}
        onSuccess={() => {
          onDelete?.('') // Trigger refresh
          setShowEditModal(false)
          setEditingMeeting(null)
        }}
        meeting={editingMeeting}
      />
    </>
  )
}
