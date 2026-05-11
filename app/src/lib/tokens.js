export const T = {
  paper:     '#FAF8F3',
  paperAlt:  '#F3F0E8',
  card:      '#FFFFFF',
  ink:       '#111110',
  inkSoft:   '#3A3935',
  inkMuted:  '#73726C',
  line:      '#E4E2DC',
  lineSoft:  '#EFEDE6',
  accent:    '#B4452C',

  serif:     '"Shippori Mincho", "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif',
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
