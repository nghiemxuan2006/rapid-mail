import axios from "axios"
const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
const apiService = axios.create({
    baseURL: baseUrl,
    headers: {
        Accept: 'application/json',
    }
})


const access_token = localStorage.getItem('access_token');
const refresh_token = localStorage.getItem('refresh_token')
apiService.interceptors.request.use((config) => {
    // Do something before request is sent
    if (config.headers) {
        config.headers.Authorization = `Bearer ${access_token}`
    }
    return config
})

apiService.interceptors.response.use((response) => {
    // Do something with response data

    return response
}, (error) => {
    // Do something with response error
    // refresh token when accesstoken is expired
    const status = error.response?.status || 500;
    switch (status) {
        // authentication
        case 401:
            break;
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