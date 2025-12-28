import { useCallback, useMemo, useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { GMAIL_SCOPES } from '@/constants'

export function useGoogleAuth() {
    const [loading, setLoading] = useState(false)
    const [authCode, setAuthCode] = useState<string | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [refreshToken, setRefreshToken] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI
    const backendBaseUrl = import.meta.env.VITE_BASE_URL
    const ready = useMemo(() => Boolean(clientId), [clientId])

    // Đổi auth code lấy access_token qua backend; nếu không có backend, có thể gọi trực tiếp Google token endpoint (cần client_secret, không nên dùng ở production FE)
    const exchangeCodeForTokens = useCallback(
        async (code: string) => {
            setLoading(true)
            try {
                if (backendBaseUrl) {
                    const res = await fetch(`${backendBaseUrl}/auth/google/exchange`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code }),
                    })

                    if (!res.ok) {
                        let message = 'Không đổi được token từ backend'
                        try {
                            const data = await res.json()
                            message = data?.message || data?.error || message
                        } catch (err) {
                            // ignore parse error
                        }
                        throw new Error(message)
                    }

                    const data = await res.json()
                    const receivedAccessToken = data.access_token || data.accessToken
                    const receivedRefreshToken = data.refresh_token || data.refreshToken

                    if (!receivedAccessToken) {
                        throw new Error('Backend không trả về access_token')
                    }

                    localStorage.setItem('access_token', receivedAccessToken)
                    if (receivedRefreshToken) {
                        localStorage.setItem('refresh_token', receivedRefreshToken)
                    }

                    setAccessToken(receivedAccessToken)
                    setRefreshToken(receivedRefreshToken ?? null)
                    setError(null)
                    return
                }

                // Fallback: đổi trực tiếp với Google token endpoint (cần client_secret và redirect_uri khớp cấu hình OAuth)
                if (!clientId || !clientSecret || !redirectUri) {
                    throw new Error('Thiếu client_id/client_secret/redirect_uri để gọi oauth2.googleapis.com/token')
                }

                const params = new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                })

                const res = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString(),
                })

                if (!res.ok) {
                    let message = 'Không đổi được token từ Google token endpoint'
                    try {
                        const data = await res.json()
                        message = data?.error_description || data?.error || message
                    } catch (err) {
                        // ignore parse error
                    }
                    throw new Error(message)
                }

                const data = await res.json()
                const receivedAccessToken = data.access_token
                const receivedRefreshToken = data.refresh_token

                if (!receivedAccessToken) {
                    throw new Error('Google không trả về access_token')
                }

                localStorage.setItem('access_token', receivedAccessToken)
                if (receivedRefreshToken) {
                    localStorage.setItem('refresh_token', receivedRefreshToken)
                }

                setAccessToken(receivedAccessToken)
                setRefreshToken(receivedRefreshToken ?? null)
                setError(null)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không đổi được token')
            } finally {
                setLoading(false)
            }
        },
        [backendBaseUrl, clientId, clientSecret, redirectUri]
    )

    const login = useGoogleLogin({
        flow: 'auth-code',
        scope: GMAIL_SCOPES.join(' '),
        // scope: 'openid email profile',
        onSuccess: (response) => {
            console.log("🚀 ~ useGoogleAuth ~ response:", response)
            setLoading(false)
            setAuthCode(response.code ?? null)
            setError(null)
            setAccessToken(null)
            setRefreshToken(null)

            // response.code chỉ là auth code, cần gửi về backend để đổi ra access_token
            if (response.code) {
                void exchangeCodeForTokens(response.code)
            } else {
                setError('Không nhận được auth code từ Google')
            }
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
        setAccessToken(null)
        setRefreshToken(null)
        setError(null)
        login()
    }, [clientId, login])

    const reset = useCallback(() => {
        setAuthCode(null)
        setAccessToken(null)
        setRefreshToken(null)
        setError(null)
        setLoading(false)
    }, [])

    return {
        signInWithGoogle,
        ready,
        loading,
        authCode,
        accessToken,
        refreshToken,
        error,
        reset,
    }
}
