// src/app/(admin)/rapot/templates/types.ts

export type GradingFormat = 'score' | 'grade' | 'hafal' | 'both'

export interface ReportTemplate {
  id: string
  name: string
  description?: string | null
  semester: 1 | 2 // Required - semester for this template
  academic_year_id?: string | null
  class_master_id?: string | null // DEPRECATED - kept for backward compatibility
  is_active: boolean
  created_at: string
  updated_at: string
  // NEW - array of class masters (from junction table)
  // If empty array = universal template (all classes)
  // If has items = specific template (selected classes only)
  class_masters?: Array<{
    id: string
    name: string
    category_id?: string | null
    categories?: {
      id: string
      code: string
      name: string
    } | null
  }>
}

export interface ReportSection {
  id: string
  template_id: string
  name: string
  description?: string | null
  grading_format: GradingFormat
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  items?: ReportSectionItem[]
}

export interface ReportSectionItem {
  id: string
  section_id: string
  material_level: 'category' | 'type' | 'item' // Required - what level to grade at
  material_category_id?: string | null
  material_type_id?: string | null
  material_item_id?: string | null
  custom_name?: string | null
  display_order: number
  is_required: boolean
  created_at: string
  updated_at: string
  // Relations
  material_category?: {
    id: string
    name: string
  } | null
  material_type?: {
    id: string
    name: string
    category_id?: string | null
    category?: { name: string } | null
  } | null
  material_item?: {
    id: string
    name: string
    material_type_id?: string | null
  } | null
  grading_mode: 'expand' | 'single' // NEW
}

// Material hierarchy types
export interface MaterialCategory {
  id: string
  name: string
  description?: string | null
  display_order: number
}

export interface MaterialType {
  id: string
  category_id: string
  name: string
  description?: string | null
  display_order: number
  category?: MaterialCategory
}

export interface MaterialItem {
  id: string
  material_type_id: string
  name: string
  description?: string | null
  display_order: number
  type?: MaterialType
}

// Form types
export interface TemplateFormData {
  name: string
  description: string
  semester: 1 | 2 // Required
  class_master_ids: string[] // NEW - array of selected class master IDs (empty = universal)
  academic_year_id?: string
  is_active: boolean
}

export interface SectionFormData {
  name: string
  description: string
  grading_format: GradingFormat
  display_order: number
  is_active: boolean
}

export interface SectionItemFormData {
  material_level: 'category' | 'type' | 'item' // Required
  material_category_id?: string
  material_type_id?: string
  material_item_id?: string
  custom_name?: string
  display_order: number
  is_required: boolean
  grading_mode: 'expand' | 'single' // NEW
}

// Complete template with sections and items
export interface TemplateWithSections extends ReportTemplate {
  sections: ReportSection[]
}