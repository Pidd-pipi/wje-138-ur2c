export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });
  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    let code = 'REQUEST_FAILED';
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
      if (body?.code) code = body.code;
    } catch {
      // 非 JSON 错误体时使用默认信息
    }
    throw new ApiError(message, response.status, code);
  }
  return response.json() as Promise<T>;
}
