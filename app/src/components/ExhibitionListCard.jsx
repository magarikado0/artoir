import { Link } from 'react-router-dom'
import { T, fmtDateRangeShort, pad2 } from '../lib/tokens'
import ExhibitionFeeBadge from './ExhibitionFeeBadge'
import ArtworkMedia from './ArtworkMedia'
import { getExhibitionThumbnailUrl } from '../lib/exhibition'
import { getThumbnailUrl } from '../lib/imageUrl'
import { getPublisherKindLabel } from '../lib/publisher'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseLocalDate(s) {
  if (!s) return null
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return new Date(s)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function matchesFilter(exh, filter) {
  if (filter === 'ALL') return true
  const today = startOfToday()
  const start = parseLocalDate(exh.start_date)
  const end = parseLocalDate(exh.end_date)
  if (filter === 'OPEN NOW') return Boolean(start && end && start <= today && today <= end)
  if (filter === 'UPCOMING') return Boolean(start && start > today)
  return true
}

function StatusDot({ exhibition }) {
  const live = matchesFilter(exhibition, 'OPEN NOW')
  const upcoming = matchesFilter(exhibition, 'UPCOMING')
  const text = live ? '開催中' : upcoming ? '予定' : '終了'
  const bg = live ? T.accent : upcoming ? T.gold : T.paperAlt
  const color = live ? T.paper : T.ink
  return <span className="ui-exhibition-list-card-badge" style={{ background: bg, color }}>{text}</span>
}

function LocationPin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="ui-exhibition-list-card-pin">
      <path
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="10" r="2.2" fill="#FFF9ED" />
    </svg>
  )
}

export function ExhibitionCardMedia({ thumbnailUrl, title }) {
  const placeholderBg = `linear-gradient(135deg, ${T.surfaceMuted}, ${T.mint} 58%, ${T.blush})`
  if (thumbnailUrl) {
    return (
      <ArtworkMedia
        src={getThumbnailUrl(thumbnailUrl, 176)}
        alt=""
        decorative
        loading="lazy"
        fit="contain"
        fillHeight
        background={T.paperAlt}
        className="ui-exhibition-list-card-thumb"
      />
    )
  }
  return (
    <div className="ui-exhibition-list-card-thumb is-placeholder" style={{ background: placeholderBg, boxShadow: `inset 0 -3px 0 ${T.gold}` }}>
      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{pad2((title || '').length || 1)}</span>
    </div>
  )
}

export default function ExhibitionListCard({ exhibition: exh, org, showOrgName = true, artworkCount }) {
  const thumbnailUrl = getExhibitionThumbnailUrl(exh)
  return (
    <Link to={`/${org?.slug}/exhibition/${exh.slug}`} className="ui-list-card ui-exhibition-list-card">
      <div className="ui-exhibition-list-card-body">
        <div className="ui-exhibition-list-card-meta">
          <StatusDot exhibition={exh} />
          <ExhibitionFeeBadge exhibition={exh} className="ui-exhibition-list-card-badge" />
          {showOrgName && org?.name && (
            <span className="ui-exhibition-list-card-tag">{org.name} / {getPublisherKindLabel(org)}</span>
          )}
        </div>
        <div className="ui-exhibition-list-card-content">
          <div className="ui-exhibition-list-card-title">{exh.title}</div>
          <div className="ui-exhibition-list-card-location">
            <LocationPin />
            <span>{exh.location || '会場未設定'}</span>
          </div>
        </div>
        <div className="ui-exhibition-list-card-footer">
          <span className="ui-exhibition-list-card-date">{fmtDateRangeShort(exh.start_date, exh.end_date)}</span>
          {artworkCount != null && (
            <span className="ui-exhibition-list-card-count">作品 {artworkCount}点</span>
          )}
        </div>
      </div>
      <div className="ui-exhibition-list-card-media">
        <ExhibitionCardMedia thumbnailUrl={thumbnailUrl} title={exh.title} />
      </div>
    </Link>
  )
}
