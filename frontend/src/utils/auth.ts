/**
 * Helper functions để lấy tokens từ localStorage
 */

export const getAccessToken = (): string | null => {
    return localStorage.getItem('access_token')
}

export const getRefreshToken = (): string | null => {
    return localStorage.getItem('refresh_token')
}

export const setTokens = (accessToken: string, refreshToken?: string): void => {
    localStorage.setItem('access_token', accessToken)
    if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken)
    }
}

export const clearTokens = (): void => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
}

export const isAuthenticated = (): boolean => {
    return !!getAccessToken()
}
