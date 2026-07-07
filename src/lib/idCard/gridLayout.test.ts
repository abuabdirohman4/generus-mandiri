import { describe, it, expect } from 'vitest'
import { calculateCardGrid } from './gridLayout'

describe('calculateCardGrid', () => {
  it('calculates grid correctly for standard ID card size (centered)', () => {
    // 8.5 x 5.5 cm, marginCm default = 0.5 (narrow print margin)
    const res = calculateCardGrid({
      cardWidthCm: 8.5,
      cardHeightCm: 5.5,
    })
    // Available width = 21 - 1 = 20; Available height = 29.7 - 1 = 28.7
    // Cols = floor((20 + 0.3) / (8.5 + 0.3)) = 2
    // Rows = floor((28.7 + 0.3) / (5.5 + 0.3)) = 5
    expect(res.cols).toBe(2)
    expect(res.rows).toBe(5)
    expect(res.cardsPerPage).toBe(10)
    expect(res.positions.length).toBe(10)

    // Centered offsets:
    // usedWidth  = 2*8.5 + 1*0.3 = 17.3 -> offsetX = (21   - 17.3)/2 = 1.85
    // usedHeight = 5*5.5 + 4*0.3 = 28.7 -> offsetY = (29.7 - 28.7)/2 = 0.5
    expect(res.positions[0].xCm).toBeCloseTo(1.85)
    expect(res.positions[0].yCm).toBeCloseTo(0.5)
    // Second pos (col 1, row 0): 1.85 + 8.5 + 0.3 = 10.65
    expect(res.positions[1].xCm).toBeCloseTo(10.65)
    expect(res.positions[1].yCm).toBeCloseTo(0.5)
  })

  it('centers the grid with balanced left/right and top/bottom margins', () => {
    const res = calculateCardGrid({ cardWidthCm: 8.5, cardHeightCm: 5.5 })
    const last = res.positions[res.positions.length - 1]
    const leftMargin = res.positions[0].xCm
    const rightMargin = 21 - (last.xCm + 8.5)
    expect(leftMargin).toBeCloseTo(rightMargin)
    const topMargin = res.positions[0].yCm
    const bottomMargin = 29.7 - (last.yCm + 5.5)
    expect(topMargin).toBeCloseTo(bottomMargin)
  })

  it('handles large cards gracefully (defaults to 1x1)', () => {
    const res = calculateCardGrid({
      cardWidthCm: 30, // larger than page
      cardHeightCm: 40,
    })
    expect(res.cols).toBe(1)
    expect(res.rows).toBe(1)
    expect(res.cardsPerPage).toBe(1)
    expect(res.positions.length).toBe(1)
  })
})
