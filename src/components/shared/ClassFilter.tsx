'use client'

import InputFilter from '@/components/form/input/InputFilter'

interface Class {
  id: string
  name: string
}

interface UserProfile {
  id?: string
  full_name?: string
  role: string
  email?: string
  kelompok_id?: string | null
  desa_id?: string | null
  daerah_id?: string | null
  kelompok?: { id: string; name: string } | null
  desa?: { id: string; name: string } | null
  daerah?: { id: string; name: string } | null
  classes?: Array<{
    id: string
    name: string
  }>
  // Siswa page user profile structure
  class_id?: string | null
  class_name?: string | null
}

interface ClassFilterProps {
  userProfile: UserProfile | null | undefined
  classes: Class[]
  selectedClassFilter: string
  onClassFilterChange: (value: string) => void
  showForTeacher?: boolean // Option to show read-only for teacher
}

export default function ClassFilter({ 
  userProfile, 
  classes, 
  selectedClassFilter, 
  onClassFilterChange,
  showForTeacher = false
}: ClassFilterProps) {
  // For teachers, optionally show read-only display
  if (userProfile?.role === 'teacher' && showForTeacher) {
    // Handle both user profile structures
    const classId = userProfile.class_id || userProfile.classes?.[0]?.id || ''
    const className = userProfile.class_name || userProfile.classes?.[0]?.name || ''
    const classOptions = userProfile.classes?.map(c => ({ value: c.id, label: c.name })) || 
                        (classId ? [{ value: classId, label: className }] : [])
    
    return (
      <InputFilter
        id="classFilter"
        label="Kelas"
        value={classId}
        onChange={() => {}} // No-op for teacher
        options={classOptions}
        disabled={true}
        widthClassName="w-full md:max-w-xs"
      />
    )
  }

  // For admin, show class filter dropdown
  if (userProfile?.role === 'admin') {
    return (
      <InputFilter
        id="classFilter"
        label="Filter Kelas"
        value={selectedClassFilter}
        onChange={onClassFilterChange}
        options={classes.map(cls => ({ value: cls.id, label: cls.name }))}
        allOptionLabel="Semua Kelas"
        widthClassName="!max-w-full md:!max-w-xs"
      />
    )
  }

  return null
}
