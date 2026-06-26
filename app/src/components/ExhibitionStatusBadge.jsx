import { exhStatus } from '../lib/exhibition'

// 形アイコンは色覚に依存しない冗長表現（色は補助）。currentColor でラベル色に追従する。
const SHAPE = {
  live: <circle cx="6" cy="6" r="4" fill="currentColor" />,
  upcoming: <path d="M4 3l5 3-5 3z" fill="currentColor" />,
  ended: <rect x="2.5" y="2.5" width="7" height="7" rx="1" fill="currentColor" />,
}

const LABEL = {
  live: '開催中',
  upcoming: '開催予定',
  ended: '終了',
}

/**
 * 展覧会の開催状態バッジ。会期日付（start_date / end_date）から自動判定する。
 * 言葉ラベル＋形アイコンで意味を伝え、色は補助。
 */
export default function ExhibitionStatusBadge({ exhibition, className = '' }) {
  if (!exhibition) return null
  const kind = exhStatus(exhibition)
  return (
    <span className={`ui-exh-status ui-exh-status--${kind} ${className}`.trim()}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        {SHAPE[kind]}
      </svg>
      <span>{LABEL[kind]}</span>
    </span>
  )
}
