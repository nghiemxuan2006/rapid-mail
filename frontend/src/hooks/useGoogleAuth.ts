import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { CLIENT_ID, GMAIL_SCOPES, BACKEND_BASE_URL } from '@/constants'
import { useAppDispatch } from '@/app/hook'
import { setCredentials, setError as setAuthError, setLoading as setAuthLoading } from '@/features/auth/authSlice'

export function useGoogleAuth() {
    const [loading, setLoading] = useState(false)
    const [authCode, setAuthCode] = useState<string | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [refreshToken, setRefreshToken] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const ready = useMemo(() => Boolean(CLIENT_ID), [CLIENT_ID])

    // Đổi auth code lấy access_token qua backend; nếu không có backend, có thể gọi trực tiếp Google token endpoint (cần client_secret, không nên dùng ở production FE)
    const exchangeCodeForTokens = useCallback(
        async (code: string) => {
            setLoading(true)
            dispatch(setAuthLoading(true))
            try {
                if (!BACKEND_BASE_URL) {
                    throw new Error('Thiếu VITE_BASE_URL để gọi backend')
                }

                const res = await fetch(`${BACKEND_BASE_URL}/v1/auth/login?authorize_code=${encodeURIComponent(code)}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                })

                const data = await res.json()
                const receivedAccessToken = data.access_token || data.accessToken
                const receivedRefreshToken = data.refresh_token || data.refreshToken

                if (!receivedAccessToken) {
                    throw new Error('Backend không trả về access_token')
                }

                // Lưu vào Redux store
                dispatch(setCredentials({
                    accessToken: receivedAccessToken,
                    refreshToken: receivedRefreshToken,
                }))

                setAccessToken(receivedAccessToken)
                setRefreshToken(receivedRefreshToken ?? null)
                setError(null)
                dispatch(setAuthError(null))
                navigate('/campaigns')
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Không đổi được token'
                setError(errorMessage)
                dispatch(setAuthError(errorMessage))
            } finally {
                setLoading(false)
                dispatch(setAuthLoading(false))
            }
        },
        [BACKEND_BASE_URL, navigate, dispatch]
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
        if (!CLIENT_ID) {
            setError('Thiếu VITE_GOOGLE_CLIENT_ID trong file môi trường')
            return
        }
        setLoading(true)
        setAuthCode(null)
        setAccessToken(null)
        setRefreshToken(null)
        setError(null)
        login()
    }, [CLIENT_ID, login])

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
