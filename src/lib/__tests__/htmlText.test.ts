import { describe, it, expect } from 'vitest'
import { stripHtml, sanitizeHtml } from '../htmlText'

describe('stripHtml', () => {
  it('removes all tags', () => {
    expect(stripHtml('<p><strong>Hello</strong></p>')).toBe('Hello')
  })
  it('handles empty string', () => {
    expect(stripHtml('')).toBe('')
  })
  it('decodes html entities', () => {
    expect(stripHtml('&amp;&lt;&gt;&quot;')).toBe('&<>"')
    expect(stripHtml('hello&nbsp;world')).toBe('hello world')
  })
})

describe('sanitizeHtml', () => {
  it('preserves allowed formatting tags', () => {
    const result = sanitizeHtml('<p><strong>Bold</strong></p>')
    expect(result).toContain('<strong>Bold</strong>')
  })

  it('strips script tags', () => {
    const result = sanitizeHtml('<p>text</p><script>alert(1)</script>')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert(1)')
  })

  it('strips onerror attributes', () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">')
    expect(result).not.toContain('onerror')
  })

  it('preserves span with font-family style (TipTap FontFamily output)', () => {
    const result = sanitizeHtml('<span style="font-family: Amiri, serif">بِسْمِ اللَّهِ</span>')
    expect(result).toContain('<span')
    expect(result).toContain('font-family')
    expect(result).toContain('Amiri')
  })

  it('preserves ul/ol/li for lists', () => {
    const result = sanitizeHtml('<ul><li>Item 1</li><li>Item 2</li></ul>')
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>Item 1</li>')
  })

  it('preserves link with href', () => {
    const result = sanitizeHtml('<a href="https://example.com" target="_blank">link</a>')
    expect(result).toContain('href="https://example.com"')
  })
})
