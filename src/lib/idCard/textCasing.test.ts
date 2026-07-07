import { describe, it, expect } from 'vitest'
import { applyCasing } from './textCasing'

describe('textCasing', () => {
  describe('applyCasing', () => {
    it('returns original text when casing is "original"', () => {
      expect(applyCasing('hello WORLD', 'original')).toBe('hello WORLD')
      expect(applyCasing('   padded  ', 'original')).toBe('   padded  ')
    })

    it('returns uppercase text when casing is "uppercase"', () => {
      expect(applyCasing('hello WORLD', 'uppercase')).toBe('HELLO WORLD')
      expect(applyCasing('Already UPPER', 'uppercase')).toBe('ALREADY UPPER')
      expect(applyCasing('', 'uppercase')).toBe('')
      expect(applyCasing('   padded  ', 'uppercase')).toBe('   PADDED  ')
    })

    it('returns titlecase text when casing is "titlecase"', () => {
      expect(applyCasing('hello WORLD', 'titlecase')).toBe('Hello World')
      expect(applyCasing('a title', 'titlecase')).toBe('A Title')
      expect(applyCasing('multiple   words   here', 'titlecase')).toBe('Multiple   Words   Here')
      expect(applyCasing('already Title Case', 'titlecase')).toBe('Already Title Case')
      expect(applyCasing('single', 'titlecase')).toBe('Single')
      expect(applyCasing('', 'titlecase')).toBe('')
      expect(applyCasing('   padded text  ', 'titlecase')).toBe('   Padded Text  ')
    })
  })
})
