import { Navigate, useLocation } from 'react-router-dom'
import { T } from '../lib/tokens'
import { useResolvedSession } from '../lib/useResolvedSession'
import { useDelayedLoading } from '../lib/useDelayedLoading'
import LoadingFrames from './LoadingFrames'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const { session, ready } = useResolvedSession()
  const showLoader = useDelayedLoading(!ready)

  if (showLoader) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: T.paper }}>
        <LoadingFrames />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
