import apiService from "@/interceptors"

export const sendRequest = async (url: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', payload: any, thunkApi: any, headers = null) => {
    let config: any = {
        method: method,
        data: payload,
        url: url,
    }

    if (method === 'GET' || method === 'DELETE') {
        config = {
            method: method,
            params: payload,
            url: url
        }
    }
    if (headers) {
        config["headers"] = headers
    }
    try {
        return (await apiService(config)).data
    } catch (e) {
        console.log(e)
        // showNotifications('error', "Error")
        return thunkApi.rejectWithValue("Error")
    }
}