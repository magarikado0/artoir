export function exhStatus(exh) {
  const today = new Date().toISOString().slice(0, 10)
  if (!exh.start_date) return 'ended'
  if (exh.start_date > today) return 'upcoming'
  if (!exh.end_date || exh.end_date >= today) return 'live'
  return 'ended'
}
