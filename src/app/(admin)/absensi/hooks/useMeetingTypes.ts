'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { getAvailableMeetingTypesByRole, MEETING_TYPES } from '@/lib/constants/meetingTypes'

interface UserProfile {
  id: string
  role: string
  daerah_id?: string | null
  desa_id?: string | null
  kelompok_id?: string | null
  classes?: Array<{
    id: string
    master_class?: Array<{
      category?: Array<{
        is_sambung_capable: boolean
        exclude_pembinaan: boolean
        code?: string
        name?: string
      }>
    }>
  }>
}

export function useMeetingTypes(userProfile: UserProfile | null) {
  const { data, isLoading, error } = useSWR(
    userProfile ? ['meeting-types', userProfile.role, userProfile.id] : null,
    async () => {
      if (!userProfile) return {}

      // For teachers, need to fetch class categories
      if (userProfile.role === 'teacher') {
        const classIds = userProfile.classes?.map((c: any) => c.id) || []

        // If no classes, it might be a hierarchical teacher (Guru Desa/Daerah) or a teacher with no classes
        if (classIds.length === 0) {
          const isHierarchicalTeacher = userProfile.daerah_id || userProfile.desa_id || userProfile.kelompok_id
          if (isHierarchicalTeacher) {
            return getAvailableMeetingTypesByRole(userProfile)
          }
          return { PEMBINAAN: MEETING_TYPES.PEMBINAAN }
        }

        const supabase = createClient()
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            class_master_mappings (
              class_master:class_master_id (
                category:category_id (
                  is_sambung_capable,
                  exclude_pembinaan,
                  code,
                  name
                )
              )
            )
          `)
          .in('id', classIds)

        if (classesError) {
          console.error('Error fetching classes for meeting types:', classesError)
          // Return default on error
          return { PEMBINAAN: MEETING_TYPES.PEMBINAAN }
        }

        // Handle case where Supabase returns null or empty array
        if (!classesData || classesData.length === 0) {
          return { PEMBINAAN: MEETING_TYPES.PEMBINAAN }
        }

        // Transform the data structure to match expected format
        const transformedClasses = classesData.map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          master_class: Array.isArray(cls.class_master_mappings) && cls.class_master_mappings.length > 0
            ? cls.class_master_mappings.map((mapping: any) => ({
              category: mapping.class_master?.category ? [{
                is_sambung_capable: mapping.class_master.category.is_sambung_capable || false,
                exclude_pembinaan: mapping.class_master.category.exclude_pembinaan || false,
                code: mapping.class_master.category.code,
                name: mapping.class_master.category.name
              }] : []
            }))
            : []
        }))

        const enrichedProfile = {
          ...userProfile,
          classes: transformedClasses
        }

        return getAvailableMeetingTypesByRole(enrichedProfile)
      }

      // For admin roles, no need to fetch additional data
      return getAvailableMeetingTypesByRole(userProfile)
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000 // Cache for 5 minutes
    }
  )

  return {
    availableTypes: data || {},
    isLoading,
    error
  }
}
