'use server'

import { createClient, createAdminClient, createAdminAuthClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { handleApiError } from '@/lib/errorUtils'
import { canOnboard } from './logic'

interface CreatedKelompok {
  id: string
  name: string
}

interface CreatedDesa {
  id: string
  name: string
  kelompoks: CreatedKelompok[]
}

export interface BatchTeacherDef {
  id: string // Client generated temp ID for UI tracking
  full_name: string
  username: string
  roleType: 'pj_utama' | 'pj_generus'
  scopeType: 'daerah' | 'desa' | 'kelompok'
  daerah_id: string
  desa_id: string | null
  kelompok_id: string | null
}

export interface BatchTeacherPayload {
  teachers: BatchTeacherDef[]
}

export async function onboardBatchCreateTeachers(payload: BatchTeacherPayload) {
  try {
    const profile = await getCurrentUserProfile()
    if (!canOnboard(profile)) {
      throw new Error('Anda tidak memiliki akses')
    }

    const { teachers } = payload
    const adminClient = await createAdminClient()
    const supabase = await createClient()

    const createdTeachers = []
    const failedTeachers = []

    // Fetch default activity types
    const { data: defaultTypes } = await supabase
      .from('activity_types')
      .select('id')
      .in('code', ['PENGAJIAN', 'ASAD'])
      .eq('is_active', true)

    // Ensure we know what sort orders represent Paud - Orang Tua, and Paud - Pra Nikah 4
    // Paud - Pra Nikah 4: 1 to 20
    // Orang Tua: 21, 22
    // Lansia: 23 (but user requested to ignore)
    // PJ Utama -> 1 to 22
    // PJ Generus -> 1 to 20

    for (const tDef of teachers) {
      const email = `${tDef.username}@generus.com`
      const password = 'ngaji354'

      // 1. Create auth user
      const { data: authData, error: authError } = await (await createAdminAuthClient()).auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: tDef.username, full_name: tDef.full_name },
      })

      if (authError || !authData.user) {
        failedTeachers.push({ name: tDef.full_name, reason: authError?.message || 'Auth failed' })
        continue
      }

      const userId = authData.user.id

      // 2. Create profile
      const { error: profileError } = await adminClient.from('profiles').insert({
        id: userId,
        username: tDef.username,
        full_name: tDef.full_name,
        role: 'teacher',
        email: email,
        daerah_id: tDef.daerah_id,
        desa_id: tDef.desa_id,
        kelompok_id: tDef.kelompok_id
      })

      if (profileError) {
        await (await createAdminAuthClient()).auth.admin.deleteUser(userId)
        failedTeachers.push({ name: tDef.full_name, reason: profileError.message })
        continue
      }

      // 3. Assign activity types
      if (defaultTypes && defaultTypes.length > 0) {
        await adminClient.from('teacher_activity_types').insert(
          defaultTypes.map((type: any) => ({ teacher_id: userId, activity_type_id: type.id }))
        )
      }

      // 4. Assign classes automatically
      // Find all classes that belong to this teacher's scope (kelompok_id, or desa_id, or daerah_id)
      let classQuery = adminClient.from('classes').select('id, class_master_id, class_masters!inner(sort_order)')
      
      if (tDef.kelompok_id) {
        classQuery = classQuery.eq('kelompok_id', tDef.kelompok_id)
      } else if (tDef.desa_id) {
        // Find classes in kelompoks belonging to this desa
        const { data: kelompoks } = await adminClient.from('kelompok').select('id').eq('desa_id', tDef.desa_id)
        if (kelompoks && kelompoks.length > 0) {
          classQuery = classQuery.in('kelompok_id', kelompoks.map(k => k.id))
        } else {
          classQuery = classQuery.eq('kelompok_id', 'none') // Empty
        }
      } else {
        // Daerah level: all classes in all kelompoks under all desas in this daerah
        const { data: kelompoks } = await adminClient.from('kelompok').select('id, desa!inner(daerah_id)').eq('desa.daerah_id', tDef.daerah_id)
        if (kelompoks && kelompoks.length > 0) {
          classQuery = classQuery.in('kelompok_id', kelompoks.map(k => k.id))
        } else {
          classQuery = classQuery.eq('kelompok_id', 'none')
        }
      }

      const { data: availableClasses } = await classQuery

      if (availableClasses && availableClasses.length > 0) {
        const allowedSortOrders = tDef.roleType === 'pj_generus' 
          ? new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]) // Paud to Pra Nikah 4
          : new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) // Paud to Orang Tua

        const classIdsToAssign = availableClasses
          .filter(c => c.class_masters && allowedSortOrders.has((c.class_masters as any).sort_order))
          .map(c => c.id)

        if (classIdsToAssign.length > 0) {
          await adminClient.from('teacher_classes').insert(
            classIdsToAssign.map(classId => ({ teacher_id: userId, class_id: classId }))
          )
        }
      }

      createdTeachers.push({
        id: userId,
        username: tDef.username,
        full_name: tDef.full_name,
        role: tDef.roleType,
        scope: tDef.scopeType,
        daerah_id: tDef.daerah_id,
        desa_id: tDef.desa_id,
        kelompok_id: tDef.kelompok_id
      })
    }

    return {
      success: true,
      teachers: createdTeachers,
      failed: failedTeachers
    }
  } catch (error) {
    const info = handleApiError(error, 'menyimpan data', 'Gagal membuat guru otomatis')
    return { success: false, message: info.message }
  }
}
