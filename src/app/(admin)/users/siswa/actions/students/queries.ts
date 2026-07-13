/**
 * Student Queries (Layer 1)
 *
 * Database queries for student operations.
 * NO 'use server' directive - pure query builders.
 * All functions accept supabase client as parameter for testability.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const STUDENT_SELECT = `
  id,
  name,
  gender,
  class_id,
  kelompok_id,
  desa_id,
  daerah_id,
  status,
  created_at,
  updated_at,
  student_classes(
    classes:class_id(id, name)
  ),
  daerah:daerah_id(name),
  desa:desa_id(name),
  kelompok:kelompok_id(name)
`

const NARROW_SELECT = `
  id,
  name,
  gender,
  class_id,
  kelompok_id,
  desa_id,
  daerah_id,
  status,
  created_at,
  updated_at,
  deleted_at,
  daerah:daerah_id(name),
  desa:desa_id(name),
  kelompok:kelompok_id(name)
`

export async function fetchAllStudents(
  supabase: SupabaseClient,
  classId?: string
) {
  let query = supabase
    .from('students')
    .select(STUDENT_SELECT)
    .is('deleted_at', null)
    .order('name')

  if (classId) {
    const classIds = classId.split(',')
    const { data: studentClassData } = await supabase
      .from('student_classes')
      .select('student_id')
      .in('class_id', classIds)

    if (studentClassData && studentClassData.length > 0) {
      const studentIds = studentClassData.map(sc => sc.student_id)
      query = query.in('id', studentIds)
    } else {
      return { data: [], error: null }
    }
  }

  // Fetch in batches to bypass Supabase/PostgREST default 1000 row limit
  let allStudents: any[] = []
  let page = 0
  const PAGE_SIZE = 1000
  let hasMore = true
  let lastError: any = null

  while (hasMore) {
    const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      lastError = error
      hasMore = false
      break
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      allStudents = [...allStudents, ...data]
      hasMore = data.length === PAGE_SIZE
      page++
    }
  }

  return { data: allStudents, error: lastError }
}

export interface FetchStudentsParams {
  page: number
  pageSize: number
  search?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  filters?: {
    daerah?: string[]
    desa?: string[]
    kelompok?: string[]
    kelas?: string[]
    gender?: string
    status?: string
  }
  teacherClassIds?: string[]
}

// Kolom students yang aman untuk sort DB langsung (bukan nested relation).
// Nested org names (kelompok/desa/daerah) TIDAK bisa .order() reliable di PostgREST → fallback ke name.
const SORTABLE_COLUMNS = new Set(['name', 'gender', 'created_at'])

function resolveOrder(sortColumn?: string, sortDirection?: 'asc' | 'desc') {
  const col = sortColumn && SORTABLE_COLUMNS.has(sortColumn) ? sortColumn : 'name'
  const ascending = sortDirection !== 'desc'
  return { col, ascending }
}

export async function fetchStudentsPaginated(
  supabase: SupabaseClient,
  params: FetchStudentsParams
) {
  const { page, pageSize, search, sortColumn, sortDirection, filters, teacherClassIds } = params
  const { col: orderCol, ascending: orderAsc } = resolveOrder(sortColumn, sortDirection)

  // Helper to apply common filters
  const applyFilters = (q: any) => {
    q = q.is('deleted_at', null)
    if (search) q = q.ilike('name', `%${search}%`)
    const status = filters?.status || 'active'
    if (status !== 'all') {
      if (status === 'active') {
        q = q.or('status.eq.active,status.is.null')
      } else {
        q = q.eq('status', status)
      }
    }
    if (filters?.gender) q = q.eq('gender', filters.gender)
    if (filters?.daerah && filters?.daerah.length > 0) q = q.in('daerah_id', filters.daerah)
    if (filters?.desa && filters?.desa.length > 0) q = q.in('desa_id', filters.desa)
    if (filters?.kelompok && filters?.kelompok.length > 0) q = q.in('kelompok_id', filters.kelompok)
    return q
  }

  let targetClassIds: string[] = []
  
  if (teacherClassIds && teacherClassIds.length > 0) {
    if (filters?.kelas && filters.kelas.length > 0) {
      targetClassIds = filters.kelas.filter(c => teacherClassIds.includes(c))
      if (targetClassIds.length === 0) {
        return { data: [], count: 0, error: null }
      }
    } else {
      targetClassIds = teacherClassIds
    }
  } else if (filters?.kelas && filters.kelas.length > 0) {
    targetClassIds = filters.kelas
  }

  if (targetClassIds.length > 0) {
    const { data: scData } = await supabase
      .from('student_classes')
      .select('student_id')
      .in('class_id', targetClassIds)
      
    const junctionStudentIds = (scData || []).map(sc => sc.student_id)
    
    const { data: pcData } = await supabase
      .from('students')
      .select('id')
      .in('class_id', targetClassIds)
      
    const primaryStudentIds = (pcData || []).map(s => s.id)
    
    const allStudentIds = [...new Set([...junctionStudentIds, ...primaryStudentIds])]
    
    if (allStudentIds.length === 0) {
      return { data: [], count: 0, error: null }
    }
    
    if (allStudentIds.length <= 100) {
      let q = supabase.from('students').select(NARROW_SELECT, { count: 'exact' })
      q = applyFilters(q)
      q = q.in('id', allStudentIds)
      
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      q = q.range(from, to).order(orderCol, { ascending: orderAsc })
      
      const { data, count, error } = await q
      return { data, count: count || 0, error }
    } else {
      // Chunking for >100 ids to avoid PostgREST URL overflow and minimize egress
      const chunks = []
      for (let i = 0; i < allStudentIds.length; i += 100) {
        chunks.push(allStudentIds.slice(i, i + 100))
      }
      
      let allMergedRows: { id: string, name: string }[] = []
      
      for (const chunk of chunks) {
        let chunkQuery = supabase.from('students').select('id, name')
        chunkQuery = applyFilters(chunkQuery)
        chunkQuery = chunkQuery.in('id', chunk)
        
        const { data, error } = await chunkQuery
        if (error) return { data: null, count: 0, error }
        if (data) allMergedRows.push(...data)
      }
      
      const totalCount = allMergedRows.length
      
      // Sort in memory (name/gender text) — chunk path only supports name/gender fallback
      allMergedRows.sort((a, b) => {
        const cmp = (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' })
        return orderAsc ? cmp : -cmp
      })
      
      // Paginate in memory
      const from = (page - 1) * pageSize
      const paginatedIds = allMergedRows.slice(from, from + pageSize).map(r => r.id)
      
      if (paginatedIds.length === 0) {
        return { data: [], count: totalCount, error: null }
      }
      
      // Fetch full rows for just the paginated IDs
      const { data: finalData, error: finalError } = await supabase
        .from('students')
        .select(NARROW_SELECT)
        .in('id', paginatedIds)
        .order(orderCol, { ascending: orderAsc })
        
      return { data: finalData, count: totalCount, error: finalError }
    }
  } else {
    // Normal query without in('id')
    let q = supabase.from('students').select(NARROW_SELECT, { count: 'exact' })
    q = applyFilters(q)
    
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    q = q.range(from, to).order(orderCol, { ascending: orderAsc })
    
    const { data, count, error } = await q
    return { data, count: count || 0, error }
  }
}

export async function fetchStudentsByIds(
  supabase: SupabaseClient,
  studentIds: string[]
) {
  return await supabase
    .from('students')
    .select(STUDENT_SELECT)
    .is('deleted_at', null)
    .in('id', studentIds)
    .order('name')
}

export async function insertStudent(
  supabase: SupabaseClient,
  data: {
    name: string
    gender: string
    class_id: string
    kelompok_id: string | null
    desa_id: string | null
    daerah_id: string | null
  }
) {
  return await supabase
    .from('students')
    .insert(data)
    .select()
    .single()
}

export async function insertStudentClass(
  supabase: SupabaseClient,
  studentId: string,
  classId: string
) {
  return await supabase
    .from('student_classes')
    .insert({
      student_id: studentId,
      class_id: classId
    })
    .select()
}

export async function updateStudentRecord(
  supabase: SupabaseClient,
  studentId: string,
  data: {
    name: string
    gender: string
    class_id: string
    kelompok_id?: string | null
    desa_id?: string | null
    daerah_id?: string | null
    updated_at: string
  }
) {
  return await supabase
    .from('students')
    .update(data)
    .eq('id', studentId)
    .select(`
      id,
      name,
      gender,
      class_id,
      created_at,
      updated_at
    `)
    .single()
}

export async function fetchCurrentStudentClasses(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('student_classes')
    .select('class_id')
    .eq('student_id', studentId)
}

export async function deleteStudentClasses(
  supabase: SupabaseClient,
  studentId: string,
  classIds: string[]
) {
  return await supabase
    .from('student_classes')
    .delete()
    .eq('student_id', studentId)
    .in('class_id', classIds)
}

export async function insertStudentClasses(
  supabase: SupabaseClient,
  studentId: string,
  classIds: string[]
) {
  const assignments = classIds.map(classId => ({
    student_id: studentId,
    class_id: classId
  }))

  return await supabase
    .from('student_classes')
    .insert(assignments)
}

export async function softDeleteStudent(
  supabase: SupabaseClient,
  studentId: string,
  userId: string
) {
  return await supabase
    .from('students')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    })
    .eq('id', studentId)
}

export async function hardDeleteStudent(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .delete()
    .eq('id', studentId)
}

export async function deleteStudentClassesByStudentId(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('student_classes')
    .delete()
    .eq('student_id', studentId)
}

export async function fetchStudentById(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .select(`
      id,
      name,
      gender,
      class_id,
      student_classes(
        classes:class_id(id, name)
      )
    `)
    .is('deleted_at', null)
    .eq('id', studentId)
    .single()
}

export async function fetchStudentBiodata(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .select(`
      id,
      name,
      nomor_induk,
      gender,
      tempat_lahir,
      tanggal_lahir,
      anak_ke,
      alamat,
      nomor_telepon,
      nama_ayah,
      nama_ibu,
      alamat_orangtua,
      telepon_orangtua,
      pekerjaan_ayah,
      pekerjaan_ibu,
      nama_wali,
      alamat_wali,
      pekerjaan_wali,
      kelompok_id,
      kelompok:kelompok_id(id, name),
      desa_id,
      desa:desa_id(id, name),
      daerah_id,
      daerah:daerah_id(id, name),
      created_at,
      updated_at
    `)
    .eq('id', studentId)
    .is('deleted_at', null)
    .single()
}

export async function updateStudentBiodata(
  supabase: SupabaseClient,
  studentId: string,
  biodata: any
) {
  return await supabase
    .from('students')
    .update(biodata)
    .eq('id', studentId)
}

export async function fetchStudentAttendanceHistory(
  supabase: SupabaseClient,
  studentId: string,
  startDate: string,
  endDate: string
) {
  return await supabase
    .from('attendance_logs')
    .select(`
      id,
      date,
      status,
      reason,
      meeting_id,
      meetings!inner(
        id,
        title,
        activity_type_id,
        activity_type:activity_types(id, code, name),
        class_id,
        class_ids,
        classes (
          id,
          name
        )
      )
    `)
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
}

export async function fetchMeetingDetail(
  supabase: SupabaseClient,
  meetingId: string
) {
  return await supabase
    .from('meetings')
    .select(`
      id,
      title,
      topic,
      description,
      activity_type_id,
      activity_type:activity_types(id, code, name),
      class_id,
      class_ids,
      classes (
        id,
        name
      )
    `)
    .eq('id', meetingId)
    .single()
}

export async function checkStudentHasAttendance(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('attendance_logs')
    .select('id')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle()
}

export async function fetchClassNames(
  supabase: SupabaseClient,
  classIds: string[]
) {
  return await supabase
    .from('classes')
    .select('id, name')
    .in('id', classIds)
}

export async function insertStudentsBatch(
  supabase: SupabaseClient,
  students: Array<{
    name: string
    gender: string
    class_id?: string
    kelompok_id: string | null
    desa_id: string | null
    daerah_id: string | null
  }>
) {
  return await supabase
    .from('students')
    .insert(students)
    .select()
}

export async function insertStudentClassesBatch(
  supabase: SupabaseClient,
  assignments: Array<{
    student_id: string
    class_id: string
  }>
) {
  return await supabase
    .from('student_classes')
    .insert(assignments)
}
