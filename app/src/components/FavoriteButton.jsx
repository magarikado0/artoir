import { useNavigate } from 'react-router-dom'
import { useFavorite } from '../lib/favoritesContext'

function HeartIcon({ filled, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function BookmarkIcon({ filled, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  )
}

const KIND_PRESET = {
  like: { Icon: HeartIcon, onLabel: 'いいね済み', offLabel: 'いいね' },
  bookmark: { Icon: BookmarkIcon, onLabel: 'お気に入り済み', offLabel: 'お気に入り' },
}

/**
 * いいね（kind="like"）/ お気に入り（kind="bookmark"）のトグルボタン。
 * appearance="pill" はページ見出し用のラベル付きピル、"icon" はカード/モーダル用のアイコンのみ。
 * 未ログイン時に押すと /login へ誘導する。
 */
export default function FavoriteButton({
  targetType,
  targetId,
  kind = 'bookmark',
  appearance = 'pill',
  className,
  stopPropagation = false,
}) {
  const navigate = useNavigate()
  const { isFavorite, toggle, pending, requiresLogin } = useFavorite(targetType, targetId)
  const { Icon, onLabel, offLabel } = KIND_PRESET[kind] || KIND_PRESET.bookmark

  if (!targetId) return null

  const label = isFavorite ? onLabel : offLabel
  const iconSize = appearance === 'icon' ? 18 : 16

  function handleClick(e) {
    if (stopPropagation) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (requiresLogin) {
      navigate('/login')
      return
    }
    toggle()
  }

  const classes = appearance === 'icon'
    ? ['ui-favorite-icon-btn', isFavorite && 'is-active', className]
    : ['ui-pill-action', 'ui-favorite-pill', isFavorite && 'ui-pill-action--accent', className]

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={isFavorite}
      aria-label={label}
      className={classes.filter(Boolean).join(' ')}
    >
      <Icon filled={isFavorite} size={iconSize} />
      {appearance !== 'icon' && <span>{label}</span>}
    </button>
  )
}
