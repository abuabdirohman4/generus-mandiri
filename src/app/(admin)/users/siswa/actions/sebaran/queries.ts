import type { SupabaseClient } from '@supabase/supabase-js'
import type { KelasNode, KelompokNode, DesaNode, DaerahNode } from './types'
import { fetchClassMasterMappings } from '../classes/queries'

export async function fetchKelasWithStudentCount(
  supabase: SupabaseClient,
  kelompokId: string
): Promise<KelasNode[]> {
  const { data: kelasData, error: kelasError } = await supabase
    .from('classes')
    .select('id, name, kelompok_id')
    .eq('kelompok_id', kelompokId)

  if (kelasError || !kelasData || kelasData.length === 0) return []

  const kelasIds = kelasData.map((k: any) => k.id)

  // Fetch sort_order via two-query pattern (nested join silently fails for sort_order)
  const classMappings = await fetchClassMasterMappings(supabase, kelasIds)

  const { data: scData } = await supabase
    .from('student_classes')
    .select('class_id, students!inner(id, status, deleted_at)')
    .in('class_id', kelasIds)
    .eq('students.status', 'active')
    .is('students.deleted_at', null)

  const countMap: Record<string, number> = {}
  kelasIds.forEach((id: string) => (countMap[id] = 0))
  ;(scData || []).forEach((sc: any) => {
    if (sc.class_id) countMap[sc.class_id] = (countMap[sc.class_id] || 0) + 1
  })

  const result = kelasData.map((k: any) => {
    const mappings = classMappings.get(k.id) || []
    const sortOrder = mappings[0]?.class_master?.sort_order ?? 999
    return {
      id: k.id,
      name: k.name,
      total_students: countMap[k.id] || 0,
      sort_order: sortOrder,
    }
  })

  // Sort by sort_order, fallback to name
  result.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.name.localeCompare(b.name)
  })

  // Remove sort_order from returned data (not part of KelasNode type)
  return result.map(({ sort_order: _, ...rest }) => rest)
}

export async function fetchKelompokWithKelas(
  supabase: SupabaseClient,
  desaId: string
): Promise<KelompokNode[]> {
  const { data: kelompokData, error } = await supabase
    .from('kelompok')
    .select('id, name')
    .eq('desa_id', desaId)

  if (error || !kelompokData || kelompokData.length === 0) return []

  return Promise.all(
    kelompokData.map(async (klp: any) => {
      const kelas = await fetchKelasWithStudentCount(supabase, klp.id)
      const total_students = kelas.reduce((sum, k) => sum + k.total_students, 0)
      return { id: klp.id, name: klp.name, total_students, kelas }
    })
  )
}

export async function fetchDesaWithKelompok(
  supabase: SupabaseClient,
  daerahId: string
): Promise<DesaNode[]> {
  const { data: desaData, error } = await supabase
    .from('desa')
    .select('id, name')
    .eq('daerah_id', daerahId)

  if (error || !desaData || desaData.length === 0) return []

  return Promise.all(
    desaData.map(async (d: any) => {
      const kelompok = await fetchKelompokWithKelas(supabase, d.id)
      const total_students = kelompok.reduce((sum, k) => sum + k.total_students, 0)
      return { id: d.id, name: d.name, total_students, kelompok }
    })
  )
}

export async function fetchDaerahWithDesa(
  supabase: SupabaseClient
): Promise<DaerahNode[]> {
  const { data: daerahData, error } = await supabase
    .from('daerah')
    .select('id, name')

  if (error || !daerahData || daerahData.length === 0) return []

  return Promise.all(
    daerahData.map(async (d: any) => {
      const desa = await fetchDesaWithKelompok(supabase, d.id)
      const total_students = desa.reduce((sum, ds) => sum + ds.total_students, 0)
      return { id: d.id, name: d.name, total_students, desa }
    })
  )
}

/**
 * Fetch kelas + jumlah siswa aktif untuk list class IDs tertentu (bukan semua kelas di kelompok).
 * Digunakan untuk guru kelompok yang hanya mengajar kelas tertentu.
 */
export async function fetchKelasByIds(
  supabase: SupabaseClient,
  classIds: string[]
): Promise<KelasNode[]> {
  if (classIds.length === 0) return []

  const { data: kelasData, error: kelasError } = await supabase
    .from('classes')
    .select('id, name, kelompok_id')
    .in('id', classIds)

  if (kelasError || !kelasData || kelasData.length === 0) return []

  const kelasIds = kelasData.map((k: any) => k.id)

  const classMappings = await fetchClassMasterMappings(supabase, kelasIds)

  const { data: scData } = await supabase
    .from('student_classes')
    .select('class_id, students!inner(id, status, deleted_at)')
    .in('class_id', kelasIds)
    .eq('students.status', 'active')
    .is('students.deleted_at', null)

  const countMap: Record<string, number> = {}
  kelasIds.forEach((id: string) => (countMap[id] = 0))
  ;(scData || []).forEach((sc: any) => {
    if (sc.class_id) countMap[sc.class_id] = (countMap[sc.class_id] || 0) + 1
  })

  const result = kelasData.map((k: any) => {
    const mappings = classMappings.get(k.id) || []
    const sortOrder = mappings[0]?.class_master?.sort_order ?? 999
    return {
      id: k.id,
      name: k.name,
      total_students: countMap[k.id] || 0,
      sort_order: sortOrder,
    }
  })

  result.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.name.localeCompare(b.name)
  })

  return result.map(({ sort_order: _, ...rest }) => rest)
}

export async function fetchKelompokByIds(
  supabase: SupabaseClient,
  kelompokIds: string[],
  // Optional: filter kelas per kelompok — key = kelompok_id, value = class IDs yang diizinkan
  allowedClassIdsByKelompok?: Map<string, string[]>
): Promise<KelompokNode[]> {
  const unique = [...new Set(kelompokIds.filter(Boolean))]
  if (unique.length === 0) return []

  const { data: kelompokData, error } = await supabase
    .from('kelompok')
    .select('id, name')
    .in('id', unique)

  if (error || !kelompokData) return []

  return Promise.all(
    kelompokData.map(async (klp: any) => {
      const allowedIds = allowedClassIdsByKelompok?.get(klp.id)
      const kelas = allowedIds
        ? await fetchKelasByIds(supabase, allowedIds)
        : await fetchKelasWithStudentCount(supabase, klp.id)
      const total_students = kelas.reduce((sum, k) => sum + k.total_students, 0)
      return { id: klp.id, name: klp.name, total_students, kelas }
    })
  )
}
