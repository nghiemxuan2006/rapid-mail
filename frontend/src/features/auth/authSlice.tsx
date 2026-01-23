import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AuthState {
    isAuthenticated: boolean
    user: {
        email?: string
        name?: string
    } | null
    loading: boolean
    error: string | null
}

// Khởi tạo state từ localStorage ngay từ đầu
const getInitialAuthState = (): AuthState => {
    const accessToken = localStorage.getItem('access_token')

    return {
        isAuthenticated: !!accessToken, // true nếu có token
        user: null,
        loading: false,
        error: null,
    }
}

const initialState: AuthState = getInitialAuthState()

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{
                accessToken: string
                refreshToken?: string
                user?: { email?: string; name?: string }
            }>
        ) => {
            state.user = action.payload.user || null
            state.isAuthenticated = true
            state.error = null

            // Lưu tokens vào localStorage
            localStorage.setItem('access_token', action.payload.accessToken)
            if (action.payload.refreshToken) {
                localStorage.setItem('refresh_token', action.payload.refreshToken)
            }
        },
        logout: (state) => {
            state.isAuthenticated = false
            state.user = null
            state.error = null

            // Xóa tokens khỏi localStorage
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },
        initializeAuth: (state) => {
            // Kiểm tra token trong localStorage khi app khởi động
            const token = localStorage.getItem('access_token')

            if (token) {
                state.isAuthenticated = true
            }
        },
    },
})

export const { setCredentials, logout, setLoading, setError, initializeAuth } = authSlice.actions

export default authSlice.reducer
