import React from 'react'
import { Document, Page, Image, View, StyleSheet } from '@react-pdf/renderer'
import { calculateCardGrid } from './gridLayout'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff'
  }
})

interface IdCardDocumentProps {
  cardImages: string[] // data URLs of composed cards
  cardWidthCm: number
  cardHeightCm: number
}

export function IdCardDocument({ cardImages, cardWidthCm, cardHeightCm }: IdCardDocumentProps) {
  const grid = calculateCardGrid({ cardWidthCm, cardHeightCm })
  
  // Chunk images per page
  const pages: string[][] = []
  for (let i = 0; i < cardImages.length; i += grid.cardsPerPage) {
    pages.push(cardImages.slice(i, i + grid.cardsPerPage))
  }

  return (
    <Document>
      {pages.map((pageImages, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {pageImages.map((imgUrl, imgIndex) => {
            const pos = grid.positions[imgIndex]
            return (
              <View 
                key={imgIndex}
                style={{
                  position: 'absolute',
                  left: `${pos.xCm}cm`,
                  top: `${pos.yCm}cm`,
                  width: `${cardWidthCm}cm`,
                  height: `${cardHeightCm}cm`,
                }}
              >
                <Image src={imgUrl} />
              </View>
            )
          })}
        </Page>
      ))}
    </Document>
  )
}
