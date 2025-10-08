'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ReasonModal from '@/app/(admin)/absensi/components/ReasonModal'
import { saveAttendance } from './actions'

interface Student {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
}

interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
  }
}

export default function AbsensiPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<AttendanceData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/signin')
        return
      }

      // Get user profile to determine which class they teach
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) {
        console.error('Profile not found')
        return
      }

      let query = supabase
        .from('students')
        .select(`
          id,
          name,
          gender,
          classes!inner(
            id,
            name
          )
        `)

      // If user is a teacher, get their class and filter students
      if (profile.role === 'teacher') {
        const { data: teacherClass } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', user.id)
          .single()

        if (teacherClass) {
          query = query.eq('class_id', teacherClass.id)
        }
      }

      const { data, error } = await query.order('name')

      if (error) {
        console.error('Error fetching students:', error)
        return
      }

      const studentsData = data.map(student => ({
        id: student.id,
        name: student.name,
        gender: student.gender,
        class_name: (student.classes as any).name,
        class_id: (student.classes as any).id
      }))

      setStudents(studentsData)

      // Load existing attendance data for today
      await loadExistingAttendance(studentsData)

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExistingAttendance = async (studentsData: Student[]) => {
    try {
      const supabase = createClient()
      const today = new Date().toLocaleDateString('en-CA')
      
      // Get existing attendance records for today
      const { data: existingAttendance, error } = await supabase
        .from('attendance_logs')
        .select('student_id, status, reason')
        .eq('date', today)

      if (error) {
        console.error('Error fetching existing attendance:', error)
        return
      }

      // Initialize attendance with existing data or default to 'A' (Absent)
      const initialAttendance: AttendanceData = {}
      studentsData.forEach(student => {
        const existingRecord = existingAttendance?.find(record => record.student_id === student.id)
        initialAttendance[student.id] = {
          status: existingRecord?.status || 'A',
          reason: existingRecord?.reason || undefined
        }
      })
      
      setAttendance(initialAttendance)
    } catch (error) {
      console.error('Error loading existing attendance:', error)
      // Fallback to default 'A' status if loading fails
      const initialAttendance: AttendanceData = {}
      studentsData.forEach(student => {
        initialAttendance[student.id] = { status: 'A' }
      })
      setAttendance(initialAttendance)
    }
  }

  const handleStatusChange = (studentId: string, status: 'H' | 'I' | 'S' | 'A') => {
    if (status === 'I') {
      // If status is 'I' (Izin), open modal for reason
      setSelectedStudent(studentId)
      setShowReasonModal(true)
    } else {
      // For other statuses, update directly
      setAttendance(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], status, reason: undefined }
      }))
    }
  }

  const handleReasonSubmit = (reason: string) => {
    if (selectedStudent) {
      setAttendance(prev => ({
        ...prev,
        [selectedStudent]: { ...prev[selectedStudent], status: 'I', reason }
      }))
    }
    setShowReasonModal(false)
    setSelectedStudent(null)
    setReason('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const today = new Date().toLocaleDateString('en-CA') // Returns YYYY-MM-DD in local timezone
      
      const attendanceData = Object.entries(attendance).map(([studentId, data]) => ({
        student_id: studentId,
        date: today,
        status: data.status,
        reason: data.reason || null
      }))

      const result = await saveAttendance(attendanceData)
      
      if (result.success) {
        alert('Data absensi berhasil disimpan!')
        // Reload attendance data to show updated status
        await loadExistingAttendance(students)
      } else {
        alert('Gagal menyimpan data absensi: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      alert('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'H': 'Hadir',
      'I': 'Izin',
      'S': 'Sakit',
      'A': 'Alfa'
    }
    return labels[status as keyof typeof labels] || status
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat data siswa...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Absensi Siswa
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Students List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Daftar Siswa ({students.length} siswa)
            </h2>
          </div>
          
          {/* Table Layout */}
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-2 sm:px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Nama
                  </th>
                  <th className="px-1 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                    Hadir
                  </th>
                  <th className="px-1 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                    Izin
                  </th>
                  <th className="px-1 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                    Sakit
                  </th>
                  <th className="px-1 pr-2 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                    Alfa
                  </th>
                </tr>
              </thead>
              
              {/* Table Body */}
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {/* Student Info */}
                    <td className="px-2 sm:px-6 py-3 sm:py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {student.name}
                        </div>
                        {/* <div className="text-xs text-gray-500 dark:text-gray-400">
                          {student.gender} • {student.class_name}
                        </div> */}
                        {attendance[student.id]?.reason && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Alasan: {attendance[student.id].reason}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Status Radio Buttons */}
                    {(['H', 'I', 'S', 'A'] as const).map((status, index) => (
                      <td key={status} className={`px-1 py-3 sm:py-4 text-center ${index === 3 ? 'pr-2' : ''}`}>
                        <label className="flex items-center justify-center cursor-pointer">
                          <input
                            type="radio"
                            name={`status-${student.id}`}
                            value={status}
                            checked={attendance[student.id]?.status === status}
                            onChange={() => handleStatusChange(student.id, status)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-center sm:justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Menyimpan...' : 'Simpan Absensi'}
          </button>
        </div>

        {/* Reason Modal */}
        <ReasonModal
          isOpen={showReasonModal}
          onClose={() => {
            setShowReasonModal(false)
            setSelectedStudent(null)
            setReason('')
          }}
          onSubmit={handleReasonSubmit}
          studentName={students.find(s => s.id === selectedStudent)?.name || ''}
        />
      </div>
    </div>
  )
}
