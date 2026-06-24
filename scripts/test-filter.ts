import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypass RLS for testing the logic
const supabase = createClient(supabaseUrl, supabaseKey)

// We want to simulate the logic of getMeetingsWithStats
async function testLogic() {
  const adminClientAdmin = supabase
  
  // 1. Get the meeting "Pengajian Gabungan"
  const { data: meetings, error: meetingsError } = await adminClientAdmin
    .from('meetings')
    .select(`
      id, title, class_id, class_ids, student_snapshot,
      classes (
        id, name, kelompok_id, kelompok:kelompok_id(id, name, desa_id)
      )
    `)
    .ilike('title', '%Gabungan%')
    .limit(1)
    
  if (meetingsError || !meetings || meetings.length === 0) {
    console.log("No meeting found", meetingsError)
    return
  }
  
  const meeting = meetings[0]
  console.log("Meeting:", meeting.title, "Total Snapshot:", meeting.student_snapshot?.length)
  
  // Get all meeting class IDs
  const allMeetingClassIds = new Set<string>()
  if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
    meeting.class_ids.forEach((id: string) => allMeetingClassIds.add(id))
  }
  if (meeting.class_id) allMeetingClassIds.add(meeting.class_id)
  
  console.log("Meeting class IDs:", allMeetingClassIds)

  // Fetch all classes
  const { data: classesData } = await adminClientAdmin
    .from('classes')
    .select('id, name, kelompok_id, kelompok:kelompok_id(id, name, desa_id, desa:desa_id(id, name, daerah_id, daerah:daerah_id(id, name)))')
    .in('id', Array.from(allMeetingClassIds))
    
  const allClassesMap = new Map<string, any>()
  if (classesData) {
    classesData.forEach(c => {
      let kelompok: any = Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok
      if (kelompok) {
        const desa = Array.isArray(kelompok.desa) ? kelompok.desa[0] : kelompok.desa
        if (desa) {
          const daerah = Array.isArray(desa.daerah) ? desa.daerah[0] : desa.daerah
          kelompok = {
            ...kelompok,
            desa: daerah ? { ...desa, daerah } : desa
          }
        }
      }
      allClassesMap.set(c.id, {
        id: c.id,
        name: c.name,
        kelompok_id: c.kelompok_id,
        kelompok
      })
    })
  }

  // Fetch student classes
  const allStudentIds = new Set<string>(meeting.student_snapshot || [])
  const { data: studentClassData, error: studentError } = await adminClientAdmin
    .from('students')
    .select('id, class_id, student_classes(classes:class_id(id))')
    .in('id', Array.from(allStudentIds))
    
  if (studentError) {
    console.error("Student error:", studentError)
    return
  }
  
  const studentToClassMap = new Map<string, string[]>()
  if (studentClassData) {
    studentClassData.forEach(s => {
      const classIds = (s.student_classes || [])
        .map((sc: any) => sc.classes?.id)
        .filter(Boolean)
      if (s.class_id && !classIds.includes(s.class_id)) classIds.push(s.class_id)
      studentToClassMap.set(s.id, classIds)
    })
  }

  // Find a kelompok_id to test
  const testKelompokId = classesData?.[0]?.kelompok_id
  console.log("Testing with Kelompok ID:", testKelompokId, classesData?.[0]?.name)

  const relevantStudentIds = meeting.student_snapshot.filter((studentId: string) => {
    const studentClassIds = studentToClassMap.get(studentId) || []
    
    return studentClassIds.some((classId: string) => {
      const classData = allClassesMap.get(classId)
      if (testKelompokId && classData?.kelompok_id === testKelompokId) return true
      return false
    })
  })
  
  console.log("Filtered students count:", relevantStudentIds.length)
}

testLogic()
