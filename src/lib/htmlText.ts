const TAG_RE = /<[^>]*>/g

export function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(TAG_RE, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()
}

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DOMPurify = require('dompurify')
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })
}
