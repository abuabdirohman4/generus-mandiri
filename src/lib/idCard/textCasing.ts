export type TextCasing = 'original' | 'uppercase' | 'titlecase'

export function applyCasing(text: string, casing: TextCasing): string {
  if (!text) return text

  switch (casing) {
    case 'uppercase':
      return text.toUpperCase()
    case 'titlecase':
      return text.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      )
    case 'original':
    default:
      return text
  }
}
