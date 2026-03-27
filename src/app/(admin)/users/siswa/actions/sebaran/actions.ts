'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import {
  fetchKelasWithStudentCount,
  fetchKelasByIds,
  fetchKelompokWithKelas,
  fetchDesaWithKelompok,
  fetchDaerahWithDesa,
  fetchKelompokByIds,
} from './queries'
import { getTopLevelForProfile, computeStats } from './logic'
import type { SebaranSiswaData, SebaranSiswaStats } from './types'
import type { UserProfile } from '@/types/user'

/**
 * getCurrentUserProfile dari accessControlServer tidak mengambil teacher_classes.
 * Fungsi ini fetch ulang dengan join teacher_classes agar profile.classes terisi.
 */
async function getProfileWithClasses(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id, full_name, role, email, daerah_id, desa_id, kelompok_id, can_manage_materials,
      teacher_classes!teacher_classes_teacher_id_fkey(
        class_id,
        class_detail:class_id(id, name, kelompok_id)
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const classes = (profile.teacher_classes || [])
    .map((tc: any) => tc.class_detail)
    .filter(Boolean)

  return { ...profile, classes } as UserProfile
}

export async function getSebaranSiswa(): Promise<{
  data?: SebaranSiswaData
  stats?: SebaranSiswaStats
  error?: string
}> {
  const profile = await getProfileWithClasses()
  if (!profile) return { error: 'Tidak terautentikasi' }

  const supabase = await createAdminClient()
  const topLevel = getTopLevelForProfile(profile)

  let data: SebaranSiswaData

  try {
    if (topLevel === 'daerah') {
      const result = await fetchDaerahWithDesa(supabase)
      data = { level: 'daerah', data: result }
    } else if (topLevel === 'desa') {
      const daerahId = profile.daerah_id!
      const result = await fetchDesaWithKelompok(supabase, daerahId)
      data = { level: 'desa', data: result }
    } else if (topLevel === 'kelompok') {
      if (profile.desa_id && !profile.kelompok_id) {
        // Admin/Guru Desa: semua kelas di tiap kelompok
        const result = await fetchKelompokWithKelas(supabase, profile.desa_id)
        data = { level: 'kelompok', data: result }
      } else {
        // Guru multi-kelompok: hanya kelas yang mereka ajar per kelompok
        const classes = profile.classes || []
        const kelompokIds = [...new Set(classes.map((c) => c.kelompok_id).filter(Boolean))] as string[]

        // Bangun map: kelompok_id → class IDs yang diizinkan
        const allowedClassIdsByKelompok = new Map<string, string[]>()
        classes.forEach((c) => {
          if (!c.kelompok_id) return
          const existing = allowedClassIdsByKelompok.get(c.kelompok_id) || []
          allowedClassIdsByKelompok.set(c.kelompok_id, [...existing, c.id])
        })

        const result = await fetchKelompokByIds(supabase, kelompokIds, allowedClassIdsByKelompok)
        data = { level: 'kelompok', data: result }
      }
    } else {
      // Single kelompok: guru kelompok hanya lihat kelas yang mereka ajar
      const classIds = (profile.classes || []).map((c) => c.id).filter(Boolean)
      if (classIds.length > 0) {
        const result = await fetchKelasByIds(supabase, classIds)
        data = { level: 'kelas', data: result }
      } else {
        // Admin kelompok: tampil semua kelas di kelompok
        const result = await fetchKelasWithStudentCount(supabase, profile.kelompok_id!)
        data = { level: 'kelas', data: result }
      }
    }

    const stats = computeStats(data)
    return { data, stats }
  } catch (err) {
    console.error('[getSebaranSiswa]', err)
    return { error: 'Gagal memuat data sebaran siswa' }
  }
}
