import { describe, it, expect } from 'vitest'
import { canOnboard } from './logic'
import type { UserProfile } from '@/types/user'

function makeProfile(overrides: Partial<UserProfile>): UserProfile {
  return {
    id: 'test-id',
    role: 'teacher',
    full_name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    daerah_id: null,
    desa_id: null,
    kelompok_id: null,
    permissions: null,
    classes: null,
    ...overrides,
  } as UserProfile
}

describe('canOnboard', () => {
  it('returns true for superadmin', () => {
    const profile = makeProfile({ role: 'superadmin' })
    expect(canOnboard(profile)).toBe(true)
  })

  it('returns true for admin daerah (role=admin, daerah_id set, desa_id null)', () => {
    const profile = makeProfile({ role: 'admin', daerah_id: 'daerah-1', desa_id: null, kelompok_id: null })
    expect(canOnboard(profile)).toBe(true)
  })

  it('returns false for admin desa (role=admin, desa_id set)', () => {
    const profile = makeProfile({ role: 'admin', daerah_id: 'daerah-1', desa_id: 'desa-1', kelompok_id: null })
    expect(canOnboard(profile)).toBe(false)
  })

  it('returns false for admin kelompok (role=admin, kelompok_id set)', () => {
    const profile = makeProfile({ role: 'admin', daerah_id: 'daerah-1', desa_id: 'desa-1', kelompok_id: 'kelompok-1' })
    expect(canOnboard(profile)).toBe(false)
  })

  it('returns false for teacher', () => {
    const profile = makeProfile({ role: 'teacher', daerah_id: 'daerah-1', kelompok_id: 'kelompok-1' })
    expect(canOnboard(profile)).toBe(false)
  })

  it('returns false for null profile', () => {
    expect(canOnboard(null)).toBe(false)
  })

  it('returns false for undefined profile', () => {
    expect(canOnboard(undefined)).toBe(false)
  })
})
