import { Link } from 'react-router-dom'
import { T, fmtDateRangeShort, pad2 } from '../lib/tokens'
import ArtworkMedia from './ArtworkMedia'
import { getExhibitionThumbnailUrl } from '../lib/exhibition'
import { getThumbnailUrl } from '../lib/imageUrl'

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

export default function ExhibitionListCard({ exhibition: exh, org, profile, showOrgName = true, artworkCount }) {
  const thumbnailUrl = getExhibitionThumbnailUrl(exh)
  const ownerSlug = org?.slug || (profile?.slug ? `@${profile.slug}` : '')
  const ownerName = org?.name || profile?.display_name
  return (
    <Link to={`/${ownerSlug}/exhibition/${exh.slug}`} className="ui-list-card ui-exhibition-list-card">
      <div className="ui-exhibition-list-card-body">
        {showOrgName && ownerName && (
          <div className="ui-exhibition-list-card-meta">
            <span className="ui-exhibition-list-card-tag">{ownerName}</span>
          </div>
        )}
        <div className="ui-exhibition-list-card-content">
          <div className="ui-exhibition-list-card-title">{exh.title}</div>
          {exh.location?.trim() && (
            <div className="ui-exhibition-list-card-location">
              <LocationPin />
              <span>{exh.location}</span>
            </div>
          )}
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
