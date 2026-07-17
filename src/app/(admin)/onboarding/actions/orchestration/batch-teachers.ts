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

      // 4. Assign classes automatically via class_master_mappings (classes has no class_master_id column)
      let kelompokIds: string[] = []
      if (tDef.kelompok_id) {
        kelompokIds = [tDef.kelompok_id]
      } else if (tDef.desa_id) {
        const { data: kels } = await adminClient.from('kelompok').select('id').eq('desa_id', tDef.desa_id)
        kelompokIds = kels?.map(k => k.id) ?? []
      } else {
        const { data: kels } = await adminClient
          .from('kelompok')
          .select('id, desa!inner(daerah_id)')
          .eq('desa.daerah_id', tDef.daerah_id)
        kelompokIds = kels?.map(k => k.id) ?? []
      }

      if (kelompokIds.length > 0) {
        // Query via class_master_mappings then filter by kelompok scope
        const { data: scopeClasses } = await adminClient
          .from('classes')
          .select('id, class_master_mappings!inner(class_masters!inner(sort_order))')
          .in('kelompok_id', kelompokIds)

        if (scopeClasses && scopeClasses.length > 0) {
          const maxSortOrder = tDef.roleType === 'pj_generus' ? 17 : 18 // pj_generus: Paud–Pra Nikah 4, pj_utama: Paud–Orang Tua

          const classIdsToAssign = scopeClasses
            .filter(c => {
              const mappings = (c as any).class_master_mappings
              const mapping = Array.isArray(mappings) ? mappings[0] : mappings
              const sortOrder = mapping?.class_masters?.sort_order
              return sortOrder != null && sortOrder >= 1 && sortOrder <= maxSortOrder
            })
            .map(c => c.id)

          if (classIdsToAssign.length > 0) {
            await adminClient.from('teacher_classes').insert(
              classIdsToAssign.map(classId => ({ teacher_id: userId, class_id: classId }))
            )
          }
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
