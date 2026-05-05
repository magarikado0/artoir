export const T = {
  paper:     '#F7F0DC',
  paperAlt:  '#D8E7C1',
  card:      '#FFF9E9',
  ink:       '#17110B',
  inkSoft:   '#312419',
  inkMuted:  '#786B5B',
  line:      '#2E2117',
  lineSoft:  '#D8CBB0',
  accent:    '#E94B2E',
  accentInk: '#8F1F13',
  moss:      '#1D6D5C',
  slate:     '#123B5D',
  gold:      '#F2B849',
  blush:     '#FFD4C2',
  mint:      '#CBE88E',
  blueSoft:  '#BFD7F1',
  violet:    '#7D5FB2',
  warning:   '#E32922',

  serif:     'Georgia, "Shippori Mincho", "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif',
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

export function pad2(n) {
  return String(n).padStart(2, '0')
}
