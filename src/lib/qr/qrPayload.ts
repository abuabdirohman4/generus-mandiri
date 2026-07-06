const QR_PREFIX = 'GM-STUDENT:'

export function buildStudentQrPayload(studentId: string): string {
  return `${QR_PREFIX}${studentId}`
}

export function parseStudentQrPayload(raw: string): { studentId: string } | null {
  if (!raw.startsWith(QR_PREFIX)) return null
  const studentId = raw.slice(QR_PREFIX.length)
  if (!studentId) return null
  return { studentId }
}
