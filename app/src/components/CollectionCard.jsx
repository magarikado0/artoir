import { Link } from 'react-router-dom'
import ArtworkMedia from './ArtworkMedia'
import FavoriteButton from './FavoriteButton'
import { getThumbnailUrl } from '../lib/imageUrl'

/**
 * コレクション一覧の縦型カード。作品・展覧会・公開ページで共通利用する。
 * 画像が無い場合はストライプのプレースホルダーを表示する。
 */
export default function CollectionCard({
  to,
  imageUrl,
  title,
  subtitle,
  targetType,
  targetId,
  kind = 'bookmark',
}) {
  return (
    <Link to={to} className="ui-collection-card">
      <div className={`ui-collection-card-media${imageUrl ? '' : ' is-placeholder'}`}>
        {imageUrl && (
          <ArtworkMedia
            src={getThumbnailUrl(imageUrl, 480)}
            alt=""
            decorative
            loading="lazy"
            fit="contain"
            fillHeight
            className="ui-collection-card-thumb"
          />
        )}
        <FavoriteButton
          targetType={targetType}
          targetId={targetId}
          kind={kind}
          appearance="icon"
          stopPropagation
          className="ui-collection-card-fav"
        />
      </div>
      <div className="ui-collection-card-body">
        <div className="ui-collection-card-title">{title || '無題'}</div>
        {subtitle && <div className="ui-collection-card-sub">{subtitle}</div>}
      </div>
    </Link>
  )
}
