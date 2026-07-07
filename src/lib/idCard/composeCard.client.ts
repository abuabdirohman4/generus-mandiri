import QRCode from 'qrcode'
import type { TemplatePositions } from '@/types/idCardTemplate'

export async function composeCard(params: {
  templateImageUrl: string
  qrPayload: string
  studentName: string
  studentKelompok?: string
  imageWidth: number
  imageHeight: number
  positions: TemplatePositions
}): Promise<string> {
  const { templateImageUrl, qrPayload, studentName, studentKelompok, imageWidth, imageHeight, positions } = params
  
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // Required to avoid canvas tainting from Supabase storage
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = imageWidth
        canvas.height = imageHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get 2d context')

        // 1. Draw template
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight)

        // 2. Generate and draw QR code
        const qrSizePx = (positions.qr_size_pct / 100) * imageWidth
        const qrXPx = (positions.qr_x_pct / 100) * imageWidth
        const qrYPx = (positions.qr_y_pct / 100) * imageHeight

        const qrCanvas = document.createElement('canvas')
        await QRCode.toCanvas(qrCanvas, qrPayload, {
          width: qrSizePx,
          margin: 1, // minimal margin
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        ctx.drawImage(qrCanvas, qrXPx, qrYPx, qrSizePx, qrSizePx)

        // 3. Draw Name
        const nameXPx = (positions.name_x_pct / 100) * imageWidth
        const nameYPx = (positions.name_y_pct / 100) * imageHeight

        const nameStyleParts = [
          positions.name_italic ? 'italic' : '',
          positions.name_bold ? 'bold' : '',
          `${positions.name_font_size}px`,
          'sans-serif',
        ].filter(Boolean)
        ctx.font = nameStyleParts.join(' ')
        ctx.fillStyle = positions.name_color || '#000000'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(studentName, nameXPx, nameYPx)

        // 4. Draw Kelompok if enabled
        if (positions.show_kelompok && studentKelompok && positions.kelompok_x_pct !== undefined && positions.kelompok_y_pct !== undefined) {
          const kelXPx = (positions.kelompok_x_pct / 100) * imageWidth
          const kelYPx = (positions.kelompok_y_pct / 100) * imageHeight
          const kelFontSize = positions.kelompok_font_size || 18

          const kelStyleParts = [
            positions.kelompok_italic ? 'italic' : '',
            positions.kelompok_bold ? 'bold' : '',
            `${kelFontSize}px`,
            'sans-serif',
          ].filter(Boolean)
          ctx.font = kelStyleParts.join(' ')
          ctx.fillStyle = positions.kelompok_color || '#000000'
          ctx.fillText(studentKelompok, kelXPx, kelYPx)
        }

        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Failed to load template image'))
    img.src = templateImageUrl
  })
}
