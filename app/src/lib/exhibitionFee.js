export function getExhibitionFeeType(exhibition) {
  if (exhibition?.fee_type === 'free') return 'free'
  if (exhibition?.fee_type === 'paid') return 'paid'
  return getExhibitionFeeDetail(exhibition) ? 'paid' : 'free'
}

export function getExhibitionFeeDetail(exhibition) {
  return String(exhibition?.fee_detail || '').trim()
}

export function getExhibitionFeeLabel(exhibition) {
  return getExhibitionFeeType(exhibition) === 'paid' ? '有料' : '無料'
}

export function getExhibitionFeeSummary(exhibition) {
  const feeType = getExhibitionFeeType(exhibition)
  if (feeType === 'free') return '無料'
  const feeDetail = getExhibitionFeeDetail(exhibition)
  return feeDetail ? `有料 / ${feeDetail}` : '有料'
}