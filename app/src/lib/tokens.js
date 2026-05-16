/** 配色は「紙色＋墨色」＋アクセント（赤土・金・くすみ緑）に寄せる */
export const T = {
  paper:     '#F4E9D6',
  paperAlt:  '#E4D3B8',
  card:      '#FFF9ED',
  ink:       '#211813',
  inkSoft:   '#47382D',
  inkMuted:  '#887869',
  line:      '#43362C',
  lineSoft:  '#D8C5A6',
  accent:    '#BE553D',
  accentInk: '#7C2E22',
  /** 装飾スポット（旧 moss）。新規はくすみ緑の補助色として使用 */
  moss:      '#687047',
  /** 非推奨: accentInk に置き換え済み。参照が残る型用 */
  slate:     '#7C2E22',
  gold:      '#D3A842',
  blush:     '#E9BDAE',
  mint:      '#DCE0C4',
  /** 画像プレースホルダ（旧 blueSoft）。寒色の水色は使わない */
  surfaceMuted: '#E3D0B3',
  blueSoft:  '#E3D0B3',
  violet:    '#77677E',
  warning:   '#C13E31',

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
