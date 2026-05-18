import { T } from '../lib/tokens'
import { getExhibitionFeeType } from '../lib/exhibitionFee'

export default function ExhibitionFeeBadge({ exhibition, style }) {
  const paid = getExhibitionFeeType(exhibition) === 'paid'
  return (
    <span
      className="ui-status-badge"
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