import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock calls BEFORE all imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../logic', () => ({
  validatePasswordChangeInput: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validatePasswordChangeInput } from '../logic'
import { changePassword } from '../actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSupabase(overrides: {
  user?: any
  signInError?: any
  updateUserError?: any
} = {}) {
  const {
    user = { id: 'user-1', email: 'user@example.com' },
    signInError = null,
    updateUserError = null,
  } = overrides

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: signInError }),
      updateUser: vi.fn().mockResolvedValue({ error: updateUserError }),
    },
  } as any
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('memanggil validatePasswordChangeInput dengan ketiga input', async () => {
    const supabase = makeSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase)

    await changePassword('oldpass123', 'newpass456', 'newpass456')

    expect(validatePasswordChangeInput).toHaveBeenCalledWith({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    })
  })

  it('return error jika user tidak authenticated', async () => {
    const supabase = makeSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(supabase)

    const result = await changePassword('oldpass123', 'newpass456', 'newpass456')

    expect(result).toEqual({ error: 'Sesi tidak ditemukan. Silakan login kembali.' })
  })

  it('return error jika user tidak memiliki email', async () => {
    const supabase = makeSupabase({ user: { id: 'user-1', email: null } })
    vi.mocked(createClient).mockResolvedValue(supabase)

    const result = await changePassword('oldpass123', 'newpass456', 'newpass456')

    expect(result).toEqual({ error: 'Sesi tidak ditemukan. Silakan login kembali.' })
  })

  it('memanggil signInWithPassword dengan email user dan currentPassword', async () => {
    const supabase = makeSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase)

    await changePassword('oldpass123', 'newpass456', 'newpass456')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'oldpass123',
    })
  })

  it('return error jika signInWithPassword gagal (password lama salah)', async () => {
    const supabase = makeSupabase({
      signInError: { message: 'Invalid login credentials' },
    })
    vi.mocked(createClient).mockResolvedValue(supabase)

    const result = await changePassword('wrongpass', 'newpass456', 'newpass456')

    expect(result).toEqual({ error: 'Password saat ini salah' })
  })

  it('memanggil auth.updateUser dengan newPassword jika re-auth sukses', async () => {
    const supabase = makeSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase)

    await changePassword('oldpass123', 'newpass456', 'newpass456')

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpass456' })
  })

  it('return { success: true } pada happy path', async () => {
    const supabase = makeSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase)

    const result = await changePassword('oldpass123', 'newpass456', 'newpass456')

    expect(result).toEqual({ success: true })
  })

  it('memanggil revalidatePath pada sukses', async () => {
    const supabase = makeSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase)

    await changePassword('oldpass123', 'newpass456', 'newpass456')

    expect(revalidatePath).toHaveBeenCalledWith('/settings/security')
  })

  it('return error message jika auth.updateUser gagal', async () => {
    const supabase = makeSupabase({
      updateUserError: { message: 'Password terlalu lemah' },
    })
    vi.mocked(createClient).mockResolvedValue(supabase)

    const result = await changePassword('oldpass123', 'newpass456', 'newpass456')

    expect(result).toEqual({ error: 'Password terlalu lemah' })
  })

  it('return error message jika validatePasswordChangeInput throw', async () => {
    vi.mocked(validatePasswordChangeInput).mockImplementationOnce(() => {
      throw new Error('Password baru minimal 8 karakter')
    })
    const supabase = makeSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase)

    const result = await changePassword('oldpass123', 'short', 'short')

    expect(result).toEqual({ error: 'Password baru minimal 8 karakter' })
  })
})
