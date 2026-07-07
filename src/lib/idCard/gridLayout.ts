export function calculateCardGrid(params: {
  cardWidthCm: number
  cardHeightCm: number
  pageWidthCm?: number
  pageHeightCm?: number
  marginCm?: number
  gapCm?: number
}) {
  const {
    cardWidthCm,
    cardHeightCm,
    pageWidthCm = 21,
    pageHeightCm = 29.7,
    marginCm = 0.5,
    gapCm = 0.3
  } = params

  const availableWidth = pageWidthCm - 2 * marginCm
  const availableHeight = pageHeightCm - 2 * marginCm

  // Calculate cols and rows. Use max(1, ...) to avoid 0 if card is too big
  const cols = Math.max(1, Math.floor((availableWidth + gapCm) / (cardWidthCm + gapCm)))
  const rows = Math.max(1, Math.floor((availableHeight + gapCm) / (cardHeightCm + gapCm)))
  const cardsPerPage = cols * rows

  // Center the whole grid block on the page (balanced margins on all 4 sides).
  // Cards stay tight (gapCm between them, ideal for cutting); the leftover space
  // becomes symmetric edge margins. Clamp to marginCm so oversized cards never
  // get negative offsets.
  const usedWidth = cols * cardWidthCm + (cols - 1) * gapCm
  const usedHeight = rows * cardHeightCm + (rows - 1) * gapCm
  const offsetX = Math.max(marginCm, (pageWidthCm - usedWidth) / 2)
  const offsetY = Math.max(marginCm, (pageHeightCm - usedHeight) / 2)

  const positions = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({
        xCm: offsetX + c * (cardWidthCm + gapCm),
        yCm: offsetY + r * (cardHeightCm + gapCm)
      })
    }
  }

  return { cols, rows, cardsPerPage, positions }
}
