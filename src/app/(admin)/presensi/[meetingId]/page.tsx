'use client'

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMeetingAttendance } from '../hooks/useMeetingAttendance'
import { getMeetingWibDateStr } from '../actions/attendance/logic'
import { useAttendanceRealtime } from '@/hooks/useAttendanceRealtime'
import { saveAttendanceForMeeting } from '../actions'
import AttendanceTable from '../components/AttendanceTable'
import ReasonModal from '../components/ReasonModal'
import QuickAddStudentModal from '../components/QuickAddStudentModal'
import SummaryCard from '../components/SummaryCard'
import PresensiTabHeader from '../components/PresensiTabHeader'
import QrScannerTab from '../components/QrScannerTab'
import LivePresensiTab from '../components/LivePresensiTab'
import LoadingState from '../components/LoadingState'
import Button from '@/components/ui/button/Button'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { 
  getCurrentUserId, 
  shouldShowKelompokFilter, 
  shouldShowDesaFilter, 
  shouldShowKelasFilter, 
  isSuperAdmin, 
  isAdminDaerah,
  isAdminDesa,
  isAdminKelompok,
  isTeacherDaerah,
  isTeacherDesa,
  isTeacherKelompok
} from '@/lib/userUtils'
import { upsertMeetingInCache } from '../utils/cache'
import { useUserProfile } from '@/stores/userProfileStore'
import { canUserEditMeetingAttendance } from '@/app/(admin)/presensi/actions/meetings/helpers.client'
import { usePresensiAttendanceStore } from '../stores/presensiAttendanceStore'
import ColumnToggle from '@/components/table/ColumnToggle'
import DataFilter from '@/components/shared/DataFilter'
import { useClasses } from '@/hooks/useClasses'
import { useKelompok } from '@/hooks/useKelompok'
import { useDesa } from '@/hooks/useDesa'
import { isCaberawitClass, isTeacherClass, isSambungDesaEligible } from '@/lib/utils/classHelpers'
import { useActivityLevels } from '@/hooks/useActivityLevels'
import MeetingOrgBreakdown from './MeetingOrgBreakdown'
import { shouldShowBreakdown } from './logic'

// Set Indonesian locale
dayjs.locale('id')

export default function MeetingAttendancePage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.meetingId as string

  const {
    meeting,
    attendance,
    students,
    loading,
    error,
    mutate,
    calculateAttendancePercentage,
    getAttendanceStats
  } = useMeetingAttendance(meetingId)

  const [saving, setSaving] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [tableSearchQuery, setTableSearchQuery] = useState('')
  const [localAttendance, setLocalAttendance] = useState(attendance)
  const [activeTab, setActiveTab] = useState<'daftar-hadir' | 'scan-qr' | 'live' | 'breakdown'>('daftar-hadir')
  const hasInitialized = useRef(false)
  const { profile: userProfile } = useUserProfile()
  const { classes: classesData } = useClasses()
  const { kelompok: kelompokData } = useKelompok()
  const { desa: desaData } = useDesa()
  const { activityLevels } = useActivityLevels()
  const { columnVisibility, setColumnVisibility } = usePresensiAttendanceStore()

  // DataFilter state
  const [filters, setFilters] = useState<{
    daerah: string[]
    desa: string[]
    kelompok: string[]
    kelas: string[]
    gender?: string
  }>({
    daerah: [],
    desa: [],
    kelompok: [],
    kelas: [],
    gender: ''
  })

  // Update local attendance when data changes
  React.useEffect(() => {
    if (attendance && Object.keys(attendance).length > 0) {
      if (!hasInitialized.current) {
        setLocalAttendance(attendance)
        hasInitialized.current = true
      } else {
        // Merge any new attendance records from DB that are not in localAttendance
        // This preserves unsaved local edits while pulling in newly added students (e.g. from Quick Add)
        setLocalAttendance(prev => {
          let hasChanges = false
          const merged = { ...prev }
          Object.keys(attendance).forEach(studentId => {
            if (!merged[studentId]) {
              merged[studentId] = attendance[studentId]
              hasChanges = true
            }
          })
          return hasChanges ? merged : prev
        })
      }
    }
  }, [attendance])

  // Realtime cross-device sync: subscribe to attendance_logs changes for this
  // meeting. When another device saves a change, adopt it here for students the
  // current user is NOT actively editing (i.e. whose local value still matches
  // the last-known server value). Locally-dirty students keep their unsaved
  // edits until the user Simpan/discard. Also revalidate SWR so `attendance`
  // (the server baseline used by isDirty) stays in sync.
  const { attendanceMap: realtimeAttendance, connectionStatus: realtimeStatus } = useAttendanceRealtime(meetingId, {
    initialAttendance: attendance,
  })

  useEffect(() => {
    if (!realtimeAttendance || Object.keys(realtimeAttendance).length === 0) return
    // Pull the fresh server baseline (updates `attendance`, feeding the merge below + isDirty).
    void mutate()

    setLocalAttendance(prev => {
      let hasChanges = false
      const next = { ...prev }
      Object.keys(realtimeAttendance).forEach(studentId => {
        const incoming = realtimeAttendance[studentId]
        const current = prev[studentId]
        const baseline = attendance[studentId]
        // A student is "locally dirty" when their local value diverges from the
        // last server baseline — don't clobber those. Otherwise adopt the
        // realtime value from the other device.
        const isLocallyDirty = current && baseline
          ? current.status !== baseline.status || current.reason !== baseline.reason
          : !!current && !baseline
        if (isLocallyDirty) return
        if (!current || current.status !== incoming.status || current.reason !== incoming.reason) {
          next[studentId] = incoming
          hasChanges = true
        }
      })
      return hasChanges ? next : prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeAttendance])

  const handleStatusChange = (studentId: string, status: 'H' | 'I' | 'S' | 'A') => {
    if (status === 'I') {
      setSelectedStudent(studentId)
      setShowReasonModal(true)
    } else {
      setLocalAttendance(prev => ({
        ...prev,
        [studentId]: { status, reason: undefined }
      }))
    }
  }

  const handleReasonSubmit = (reason: string) => {
    if (selectedStudent) {
      setLocalAttendance(prev => ({
        ...prev,
        [selectedStudent]: { status: 'I', reason }
      }))
    }
    setShowReasonModal(false)
    setSelectedStudent(null)
  }

  // QR scan already committed to DB (unlike manual table edits, which wait for Simpan).
  // Overwrite the entry directly instead of relying on the conservative merge effect above
  // (that effect only fills in missing students, it won't overwrite an existing default status).
  const handleQrScanSuccess = (studentId: string) => {
    setLocalAttendance(prev => ({
      ...prev,
      [studentId]: { status: 'H', reason: undefined }
    }))
    void mutate()
  }

  const isDirty = useMemo(() => {
    const keys = Object.keys(localAttendance)
    if (keys.length !== Object.keys(attendance).length) return true
    return keys.some(id => {
      const local = localAttendance[id]
      const orig = attendance[id]
      return !orig || local.status !== orig.status || local.reason !== orig.reason
    })
  }, [localAttendance, attendance])

  const handleSave = async () => {
    if (!meeting) return

    setSaving(true)
    try {
      const attendanceData = Object.entries(localAttendance).map(([studentId, data]) => ({
        student_id: studentId,
        date: meeting.date, // Keep for compatibility
        status: data.status,
        reason: data.reason || null
      }))

      const result = await saveAttendanceForMeeting(meetingId, attendanceData)

      if (result.success) {
        sessionStorage.setItem('presensi_needs_refresh', meetingId)
        toast.success('Data presensi berhasil disimpan!')
        hasInitialized.current = false
        mutate() // Refresh current page data

        // Optimistic upsert: sisipkan meeting baru / patch existing di cache list instan.
        // void = fire-and-forget, navigasi back tidak tertahan refetch berat (40s).
        const userId = await getCurrentUserId()
        if (userId && meeting) {
          const allRecords = Object.values(localAttendance)
          void upsertMeetingInCache(userId, meeting, {
            totalStudents: allRecords.length,
            presentCount: allRecords.filter(r => r.status === 'H').length,
            absentCount: allRecords.filter(r => r.status === 'A').length,
            sickCount: allRecords.filter(r => r.status === 'S').length,
            excusedCount: allRecords.filter(r => r.status === 'I').length,
          })
        }
      } else {
        toast.error('Gagal menyimpan data presensi: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  // Calculate stats from local attendance state (real-time updates)
  const calculateLocalStats = () => {
    // Only count stats for visible students
    const visibleStudentIds = new Set(visibleStudents.map(s => s.id))
    const records = Object.entries(localAttendance)
      .filter(([studentId]) => visibleStudentIds.has(studentId))
      .map(([_, data]) => data)

    return {
      total: records.length,
      hadir: records.filter(record => record.status === 'H').length,
      izin: records.filter(record => record.status === 'I').length,
      sakit: records.filter(record => record.status === 'S').length,
      absen: records.filter(record => record.status === 'A').length
    }
  }

  const calculateLocalAttendancePercentage = () => {
    if (!meeting || visibleStudents.length === 0) {
      return 0
    }

    const totalStudents = visibleStudents.length
    const visibleStudentIds = new Set(visibleStudents.map(s => s.id))

    const presentCount = Object.entries(localAttendance)
      .filter(([studentId, record]) => {
        const isVisible = visibleStudentIds.has(studentId)
        const isPresent = record.status === 'H'
        return isVisible && isPresent
      }).length

    const percentage = Math.round((presentCount / totalStudents) * 100)
    return percentage
  }

  // Check if current user is meeting creator
  const isMeetingCreator = meeting?.teacher_id === userProfile?.id

  // Check if meeting is for "Pengajar" class
  const isPengajarMeeting = useMemo(() => {
    if (!meeting) return false

    // Check from primary class
    if (meeting.classes && isTeacherClass(meeting.classes)) {
      return true
    }

    // Check from class_ids array (for multi-class meetings)
    // Note: For simplicity, we rely on primary class check first
    // If needed, we can enhance this to fetch class details for class_ids array
    return false
  }, [meeting])

  // Check if teacher teaches Paud or Kelas 1-6
  const teacherCaberawit = useMemo(() => {
    if (!userProfile?.classes) return false
    return userProfile.classes.some(c => isCaberawitClass(c))
  }, [userProfile?.classes])

  // Check if teacher is hierarchical (Guru Desa/Daerah)
  const isHierarchicalTeacher = useMemo(() => {
    if (!userProfile) return false
    return !!((userProfile.daerah_id || userProfile.desa_id || userProfile.kelompok_id) &&
      (!userProfile.classes || userProfile.classes.length === 0))
  }, [userProfile])

  // Check if meeting is strictly read-only for the current user based on hierarchy
  const isReadOnlyMeeting = useMemo(() => {
    if (!userProfile || !meeting) return true
    
    // Creator can always edit
    if (isMeetingCreator) return false
    
    // Superadmin can always edit
    if (isSuperAdmin(userProfile)) return false

    // Determine meeting level rank
    const getLevelRank = (code?: string) => {
      switch (code?.toUpperCase()) {
        case 'PUSAT': return 4
        case 'DAERAH': return 3
        case 'DESA': return 2
        case 'KELOMPOK': return 1
        default: return 0
      }
    }
    
    let meetingLevelRank = getLevelRank(meeting.activity_level?.code)
    
    // Fallback to activity type if level is not set
    if (meetingLevelRank === 0 && meeting.activity_type?.code) {
      const typeCode = meeting.activity_type.code.toUpperCase()
      if (typeCode.includes('PUSAT')) meetingLevelRank = 4
      else if (typeCode.includes('DAERAH')) meetingLevelRank = 3
      else if (typeCode.includes('DESA')) meetingLevelRank = 2
    }
    
    if (meetingLevelRank === 0) return false // Not a hierarchical meeting
    
    // Determine user level rank using project permissions
    let userLevelRank = 1
    if (isAdminDaerah(userProfile) || isTeacherDaerah(userProfile)) userLevelRank = 3
    else if (isAdminDesa(userProfile) || isTeacherDesa(userProfile)) userLevelRank = 2
    else if (isAdminKelompok(userProfile) || isTeacherKelompok(userProfile)) userLevelRank = 1
    else if (userProfile.role === 'admin') userLevelRank = 4 // Fallback for unspecified admins
    
    // If meeting is higher level than user, it's read only
    return meetingLevelRank > userLevelRank
  }, [userProfile, meeting, isMeetingCreator])

  // Scan QR tab is only useful for large, cross-kelompok meetings (Desa/Daerah level)
  // where manual roll-call doesn't scale — kelompok-level meetings stay manual-only.
  const isDesaOrDaerahMeeting = useMemo(() => {
    if (!meeting) return false
    const levelCode = meeting.activity_level?.code?.toUpperCase()
    if (levelCode === 'DESA' || levelCode === 'DAERAH') return true
    const typeCode = meeting.activity_type?.code?.toUpperCase()
    if (typeCode?.includes('DESA') || typeCode?.includes('DAERAH')) return true
    return false
  }, [meeting])

  // Fallback to Daftar Hadir if Scan QR / Presentasi tab is no longer available (e.g. meeting data changes)
  useEffect(() => {
    if ((activeTab === 'scan-qr' || activeTab === 'live') && !isDesaOrDaerahMeeting) {
      setActiveTab('daftar-hadir')
    }
  }, [activeTab, isDesaOrDaerahMeeting])

  // Filter students based on user role and filters
  const visibleStudents = useMemo(() => {
    let filtered = students

    // Role-based filtering (existing logic) - support multiple classes
    // Skip filtering for Pengajar meetings (students should be visible to Paud/Kelas 1-6 teachers)
    // Skip filtering for Hierarchical teachers (they should see all classes in their scope)
    if (userProfile?.role === 'teacher' && !isMeetingCreator && !isPengajarMeeting && !isHierarchicalTeacher) {
      const myClassIds = userProfile.classes?.map(c => c.id) || []
      // Note: For meeting attendance, we filter by class_id (primary class)
      // This is because students in meeting snapshot are already filtered by meeting's classes
      filtered = filtered.filter(s => myClassIds.includes(s.class_id))
    }

    // Desa-based filtering (for Admin Desa and Guru Desa viewing daerah-level meetings)
    // This ensures they only see students from their own desa
    if (!isMeetingCreator && userProfile && (isAdminDesa(userProfile) || isTeacherDesa(userProfile))) {
      const userDesaId = userProfile.desa_id
      if (userDesaId) {
        filtered = filtered.filter(student => {
          // Check student's desa_id directly (from hook data)
          if (student.desa_id) {
            return student.desa_id === userDesaId
          }

          // Fallback: lookup desa via student's kelompok -> classesData -> kelompokData
          const primaryClass = classesData.find(c => c.id === student.class_id)
          if (primaryClass?.kelompok_id) {
            const kelompok = kelompokData?.find((k: any) => k.id === primaryClass.kelompok_id)
            if (kelompok?.desa_id) {
              return kelompok.desa_id === userDesaId
            }
          }

          // Check from junction table classes
          if (student.classes && Array.isArray(student.classes)) {
            return student.classes.some(cls => {
              const fullClass = classesData.find(c => c.id === cls.id)
              if (fullClass?.kelompok_id) {
                const kelompok = kelompokData?.find((k: any) => k.id === fullClass.kelompok_id)
                return kelompok?.desa_id === userDesaId
              }
              return false
            })
          }

          return false
        })
      }
    }

    // Kelompok-based filtering (for Admin Kelompok and single-kelompok Teachers)
    if (!isMeetingCreator && (userProfile?.role === 'admin' || userProfile?.role === 'teacher')) {
      // Skip if already filtered by desa above (Admin Desa / Guru Desa)
      const alreadyFilteredByDesa = userProfile && (isAdminDesa(userProfile) || isTeacherDesa(userProfile))
      if (!alreadyFilteredByDesa) {
        // Get user's kelompok IDs from their classes (for teachers) or direct kelompok_id (for admin kelompok/hierarchical teachers)
        let userKelompokIds: string[] = []

        if (userProfile.role === 'teacher' && userProfile.classes && userProfile.classes.length > 0) {
          // For teachers: get kelompok IDs from all their classes
          userKelompokIds = userProfile.classes
            .map((c: any) => {
              // Try to get kelompok_id from the class object
              if (c.kelompok_id) return c.kelompok_id
              // Otherwise lookup from classesData
              const fullClass = classesData.find(cls => cls.id === c.id)
              return fullClass?.kelompok_id
            })
            .filter(Boolean) as string[]
        } else if (userProfile.kelompok_id) {
          // For admin kelompok and single-kelompok hierarchical teachers: use their kelompok_id
          userKelompokIds = [userProfile.kelompok_id]
        }

        // Check if user has multiple kelompok (special case for teachers teaching multiple kelompok)
        const uniqueKelompokIds = [...new Set(userKelompokIds)]

        // Apply kelompok filter only if user has kelompok restrictions
        if (uniqueKelompokIds.length > 0) {
          filtered = filtered.filter(student => {
            // Check if student belongs to any of user's kelompok
            // Get student's kelompok from their classes
            const studentKelompokIds = new Set<string>()

            // Check from primary class
            const primaryClass = classesData.find(c => c.id === student.class_id)
            if (primaryClass?.kelompok_id) {
              studentKelompokIds.add(primaryClass.kelompok_id)
            }

            // Check from junction table classes
            if (student.classes && Array.isArray(student.classes)) {
              student.classes.forEach(cls => {
                const fullClass = classesData.find(c => c.id === cls.id)
                if (fullClass?.kelompok_id) {
                  studentKelompokIds.add(fullClass.kelompok_id)
                }
              })
            }

            // Student is visible if they belong to any of user's kelompok
            return uniqueKelompokIds.some(kelompokId => studentKelompokIds.has(kelompokId))
          })
        }
      }
    }

    // Desa filter (from UI filter dropdown — for daerah-level meetings)
    if (filters.desa && filters.desa.length > 0) {
      filtered = filtered.filter(student => {
        // Check student's desa_id directly
        if (student.desa_id) {
          return filters.desa.includes(student.desa_id)
        }

        // Fallback: lookup via classesData -> kelompokData
        const primaryClass = classesData.find(c => c.id === student.class_id)
        if (primaryClass?.kelompok_id) {
          const kelompok = kelompokData?.find((k: any) => k.id === primaryClass.kelompok_id)
          if (kelompok?.desa_id) {
            return filters.desa.includes(kelompok.desa_id)
          }
        }

        return false
      })
    }

    // Gender filter
    if (filters.gender) {
      filtered = filtered.filter(s => s.gender === filters.gender)
    }

    // Kelompok filter (from UI filter dropdown)
    if (filters.kelompok && filters.kelompok.length > 0) {
      filtered = filtered.filter(student => {
        // Get student's kelompok IDs
        const studentKelompokIds = new Set<string>()

        // Check from primary class
        const primaryClass = classesData.find(c => c.id === student.class_id)
        if (primaryClass?.kelompok_id) {
          studentKelompokIds.add(primaryClass.kelompok_id)
        }

        // Check from junction table classes
        if (student.classes && Array.isArray(student.classes)) {
          student.classes.forEach(cls => {
            const fullClass = classesData.find(c => c.id === cls.id)
            if (fullClass?.kelompok_id) {
              studentKelompokIds.add(fullClass.kelompok_id)
            }
          })
        }

        // Student matches if any of their kelompok is in the filter
        return filters.kelompok.some(kelompokId => studentKelompokIds.has(kelompokId))
      })
    }

    // Class filter (for multi-class meetings) - support multiple classes per student
    if (filters.kelas && filters.kelas.length > 0) {
      // Support comma-separated class IDs from DataFilter
      const selectedClassIds = filters.kelas.flatMap(k => k.split(','))
      filtered = filtered.filter(s => {
        // Check primary class_id (for backward compatibility)
        if (selectedClassIds.includes(s.class_id)) return true

        // Check all classes from junction table (for multi-class students)
        if (s.classes && Array.isArray(s.classes)) {
          return s.classes.some(cls => selectedClassIds.includes(cls.id))
        }

        return false
      })
    }

    return filtered
  }, [students, userProfile, isMeetingCreator, isPengajarMeeting, isHierarchicalTeacher, filters, classesData, kelompokData])

  // Determine if a specific student's attendance can be edited
  const canEditStudent = useCallback((studentId: string) => {
    if (!userProfile || !meeting) return false
    
    // If meeting is strictly read-only for this user's hierarchy, disallow edits
    if (isReadOnlyMeeting) return false

    const student = students.find(s => s.id === studentId)
    if (!student) return false

    // Special case: Allow teachers (Paud/Kelas 1-6) to edit "Pengajar" meeting attendance
    if (isPengajarMeeting && teacherCaberawit) {
      return true
    }

    return canUserEditMeetingAttendance(
      userProfile.role,
      isMeetingCreator,
      student.class_id,
      userProfile.classes?.map(c => c.id) || [],
      isHierarchicalTeacher
    )
  }, [userProfile, meeting, students, isMeetingCreator, isPengajarMeeting, teacherCaberawit, isHierarchicalTeacher, isReadOnlyMeeting])

  // Prepare class list for filter - only for multi-class meetings
  const classListForFilter = useMemo(() => {
    if (!meeting?.class_ids || meeting.class_ids.length <= 1) return []

    // Get all unique class IDs from students (including from junction table)
    const classIds = new Set<string>()
    students.forEach(s => {
      // Add primary class_id
      if (s.class_id) classIds.add(s.class_id)

      // Add all classes from junction table
      if (s.classes && Array.isArray(s.classes)) {
        s.classes.forEach(cls => classIds.add(cls.id))
      }
    })

    // Filter to only classes that are in meeting.class_ids
    const meetingClassIds = new Set(meeting.class_ids)
    const relevantClassIds = Array.from(classIds).filter(id => meetingClassIds.has(id))

    // For teacher non-creator, only show their classes (skip for hierarchical teachers)
    if (userProfile?.role === 'teacher' && !isMeetingCreator && !isHierarchicalTeacher) {
      const myClassIds = userProfile.classes?.map(c => c.id) || []
      const teacherRelevantClassIds = relevantClassIds.filter(id => myClassIds.includes(id))

      // Only show filter if teacher has more than 1 class in this meeting
      if (teacherRelevantClassIds.length <= 1) return []

      // Get class details with kelompok info
      // First try to use meeting.allClasses if available (from backend, bypasses RLS)
      let classDetails: Array<{ id: string; name: string; kelompok_id: string | null; kelompok_name: string | null }> = []

      if (meeting.allClasses && Array.isArray(meeting.allClasses) && meeting.allClasses.length > 0) {
        // Use allClasses from backend (bypasses RLS)
        classDetails = meeting.allClasses
          .filter((c: any) => teacherRelevantClassIds.includes(c.id))
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            kelompok_id: c.kelompok_id,
            kelompok_name: c.kelompok?.name || null
          }))
      } else {
        // Fallback: get from classesData and kelompokData
        classDetails = teacherRelevantClassIds.map(id => {
          const classData = classesData.find(c => c.id === id)
          const kelompok = classData?.kelompok_id && kelompokData
            ? kelompokData.find((k: any) => k.id === classData.kelompok_id)
            : null

          return {
            id,
            name: classData?.name || 'Unknown',
            kelompok_id: classData?.kelompok_id || null,
            kelompok_name: kelompok?.name || null
          }
        })
      }

      // For SAMBUNG_DESA / Desa-level meetings, filter to only show eligible classes (exclude Pengajar/PAUD/Caberawit)
      const desaLevelId = activityLevels?.find((l: any) => l.code === 'DESA')?.id
      const isDesaLevelMeeting = (desaLevelId && meeting.activity_level_id === desaLevelId) ||
        (!meeting.activity_level_id && meeting.activity_type?.code === 'SAMBUNG_DESA')
      if (isDesaLevelMeeting) {
        classDetails = classDetails.filter(cls => {
          const classData = classesData.find(c => c.id === cls.id) ||
            (meeting.allClasses && Array.isArray(meeting.allClasses)
              ? meeting.allClasses.find((c: any) => c.id === cls.id)
              : null)
          return classData && isSambungDesaEligible(classData)
        })
      }

      // Return class details without pre-formatting
      // DataFilter will handle deduplication and formatting
      return classDetails.map(cls => ({
        id: cls.id,
        name: cls.name, // Use original name, not formatted
        kelompok_id: cls.kelompok_id
      }))
    }

    // For admin/creator, show all classes
    // Get class details with kelompok info
    // First try to use meeting.allClasses if available (from backend, bypasses RLS)
    let classDetails: Array<{ id: string; name: string; kelompok_id: string | null; kelompok_name: string | null }> = []

    if (meeting.allClasses && Array.isArray(meeting.allClasses) && meeting.allClasses.length > 0) {
      // Use allClasses from backend (bypasses RLS)
      classDetails = meeting.allClasses
        .filter((c: any) => relevantClassIds.includes(c.id))
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          kelompok_id: c.kelompok_id,
          kelompok_name: c.kelompok?.name || null
        }))
    } else {
      // Fallback: get from classesData and kelompokData
      classDetails = relevantClassIds.map(id => {
        const classData = classesData.find(c => c.id === id)
        const kelompok = classData?.kelompok_id && kelompokData
          ? kelompokData.find((k: any) => k.id === classData.kelompok_id)
          : null

        return {
          id,
          name: classData?.name || 'Unknown',
          kelompok_id: classData?.kelompok_id || null,
          kelompok_name: kelompok?.name || null
        }
      })
    }

    // For SAMBUNG_DESA / Desa-level meetings, filter to only show eligible classes (exclude Pengajar/PAUD/Caberawit)
    const desaLevelIdAdmin = activityLevels?.find((l: any) => l.code === 'DESA')?.id
    const isDesaLevelMeetingForAdmin = (desaLevelIdAdmin && meeting.activity_level_id === desaLevelIdAdmin) ||
      (!meeting.activity_level_id && meeting.activity_type?.code === 'SAMBUNG_DESA')
    if (isDesaLevelMeetingForAdmin) {
      classDetails = classDetails.filter(cls => {
        const classData = classesData.find(c => c.id === cls.id) ||
          (meeting.allClasses && Array.isArray(meeting.allClasses)
            ? meeting.allClasses.find((c: any) => c.id === cls.id)
            : null)
        return classData && isSambungDesaEligible(classData)
      })
    }

    // Return class details without pre-formatting
    // DataFilter will handle deduplication and formatting
    return classDetails.map(cls => ({
      id: cls.id,
      name: cls.name, // Use original name, not formatted
      kelompok_id: cls.kelompok_id
    }))
  }, [meeting, students, userProfile, isMeetingCreator, classesData, kelompokData])

  // Build kelompok list for filter - only for multi-kelompok meetings
  const kelompokListForFilter = useMemo(() => {
    if (!meeting?.class_ids || meeting.class_ids.length === 0) return []

    // Get all unique kelompok IDs from meeting classes
    const kelompokIds = new Set<string>()
    const kelompokMap = new Map<string, { id: string; name: string; desa_id: string }>()

    // First try to use meeting.allClasses if available
    if (meeting.allClasses && Array.isArray(meeting.allClasses) && meeting.allClasses.length > 0) {
      meeting.allClasses.forEach((classData: any) => {
        if (classData.kelompok_id && classData.kelompok) {
          const kelompok = Array.isArray(classData.kelompok) ? classData.kelompok[0] : classData.kelompok
          if (kelompok?.id && kelompok?.name && kelompok?.desa_id) {
            kelompokMap.set(kelompok.id, {
              id: kelompok.id,
              name: kelompok.name,
              desa_id: kelompok.desa_id
            })
          }
        }
      })
    } else {
      // Fallback: get from classesData and kelompokData
      meeting.class_ids.forEach((classId: string) => {
        const classData = classesData.find(c => c.id === classId)
        if (classData?.kelompok_id) {
          const kelompok = kelompokData?.find((k: any) => k.id === classData.kelompok_id)
          if (kelompok && kelompok.desa_id) {
            kelompokMap.set(kelompok.id, {
              id: kelompok.id,
              name: kelompok.name,
              desa_id: kelompok.desa_id
            })
          }
        }
      })
    }

    return Array.from(kelompokMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [meeting, classesData, kelompokData])

  // Build desa list for filter - only for daerah-level meetings
  const isDaerahLevelMeeting = useMemo(() => {
    if (!meeting) return false

    // Check via activity_level_id
    if (activityLevels) {
      const daerahLevelId = activityLevels.find((l: any) => l.code === 'DAERAH')?.id
      if (daerahLevelId && meeting.activity_level_id === daerahLevelId) return true
    }

    // Check via activity_level object (from query join)
    if (meeting.activity_level?.code === 'DAERAH') return true

    // Fallback heuristic: if meeting's classes span multiple desa, treat as daerah-level
    if (meeting.allClasses && Array.isArray(meeting.allClasses) && meeting.allClasses.length > 0) {
      const desaIds = new Set<string>()
      meeting.allClasses.forEach((classData: any) => {
        const kelompok = Array.isArray(classData.kelompok) ? classData.kelompok[0] : classData.kelompok
        const desa = kelompok?.desa
          ? (Array.isArray(kelompok.desa) ? kelompok.desa[0] : kelompok.desa)
          : null
        if (desa?.id) desaIds.add(desa.id)
      })
      if (desaIds.size > 1) return true
    }

    return false
  }, [meeting, activityLevels])

  const desaListForFilter = useMemo(() => {
    if (!isDaerahLevelMeeting || !meeting?.allClasses) return []

    // Extract unique desa from meeting's classes
    const desaMap = new Map<string, { id: string; name: string; daerah_id: string }>()

    if (meeting.allClasses && Array.isArray(meeting.allClasses)) {
      meeting.allClasses.forEach((classData: any) => {
        const kelompok = Array.isArray(classData.kelompok) ? classData.kelompok[0] : classData.kelompok
        const desa = kelompok?.desa
          ? (Array.isArray(kelompok.desa) ? kelompok.desa[0] : kelompok.desa)
          : null
        if (desa?.id && desa?.name) {
          desaMap.set(desa.id, {
            id: desa.id,
            name: desa.name,
            daerah_id: desa.daerah_id || ''
          })
        }
      })
    }

    return Array.from(desaMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [isDaerahLevelMeeting, meeting])

  // Determine if class filter should show (controlled by column toggle)
  const hasMultipleClasses = classListForFilter.length > 1
  const showClassFilter = hasMultipleClasses && 
    (userProfile ? shouldShowKelasFilter(userProfile, hasMultipleClasses) : false)

  // Determine if desa filter should show
  const showDesaFilterForMeeting = isDaerahLevelMeeting && desaListForFilter.length > 1 &&
    userProfile ? shouldShowDesaFilter(userProfile) : false

  // Determine if kelompok filter should show
  const showKelompokFilter = kelompokListForFilter.length > 1 &&
    userProfile ? shouldShowKelompokFilter(userProfile) : false

  // Per-desa/kelompok attendance breakdown chart — only for multi-scope meetings
  // (classes spanning more than one kelompok). Single-class meetings never show it.
  const showOrgBreakdown = useMemo(() => shouldShowBreakdown(meeting), [meeting])

  // Fallback to Daftar Hadir if Breakdown tab is no longer available (e.g. meeting data changes)
  useEffect(() => {
    if (activeTab === 'breakdown' && !showOrgBreakdown) {
      setActiveTab('daftar-hadir')
    }
  }, [activeTab, showOrgBreakdown])

  const attendanceRowsForBreakdown = useMemo(() => {
    if (!showOrgBreakdown) return []

    return visibleStudents.map(student => {
      // Resolve kelompok_id/desa_id, falling back to classesData/kelompokData
      // lookup for students where the attendance query didn't attach org info
      // directly (e.g. placeholder/snapshot students).
      let kelompokId = student.kelompok_id
      let kelompokName = student.kelompok_name
      let desaId = student.desa_id
      let desaName = student.desa_name

      if (!kelompokId) {
        const primaryClass = classesData.find(c => c.id === student.class_id)
        if (primaryClass?.kelompok_id) {
          kelompokId = primaryClass.kelompok_id
          const kelompok = kelompokData?.find((k: any) => k.id === primaryClass.kelompok_id)
          if (kelompok) {
            kelompokName = kelompokName || kelompok.name
            desaId = desaId || kelompok.desa_id
          }
        }
      }

      return {
        student_id: student.id,
        status: (localAttendance[student.id]?.status || 'A') as 'H' | 'I' | 'S' | 'A',
        kelompok_id: kelompokId,
        kelompok_name: kelompokName,
        desa_id: desaId,
        desa_name: desaName,
      }
    })
  }, [showOrgBreakdown, visibleStudents, localAttendance, classesData, kelompokData])

  const goBack = () => {
    router.push('/presensi')
  }

  const availableColumns = useMemo(() => {
    if (!userProfile) return { kelompok: false, desa: false, kelas: false }
    
    // Kelas column is available for multi-class meetings (desa/daerah level)
    const hasMultipleClasses = classListForFilter.length > 1
    
    return { 
      kelompok: shouldShowKelompokFilter(userProfile),
      desa: shouldShowDesaFilter(userProfile),
      kelas: shouldShowKelasFilter(userProfile, hasMultipleClasses)
    }
  }, [userProfile, classListForFilter.length])

  if (loading) {
    return <LoadingState />
  }

  if (error || !meeting) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Pertemuan tidak ditemukan
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {error?.message || 'Pertemuan yang Anda cari tidak ditemukan'}
            </p>
            <button
              onClick={goBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kembali ke Daftar Pertemuan
            </button>
          </div>
        </div>
      </div>
    )
  }

  const showKelompokColumn = availableColumns.kelompok && columnVisibility.showKelompokColumn
  const showDesaColumn = availableColumns.desa && columnVisibility.showDesaColumn
  const showKelasColumn = availableColumns.kelas && columnVisibility.showKelasColumn

  const toggleableColumns = [
    availableColumns.kelas && { key: 'showKelasColumn' as const, label: 'Kelas' },
    availableColumns.kelompok && { key: 'showKelompokColumn' as const, label: 'Kelompok' },
    availableColumns.desa && { key: 'showDesaColumn' as const, label: 'Desa' },
  ].filter(Boolean) as Array<{ key: keyof typeof columnVisibility; label: string }>

  const columnToggleElement = toggleableColumns.length > 0
    ? <ColumnToggle columns={toggleableColumns} visibility={columnVisibility} onChange={setColumnVisibility} />
    : undefined

  const localStats = calculateLocalStats()
  const localAttendancePercentage = calculateLocalAttendancePercentage()

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4">
          {/* <div className="flex items-center gap-4 mb-4">
            <button
              onClick={goBack}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Kembali"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {meeting.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {dayjs(meeting.date).format('dddd, DD MMMM YYYY')} • {meeting.classes[0]?.name || ''}
              </p>
            </div>
          </div> */}

          {/* Meeting Info */}
          {/* rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-3 */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-3 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {meeting.topic && (
                  <div className="mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">Topik</h3>
                    <p className="whitespace-pre-wrap">{meeting.topic}</p>
                  </div>
                )}
                {meeting.description && (
                  <div className="text-gray-600 dark:text-gray-400 mb-2">
                    <p className="text-lg font-semibold text-gray-900">Deskripsi</p>
                    <p className="whitespace-pre-wrap">{meeting.description}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{dayjs(meeting.date).format('dddd, DD MMMM YYYY')}</span>
                </div>
              </div>
              
              {/* Quick Add Student Button - Only for Desa/Daerah level meetings */}
              {(isDaerahLevelMeeting || meeting.activity_level?.code === 'DESA' || kelompokListForFilter.length > 1) && (
                <div className="ml-4 shrink-0">
                  <Button
                    onClick={() => setIsQuickAddOpen(true)}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Tambah Siswa</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <SummaryCard
            title={`Siswa (${visibleStudents.length} orang)`}
            subtitle={`${localStats.hadir} hadir, ${localStats.absen} alfa, ${localStats.izin} izin, ${localStats.sakit} sakit`}
            percentage={localAttendancePercentage}
            percentageLabel="Kehadiran"
          />

        </div>

        {/* Tabs: Daftar Hadir (manual) vs Scan QR (Desa/Daerah meetings only, editors only)
            vs Live/Infocus (read-only realtime view, always available). */}
        <PresensiTabHeader
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as 'daftar-hadir' | 'scan-qr' | 'live' | 'breakdown')}
          tabs={[
            { id: 'daftar-hadir', label: 'Daftar Hadir', shortLabel: 'Daftar' },
            ...(showOrgBreakdown ? [{ id: 'breakdown', label: 'Perbandingan' }] : []),
            ...(!isReadOnlyMeeting && isDesaOrDaerahMeeting ? [{ id: 'scan-qr', label: 'Scan QR', shortLabel: 'Scan' }] : []),
            ...(isDesaOrDaerahMeeting ? [{ id: 'live', label: 'Presentasi' }] : []),
          ]}
        />

        {activeTab === 'scan-qr' && !isReadOnlyMeeting && isDesaOrDaerahMeeting ? (
          <QrScannerTab meetingId={meetingId} students={visibleStudents} onAttendanceChange={handleQrScanSuccess} />
        ) : activeTab === 'live' && isDesaOrDaerahMeeting ? (
          <LivePresensiTab
            students={visibleStudents}
            attendanceMap={realtimeAttendance}
            connectionStatus={realtimeStatus}
            meetingDate={meeting?.date ? getMeetingWibDateStr(meeting.date) : undefined}
            meetingStartTime={meeting?.start_time}
            checkTimeEnabled={meeting?.check_time_enabled}
          />
        ) : activeTab === 'breakdown' && showOrgBreakdown ? (
          <MeetingOrgBreakdown
            meeting={meeting}
            attendanceRows={attendanceRowsForBreakdown}
            userProfile={userProfile}
            desaList={desaListForFilter}
            kelompokList={kelompokListForFilter}
          />
        ) : (
          <>
            {/* Filters */}
            <DataFilter
              filters={filters}
              onFilterChange={setFilters}
              userProfile={userProfile}
              daerahList={[]}
              desaList={desaListForFilter}
              kelompokList={kelompokListForFilter}
              classList={classListForFilter}
              showDaerah={false}
              showDesa={showDesaFilterForMeeting}
              showKelompok={showKelompokFilter}
              showKelas={showClassFilter}
              showGender={true}
              variant="page"
              cascadeFilters={false}
            />

            {/* Attendance Table */}
            <div className="pb-28 md:pb-8">
              <AttendanceTable
                students={visibleStudents}
                attendance={localAttendance}
                onStatusChange={handleStatusChange}
                canEditStudent={canEditStudent}
                showKelasColumn={showKelasColumn}
                showKelompokColumn={showKelompokColumn}
                showDesaColumn={showDesaColumn}
                columnToggle={columnToggleElement}
                searchQuery={tableSearchQuery}
                onSearchQueryChange={setTableSearchQuery}
                meetingDate={meeting?.date ? getMeetingWibDateStr(meeting.date) : undefined}
                meetingStartTime={meeting?.start_time}
                checkTimeEnabled={meeting?.check_time_enabled}
              />
            </div>

            {/* Save Button - Mobile: floating, Desktop: static */}
            {!isReadOnlyMeeting && (
              <div className="fixed md:static bottom-16 left-4 right-4 md:flex md:justify-end z-50 shadow-lg md:shadow-none">
                <Button
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  variant="primary"
                  className="w-full md:w-auto"
                  loading={saving}
                  loadingText="Menyimpan..."
                >
                  Simpan
                </Button>
              </div>
            )}
          </>
        )}

        {/* Reason Modal */}
        <ReasonModal
          isOpen={showReasonModal}
          onClose={() => {
            setShowReasonModal(false)
            setSelectedStudent(null)
          }}
          onSubmit={handleReasonSubmit}
          studentName={students.find(s => s.id === selectedStudent)?.name || ''}
        />
        
        {/* Quick Add Student Modal */}
        <QuickAddStudentModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          meetingId={meetingId}
          classList={classesData}
          kelompokList={kelompokData || []}
          desaList={desaData || []}
          onSuccess={(studentId, studentName) => {
            toast.success('Siswa berhasil ditambahkan')
            
            // UX Enhancement: auto-select "Hadir" visually and search for the new student
            if (studentId) {
              setLocalAttendance(prev => ({
                ...prev,
                [studentId]: { status: 'H' }
              }))
            }
            if (studentName) {
              setTableSearchQuery(studentName)
            }
            
            mutate() // Refresh data
          }}
        />
      </div>
    </div>
  )
}
