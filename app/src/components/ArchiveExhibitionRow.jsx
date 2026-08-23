import { Link } from 'react-router-dom'
import ArtworkMedia from './ArtworkMedia'
import ExhibitionStatusBadge from './ExhibitionStatusBadge'
import FavoriteButton from './FavoriteButton'
import { getExhibitionThumbnailUrl } from '../lib/exhibition'
import { getThumbnailUrl } from '../lib/imageUrl'
import { profileExhibitionPath, profilePath } from '../lib/profileRoutes'
import { fmtDateRange } from '../lib/tokens'

function exhibitionPath(exhibition, org, profile) {
  if (profile?.slug) return profileExhibitionPath(profile.slug, exhibition.slug)
  return `/${org?.slug || ''}/exhibition/${exhibition.slug}`
}

export default function ArchiveExhibitionRow({ exhibition, org, profile, creators = [], showOwner = true }) {
  const href = exhibitionPath(exhibition, org, profile)
  const ownerName = org?.name || profile?.display_name
  const ownerHref = org?.slug ? `/${org.slug}` : profile?.slug ? profilePath(profile.slug) : ''
  const thumbnailUrl = getExhibitionThumbnailUrl(exhibition)
  const displayCreators = creators.filter((creator) => creator.id !== profile?.id)

  return (
    <article className="ui-archive-exhibition-row">
      <Link className="ui-archive-exhibition-media" to={href} state={{ showExhibitionPageLoading: true }} tabIndex={-1} aria-hidden="true">
        {thumbnailUrl ? (
          <ArtworkMedia
            src={getThumbnailUrl(thumbnailUrl, 420)}
            alt=""
            decorative
            loading="lazy"
            fit="cover"
            fillHeight
          />
        ) : (
          <span className="ui-archive-media-placeholder" aria-hidden="true">{String(exhibition.title || '・').charAt(0)}</span>
        )}
      </Link>

      <div className="ui-archive-exhibition-copy">
        <div className="ui-archive-exhibition-kicker">
          <ExhibitionStatusBadge exhibition={exhibition} />
          <span>{fmtDateRange(exhibition.start_date, exhibition.end_date) || '会期未設定'}</span>
        </div>
        <h3><Link to={href} state={{ showExhibitionPageLoading: true }}>{exhibition.title}</Link></h3>
        <div className="ui-archive-exhibition-relations">
          {showOwner && ownerName && ownerHref && <Link to={ownerHref}>{ownerName}</Link>}
          {displayCreators.slice(0, 3).map((creator) => (
            <Link key={creator.id} to={profilePath(creator.slug)}>{creator.display_name || creator.slug}</Link>
          ))}
          {displayCreators.length > 3 && <span>ほか{displayCreators.length - 3}名</span>}
        </div>
        <div className="ui-archive-exhibition-meta">
          {exhibition.location && <span>{exhibition.location}</span>}
          {exhibition.artworkCount != null && <span>{exhibition.artworkCount}作品</span>}
        </div>
      </div>

      <FavoriteButton
        targetType="exhibition"
        targetId={exhibition.id}
        kind="bookmark"
        appearance="icon"
        className="ui-archive-row-favorite"
      />
    </article>
  )
}
