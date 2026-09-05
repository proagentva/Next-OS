// Minimal allow-list sanitizer for the Scripts editor's output. The Tiptap
// config only ever produces a small set of tags/styles, but this is applied
// on both save and render as defense in depth against anything injected
// outside the editor (e.g. a direct API call).
const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'MARK', 'SPAN'])
const ALLOWED_STYLE_PROPS = new Set(['color', 'background-color'])
// The fixed palette (src/lib/colors.ts) always supplies #rrggbb hex, but the
// browser's CSSOM normalizes inline color styles to rgb()/rgba() when they're
// read back from the DOM (which is what Tiptap's getHTML() does) — so both
// forms need to be allowed, not just the hex one the color actually started as.
const SAFE_COLOR = /^(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\))$/

function sanitizeStyle(style: string): string {
  return style
    .split(';')
    .map(rule => rule.split(':').map(s => s.trim()))
    .filter(([prop, value]) => prop && value && ALLOWED_STYLE_PROPS.has(prop.toLowerCase()) && SAFE_COLOR.test(value))
    .map(([prop, value]) => `${prop.toLowerCase()}: ${value}`)
    .join('; ')
}

function sanitizeNode(node: Node, out: Node[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    out.push(node.cloneNode())
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return

  const el = node as Element
  const tag = el.tagName

  if (!ALLOWED_TAGS.has(tag)) {
    // Drop the tag but keep sanitized children (safe default for anything
    // the editor shouldn't produce, e.g. a stray <img> or <table>).
    Array.from(el.childNodes).forEach(child => sanitizeNode(child, out))
    return
  }

  const clean = document.createElement(tag.toLowerCase())
  const style = el.getAttribute('style')
  if (style && (tag === 'SPAN' || tag === 'MARK')) {
    const sanitized = sanitizeStyle(style)
    if (sanitized) clean.setAttribute('style', sanitized)
  }

  const childOut: Node[] = []
  Array.from(el.childNodes).forEach(child => sanitizeNode(child, childOut))
  childOut.forEach(c => clean.appendChild(c))
  out.push(clean)
}

export function sanitizeScriptHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: Node[] = []
  Array.from(doc.body.childNodes).forEach(child => sanitizeNode(child, out))
  const container = document.createElement('div')
  out.forEach(n => container.appendChild(n))
  return container.innerHTML
}
