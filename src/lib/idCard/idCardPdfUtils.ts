import { pdf } from '@react-pdf/renderer'
import { IdCardDocument } from './IdCardDocument'
import { composeCard } from './composeCard.client'
import type { Student } from '@/app/(admin)/users/siswa/actions'
import type { IdCardTemplate } from '@/types/idCardTemplate'
import { buildStudentQrPayload } from '@/lib/qr/qrPayload'
import React from 'react'

export async function generateIdCardsPdfBlob(
  students: Student[],
  template: IdCardTemplate & { signedUrl?: string },
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const templateImageUrl = template.signedUrl || template.image_path
  const cardImages: string[] = []

  const total = students.length

  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    const qrPayload = buildStudentQrPayload(student.id)

    const dataUrl = await composeCard({
      templateImageUrl,
      qrPayload,
      studentName: student.name,
      studentKelompok: student.kelompok_name,
      imageWidth: template.image_width,
      imageHeight: template.image_height,
      positions: {
        qr_x_pct: template.qr_x_pct,
        qr_y_pct: template.qr_y_pct,
        qr_size_pct: template.qr_size_pct,
        name_x_pct: template.name_x_pct,
        name_y_pct: template.name_y_pct,
        name_font_size: template.name_font_size,
        show_kelompok: template.show_kelompok,
        kelompok_x_pct: template.kelompok_x_pct,
        kelompok_y_pct: template.kelompok_y_pct,
        kelompok_font_size: template.kelompok_font_size,
        name_color: template.name_color,
        name_italic: template.name_italic,
        name_bold: template.name_bold,
        kelompok_color: template.kelompok_color,
        kelompok_italic: template.kelompok_italic,
        kelompok_bold: template.kelompok_bold
      }
    })
    
    cardImages.push(dataUrl)
    
    if (onProgress) {
      onProgress(i + 1, total)
    }
  }

  const cardHeightCm = template.card_width_cm * (template.image_height / template.image_width)

  const doc = React.createElement(IdCardDocument, {
    cardImages,
    cardWidthCm: template.card_width_cm,
    cardHeightCm
  })

  return await pdf(doc as any).toBlob()
}
