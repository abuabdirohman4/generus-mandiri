'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { canManageIdCardTemplate } from '@/lib/accessControl'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import {
  fetchIdCardTemplates,
  insertIdCardTemplate,
  updateIdCardTemplatePositions,
  deleteIdCardTemplate,
  uploadTemplateImage,
  deleteTemplateImage,
  getTemplateImageSignedUrl,
  getIdCardTemplateQuery
} from './queries'
import { validateTemplatePositions } from './logic'
import type { IdCardTemplate, TemplatePositions } from '@/types/idCardTemplate'
import { revalidatePath } from 'next/cache'

async function checkTemplateAdminAccess() {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const profile = await getCurrentUserProfile()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!canManageIdCardTemplate(profile)) {
    throw new Error('Unauthorized: You do not have permission to manage templates')
  }
  return { supabase, adminSupabase, profile, user }
}

export async function uploadIdCardTemplate(formData: FormData) {
  try {
    const { adminSupabase, user } = await checkTemplateAdminAccess()
    
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const imageWidth = parseInt(formData.get('imageWidth') as string)
    const imageHeight = parseInt(formData.get('imageHeight') as string)
    const cardWidthCm = parseFloat(formData.get('cardWidthCm') as string)

    if (!file || !name || !imageWidth || !imageHeight || !cardWidthCm) {
      return { success: false, message: 'Missing required fields' }
    }

    const fileName = `${Date.now()}-${file.name}`
    const image_path = await uploadTemplateImage(adminSupabase, file, fileName)

    const templateData: Omit<IdCardTemplate, 'id' | 'created_at' | 'created_by'> = {
      name,
      image_path,
      image_width: imageWidth,
      image_height: imageHeight,
      card_width_cm: cardWidthCm,
      qr_x_pct: 10,
      qr_y_pct: 10,
      qr_size_pct: 20,
      name_x_pct: 50,
      name_y_pct: 50,
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
      custom_field_label: 'Keterangan',
      custom_field_x_pct: 50,
      custom_field_y_pct: 70,
      custom_field_font_size: 18,
      custom_field_casing: 'original',
      custom_field_color: '#000000',
      custom_field_italic: false,
      custom_field_bold: true,
    }

    const data = await insertIdCardTemplate(adminSupabase, templateData)
    
    await adminSupabase
      .from('id_card_templates')
      .update({ created_by: user?.id })
      .eq('id', data.id)
    
    revalidatePath('/users/siswa')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to upload template' }
  }
}

export async function getIdCardTemplate(id: string) {
  try {
    const { adminSupabase } = await checkTemplateAdminAccess()
    const template = await getIdCardTemplateQuery(adminSupabase, id)
    const signedUrl = await getTemplateImageSignedUrl(adminSupabase, template.image_path)
    
    return { success: true, data: { template, signedUrl } }
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to fetch template' }
  }
}

export async function saveIdCardTemplatePositions(id: string, positions: TemplatePositions, name?: string) {
  try {
    const { adminSupabase } = await checkTemplateAdminAccess()
    
    validateTemplatePositions(positions)
    
    const data = await updateIdCardTemplatePositions(adminSupabase, id, positions, name)
    revalidatePath('/users/siswa')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to save positions' }
  }
}

export async function deleteIdCardTemplateAction(id: string) {
  try {
    const { adminSupabase } = await checkTemplateAdminAccess()
    const template = await getIdCardTemplateQuery(adminSupabase, id)
    
    await deleteIdCardTemplate(adminSupabase, id)
    await deleteTemplateImage(adminSupabase, template.image_path)
    
    revalidatePath('/users/siswa')
    return { success: true, data: null }
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to delete template' }
  }
}

export async function getIdCardTemplatesAction() {
  try {
    const { adminSupabase } = await checkTemplateAdminAccess()
    const templates = await fetchIdCardTemplates(adminSupabase)
    
    // Also fetch signed urls for all of them so we can show them
    const templatesWithUrls = await Promise.all(
      templates.map(async (t) => {
        const signedUrl = await getTemplateImageSignedUrl(adminSupabase, t.image_path)
        return { ...t, signedUrl }
      })
    )
    
    return { success: true, data: templatesWithUrls }
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to fetch templates' }
  }
}
