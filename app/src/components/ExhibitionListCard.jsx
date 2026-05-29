import { Link } from 'react-router-dom'
import { T, fmtDateDot, pad2 } from '../lib/tokens'
import ExhibitionFeeBadge from './ExhibitionFeeBadge'
import ArtworkMedia from './ArtworkMedia'
import { getExhibitionThumbnailUrl } from '../lib/exhibition'
import { getThumbnailUrl } from '../lib/imageUrl'

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
  return <span className="ui-status-badge" style={{ background: bg, color }}>{text}</span>
}

export default function ExhibitionListCard({ exhibition: exh, org, showOrgName = true }) {
  const placeholderBg = `linear-gradient(135deg, ${T.surfaceMuted}, ${T.mint} 58%, ${T.blush})`
  const thumbnailUrl = getExhibitionThumbnailUrl(exh)
  return (
    <Link to={`/${org?.slug}/exhibition/${exh.slug}`} className="ui-list-card ui-exhibition-list-card" style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12, padding: 10 }}>
      {thumbnailUrl ? (
        <ArtworkMedia
          src={getThumbnailUrl(thumbnailUrl, 96)}
          alt=""
          decorative
          loading="lazy"
          aspectRatio="1 / 1"
          fit="contain"
          wrapperStyle={{ width: 96, borderRadius: 7 }}
        />
      ) : (
        <div style={{ width: 96, aspectRatio: '1 / 1', borderRadius: 7, background: placeholderBg, boxShadow: `inset 0 -3px 0 ${T.gold}`, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>{pad2((exh.title || '').length || 1)}</span>
        </div>
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2px 0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <StatusDot exhibition={exh} />
            <ExhibitionFeeBadge exhibition={exh} />
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.inkMuted }}>{fmtDateDot(exh.start_date)}</span>
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 18, lineHeight: 1.35, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis' }}>{exh.title}</div>
          {showOrgName && org?.name && (
            <div style={{ marginTop: 4, fontSize: 12, color: T.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</div>
          )}
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, color: T.inkSoft }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exh.location || '会場未設定'}</span>
          <span style={{ fontFamily: T.mono, flexShrink: 0 }}>→</span>
        </div>
      </div>
    </Link>
  )
}
