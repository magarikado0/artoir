/** 配色は「紙色＋墨色」＋アクセント（テラコッタ・金）に寄せ、副次は ink 系と暖色のみに揃える */
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
  /** 装飾スポット（旧 moss）。新規は accentInk 優先 */
  moss:      '#8B4D3A',
  /** 非推奨: accentInk に置き換え済み。参照が残る型用 */
  slate:     '#7A2F24',
  gold:      '#D4B15F',
  blush:     '#EBC9BD',
  mint:      '#DDE5D0',
  /** 画像プレースホルダ（旧 blueSoft）。寒色の水色は使わない */
  surfaceMuted: '#E5D9C8',
  blueSoft:  '#E5D9C8',
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

export function externalHost(href) {
  if (!href) return ''
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}
