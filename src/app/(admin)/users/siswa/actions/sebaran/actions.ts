'use server'

import { createAdminClient, createClient, createAuthClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import {
  fetchKelasWithStudentCount,
  fetchKelasByIds,
  fetchKelompokWithKelas,
  fetchDesaWithKelompok,
  fetchDaerahWithDesa,
  fetchKelompokByIds,
} from './queries'
import { getTopLevelForProfile, computeStats, sortSebaranData } from './logic'
import type { SebaranSiswaData, SebaranSiswaStats } from './types'
import type { UserProfile } from '@/types/user'

/**
 * getCurrentUserProfile dari accessControlServer tidak mengambil teacher_classes.
 * Fungsi ini fetch ulang dengan join teacher_classes agar profile.classes terisi.
 */
async function getProfileWithClasses(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await (await createAuthClient()).auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id, full_name, role, email, daerah_id, desa_id, kelompok_id, permissions,
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

function filterSebaranData(data: SebaranSiswaData, allowedIds: Set<string>): SebaranSiswaData {
  if (data.level === 'kelas') {
    const filtered = data.data.filter((k) => allowedIds.has(k.id))
    return { level: 'kelas', data: filtered }
  }

  if (data.level === 'kelompok') {
    const filtered = data.data
      .map((klp) => {
        const filteredKelas = klp.kelas.filter((k) => allowedIds.has(k.id))
        const total_students = filteredKelas.reduce((sum, k) => sum + k.total_students, 0)
        return { ...klp, kelas: filteredKelas, total_students }
      })
      .filter((klp) => klp.kelas.length > 0)
    return { level: 'kelompok', data: filtered }
  }

  if (data.level === 'desa') {
    const filtered = data.data
      .map((d) => {
        const filteredKelompok = d.kelompok
          .map((klp) => {
            const filteredKelas = klp.kelas.filter((k) => allowedIds.has(k.id))
            const total_students = filteredKelas.reduce((sum, k) => sum + k.total_students, 0)
            return { ...klp, kelas: filteredKelas, total_students }
          })
          .filter((klp) => klp.kelas.length > 0)

        const total_students = filteredKelompok.reduce((sum, k) => sum + k.total_students, 0)
        return { ...d, kelompok: filteredKelompok, total_students }
      })
      .filter((d) => d.kelompok.length > 0)
    return { level: 'desa', data: filtered }
  }

  if (data.level === 'daerah') {
    const filtered = data.data
      .map((da) => {
        const filteredDesa = da.desa
          .map((d) => {
            const filteredKelompok = d.kelompok
              .map((klp) => {
                const filteredKelas = klp.kelas.filter((k) => allowedIds.has(k.id))
                const total_students = filteredKelas.reduce((sum, k) => sum + k.total_students, 0)
                return { ...klp, kelas: filteredKelas, total_students }
              })
              .filter((klp) => klp.kelas.length > 0)

            const total_students = filteredKelompok.reduce((sum, k) => sum + k.total_students, 0)
            return { ...d, kelompok: filteredKelompok, total_students }
          })
          .filter((d) => d.kelompok.length > 0)

        const total_students = filteredDesa.reduce((sum, d) => sum + d.total_students, 0)
        return { ...da, desa: filteredDesa, total_students }
      })
      .filter((da) => da.desa.length > 0)
    return { level: 'daerah', data: filtered }
  }

  return data
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

    // Apply teacher class restrictions filter
    if (profile.role === 'teacher') {
      const { getTeacherAllowedClassIds } = await import('@/lib/accessControlServer')
      const allowedClassIds = await getTeacherAllowedClassIds(profile.id, profile)
      if (allowedClassIds instanceof Set && allowedClassIds.size > 0) {
        data = filterSebaranData(data, allowedClassIds)
      }
    }

    data = sortSebaranData(data)
    const stats = computeStats(data)
    return { data, stats }
  } catch (err) {
    console.error('[getSebaranSiswa]', err)
    return { error: 'Gagal memuat data sebaran siswa' }
  }
}
