import { describe, it, expect } from 'vitest'
import { computeStats, getTopLevelForProfile } from '../logic'
import type { KelompokNode } from '../types'

describe('computeStats', () => {
  it('counts kelompok kosong correctly at kelompok level', () => {
    const kelompok: KelompokNode[] = [
      { id: '1', name: 'Nambo', total_students: 15, kelas: [] },
      { id: '2', name: 'Maji', total_students: 0, kelas: [] },
      { id: '3', name: 'Ciawi', total_students: 8, kelas: [] },
    ]
    const stats = computeStats({ level: 'kelompok', data: kelompok })
    expect(stats.total_siswa).toBe(23)
    expect(stats.kelompok_kosong).toBe(1)
    expect(stats.total_kelompok).toBe(3)
  })

  it('counts kelompok kosong from nested desa level', () => {
    const desa = [
      {
        id: 'd1', name: 'Sukamaju', total_students: 15,
        kelompok: [
          { id: 'k1', name: 'Nambo', total_students: 15, kelas: [] },
          { id: 'k2', name: 'Kosong', total_students: 0, kelas: [] },
        ]
      }
    ]
    const stats = computeStats({ level: 'desa', data: desa })
    expect(stats.kelompok_kosong).toBe(1)
    expect(stats.total_siswa).toBe(15)
    expect(stats.total_desa).toBe(1)
    expect(stats.total_kelompok).toBe(2)
  })

  it('returns 0 kelompok_kosong for kelas level', () => {
    const stats = computeStats({
      level: 'kelas',
      data: [{ id: 'k1', name: 'Pra Nikah', total_students: 5 }]
    })
    expect(stats.kelompok_kosong).toBe(0)
    expect(stats.total_siswa).toBe(5)
  })
})

describe('getTopLevelForProfile', () => {
  it('returns daerah for superadmin', () => {
    expect(getTopLevelForProfile({ role: 'superadmin', id: '1' } as any)).toBe('daerah')
  })

  it('returns desa for admin daerah', () => {
    expect(getTopLevelForProfile({ role: 'admin', daerah_id: 'x', id: '1' } as any)).toBe('desa')
  })

  it('returns kelompok for admin desa', () => {
    expect(getTopLevelForProfile({ role: 'admin', desa_id: 'x', id: '1' } as any)).toBe('kelompok')
  })

  it('returns kelas for admin kelompok', () => {
    expect(getTopLevelForProfile({ role: 'admin', kelompok_id: 'x', id: '1' } as any)).toBe('kelas')
  })

  it('returns desa for guru daerah', () => {
    expect(getTopLevelForProfile({ role: 'teacher', daerah_id: 'x', id: '1' } as any)).toBe('desa')
  })

  it('returns kelompok for guru desa', () => {
    expect(getTopLevelForProfile({ role: 'teacher', desa_id: 'x', id: '1' } as any)).toBe('kelompok')
  })

  it('returns kelompok for multi-kelompok guru', () => {
    const profile = {
      role: 'teacher', kelompok_id: 'x', id: '1',
      classes: [
        { id: 'c1', kelompok_id: 'k1' },
        { id: 'c2', kelompok_id: 'k2' },
      ]
    }
    expect(getTopLevelForProfile(profile as any)).toBe('kelompok')
  })

  it('returns kelas for single-kelompok guru', () => {
    const profile = {
      role: 'teacher', kelompok_id: 'x', id: '1',
      classes: [
        { id: 'c1', kelompok_id: 'k1' },
        { id: 'c2', kelompok_id: 'k1' },
      ]
    }
    expect(getTopLevelForProfile(profile as any)).toBe('kelas')
  })
})
