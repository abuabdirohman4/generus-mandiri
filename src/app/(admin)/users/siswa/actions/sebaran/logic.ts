import type { UserProfile } from '@/types/user'
import type { SebaranSiswaData, SebaranSiswaStats, KelompokNode, DesaNode, DaerahNode } from './types'

export type TopLevel = 'daerah' | 'desa' | 'kelompok' | 'kelas'

export function getTopLevelForProfile(profile: UserProfile): TopLevel {
  if (profile.role === 'superadmin') return 'daerah'

  if (profile.role === 'admin') {
    if (!profile.desa_id && !profile.kelompok_id && profile.daerah_id) return 'desa'
    if (!profile.kelompok_id && profile.desa_id) return 'kelompok'
    return 'kelas'
  }

  if (profile.role === 'teacher') {
    if (profile.daerah_id && !profile.desa_id && !profile.kelompok_id) return 'desa'
    if (profile.desa_id && !profile.kelompok_id) return 'kelompok'
    if (profile.kelompok_id) {
      const uniqueKelompoks = new Set(
        (profile.classes || []).map((c) => c.kelompok_id).filter(Boolean)
      )
      return uniqueKelompoks.size > 1 ? 'kelompok' : 'kelas'
    }
  }

  return 'kelas'
}

function extractAllKelompok(data: SebaranSiswaData): KelompokNode[] {
  if (data.level === 'kelompok') return data.data
  if (data.level === 'desa') {
    return (data.data as DesaNode[]).flatMap((d) => d.kelompok)
  }
  if (data.level === 'daerah') {
    return (data.data as DaerahNode[]).flatMap((dr) => dr.desa.flatMap((d) => d.kelompok))
  }
  return []
}

export function computeStats(data: SebaranSiswaData): SebaranSiswaStats {
  if (data.level === 'kelas') {
    const total_siswa = data.data.reduce((sum, k) => sum + k.total_students, 0)
    return { total_siswa, kelompok_kosong: 0 }
  }

  const allKelompok = extractAllKelompok(data)
  const kelompok_kosong = allKelompok.filter((k) => k.total_students === 0).length
  const total_siswa = allKelompok.reduce((sum, k) => sum + k.total_students, 0)

  const stats: SebaranSiswaStats = { total_siswa, kelompok_kosong }

  if (data.level === 'kelompok') {
    stats.total_kelompok = data.data.length
  } else if (data.level === 'desa') {
    stats.total_desa = data.data.length
    stats.total_kelompok = allKelompok.length
  } else if (data.level === 'daerah') {
    stats.total_daerah = data.data.length
    stats.total_desa = (data.data as DaerahNode[]).reduce((sum, dr) => sum + dr.desa.length, 0)
    stats.total_kelompok = allKelompok.length
  }

  return stats
}
