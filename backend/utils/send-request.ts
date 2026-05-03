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

    const isFormEncoded = headers?.['Content-Type'] === 'application/x-www-form-urlencoded';
    const body = data
        ? (isFormEncoded || typeof data === 'string' ? data : JSON.stringify(data))
        : undefined;

    const response = await fetch(finalUrl, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
    });

    const text = await response.text();
    const responseData = text ? JSON.parse(text) : {};

    return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
    };
}
