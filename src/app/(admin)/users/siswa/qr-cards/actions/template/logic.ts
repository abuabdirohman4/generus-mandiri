import type { TemplatePositions } from '@/types/idCardTemplate'

export function validateTemplatePositions(positions: TemplatePositions) {
  const { qr_x_pct, qr_y_pct, qr_size_pct, name_x_pct, name_y_pct, name_font_size, kelompok_x_pct, kelompok_y_pct, kelompok_font_size } = positions

  // Check valid percentages 0-100
  if (
    qr_x_pct < 0 || qr_x_pct > 100 ||
    qr_y_pct < 0 || qr_y_pct > 100 ||
    qr_size_pct < 5 || qr_size_pct > 100 ||
    name_x_pct < 0 || name_x_pct > 100 ||
    name_y_pct < 0 || name_y_pct > 100 ||
    (kelompok_x_pct !== undefined && (kelompok_x_pct < 0 || kelompok_x_pct > 100)) ||
    (kelompok_y_pct !== undefined && (kelompok_y_pct < 0 || kelompok_y_pct > 100))
  ) {
    throw new Error('Position values must be between 0 and 100')
  }

  // NOTE: QR position + size may exceed 100 by design (QR is allowed to extend
  // past the card edge), so no right/bottom boundary check here.

  if (name_font_size < 8 || name_font_size > 72) {
    throw new Error('Font size must be between 8 and 72')
  }
  
  if (kelompok_font_size !== undefined && (kelompok_font_size < 8 || kelompok_font_size > 72)) {
    throw new Error('Kelompok font size must be between 8 and 72')
  }

  // Validate hex colors (#RRGGBB)
  const hexPattern = /^#[0-9a-fA-F]{6}$/
  const { name_color, kelompok_color } = positions
  if (name_color !== undefined && !hexPattern.test(name_color)) {
    throw new Error('Warna harus format hex #RRGGBB')
  }
  if (kelompok_color !== undefined && !hexPattern.test(kelompok_color)) {
    throw new Error('Warna harus format hex #RRGGBB')
  }
}
