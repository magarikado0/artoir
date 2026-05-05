export const T = {
  paper:     '#F6F0E4',
  paperAlt:  '#E7E0D0',
  card:      '#FFFDF7',
  ink:       '#1E1A16',
  inkSoft:   '#3E3730',
  inkMuted:  '#7E7569',
  line:      '#3A332C',
  lineSoft:  '#DCD3C2',
  accent:    '#B65A45',
  accentInk: '#7A2F24',
  moss:      '#607668',
  slate:     '#435767',
  gold:      '#D4B15F',
  blush:     '#EBC9BD',
  mint:      '#DDE5D0',
  blueSoft:  '#D8E1E8',
  violet:    '#756988',
  warning:   '#C54739',

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
