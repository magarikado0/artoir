import { Navigate } from 'react-router-dom'
import { useAuth } from '../App'

export default function ProtectedRoute({ children }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return children
}
