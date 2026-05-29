import { T } from '../lib/tokens'
import { getExhibitionFeeType } from '../lib/exhibition'

export default function ExhibitionFeeBadge({ exhibition, style, className = 'ui-status-badge' }) {
  const paid = getExhibitionFeeType(exhibition) === 'paid'
  return (
    <span
      className={className}
      style={{
        background: paid ? T.blush : T.mint,
        color: T.ink,
        ...style,
      }}
    >
      {paid ? '有料' : '無料'}
    </span>
  )
}