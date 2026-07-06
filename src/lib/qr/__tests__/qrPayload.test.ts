import { describe, expect, it } from 'vitest'
import { buildStudentQrPayload, parseStudentQrPayload } from '../qrPayload'

describe('buildStudentQrPayload', () => {
  it('builds payload with GM-STUDENT prefix', () => {
    expect(buildStudentQrPayload('abc-123')).toBe('GM-STUDENT:abc-123')
  })
})

describe('parseStudentQrPayload', () => {
  it('parses valid payload back to studentId', () => {
    expect(parseStudentQrPayload('GM-STUDENT:abc-123')).toEqual({ studentId: 'abc-123' })
  })

  it('round-trips build then parse', () => {
    const payload = buildStudentQrPayload('student-uuid-456')
    expect(parseStudentQrPayload(payload)).toEqual({ studentId: 'student-uuid-456' })
  })

  it('rejects payload without app prefix', () => {
    expect(parseStudentQrPayload('some-random-qr-code')).toBeNull()
  })

  it('rejects empty string', () => {
    expect(parseStudentQrPayload('')).toBeNull()
  })

  it('rejects prefix with empty studentId', () => {
    expect(parseStudentQrPayload('GM-STUDENT:')).toBeNull()
  })
})
