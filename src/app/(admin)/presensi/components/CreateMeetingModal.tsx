'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import Button from '@/components/ui/button/Button'
import { createMeeting, updateMeeting } from '../actions'
import { toast } from 'sonner'
import { useStudents } from '@/hooks/useStudents'
import { useClasses, type Class } from '@/hooks/useClasses'
import { useKelompok } from '@/hooks/useKelompok'
import { useMyAllowedClasses } from '@/hooks/useMyAllowedClasses'
import InputFilter from '@/components/form/input/InputFilter'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import Link from 'next/link'
import DatePickerInput from '@/components/form/input/DatePicker'
import { useUserProfile } from '@/stores/userProfileStore'
import Modal from '@/components/ui/modal'
import { invalidateAllMeetingsCache } from '../utils/cache'
import { isTeacherClass } from '@/lib/utils/classHelpers'
import { useMeetingFormSettings } from '../hooks/useMeetingFormSettings'
import { useMyActivityTypes } from '@/hooks/useMyActivityTypes'
import { useActivityLevels } from '@/hooks/useActivityLevels'
import { useTeacherKelompokAccess } from '@/hooks/useTeacherKelompokAccess'

// Set Indonesian locale
dayjs.locale('id')

interface CreateMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  classId?: string
  meeting?: any // Add meeting prop for edit mode
}

export default function CreateMeetingModal({
  isOpen,
  onClose,
  onSuccess,
  classId,
  meeting // Add meeting parameter
}: CreateMeetingModalProps) {
  const [formData, setFormData] = useState({
    date: meeting ? dayjs(meeting.date) : dayjs(),
    title: meeting?.title || '',
    topic: meeting?.topic || '',
    description: meeting?.description || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [selectedKelompokIds, setSelectedKelompokIds] = useState<string[]>([])
  // For hierarchical teachers (Guru Desa/Daerah): user picks deduplicated class names,
  // selectedClassIds is auto-derived from selectedClassNames × selectedKelompokIds
  const [selectedClassNames, setSelectedClassNames] = useState<string[]>([])
  const [activityTypeId, setActivityTypeId] = useState<string | null>(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [selectedGender, setSelectedGender] = useState<string | null>(null)

  // Track if selections were manually modified by user
  const isManualSelectionRef = useRef(false)

  // Track previously selected class IDs to detect additions/removals
  const previousClassIdsRef = useRef<string[]>([])

  // Store full student objects that were previously selected
  const [previouslySelectedStudents, setPreviouslySelectedStudents] = useState<any[]>([])

  const { students, isLoading: studentsLoading, mutate: mutateStudents } = useStudents()
  const { classes, isLoading: classesLoading } = useClasses()
  const { kelompok } = useKelompok()
  const { profile: userProfile } = useUserProfile()
  const { settings: formSettings, isLoading: isLoadingSettings } = useMeetingFormSettings(userProfile?.id)
  const { activityTypes: myActivityTypes, isLoading: activityTypesLoading } = useMyActivityTypes()
  const { activityLevels } = useActivityLevels()
  const { allowedClassIds, isLoading: allowedClassesLoading } = useMyAllowedClasses()

  // Tambahkan useMemo untuk menambahkan PEMBINAAN jika kelas Pengajar dipilih
  const finalAvailableTypes = useMemo(() => {
    if (activityTypesLoading) return []

    // Check if any selected class is Pengajar
    const hasPengajarClass = selectedClassIds.some(classId => {
      const selectedClass = classes.find(c => c.id === classId)
      return selectedClass && isTeacherClass(selectedClass)
    })

    // If Pengajar class is selected, and PEMBINAAN is not in myActivityTypes,
    // we could potentially add it, but business logic now assumes teacher_activity_types
    // is the source of truth for teachers. For now, just use myActivityTypes.
    return myActivityTypes
  }, [myActivityTypes, activityTypesLoading, selectedClassIds, classes])

  // Sort classes by minimum class_master sort_order
  const sortClassesByMasterOrder = (classList: any[]) => {
    return [...classList].sort((a, b) => {
      const getSortOrder = (cls: any): number => {
        if (!cls.class_master_mappings || cls.class_master_mappings.length === 0) return 9999
        const sortOrders = cls.class_master_mappings
          .map((m: any) => m.class_master?.sort_order)
          .filter((o: any) => typeof o === 'number')
        return sortOrders.length === 0 ? 9999 : Math.min(...sortOrders)
      }
      const orderA = getSortOrder(a)
      const orderB = getSortOrder(b)
      if (orderA !== orderB) return orderA - orderB
      return a.name.localeCompare(b.name)
    })
  }

  // Check if teacher is hierarchical (Guru Desa/Daerah)
  const isHierarchicalTeacher = useMemo(() => {
    if (!userProfile) return false
    return !!((userProfile.daerah_id || userProfile.desa_id || userProfile.kelompok_id) &&
      (!userProfile.classes || userProfile.classes.length === 0))
  }, [userProfile])

  // Auto-determine activity level based on user role
  const activityLevelId = useMemo(() => {
    if (!userProfile || !activityLevels || activityLevels.length === 0) return null
    let levelCode = 'KELOMPOK'
    if (userProfile.role === 'superadmin') {
      // Superadmin: could be any level — default to KELOMPOK for now
      levelCode = 'KELOMPOK'
    } else if (userProfile.daerah_id && !userProfile.desa_id) {
      levelCode = 'DAERAH'
    } else if (userProfile.desa_id && !userProfile.kelompok_id) {
      levelCode = 'DESA'
    } else {
      levelCode = 'KELOMPOK'
    }
    const level = activityLevels.find((l: any) => l.code === levelCode)
    return level?.id || null
  }, [userProfile, activityLevels])

  // Count active students per class for filtering empty classes
  const classStudentCounts = useMemo(() => {
    const counts = new Map<string, number>()

    students.forEach(student => {
      // Only count active students (exclude graduated/inactive)
      if (student.status !== 'active') return

      // Handle both many-to-many (student.classes) and legacy (student.class_id)
      const studentClassIds = (student.classes || []).map(c => c.id)
      const allClassIds = student.class_id
        ? [...studentClassIds, student.class_id]
        : studentClassIds

      allClassIds.forEach(classId => {
        counts.set(classId, (counts.get(classId) || 0) + 1)
      })
    })

    return counts
  }, [students])

  // Guru Desa tapi hanya beberapa kelompok (tidak semua)
  const allowedKelompokIds = useTeacherKelompokAccess()
  const filteredKelompok = useMemo(() => {
    if (!kelompok || allowedKelompokIds === null) return kelompok || []
    return kelompok.filter((k: any) => allowedKelompokIds.includes(k.id))
  }, [kelompok, allowedKelompokIds])

  // Kelompok yang tersedia untuk Guru Desa (filter by desa_id)
  const availableKelompok = useMemo(() => {
    if (!kelompok || !userProfile) return []
    // Hanya untuk Guru Desa (ada desa_id, tidak ada kelompok_id langsung)
    if (!isHierarchicalTeacher) return []
    if (userProfile.desa_id && !userProfile.kelompok_id) {
      return filteredKelompok.filter((k: any) => k.desa_id === userProfile.desa_id)
    }
    // Guru Daerah: tampilkan semua (scope terpisah, bisa dikembangkan nanti)
    return []
  }, [filteredKelompok, userProfile, isHierarchicalTeacher])

  // Filter available classes based on user role and enrich with kelompok_id for teacher
  // Use stable string representation for dependency to avoid infinite loops
  const availableClasses = useMemo(() => {
    let filtered: Class[] = []

    // Role-based filtering (existing logic)
    if (isHierarchicalTeacher) {
      filtered = classes || []
    } else if (userProfile?.role === 'teacher' && userProfile.classes && userProfile.classes.length > 1) {
      // Enrich teacher classes with kelompok_id from classes
      const enriched = userProfile.classes.map(cls => {
        const fullClass = classes.find(c => c.id === cls.id)
        return {
          ...cls,
          kelompok_id: fullClass?.kelompok_id || null
        }
      })
      filtered = enriched as Class[]
    } else if (userProfile?.role === 'teacher') {
      // Enrich single-class teacher with kelompok_id (consistency with multi-class path)
      const enriched = (userProfile.classes || []).map(cls => {
        const fullClass = classes.find(c => c.id === cls.id)
        return {
          ...cls,
          kelompok_id: fullClass?.kelompok_id || null
        }
      })
      filtered = enriched as Class[]
    } else {
      filtered = classes || []
    }

    // Sort by class_master.sort_order (existing logic)
    let sorted = sortClassesByMasterOrder(filtered)

    // Apply class master restriction for Guru Desa/Daerah
    if (isHierarchicalTeacher && allowedClassIds !== null) {
      sorted = sorted.filter(cls => allowedClassIds.includes(cls.id))
    }

    // Apply kelompok filter if kelompok selector is active and user has selected kelompok
    if (isHierarchicalTeacher && availableKelompok.length > 1 && selectedKelompokIds.length > 0) {
      sorted = sorted.filter(cls =>
        (cls as any).kelompok_id && selectedKelompokIds.includes((cls as any).kelompok_id)
      )
    }

    // Filter out classes with 0 active students
    const withStudents = sorted.filter(cls => {
      const count = classStudentCounts.get(cls.id) || 0
      return count > 0
    })

    if (withStudents.length === 0) {
      console.warn('No classes with active students found')
    }

    return withStudents
  }, [
    userProfile?.role,
    userProfile?.classes?.length,
    userProfile?.classes?.map(c => c.id).join(','),
    classes?.length,
    classes?.map(c => `${c.id}-${c.kelompok_id}`).join(','),
    isHierarchicalTeacher,
    classStudentCounts,
    allowedClassIds,
    selectedKelompokIds,
    availableKelompok
  ])

  // Deduplicated class name options (for hierarchical teacher — Opsi B)
  // Unique class names preserving sort_order via first occurrence
  const dedupedClassOptions = useMemo(() => {
    if (!isHierarchicalTeacher) return []
    const seen = new Set<string>()
    const result: { id: string; label: string; name: string }[] = []
    for (const cls of availableClasses) {
      if (!seen.has(cls.name)) {
        seen.add(cls.name)
        result.push({ id: cls.name, label: cls.name, name: cls.name })
      }
    }
    return result
  }, [isHierarchicalTeacher, availableClasses])

  // For hierarchical teachers: auto-derive selectedClassIds from selectedClassNames × selectedKelompokIds
  useEffect(() => {
    if (!isHierarchicalTeacher) return
    const kelompokFilter = selectedKelompokIds.length > 0 ? new Set(selectedKelompokIds) : null
    const derived = selectedClassNames.length === 0
      ? []
      : availableClasses
          .filter(cls =>
            selectedClassNames.includes(cls.name) &&
            (kelompokFilter === null || ((cls as any).kelompok_id && kelompokFilter.has((cls as any).kelompok_id)))
          )
          .map(cls => cls.id)
    setSelectedClassIds(prev => {
      if (prev.length === derived.length && prev.every((id, i) => id === derived[i])) return prev
      return derived
    })
  }, [isHierarchicalTeacher, selectedClassNames, selectedKelompokIds, availableClasses])

  // Helper to find matching class for a student
  const getStudentMatchingClass = (student: any, selectedClassIds: string[], classesData: any[]) => {
    // Find first class from student.classes that exists in selectedClassIds
    const matchingClassId = student.classes?.find((c: any) => selectedClassIds.includes(c.id))?.id
    if (!matchingClassId) return null

    // Get full class details
    return classesData.find((c: any) => c.id === matchingClassId)
  }

  // Check if teacher has multiple kelompok
  const teacherHasMultipleKelompok = useMemo(() => {
    if (userProfile?.role !== 'teacher') return false
    const kelompokIds = new Set(availableClasses.map((c: any) => c.kelompok_id).filter(Boolean))
    return kelompokIds.size > 1
  }, [userProfile?.role, availableClasses])

  // Kelompok name map
  const kelompokMap = useMemo(() => {
    if (!kelompok || kelompok.length === 0) return new Map()
    return new Map(kelompok.map((k: any) => [k.id, k.name]))
  }, [kelompok])

  // Filter students by selected classes and gender - support multiple classes per student
  const filteredStudents = students.filter(student => {
    // Only show active students (exclude archived: graduated/inactive)
    if (student.status !== 'active') {
      return false
    }

    // Only show students with classes assigned
    const hasClasses = (student.classes && student.classes.length > 0) || student.class_id
    if (!hasClasses) {
      return false
    }

    // Filter by class
    let matchesClass = true
    if (selectedClassIds.length > 0) {
      const studentClassIds = (student.classes || []).map(c => c.id)
      // Also check class_id for backward compatibility
      const allStudentClassIds = student.class_id ? [...studentClassIds, student.class_id] : studentClassIds
      matchesClass = allStudentClassIds.some(classId => selectedClassIds.includes(classId))
    }

    // Filter by gender
    let matchesGender = true
    if (selectedGender && selectedGender !== '') {
      matchesGender = student.gender === selectedGender
    }

    return matchesClass && matchesGender
  })

  // Combine filtered students with previously selected students
  const combinedStudents = useMemo(() => {
    // Get previously selected students that are NOT in current filter
    const previouslySelected = previouslySelectedStudents.filter(
      prevStudent => !filteredStudents.some(s => s.id === prevStudent.id)
    )

    // Combine: current filtered + previously selected
    return [...filteredStudents, ...previouslySelected]
  }, [filteredStudents, previouslySelectedStudents])

  // Auto-init kelompok selection when modal opens for Guru Desa
  useEffect(() => {
    if (!isOpen) {
      setSelectedKelompokIds([])
      return
    }
    if (availableKelompok.length === 0) return
    if (availableKelompok.length === 1) {
      // Only 1 kelompok → auto-select it silently
      setSelectedKelompokIds([availableKelompok[0].id])
      return
    }
    // Multiple kelompok → default pilih semua
    setSelectedKelompokIds(availableKelompok.map((k: any) => k.id))
  }, [isOpen, availableKelompok.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Force revalidate students when modal opens to get fresh data
  useEffect(() => {
    if (isOpen) {
      mutateStudents(undefined, { revalidate: true }) // Force hard refresh
    }
  }, [isOpen, mutateStudents])

  // Track initialization to prevent infinite loops
  const initializedRef = useRef(false)
  const previousIsOpenRef = useRef(isOpen)

  // Initialize selectedClassIds based on mode - only when modal opens for the first time
  useEffect(() => {
    // Reset when modal closes
    if (!isOpen) {
      if (previousIsOpenRef.current) {
        initializedRef.current = false
      }
      previousIsOpenRef.current = false
      return
    }

    // Only initialize once when modal first opens
    if (!previousIsOpenRef.current && isOpen) {
      previousIsOpenRef.current = true
      initializedRef.current = false
    }

    // Only initialize once per modal open
    if (initializedRef.current) return

    if (meeting) {
      // Edit mode: populate from meeting.class_ids
      const meetingClassIds = meeting.class_ids || (meeting.class_id ? [meeting.class_id] : [])
      if (isHierarchicalTeacher) {
        // Derive selected names from class IDs
        const names = [...new Set(
          availableClasses
            .filter(c => meetingClassIds.includes(c.id))
            .map(c => c.name)
        )]
        setSelectedClassNames(names)
        // selectedClassIds will be auto-derived by the useEffect above
      } else {
        setSelectedClassIds(meetingClassIds)
      }
      initializedRef.current = true
    } else if (classId) {
      // Create mode with specific class
      // Handle comma-separated class IDs from filter
      const classIds = classId.includes(',') ? classId.split(',').filter(Boolean) : [classId]
      setSelectedClassIds(classIds)
      initializedRef.current = true
    } else if (availableClasses && availableClasses.length > 0) {
      if (isHierarchicalTeacher) {
        // Hierarchical teacher: default pilih semua nama kelas (user bisa uncheck)
        setSelectedClassNames(dedupedClassOptions.map(o => o.name))
        // selectedClassIds auto-derived by useEffect
      } else {
        // Create mode: Determine selection based on UI visibility
        const isUIShown = formSettings.showClassSelection && availableClasses.length > 1
        if (isUIShown) {
          setSelectedClassIds([])
        } else {
          setSelectedClassIds(availableClasses.map(cls => cls.id))
        }
      }
      initializedRef.current = true
    }
  }, [isOpen, classId, meeting])

  // Separate effect for availableClasses to avoid infinite loop
  // Only initialize if not already initialized and modal is open
  useEffect(() => {
    if (!isOpen || initializedRef.current) return
    if (!classId && !meeting && availableClasses && availableClasses.length > 0) {
      if (isHierarchicalTeacher) {
        if (dedupedClassOptions.length > 0) {
          setSelectedClassNames(dedupedClassOptions.map(o => o.name))
        }
      } else {
        setSelectedClassIds(prev => {
          if (prev.length === 0) {
            const isUIShown = formSettings.showClassSelection && availableClasses.length > 1
            return isUIShown ? [] : availableClasses.map(cls => cls.id)
          }
          return prev
        })
      }
    }
  }, [isOpen, availableClasses?.length, availableClasses?.[0]?.id, formSettings.showClassSelection, isHierarchicalTeacher, dedupedClassOptions?.length])

  // Update form data when meeting changes
  useEffect(() => {
    if (meeting) {
      setFormData({
        date: dayjs(meeting.date),
        title: meeting.title,
        topic: meeting.topic || '',
        description: meeting.description || ''
      })
      setActivityTypeId(meeting.activity_type_id || null)
    }
  }, [meeting])

  // Initialize selectedStudentIds with smart preservation
  useEffect(() => {
    // Early return if no classes selected
    if (selectedClassIds.length === 0) {
      if (selectedStudentIds.length > 0) {
        setSelectedStudentIds([])
        setPreviouslySelectedStudents([])
      }
      previousClassIdsRef.current = []
      return
    }

    // Wait for students to load
    if (filteredStudents.length === 0) return

    // CASE 1: Edit Mode - Initialize from meeting.student_snapshot (ONCE)
    if (meeting && meeting.student_snapshot && !isManualSelectionRef.current) {
      const validStudentIds = filteredStudents
        .filter(s => meeting.student_snapshot.includes(s.id))
        .map(s => s.id)

      setSelectedStudentIds(validStudentIds.length > 0 ? validStudentIds : filteredStudents.map(s => s.id))
      setPreviouslySelectedStudents(filteredStudents.filter(s => validStudentIds.includes(s.id)))
      previousClassIdsRef.current = [...selectedClassIds]
      return
    }

    // CASE 2: Initial Auto-selection (Create Mode, first time)
    if (!isManualSelectionRef.current && previousClassIdsRef.current.length === 0) {
      const allStudentIds = filteredStudents.map(s => s.id)
      setSelectedStudentIds(allStudentIds)
      setPreviouslySelectedStudents([...filteredStudents])
      previousClassIdsRef.current = [...selectedClassIds]
      return
    }

    // CASE 2B: Class selection changed but user hasn't manually changed students
    // This handles when showClassSelection=false and all classes are auto-selected,
    // or when user changes classes but hasn't touched student selection yet
    if (!isManualSelectionRef.current && previousClassIdsRef.current.length > 0) {
      const prevClassIds = previousClassIdsRef.current
      const currentClassIds = selectedClassIds

      // Check if classes actually changed
      const classIdsChanged = prevClassIds.length !== currentClassIds.length ||
        prevClassIds.some(id => !currentClassIds.includes(id)) ||
        currentClassIds.some(id => !prevClassIds.includes(id))

      if (classIdsChanged) {
        // Classes changed but no manual student selection yet - auto-select all students
        const allStudentIds = filteredStudents.map(s => s.id)
        setSelectedStudentIds(allStudentIds)
        setPreviouslySelectedStudents([...filteredStudents])
        previousClassIdsRef.current = [...selectedClassIds]
      }
      return
    }

    // CASE 3: Smart Merge (User has made manual changes)
    if (isManualSelectionRef.current) {
      const prevClassIds = previousClassIdsRef.current
      const currentClassIds = selectedClassIds

      // Check if classes actually changed
      const classIdsChanged = prevClassIds.length !== currentClassIds.length ||
        prevClassIds.some(id => !currentClassIds.includes(id)) ||
        currentClassIds.some(id => !prevClassIds.includes(id))

      if (!classIdsChanged) return // No change, skip update

      // Detect added classes
      const addedClassIds = currentClassIds.filter(id => !prevClassIds.includes(id))

      // Detect removed classes
      const removedClassIds = prevClassIds.filter(id => !currentClassIds.includes(id))

      if (addedClassIds.length > 0) {
        // NEW CLASSES ADDED: Auto-select students from new classes only
        const newStudents = filteredStudents.filter(student => {
          const studentClassIds = (student.classes || []).map(c => c.id)
          const allStudentClassIds = student.class_id ? [...studentClassIds, student.class_id] : studentClassIds
          return allStudentClassIds.some(classId => addedClassIds.includes(classId))
        })

        const newStudentIds = newStudents.map(s => s.id)

        // Merge: keep existing selections + add new students
        setSelectedStudentIds(prev => [...new Set([...prev, ...newStudentIds])])

        // Update previously selected students
        setPreviouslySelectedStudents(prev => {
          const merged = [...prev, ...newStudents]
          return merged.filter((student, index, self) =>
            index === self.findIndex(s => s.id === student.id)
          )
        })
      }

      if (removedClassIds.length > 0) {
        // CLASSES REMOVED: Clean up students that are ONLY in removed classes
        setSelectedStudentIds(prev => {
          return prev.filter(id => {
            const student = students.find(s => s.id === id)
            if (!student) return false

            const studentClassIds = (student.classes || []).map(c => c.id)
            const allStudentClassIds = student.class_id ? [...studentClassIds, student.class_id] : studentClassIds

            // Keep if student is in at least one remaining selected class
            return allStudentClassIds.some(classId => currentClassIds.includes(classId))
          })
        })

        // Update previously selected students
        setPreviouslySelectedStudents(prev => {
          return prev.filter(student => {
            const studentClassIds = (student.classes || []).map((c: any) => c.id)
            const allStudentClassIds = student.class_id ? [...studentClassIds, student.class_id] : studentClassIds
            return allStudentClassIds.some((classId: string) => currentClassIds.includes(classId))
          })
        })
      }

      // Update ref for next comparison
      previousClassIdsRef.current = [...selectedClassIds]
    }
  }, [
    selectedClassIds.join(','),
    filteredStudents.map(s => s.id).join(','),
    meeting?.student_snapshot?.join(','),
    students
  ])

  // Determine if meeting type input should be shown
  const shouldShowMeetingTypeInput = useMemo(() => {
    if (activityTypesLoading || finalAvailableTypes.length === 0) {
      return true // Show by default while loading
    }

    // If only 1 type available and it's PEMBINAAN, could potentially hide
    if (finalAvailableTypes.length === 1 && finalAvailableTypes[0].code === 'PEMBINAAN') {
      return false
    }

    return true
  }, [finalAvailableTypes, activityTypesLoading])

  // Auto-initialize activityTypeId when DB activity types load (create mode only)
  useEffect(() => {
    if (meeting) return // edit mode: already set from meeting.activity_type_id
    if (!isOpen) return
    if (activityTypesLoading || myActivityTypes.length === 0) return
    if (activityTypeId) return // already set
    const first = myActivityTypes[0]
    setActivityTypeId(first.id)
  }, [isOpen, activityTypesLoading, myActivityTypes.length, myActivityTypes[0]?.id])

  // Auto-select activity type based on available options
  useEffect(() => {
    if (meeting || !isOpen || activityTypesLoading) return

    if (!shouldShowMeetingTypeInput) {
      const pembinaan = finalAvailableTypes.find(t => t.code === 'PEMBINAAN')
      if (pembinaan && activityTypeId !== pembinaan.id) {
        setActivityTypeId(pembinaan.id)
      }
      return
    }

    if (!activityTypeId && finalAvailableTypes.length > 0) {
      // If only 1 option, auto-select it
      if (finalAvailableTypes.length === 1) {
        setActivityTypeId(finalAvailableTypes[0].id)
      }
      // Default selection logic
      else if (finalAvailableTypes.length > 1) {
        const pembinaan = finalAvailableTypes.find(t => t.code === 'PEMBINAAN')
        const sambungKelompok = finalAvailableTypes.find(t => t.code === 'SAMBUNG_KELOMPOK')
        
        if (pembinaan) {
          // Default to SAMBUNG_KELOMPOK if available, else PEMBINAAN
          setActivityTypeId(sambungKelompok?.id || pembinaan.id)
        }
      }
    }
  }, [isOpen, finalAvailableTypes, activityTypesLoading, shouldShowMeetingTypeInput, activityTypeId, meeting])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedClassIds.length === 0) {
      toast.error('Pilih kelas terlebih dahulu')
      return
    }

    if (selectedStudentIds.length === 0) {
      toast.error('Pilih minimal satu siswa untuk diikutsertakan')
      return
    }

    if (!activityTypeId) {
      toast.error('Pilih tipe kegiatan terlebih dahulu')
      return
    }

    setIsSubmitting(true)
    try {
      if (meeting) {
        // Edit mode
        const result = await updateMeeting(meeting.id, {
          classIds: selectedClassIds,
          date: formData.date.format('YYYY-MM-DD'),
          title: formData.title,
          topic: formData.topic || undefined,
          description: formData.description || undefined,
          activityTypeId: activityTypeId || undefined,
          activityLevelId: activityLevelId || undefined,
          studentIds: selectedStudentIds
        })

        if (result.success) {
          toast.success('Pertemuan berhasil diperbarui!')
          // Invalidate all meetings cache so other users see the update
          await invalidateAllMeetingsCache()
          onSuccess()
          handleClose()
        } else {
          toast.error('Gagal memperbarui pertemuan: ' + result.error)
        }
      } else {
        // Create mode
        // Derive kelompokIds: prefer selectedKelompokIds (Guru Desa path), else infer from selected classes
        const kelompokIds: string[] =
          isHierarchicalTeacher && selectedKelompokIds.length > 0
            ? selectedKelompokIds
            : [...new Set(
                selectedClassIds
                  .map(id => {
                    const cls = availableClasses.find(c => c.id === id)
                    return (cls as any)?.kelompok_id as string | undefined
                  })
                  .filter((id): id is string => Boolean(id))
              )]

        const result = await createMeeting({
          classIds: selectedClassIds,
          kelompokIds: kelompokIds.length > 0 ? kelompokIds : undefined,
          date: formData.date.format('YYYY-MM-DD'),
          title: formData.title,
          topic: formData.topic || undefined,
          description: formData.description || undefined,
          activityTypeId: activityTypeId || undefined,
          activityLevelId: activityLevelId || undefined,
          studentIds: selectedStudentIds
        })

        if (result.success) {
          toast.success('Pertemuan berhasil dibuat!')
          // Invalidate all meetings cache so other users see the new meeting
          await invalidateAllMeetingsCache()
          onSuccess()
          handleClose()
        } else {
          toast.error('Gagal membuat pertemuan: ' + result.error)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      date: dayjs(),
      title: '',
      topic: '',
      description: ''
    })
    setActivityTypeId(null)
    setSelectedStudentIds([])
    setSelectedGender(null)
    setSelectedKelompokIds([])
    setSelectedClassNames([])
    setPreviouslySelectedStudents([])
    isManualSelectionRef.current = false
    previousClassIdsRef.current = []
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={meeting ? 'Edit Pertemuan' : 'Buat Pertemuan Baru'}
    >
      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col h-full -mx-6 -my-4">
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoadingSettings ? (
            // Loading skeleton
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ) : (
            <>
              {/* Kelompok Selector — hanya untuk Guru Desa dengan >1 kelompok */}
              {isHierarchicalTeacher && availableKelompok.length > 1 && (
                <div className="mb-4">
                  <MultiSelectCheckbox
                    label="Pilih Kelompok"
                    items={availableKelompok.map((k: any) => ({
                      id: k.id,
                      label: k.name
                    }))}
                    selectedIds={selectedKelompokIds}
                    onChange={setSelectedKelompokIds}
                    hint="Pilih kelompok yang akan mengikuti pertemuan ini"
                    disabled={isSubmitting || allowedClassesLoading}
                  />
                </div>
              )}

              {/* Class Selection */}
              {formSettings.showClassSelection && (
                isHierarchicalTeacher ? (
                  // Hierarchical teacher (Guru Desa/Daerah): show deduplicated class names
                  dedupedClassOptions.length > 0 && (
                    <div className="mb-4">
                      <MultiSelectCheckbox
                        label="Pilih Kelas"
                        items={dedupedClassOptions.map(o => ({ id: o.name, label: o.label }))}
                        selectedIds={selectedClassNames}
                        onChange={setSelectedClassNames}
                        hint={`Pilih tingkat kelas untuk pertemuan ini (${selectedClassIds.length} kelas dipilih)`}
                        disabled={isSubmitting || classesLoading || allowedClassesLoading}
                      />
                    </div>
                  )
                ) : (
                  // Regular teacher / admin: show individual classes
                  availableClasses.length > 1 && (
                    <div className="mb-4">
                      <MultiSelectCheckbox
                        label="Pilih Kelas"
                        items={(() => {
                          if (availableClasses.length > 1) {
                            // Create mapping kelompok_id -> kelompok name directly from availableClasses
                            const kelompokMap = new Map();
                            availableClasses.forEach((cls: any) => {
                              if (cls.kelompok_id && cls.kelompok?.name) {
                                kelompokMap.set(cls.kelompok_id, cls.kelompok.name);
                              }
                            });

                            const nameCounts = availableClasses.reduce((acc, cls: any) => {
                              const normalizedName = (cls.name || '').trim();
                              acc[normalizedName] = (acc[normalizedName] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);

                            return availableClasses.map((cls: any) => {
                              const normalizedName = (cls.name || '').trim();
                              const hasDuplicate = nameCounts[normalizedName] > 1;
                              const kelompokName = cls.kelompok_id ? kelompokMap.get(cls.kelompok_id) : null;
                              
                              const label = (hasDuplicate && kelompokName)
                                ? `${cls.name} (${kelompokName})`
                                : cls.name;

                              return {
                                id: cls.id,
                                label: label
                              };
                            });
                          }
                          return availableClasses.map(cls => ({ id: cls.id, label: cls.name }));
                        })()}
                        selectedIds={selectedClassIds}
                        onChange={setSelectedClassIds}
                        hint="Pilih satu atau lebih kelas untuk pertemuan ini"
                        disabled={isSubmitting || classesLoading}
                      />
                    </div>
                  )
                )
              )}

              {/* Gender Filter */}
              {formSettings.showGenderFilter && (
                <div className="mb-4">
                  <InputFilter
                    id="genderFilter"
                    label="Jenis Kelamin (Opsional)"
                    value={selectedGender || ''}
                    onChange={(value) => setSelectedGender(value === '' ? null : value)}
                    options={[
                      { value: '', label: 'Semua' },
                      { value: 'Laki-laki', label: 'Laki-laki' },
                      { value: 'Perempuan', label: 'Perempuan' }
                    ]}
                    disabled={isSubmitting}
                    widthClassName="!max-w-full"
                    className='mb-0!'
                  />
                </div>
              )}

              {/* Activity Type Selector (DB-driven) */}
              {myActivityTypes.length > 0 && (
                <div className="mb-4">
                  <InputFilter
                    id="activityType"
                    label="Tipe Kegiatan"
                    value={activityTypeId || ''}
                    onChange={(val) => {
                      setActivityTypeId(val || null)
                    }}
                    options={myActivityTypes.map((t: any) => ({
                      value: t.id,
                      label: t.name
                    }))}
                    disabled={isSubmitting || activityTypesLoading}
                    widthClassName="!max-w-full"
                    className='mb-0!'
                  />
                </div>
              )}


              {/* Title Field */}
              {formSettings.showTitle && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Judul Pertemuan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Judul pertemuan..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              )}

              {/* Topic */}
              {formSettings.showTopic && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Topik (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="Topik pertemuan..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              )}

              {/* Description */}
              {formSettings.showDescription && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Deskripsi (Opsional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Deskripsi pertemuan..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  />
                </div>
              )}

              {/* Date Picker */}
              {formSettings.showDate && (
                <div className="mb-4">
                  <DatePickerInput
                    mode="single"
                    label="Tanggal Pertemuan"
                    value={formData.date}
                    onChange={(date) => setFormData(prev => ({ ...prev, date: date || dayjs() }))}
                    format="DD/MM/YYYY"
                    placeholder="Pilih Tanggal"
                  />
                </div>
              )}

              {/* Student Preview */}
              {combinedStudents.length > 0 ? (
                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jumlah Siswa: <Link href={`/users/siswa`} className="text-blue-500 hover:text-blue-600">{selectedStudentIds.length} dari {combinedStudents.length} siswa dipilih</Link>
                    {selectedClassIds.length > 1 && (
                      <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">
                        ({selectedClassIds.length} kelas gabungan)
                      </span>
                    )}
                    {/* Show multi-class indicator if any student has multiple classes */}
                    {/* {filteredStudents.some(s => (s.classes || []).length > 1) && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                        (termasuk siswa multi-kelas)
                      </span>
                    )} */}
                  </h4>

                  {/* Student Selection */}
                  {formSettings.showStudentSelection && (
                    <div className="mt-4">
                      <MultiSelectCheckbox
                        label="Pilih Siswa yang Akan Diikutsertakan"
                        items={combinedStudents
                          .map(s => {
                            const matchingClass = getStudentMatchingClass(s, selectedClassIds, classes)
                            const className = matchingClass?.name || ''
                            const kelompokName = matchingClass?.kelompok_id ? kelompokMap.get(matchingClass.kelompok_id) : null

                            let label = s.name
                            if (className) {
                              if (teacherHasMultipleKelompok && kelompokName) {
                                label = `${s.name} (${className} - ${kelompokName})`
                              } else {
                                label = `${s.name} (${className})`
                              }
                            }

                            return {
                              id: s.id,
                              label,
                              kelompokName: kelompokName || '',
                              studentName: s.name
                            }
                          })
                          .sort((a, b) => {
                            // Sort by kelompok first, then by student name
                            if (a.kelompokName !== b.kelompokName) {
                              return a.kelompokName.localeCompare(b.kelompokName, 'id')
                            }
                            return a.studentName.localeCompare(b.studentName, 'id')
                          })}
                        selectedIds={selectedStudentIds}
                        onChange={(newSelectedIds) => {
                          // Mark as manual selection
                          isManualSelectionRef.current = true
                          setSelectedStudentIds(newSelectedIds)

                          // Update previously selected students
                          const selected = combinedStudents.filter(s => newSelectedIds.includes(s.id))
                          setPreviouslySelectedStudents(selected)
                        }}
                        maxHeight="15rem"
                        hint="Pilih siswa yang akan ikut dalam pertemuan ini. Default: semua siswa terpilih."
                        disabled={isSubmitting}
                        showSearch={combinedStudents.length > 15}
                        searchPlaceholder="Cari nama siswa..."
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tidak ada siswa di kelas yang dipilih
                  </h4>
                </div>
              )}
            </>
          )}
        </div>

        {/* Buttons - Sticky at bottom */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 mt-auto">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || studentsLoading || classesLoading || combinedStudents.length === 0 || isLoadingSettings}
            variant="primary"
            loading={isSubmitting}
            loadingText={meeting ? 'Memperbarui...' : 'Membuat...'}
          >
            {meeting ? 'Perbarui' : 'Buat Pertemuan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
