'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { DndContext, useDraggable, useSensor, useSensors, PointerSensor, DragEndEvent, DragMoveEvent } from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import Checkbox from '@/components/form/input/Checkbox'
import GridPreview from '@/lib/idCard/GridPreview'
import Spinner from '@/components/ui/spinner/Spinner'
import { toast } from 'sonner'
import { uploadIdCardTemplate, getIdCardTemplate } from '../actions/template/actions'
import { useRouter } from 'next/navigation'

interface Position {
  x: number // percent
  y: number // percent
}

const CENTER = 50
const SNAP_RADIUS = 1.5 // percent

interface TextStyle {
  color: string
  italic: boolean
  bold: boolean
  fontSizePx: number
}

function DraggableBox({
  id,
  position,
  children,
  sizePct = undefined,
  textStyle = undefined,
  imageWidth = undefined,
  containerWidthPx = undefined,
  centerAnchor = false,
  onResize = undefined,
}: {
  id: string
  position: Position
  children: React.ReactNode
  sizePct?: number
  textStyle?: TextStyle
  imageWidth?: number
  containerWidthPx?: number
  centerAnchor?: boolean
  onResize?: (deltaXPct: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })

  // Drag delta (px) on top of any anchor-centering offset (%). Order matters:
  // translate3d must come first so its px values aren't affected by the
  // percentage-based centering translate.
  const transformParts = [
    transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    centerAnchor ? 'translate(-50%, -50%)' : undefined,
  ].filter(Boolean)

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: transformParts.length ? transformParts.join(' ') : undefined,
    width: sizePct ? `${sizePct}%` : 'auto',
    aspectRatio: sizePct ? '1 / 1' : undefined,
    // Text font-size must scale with the rendered image width so the preview
    // matches composeCard.client.ts, which draws at native image resolution
    // (fontSizePx is stored relative to imageWidth). Computed directly in px
    // from the container's measured rendered width (via ResizeObserver) rather
    // than CSS container query units (cqw) — cqw resolves against the query
    // container's own inline-size, which in practice didn't track the
    // displayed <img> width reliably (nested scroll/grid ancestors), causing
    // preview/PDF font-size mismatch.
    fontSize:
      textStyle && imageWidth && containerWidthPx
        ? `${(textStyle.fontSizePx / imageWidth) * containerWidthPx}px`
        : undefined,
    zIndex: isDragging ? 10 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    border: '2px dashed #666',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    fontWeight: textStyle ? (textStyle.bold ? 'bold' : 'normal') : 'bold',
    fontStyle: textStyle && textStyle.italic ? 'italic' : 'normal',
    color: textStyle ? textStyle.color : '#000',
    userSelect: 'none',
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
      {onResize && <ResizeHandle onResize={onResize} />}
    </div>
  )
}

/**
 * Resize handle for the QR box. Deliberately NOT a dnd-kit draggable — it uses
 * native pointer capture. dnd-kit's restrictToParentElement modifier clamps a
 * nested handle (positioned outside the box) so outward drags register as ~0,
 * making grow impossible. Native pointer handling avoids both that clamp and
 * the double-activation of nested draggables, and gives live resizing.
 */
function ResizeHandle({ onResize }: { onResize: (deltaXPct: number) => void }) {
  const start = useRef<{ x: number; containerW: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation() // never let the qr-box drag activate
    e.preventDefault()
    // parent chain: handle -> qr-box -> image container
    const container = e.currentTarget.parentElement?.parentElement
    const rect = container?.getBoundingClientRect()
    if (!rect) return
    start.current = { x: e.clientX, containerW: rect.width }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!start.current) return
    // qrSize is a percent of container WIDTH (box is square via aspect-ratio),
    // so measure horizontal movement as percent-of-width.
    const deltaXPct = ((e.clientX - start.current.x) / start.current.containerW) * 100
    onResize(deltaXPct)
    start.current.x = e.clientX // incremental: apply per-move delta
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    start.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute',
        right: -8,
        bottom: -8,
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: '#3b82f6',
        border: '2px solid #fff',
        cursor: 'nwse-resize',
        touchAction: 'none',
        zIndex: 20,
      }}
    />
  )
}

interface TemplateClientProps {
  templateId?: string
  onCancelEdit?: () => void
  onSaved?: () => void
}

export default function TemplateClient({ templateId, onCancelEdit, onSaved }: TemplateClientProps) {
  const router = useRouter()
  const [loadingExisting, setLoadingExisting] = useState(!!templateId)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [cardWidthCm, setCardWidthCm] = useState('8.5')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageDims, setImageDims] = useState({ width: 0, height: 0 })
  const [containerWidthPx, setContainerWidthPx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [submitting, setSubmitting] = useState(false)

  const [qrPos, setQrPos] = useState<Position>({ x: 10, y: 10 })
  const [qrSize, setQrSize] = useState(20)
  const [nameFontSize, setNameFontSize] = useState(24)
  const [namePos, setNamePos] = useState<Position>({ x: 50, y: 50 })

  const [showKelompok, setShowKelompok] = useState(false)
  const [kelompokPos, setKelompokPos] = useState<Position>({ x: 50, y: 60 })
  const [kelompokFontSize, setKelompokFontSize] = useState(18)

  const [nameColor, setNameColor] = useState('#000000')
  const [nameItalic, setNameItalic] = useState(false)
  const [nameBold, setNameBold] = useState(true)
  const [kelompokColor, setKelompokColor] = useState('#000000')
  const [kelompokItalic, setKelompokItalic] = useState(false)
  const [kelompokBold, setKelompokBold] = useState(true)

  const [showCenterGuide, setShowCenterGuide] = useState(false)

  // Ref mirror of qrPos so the resize clamp never reads a stale closure.
  const qrPosRef = useRef(qrPos)
  qrPosRef.current = qrPos

  // Track the image container's actual rendered width so text font-size can
  // be computed in px directly (see DraggableBox) instead of relying on CSS
  // container query units, which didn't reliably track the displayed <img>
  // width.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidthPx(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [previewUrl])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  // Load existing template into the form when editing (templateId is set).
  // Component is remounted (parent uses key={templateId||'new'}) on target
  // change, so this only ever runs once per mount — no stale-load guard needed.
  useEffect(() => {
    if (!templateId) return
    let cancelled = false
    getIdCardTemplate(templateId).then(res => {
      if (cancelled || !res.success || !res.data) {
        if (!cancelled) toast.error(res.message || 'Gagal memuat template')
        return
      }
      // Supabase/PostgREST returns `numeric` columns as strings, not JS
      // numbers. Without Number(...) here, drag math like `prev.x + deltaXPct`
      // becomes string concatenation (e.g. "49.3" + 2.1 = "49.32.1"), producing
      // an invalid CSS percent — the box silently disappears from the preview.
      const { template, signedUrl } = res.data
      setName(template.name)
      setCardWidthCm(String(template.card_width_cm))
      setPreviewUrl(signedUrl)
      setImageDims({ width: Number(template.image_width), height: Number(template.image_height) })
      setQrPos({ x: Number(template.qr_x_pct), y: Number(template.qr_y_pct) })
      setQrSize(Number(template.qr_size_pct))
      setNamePos({ x: Number(template.name_x_pct), y: Number(template.name_y_pct) })
      setNameFontSize(Number(template.name_font_size))
      setShowKelompok(template.show_kelompok)
      setKelompokPos({ x: Number(template.kelompok_x_pct), y: Number(template.kelompok_y_pct) })
      setKelompokFontSize(Number(template.kelompok_font_size))
      setNameColor(template.name_color)
      setNameItalic(template.name_italic)
      setNameBold(template.name_bold)
      setKelompokColor(template.kelompok_color)
      setKelompokItalic(template.kelompok_italic)
      setKelompokBold(template.kelompok_bold)
      setLoadingExisting(false)
    })
    return () => { cancelled = true }
  }, [templateId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      const url = URL.createObjectURL(selected)
      setPreviewUrl(url)
      const img = new Image()
      img.onload = () => setImageDims({ width: img.width, height: img.height })
      img.src = url
    }
  }

  // Live resize: grow when dragging right, shrink when dragging left. Clamp to
  // Clamp to [5, 100] — QR may extend to full width; it is not restricted by
  // its current position (user accepts it can overflow the card edge).
  const handleQrResize = useCallback((deltaXPct: number) => {
    setQrSize(prev => Math.round(Math.max(5, Math.min(100, prev + deltaXPct))))
  }, [])

  const setQrSizeClamped = (val: number) => {
    setQrSize(Math.round(Math.max(5, Math.min(100, val || 5))))
  }

  // Snap guide: compare the dragged box's ACTUAL visual center (from its
  // translated DOM rect — works for both the sized QR box and the auto-width
  // text boxes) against the container center. pos-model math was wrong for the
  // text boxes (left != center), which is why the name box never snapped.
  const handleDragMove = (event: DragMoveEvent) => {
    const { active } = event
    if (!containerRef.current) return
    const translated = active.rect.current.translated
    if (!translated) return
    const containerRect = containerRef.current.getBoundingClientRect()
    // dnd-kit's reported rect reflects the box's CSS left/top BEFORE our own
    // static `translate(-50%, -50%)` centering transform (name/kelompok boxes)
    // is applied — dnd-kit has no knowledge of that extra cosmetic transform.
    // For those boxes, `translated.left` IS ALREADY the visual center (that's
    // the whole point of the -50% shift), so adding width/2 double-counts the
    // offset and shifts the computed "center" half a box-width to the right of
    // the true visual center — which is why centering only "worked" when the
    // box was dragged far enough left to compensate. QR uses top-left
    // anchoring (no such transform), so it still needs + width/2.
    const isCenterAnchored = active.id === 'name-box' || active.id === 'kelompok-box'
    const boxCenterX = isCenterAnchored ? translated.left : translated.left + translated.width / 2
    const containerCenterX = containerRect.left + containerRect.width / 2
    const offsetPct = ((boxCenterX - containerCenterX) / containerRect.width) * 100
    setShowCenterGuide(Math.abs(offsetPct) <= SNAP_RADIUS)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event
    setShowCenterGuide(false)
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const deltaXPct = (delta.x / rect.width) * 100
    const deltaYPct = (delta.y / rect.height) * 100
    const id = active.id

    // Detect the dragged box's actual visual center-x (from its translated DOM
    // rect) vs the container center, for the snap guide. See handleDragMove for
    // why name/kelompok (center-anchored via CSS transform) don't need +width/2.
    const translated = active.rect.current.translated
    const isCenterAnchored = id === 'name-box' || id === 'kelompok-box'
    const boxCenterX = translated
      ? (((isCenterAnchored ? translated.left : translated.left + translated.width / 2) - rect.left) / rect.width) * 100
      : null
    const nearCenter = boxCenterX !== null && Math.abs(boxCenterX - CENTER) <= SNAP_RADIUS

    if (id === 'qr-box') {
      // QR uses top-left anchoring (matches canvas drawImage, which is also
      // top-left), so centering means offsetting by half its own width.
      setQrPos(prev => {
        let nx = prev.x + deltaXPct
        if (nearCenter) nx = CENTER - qrSize / 2
        // QR may extend past the card edge (size can be up to 100%), so the
        // position is free within 0..100 and NOT clamped by qrSize — otherwise
        // a large QR gets yanked toward the top-left because its max x/y shrinks.
        return {
          x: Math.max(0, Math.min(100, nx)),
          y: Math.max(0, Math.min(100, prev.y + deltaYPct)),
        }
      })
    } else if (id === 'name-box') {
      // Name/Kelompok are center-anchored (matches canvas textAlign:center),
      // so their stored x IS the center — snapping just sets it to 50 directly.
      setNamePos(prev => {
        let nx = prev.x + deltaXPct
        if (nearCenter) nx = CENTER
        return { x: Math.max(0, Math.min(100, nx)), y: Math.max(0, Math.min(100, prev.y + deltaYPct)) }
      })
    } else if (id === 'kelompok-box') {
      setKelompokPos(prev => {
        let nx = prev.x + deltaXPct
        if (nearCenter) nx = CENTER
        return { x: Math.max(0, Math.min(100, nx)), y: Math.max(0, Math.min(100, prev.y + deltaYPct)) }
      })
    }
  }

  const handleSave = async () => {
    const isEditing = !!templateId
    if (!isEditing && (!file || !name)) {
      toast.error('Harap lengkapi semua field dan file')
      return
    }
    if (!cardWidthCm || imageDims.width === 0) {
      toast.error('Harap lengkapi semua field dan file')
      return
    }
    setSubmitting(true)
    try {
      const { saveIdCardTemplatePositions } = await import('../actions/template/actions')
      const positions = {
        qr_x_pct: qrPos.x,
        qr_y_pct: qrPos.y,
        qr_size_pct: qrSize,
        name_x_pct: namePos.x,
        name_y_pct: namePos.y,
        name_font_size: nameFontSize,
        show_kelompok: showKelompok,
        kelompok_x_pct: kelompokPos.x,
        kelompok_y_pct: kelompokPos.y,
        kelompok_font_size: kelompokFontSize,
        name_color: nameColor,
        name_italic: nameItalic,
        name_bold: nameBold,
        kelompok_color: kelompokColor,
        kelompok_italic: kelompokItalic,
        kelompok_bold: kelompokBold,
      }

      if (isEditing) {
        // Edit mode: image is not replaced, only positions/style are updated.
        const posRes = await saveIdCardTemplatePositions(templateId, positions, name)
        if (!posRes.success) throw new Error(posRes.message)
        toast.success('Template berhasil diperbarui')
        onSaved?.()
      } else {
        const formData = new FormData()
        formData.append('file', file as File)
        formData.append('name', name)
        formData.append('cardWidthCm', cardWidthCm)
        formData.append('imageWidth', imageDims.width.toString())
        formData.append('imageHeight', imageDims.height.toString())

        const uploadRes = await uploadIdCardTemplate(formData)
        if (!uploadRes.success || !uploadRes.data) {
          throw new Error(uploadRes.message || 'Gagal upload template')
        }

        const posRes = await saveIdCardTemplatePositions(uploadRes.data.id, positions)
        if (!posRes.success) throw new Error(posRes.message)

        toast.success('Template berhasil disimpan')
        onSaved?.()
        router.push('/users/siswa/qr-cards')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingExisting) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex justify-center py-12">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch text-gray-900 dark:text-gray-100">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-col gap-4">
        <div>
          <Label htmlFor="template-name">Nama Template</Label>
          <Input
            id="template-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Mis: Template Siswa 2026"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="card-width-cm">Lebar Kartu Fisik (cm)</Label>
            <Input
              id="card-width-cm"
              type="number"
              step={0.1}
              value={cardWidthCm}
              onChange={e => setCardWidthCm(e.target.value)}
              placeholder="8.5"
            />
          </div>
          <div>
            <Label htmlFor="qr-size">Ukuran QR (%)</Label>
            <Input
              id="qr-size"
              type="number"
              min="5"
              max="100"
              value={qrSize}
              onChange={e => setQrSizeClamped(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Grid preview */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <Label>Tata Letak di Kertas A4</Label>
          <GridPreview
            cardWidthCm={Number(cardWidthCm)}
            imageWidth={imageDims.width}
            imageHeight={imageDims.height}
          />
        </div>

        {/* Text styling */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
          {/* Name styling */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Nama</p>
            <div className="max-w-45">
              <Label htmlFor="name-font-size">Ukuran Font (px)</Label>
              <Input
                id="name-font-size"
                type="number"
                value={nameFontSize}
                onChange={e => setNameFontSize(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="name-color" className="mb-0">Warna</Label>
                <input
                  id="name-color"
                  type="color"
                  value={nameColor}
                  onChange={e => setNameColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-md border border-gray-300 bg-transparent p-0.5 dark:border-gray-600"
                />
              </div>
              <div className="flex items-center gap-4">
                <Checkbox id="name-bold" label="Tebal" checked={nameBold} onChange={setNameBold} />
                <Checkbox id="name-italic" label="Miring" checked={nameItalic} onChange={setNameItalic} />
              </div>
            </div>
          </div>

          {/* Kelompok styling */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
            <Checkbox
              id="show-kelompok"
              label="Tampilkan Nama Kelompok"
              checked={showKelompok}
              onChange={setShowKelompok}
            />
            {showKelompok && (
              <div className="space-y-3 pt-1">
                <div className="max-w-45">
                  <Label htmlFor="kelompok-font-size">Ukuran Font (px)</Label>
                  <Input
                    id="kelompok-font-size"
                    type="number"
                    value={kelompokFontSize}
                    onChange={e => setKelompokFontSize(Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="kelompok-color" className="mb-0">Warna</Label>
                    <input
                      id="kelompok-color"
                      type="color"
                      value={kelompokColor}
                      onChange={e => setKelompokColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-md border border-gray-300 bg-transparent p-0.5 dark:border-gray-600"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Checkbox id="kelompok-bold" label="Tebal" checked={kelompokBold} onChange={setKelompokBold} />
                    <Checkbox id="kelompok-italic" label="Miring" checked={kelompokItalic} onChange={setKelompokItalic} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {!templateId && (
          <div className="mt-auto border-t border-gray-200 dark:border-gray-700 pt-4">
            <Label htmlFor="template-file">Upload Gambar Template</Label>
            <input
              id="template-file"
              type="file"
              accept="image/*"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm text-gray-700 dark:text-gray-300 bg-transparent file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 dark:file:bg-gray-700 dark:file:text-gray-200"
              onChange={handleFileChange}
            />
          </div>
        )}
        {templateId && (
          <p className="mt-auto text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">
            Mode edit: gambar template tidak bisa diganti. Hapus dan buat baru untuk mengganti gambar.
          </p>
        )}
      </div>

      {!previewUrl && (
        <div className="hidden lg:flex bg-white dark:bg-gray-800 p-4 rounded-lg shadow lg:sticky lg:top-4 min-h-64 items-center justify-center text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Upload gambar template untuk melihat preview & atur posisi di sini.
          </p>
        </div>
      )}

      {previewUrl && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4 lg:sticky lg:top-4">
          <h3 className="font-semibold text-lg">Preview & Atur Posisi</h3>
          <p className="text-sm text-gray-500">Geser kotak untuk atur posisi. Tarik titik biru di pojok kotak QR untuk ubah ukuran. Garis biru muncul saat pas di tengah.</p>

          <DndContext sensors={sensors} onDragMove={handleDragMove} onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
            <div className="max-h-[70vh] overflow-auto rounded-md">
            <div
              ref={containerRef}
              className="relative border overflow-hidden w-full"
              style={{
                // Fill the available column width (matches the "new template"
                // upload flow's size) instead of shrink-to-fit (`w-fit`), which
                // depended ambiguously on the <img>'s natural size and could
                // collapse to a tiny/zero width while the image was still
                // loading (edit mode loads a remote Supabase signed URL, not a
                // local blob, so this load is not instant). The aspect-ratio
                // here comes from state (not the image element), so the
                // container has a correct, definite size immediately.
                aspectRatio: imageDims.width && imageDims.height ? `${imageDims.width} / ${imageDims.height}` : undefined,
              } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Template Preview"
                className="max-w-full w-full h-auto block select-none pointer-events-none"
                onError={() => toast.error('Gagal memuat gambar template (URL mungkin kedaluwarsa)')}
              />

              {showCenterGuide && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0"
                  style={{ left: '50%', width: 0, borderLeft: '1px dashed #3b82f6', zIndex: 15 }}
                />
              )}

              <DraggableBox id="qr-box" position={qrPos} sizePct={qrSize} onResize={handleQrResize}>
                <div className="text-xs text-center pointer-events-none">QR CODE<br />(Area)</div>
              </DraggableBox>
              <DraggableBox
                id="name-box"
                position={namePos}
                imageWidth={imageDims.width}
                containerWidthPx={containerWidthPx}
                centerAnchor
                textStyle={{ color: nameColor, italic: nameItalic, bold: nameBold, fontSizePx: nameFontSize }}
              >
                [NAMA SISWA]
              </DraggableBox>
              {showKelompok && (
                <DraggableBox
                  id="kelompok-box"
                  position={kelompokPos}
                  imageWidth={imageDims.width}
                  containerWidthPx={containerWidthPx}
                  centerAnchor
                  textStyle={{ color: kelompokColor, italic: kelompokItalic, bold: kelompokBold, fontSizePx: kelompokFontSize }}
                >
                  [NAMA KELOMPOK]
                </DraggableBox>
              )}
            </div>
            </div>
          </DndContext>

          <div className="flex justify-end gap-2 pt-4">
            {onCancelEdit && (
              <Button variant="outline" onClick={onCancelEdit} disabled={submitting}>
                Batal
              </Button>
            )}
            <Button onClick={handleSave} disabled={submitting} loading={submitting}>
              {submitting ? 'Menyimpan...' : templateId ? 'Update Template' : 'Simpan Template'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
