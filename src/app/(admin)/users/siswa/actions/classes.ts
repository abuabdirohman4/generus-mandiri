'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'

export interface Class {
  id: string
  name: string
  kelompok_id?: string | null
  kelompok?: {
    id: string
    name: string
  } | null
  class_master_mappings?: Array<{
    class_master: {
      id: string
      sort_order: number
    }
  }>
}

/**
 * Fetch class_master sort_order for a list of class IDs using two-query pattern
 * Returns a Map of class_id → array of { class_master: { id, sort_order } }
 */
async function fetchClassMasterMappings(supabase: any, classIds: string[]): Promise<Map<string, any[]>> {
  const classMappings: Map<string, any[]> = new Map()
  if (classIds.length === 0) return classMappings

  // Step 1: get mappings
  const { data: mappings } = await supabase
    .from('class_master_mappings')
    .select('class_id, class_master_id')
    .in('class_id', classIds)

  if (!mappings || mappings.length === 0) return classMappings

  // Step 2: get class masters with sort_order
  const masterIds = mappings.map((m: any) => m.class_master_id)
  const { data: masters } = await supabase
    .from('class_masters')
    .select('id, sort_order')
    .in('id', masterIds)

  if (!masters) return classMappings

  // Step 3: group by class_id
  mappings.forEach((mapping: any) => {
    const master = masters.find((m: any) => m.id === mapping.class_master_id)
    if (!master) return
    if (!classMappings.has(mapping.class_id)) {
      classMappings.set(mapping.class_id, [])
    }
    classMappings.get(mapping.class_id)?.push({ class_master: master })
  })

  return classMappings
}

/**
 * Sort classes by minimum class_master sort_order
 * Classes with no mappings are sorted to the end
 */
function sortClassesByMasterOrder(classes: any[]): any[] {
  return classes.sort((a, b) => {
    // Get minimum sort_order from mappings
    const getSortOrder = (cls: any): number => {
      if (!cls.class_master_mappings || cls.class_master_mappings.length === 0) {
        return 9999 // Classes without mappings go to end
      }

      const sortOrders = cls.class_master_mappings
        .map((mapping: any) => mapping.class_master?.sort_order)
        .filter((order: any) => typeof order === 'number')

      if (sortOrders.length === 0) return 9999
      return Math.min(...sortOrders)
    }

    const orderA = getSortOrder(a)
    const orderB = getSortOrder(b)

    // Primary sort: by sort_order
    if (orderA !== orderB) {
      return orderA - orderB
    }

    // Secondary sort: by name (fallback for same sort_order)
    return a.name.localeCompare(b.name)
  })
}

/**
 * Mendapatkan daftar kelas berdasarkan role user
 */
export async function getAllClasses(): Promise<Class[]> {
  try {
    const supabase = await createClient()
    
    // Get user profile to determine role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // If user is admin or superadmin, get all classes in their hierarchy
    // If user is teacher, get only their assigned classes
    if (profile.role === 'admin' || profile.role === 'superadmin') {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, kelompok_id, kelompok:kelompok(id, name)')

      if (error) throw error

      const classIds = (classes || []).map(c => c.id)
      const classMappings = await fetchClassMasterMappings(supabase, classIds)

      const transformedClasses = (classes || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        kelompok_id: c.kelompok_id,
        kelompok: Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok,
        class_master_mappings: classMappings.get(c.id) || []
      }))

      return sortClassesByMasterOrder(transformedClasses)
    } else if (profile.role === 'teacher') {
      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          kelompok_id,
          kelompok:kelompok(id, name),
          teacher_classes!inner(teacher_id)
        `)
        .eq('teacher_classes.teacher_id', user.id)

      if (error) throw error

      const classIds = (classes || []).map(c => c.id)
      const classMappings = await fetchClassMasterMappings(supabase, classIds)

      const transformedClasses = (classes || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        kelompok_id: c.kelompok_id,
        kelompok: Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok,
        class_master_mappings: classMappings.get(c.id) || []
      }))

      return sortClassesByMasterOrder(transformedClasses)
    } else {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, kelompok_id, kelompok:kelompok(id, name)')

      if (error) throw error

      const classIds = (classes || []).map(c => c.id)
      const classMappings = await fetchClassMasterMappings(supabase, classIds)

      const transformedClasses = (classes || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        kelompok_id: c.kelompok_id,
        kelompok: Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok,
        class_master_mappings: classMappings.get(c.id) || []
      }))

      return sortClassesByMasterOrder(transformedClasses)
    }
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}
