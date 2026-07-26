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

  // font_size = persen lebar kartu (min 0.1%, tanpa batas atas), bukan px absolut
  if (name_font_size < 0.1) {
    throw new Error('Ukuran font minimal 0.1% dari lebar kartu')
  }

  if (positions.kelompok_font_size !== undefined && positions.kelompok_font_size < 0.1) {
    throw new Error('Ukuran font Kelompok minimal 0.1%')
  }

  if (positions.custom_field_font_size !== undefined && positions.custom_field_font_size < 0.1) {
    throw new Error('Ukuran font Field minimal 0.1%')
  }

  const validCasings = ['original', 'uppercase', 'titlecase']
  
  if (positions.name_casing && !validCasings.includes(positions.name_casing)) {
    throw new Error('Casing nama tidak valid')
  }

  if (positions.kelompok_casing && !validCasings.includes(positions.kelompok_casing)) {
    throw new Error('Casing kelompok tidak valid')
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
