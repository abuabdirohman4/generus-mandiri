import { describe, it, expect } from 'vitest'
import { validatePasswordChangeInput } from '../logic'

describe('validatePasswordChangeInput', () => {
  it('tidak throw untuk input valid', () => {
    expect(() =>
      validatePasswordChangeInput({
        currentPassword: 'oldpass123',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      })
    ).not.toThrow()
  })

  it('throw jika currentPassword kosong', () => {
    expect(() =>
      validatePasswordChangeInput({
        currentPassword: '',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      })
    ).toThrow('Password saat ini harus diisi')
  })

  it('throw jika currentPassword hanya spasi', () => {
    expect(() =>
      validatePasswordChangeInput({
        currentPassword: '   ',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      })
    ).toThrow('Password saat ini harus diisi')
  })

  it('throw jika newPassword kurang dari 8 karakter', () => {
    expect(() =>
      validatePasswordChangeInput({
        currentPassword: 'oldpass123',
        newPassword: 'short',
        confirmPassword: 'short',
      })
    ).toThrow('Password baru minimal 8 karakter')
  })

  it('throw jika newPassword tepat 7 karakter (boundary)', () => {
    expect(() =>
      validatePasswordChangeInput({
        currentPassword: 'oldpass123',
        newPassword: '1234567',
        confirmPassword: '1234567',
      })
    ).toThrow('Password baru minimal 8 karakter')
  })

  it('tidak throw jika newPassword tepat 8 karakter', () => {
    expect(() =>
      validatePasswordChangeInput({
        currentPassword: 'oldpass123',
        newPassword: '12345678',
        confirmPassword: '12345678',
      })
    ).not.toThrow()
  })

  it('throw jika confirmPassword tidak cocok dengan newPassword', () => {
    expect(() =>
      validatePasswordChangeInput({
        currentPassword: 'oldpass123',
        newPassword: 'newpass123',
        confirmPassword: 'differentpass',
      })
    ).toThrow('Konfirmasi password tidak cocok')
  })

  it('throw jika newPassword sama dengan currentPassword', () => {
    expect(() =>
      validatePasswordChangeInput({
        currentPassword: 'samepass123',
        newPassword: 'samepass123',
        confirmPassword: 'samepass123',
      })
    ).toThrow('Password baru tidak boleh sama dengan password saat ini')
  })
})
