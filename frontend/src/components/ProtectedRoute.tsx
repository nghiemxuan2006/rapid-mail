import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hook'

interface ProtectedRouteProps {
    children: ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, loading } = useAppSelector((state) => state.auth)

    // Hiển thị loading khi đang check authentication
    if (loading) {
        return <div>Loading...</div>
    }

    // Redirect về login nếu chưa đăng nhập
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

export default ProtectedRoute
