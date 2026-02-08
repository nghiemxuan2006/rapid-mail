type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

interface RequestConfig {
    method: HttpMethod;
    url: string;
    data?: any;
    params?: any;
    headers?: Record<string, string>;
}

interface FetchResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
}

export async function sendRequest<T = any>(
    config: RequestConfig
): Promise<FetchResponse<T>> {
    const { url, method, data, params, headers } = config;

    let finalUrl = url;
    if (params) {
        const queryString = new URLSearchParams(params).toString();
        finalUrl = `${url}?${queryString}`;
    }

    const response = await fetch(finalUrl, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json();

    return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
    };
}
