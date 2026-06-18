import { Link } from 'react-router-dom'
import { T, fmtDateRangeShort } from '../lib/tokens'
import ArtworkMedia from './ArtworkMedia'
import { getExhibitionThumbnailUrl } from '../lib/exhibition'
import { getThumbnailUrl } from '../lib/imageUrl'
import { profileExhibitionPath } from '../lib/profileRoutes'

function LocationPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" className="ui-exhibition-list-card-pin">
      <path
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.4" fill="currentColor" />
    </svg>
  )
}

function PlaceholderGlyph({ title }) {
  const initial = (title || '').trim().charAt(0) || '·'
  return (
    <span
      aria-hidden="true"
      style={{
        fontFamily: T.serif,
        fontSize: 48,
        color: '#B3AAA0',
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  )
}

export function ExhibitionCardMedia({ thumbnailUrl, title }) {
  if (thumbnailUrl) {
    return (
      <ArtworkMedia
        src={getThumbnailUrl(thumbnailUrl, 480)}
        alt=""
        decorative
        loading="lazy"
        fit="cover"
        fillHeight
        background={T.paperAlt}
        className="ui-exhibition-list-card-thumb"
      />
    )
  }
  return (
    <div className="ui-exhibition-list-card-thumb is-placeholder">
      <PlaceholderGlyph title={title} />
    </div>
  )
}

export default function ExhibitionListCard({ exhibition: exh, org, profile, showOrgName = true, artworkCount }) {
  const thumbnailUrl = getExhibitionThumbnailUrl(exh)
  const exhibitionHref = profile?.slug ? profileExhibitionPath(profile.slug, exh.slug) : `/${org?.slug || ''}/exhibition/${exh.slug}`
  const ownerName = org?.name || profile?.display_name
  return (
    <Link
      to={exhibitionHref}
      state={{ showExhibitionPageLoading: true }}
      className="ui-list-card ui-exhibition-list-card"
    >
      <div className="ui-exhibition-list-card-media">
        <ExhibitionCardMedia thumbnailUrl={thumbnailUrl} title={exh.title} />
      </div>
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
            <span className="ui-exhibition-list-card-count">{artworkCount} works</span>
          )}
        </div>
      </div>
    </Link>
  )
}
