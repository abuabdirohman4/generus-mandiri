// NO 'use server' directive

export function buildKelompokAccessMappings(
  teacherId: string,
  kelompokIds: string[]
): Array<{ teacher_id: string; kelompok_id: string }> {
  return kelompokIds.map(kelompok_id => ({ teacher_id: teacherId, kelompok_id }))
}

export function validateKelompokAccessInput(
  teacherId: string,
  kelompokIds: string[]
): { valid: boolean; message?: string } {
  if (!teacherId) return { valid: false, message: 'Teacher ID diperlukan' }
  if (!Array.isArray(kelompokIds)) return { valid: false, message: 'kelompokIds harus array' }
  if (kelompokIds.some(id => !id || typeof id !== 'string')) {
    return { valid: false, message: 'ID kelompok tidak valid' }
  }
  return { valid: true }
}
