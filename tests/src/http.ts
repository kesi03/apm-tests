export interface HttpResponse {
  status: number;
  ok: boolean;
  text: string;
  body: unknown;
}

export interface RequestOptions {
  timeout?: number;
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

export async function request(
  url: string,
  { timeout = 5000, method = 'GET', body, headers }: RequestOptions = {}
): Promise<HttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const requestHeaders: Record<string, string> = {};
  if (body !== undefined) {
    requestHeaders['content-type'] = 'application/json';
  }
  if (headers) {
    Object.assign(requestHeaders, headers);
  }
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      method,
      headers: requestHeaders,
      ...(body !== undefined ? { body } : {})
    });
    const text = await response.text();
    let bodyValue: unknown = text;
    try {
      bodyValue = JSON.parse(text);
    } catch {
      // keep the raw text body
    }
    return { status: response.status, ok: response.ok, text, body: bodyValue };
  } finally {
    clearTimeout(timer);
  }
}

export async function get(url: string, options?: RequestOptions): Promise<HttpResponse> {
  return request(url, options);
}

export async function post(url: string, body: string, options?: RequestOptions): Promise<HttpResponse> {
  return request(url, { ...options, method: 'POST', body });
}
