import { describe, it, expect } from 'vitest'
import { validateTemplatePositions } from './logic'
import type { TemplatePositions } from '@/types/idCardTemplate'

// Factory: valid base positions, override per-test
function makePositions(overrides: Partial<TemplatePositions> = {}): TemplatePositions {
  return {
    qr_x_pct: 10,
    qr_y_pct: 10,
    qr_size_pct: 20,
    name_x_pct: 50,
    name_y_pct: 80,
    name_font_size: 24,
    name_casing: 'original',
    show_kelompok: false,
    kelompok_x_pct: 50,
    kelompok_y_pct: 60,
    kelompok_font_size: 18,
    kelompok_casing: 'original',
    name_color: '#000000',
    name_italic: false,
    name_bold: true,
    kelompok_color: '#000000',
    kelompok_italic: false,
    kelompok_bold: true,
    show_custom_field: false,
    custom_field_x_pct: 50,
    custom_field_y_pct: 70,
    custom_field_font_size: 18,
    custom_field_casing: 'original',
    custom_field_color: '#000000',
    custom_field_italic: false,
    custom_field_bold: false,
    ...overrides,
  }
}

describe('validateTemplatePositions', () => {
  it('passes for valid positions', () => {
    expect(() => validateTemplatePositions(makePositions())).not.toThrow()
  })

  it('rejects values < 0 or > 100', () => {
    expect(() => validateTemplatePositions(makePositions({ qr_x_pct: -1 }))).toThrow('Position values must be between 0 and 100')
    expect(() => validateTemplatePositions(makePositions({ qr_y_pct: 101 }))).toThrow('Position values must be between 0 and 100')
  })

  it('allows QR to extend past the card edge (size/position not bounded together)', () => {
    // QR may overflow the card boundary by design — position + size can exceed 100.
    expect(() => validateTemplatePositions(makePositions({ qr_x_pct: 90, qr_size_pct: 50 }))).not.toThrow()
    expect(() => validateTemplatePositions(makePositions({ qr_y_pct: 90, qr_size_pct: 50 }))).not.toThrow()
  })

  it('rejects font size out of range', () => {
    expect(() => validateTemplatePositions(makePositions({ name_font_size: 0 }))).toThrow('Font size must be between 8 and 72')
    expect(() => validateTemplatePositions(makePositions({ name_font_size: 100 }))).toThrow('Font size must be between 8 and 72')
  })

  it('rejects invalid name color hex', () => {
    expect(() => validateTemplatePositions(makePositions({ name_color: 'red' }))).toThrow('Warna harus format hex')
    expect(() => validateTemplatePositions(makePositions({ name_color: '#fff' }))).toThrow('Warna harus format hex')
    expect(() => validateTemplatePositions(makePositions({ name_color: '#12345g' }))).toThrow('Warna harus format hex')
  })

  it('rejects invalid kelompok color hex', () => {
    expect(() => validateTemplatePositions(makePositions({ kelompok_color: 'blue' }))).toThrow('Warna harus format hex')
  })

  it('accepts valid 6-digit hex colors (both cases)', () => {
    expect(() => validateTemplatePositions(makePositions({ name_color: '#FF00aa', kelompok_color: '#abcDEF' }))).not.toThrow()
  })
})
