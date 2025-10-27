export const MEETING_TYPES = {
  PEMBINAAN: { code: 'PEMBINAAN', label: 'Pembinaan' },
  SAMBUNG_KELOMPOK: { code: 'SAMBUNG_KELOMPOK', label: 'Sambung Kelompok' },
  SAMBUNG_DESA: { code: 'SAMBUNG_DESA', label: 'Sambung Desa' },
  SAMBUNG_DAERAH: { code: 'SAMBUNG_DAERAH', label: 'Sambung Daerah' },
  SAMBUNG_PUSAT: { code: 'SAMBUNG_PUSAT', label: 'Sambung Pusat' }
} as const

export type MeetingTypes = typeof MEETING_TYPES[keyof typeof MEETING_TYPES]

export function getAvailableMeetingTypes(categories: Array<{is_sambung_capable: boolean}>): Partial<typeof MEETING_TYPES> {
  const hasSambungCapable = categories.some(c => c.is_sambung_capable)
  if (hasSambungCapable) {
    return MEETING_TYPES // All types available
  }
  return { PEMBINAAN: MEETING_TYPES.PEMBINAAN } // Only Pembinaan
}

export function getMeetingTypeLabel(code: string): string {
  return Object.values(MEETING_TYPES).find(type => type.code === code)?.label || code
}
