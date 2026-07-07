'use client'

import { useMemo } from 'react'
import { calculateCardGrid } from './gridLayout'

interface GridPreviewProps {
  cardWidthCm: number
  imageWidth: number
  imageHeight: number
}

const PAGE_W_CM = 21
const PAGE_H_CM = 29.7

/**
 * Visual mini-A4 preview: shows how many cards fit per A4 page for the given
 * card width. Updates in realtime as cardWidthCm changes. Cards drawn to scale.
 */
export default function GridPreview({ cardWidthCm, imageWidth, imageHeight }: GridPreviewProps) {
  const grid = useMemo(() => {
    if (!cardWidthCm || cardWidthCm <= 0 || !imageWidth || !imageHeight) return null
    const cardHeightCm = cardWidthCm * (imageHeight / imageWidth)
    return {
      ...calculateCardGrid({ cardWidthCm, cardHeightCm }),
      cardWidthCm,
      cardHeightCm,
    }
  }, [cardWidthCm, imageWidth, imageHeight])

  if (!grid) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Masukkan lebar kartu untuk melihat preview tata letak.
      </p>
    )
  }

  // Scale cm → percent of A4 page for absolute positioning inside the mini page
  const toPctW = (cm: number) => (cm / PAGE_W_CM) * 100
  const toPctH = (cm: number) => (cm / PAGE_H_CM) * 100

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <div
        className="relative shrink-0 rounded-sm border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-100"
        style={{ width: 120, aspectRatio: `${PAGE_W_CM} / ${PAGE_H_CM}` }}
        aria-label="Preview tata letak kartu di kertas A4"
      >
        {grid.positions.map((pos, i) => (
          <div
            key={i}
            className="absolute rounded-[1px] border border-brand-400 bg-brand-500/30"
            style={{
              left: `${toPctW(pos.xCm)}%`,
              top: `${toPctH(pos.yCm)}%`,
              width: `${toPctW(grid.cardWidthCm)}%`,
              height: `${toPctH(grid.cardHeightCm)}%`,
            }}
          />
        ))}
      </div>

      <div className="text-sm">
        <p className="font-semibold text-gray-800 dark:text-gray-200">
          {grid.cardsPerPage} kartu / halaman
        </p>
        <p className="text-gray-500 dark:text-gray-400">
          {grid.cols} kolom × {grid.rows} baris
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Kertas A4 · kartu {grid.cardWidthCm.toFixed(1)} × {grid.cardHeightCm.toFixed(1)} cm
        </p>
      </div>
    </div>
  )
}
