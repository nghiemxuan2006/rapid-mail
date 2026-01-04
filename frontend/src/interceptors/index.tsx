import axios, { AxiosError } from "axios"
const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
const apiService = axios.create({
    baseURL: baseUrl + '/v1',
    headers: {
        Accept: 'application/json',
    }
})


apiService.interceptors.request.use((config) => {
    // Do something before request is sent
    if (config.headers) {
        const access_token = localStorage.getItem('access_token');

        config.headers.Authorization = `Bearer ${access_token}`
    }
    return config
})


const handelUnauthorized = async (err: AxiosError) => {
    const originalRequest = err.response?.config;
    const refresh_token = localStorage.getItem('refresh_token');
    if (!refresh_token) {
        return handleLogout(err);
    }
    if (originalRequest?.url === '/auth/refresh-login') {
        // axiosInstance.post('/auth/logout');
        return handleLogout(err);
    }
    return await attemptTokenRefresh(originalRequest, refresh_token);
}

const handleLogout = (error: unknown) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return Promise.reject(error);
}

const attemptTokenRefresh = async (originalRequest: any, refresh_token: string) => {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${refresh_token}`,
        }
    };

    try {
        const response = await axios.post(baseUrl + '/v1/auth/refresh-token', {}, config);
        const newAccessToken = response.data.accessToken;
        localStorage.setItem('access_token', newAccessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiService(originalRequest);
    } catch (error) {
        return handleLogout(error)
    }
}

apiService.interceptors.response.use((response) => {
    // Do something with response data

    return response
}, async (error) => {
    // Do something with response error
    // refresh token when accesstoken is expired
    const status = error.response?.status || 500;
    switch (status) {
        // authentication
        case 401:
            return await handelUnauthorized(error);
        //forbidden
        case 403:
            break;
        //bad request
        case 400:
            break;
        //not found
        case 404:
            break;
        default:
            break;
    }
    return Promise.reject(error)
})

export default apiService