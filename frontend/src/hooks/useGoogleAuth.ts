import { useCallback, useMemo, useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { GMAIL_SCOPES } from '@/constants'

export function useGoogleAuth() {
    const [loading, setLoading] = useState(false)
    const [authCode, setAuthCode] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const ready = useMemo(() => Boolean(clientId), [clientId])

    const login = useGoogleLogin({
        flow: 'auth-code',
        scope: GMAIL_SCOPES.join(' '),
        // scope: 'openid email profile',
        onSuccess: (response) => {
            setLoading(false)
            setAuthCode(response.code ?? null)
            setError(null)
        },
        onError: (err) => {
            setLoading(false)
            const message =
                (err as { error?: string; details?: string }).error ||
                (err as { details?: string }).details ||
                'Không thể đăng nhập Google'
            setError(message)
        },
    })

    const signInWithGoogle = useCallback(() => {
        if (!clientId) {
            setError('Thiếu VITE_GOOGLE_CLIENT_ID trong file môi trường')
            return
        }
        setLoading(true)
        setAuthCode(null)
        setError(null)
        login()
    }, [clientId, login])

    const reset = useCallback(() => {
        setAuthCode(null)
        setError(null)
        setLoading(false)
    }, [])

    return {
        signInWithGoogle,
        ready,
        loading,
        authCode,
        error,
        reset,
    }
}
