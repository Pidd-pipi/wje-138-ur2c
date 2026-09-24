export type ApiErrorBody = { detail?: string; code?: string; [key: string]: unknown };

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function resolveMessage(response: Response): Promise<{ message: string; code?: string }> {
  const raw = await response.text();
  try {
    const body = JSON.parse(raw) as ApiErrorBody;
    if (typeof body.detail === 'string') return { message: body.detail, code: body.code };
    const first = Object.values(body)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return { message: first[0] };
  } catch {
    // 非 JSON 错误体时回退到状态码提示
  }
  return { message: raw || `请求失败（${response.status}）` };
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }, ...init });
  if (!response.ok) {
    const { message, code } = await resolveMessage(response);
    throw new ApiError(message, response.status, code);
  }
  return response.json() as Promise<T>;
}
