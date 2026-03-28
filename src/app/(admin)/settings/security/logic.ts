export interface PasswordChangeInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function validatePasswordChangeInput(input: PasswordChangeInput): void {
  if (!input.currentPassword?.trim())
    throw new Error('Password saat ini harus diisi')
  if (!input.newPassword || input.newPassword.length < 8)
    throw new Error('Password baru minimal 8 karakter')
  if (input.newPassword !== input.confirmPassword)
    throw new Error('Konfirmasi password tidak cocok')
  if (input.newPassword === input.currentPassword)
    throw new Error('Password baru tidak boleh sama dengan password saat ini')
}
