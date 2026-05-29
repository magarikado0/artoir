import { Navigate, useLocation } from 'react-router-dom'
import { T } from '../lib/tokens'
import { useResolvedSession } from '../lib/useResolvedSession'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const { session, ready } = useResolvedSession()

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: T.paper }}>
        <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
