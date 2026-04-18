import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function ProtectedRoute({ children }) {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
