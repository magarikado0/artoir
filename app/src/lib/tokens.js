export const T = {
  paper:     '#F5F1EB',
  paperAlt:  '#ECE5D9',
  card:      '#FBF8F3',
  ink:       '#1F1B17',
  inkSoft:   '#4A413A',
  inkMuted:  '#8A8178',
  line:      '#2A241F',
  lineSoft:  '#E4DDD2',
  accent:    '#BE553D',
  accentInk: '#7C2E22',
  moss:      '#6B7355',
  slate:     '#7C2E22',
  gold:      '#B8923A',
  blush:     '#E9BDAE',
  mint:      '#DCE0C4',
  surfaceMuted: '#ECE5D9',
  blueSoft:  '#ECE5D9',
  violet:    '#77677E',
  warning:   '#C13E31',

  serif:     '"Shippori Mincho", "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", Georgia, serif',
  serifBody: '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif',
  sans:      '"Noto Sans JP", -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
  mono:      'ui-monospace, "SF Mono", Menlo, monospace',
}

export function fmtDateDot(str) {
  if (!str) return ''
  const d = new Date(str)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

export function fmtDateRange(start, end) {
  if (!start) return ''
  return end ? `${fmtDateDot(start)} — ${fmtDateDot(end)}` : fmtDateDot(start)
}

export function fmtDateShort(str) {
  if (!str) return ''
  const d = new Date(str)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function fmtDateRangeShort(start, end) {
  if (!start) return ''
  if (!end || start === end) return fmtDateShort(start)
  return `${fmtDateShort(start)} - ${fmtDateShort(end)}`
}

export function fmtTime(str) {
  if (!str) return ''
  return str
}

export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function externalHost(href) {
  if (!href) return ''
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}
