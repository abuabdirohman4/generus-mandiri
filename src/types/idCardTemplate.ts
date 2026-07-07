export interface IdCardTemplate {
  id: string
  name: string
  image_path: string
  image_width: number
  image_height: number
  qr_x_pct: number
  qr_y_pct: number
  qr_size_pct: number
  name_x_pct: number
  name_y_pct: number
  name_font_size: number
  show_kelompok: boolean
  kelompok_x_pct: number
  kelompok_y_pct: number
  kelompok_font_size: number
  name_color: string
  name_italic: boolean
  name_bold: boolean
  kelompok_color: string
  kelompok_italic: boolean
  kelompok_bold: boolean
  card_width_cm: number
  created_by?: string
  created_at?: string
}

export interface TemplatePositions {
  qr_x_pct: number
  qr_y_pct: number
  qr_size_pct: number
  name_x_pct: number
  name_y_pct: number
  name_font_size: number
  show_kelompok: boolean
  kelompok_x_pct: number
  kelompok_y_pct: number
  kelompok_font_size: number
  name_color: string
  name_italic: boolean
  name_bold: boolean
  kelompok_color: string
  kelompok_italic: boolean
  kelompok_bold: boolean
}
