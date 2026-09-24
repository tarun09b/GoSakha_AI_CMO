// frontend/lib/api.ts — HTTP client for the GoSakha backend API

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type ApiError = Error & {
  code?: string;
  status?: number;
};

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err: ApiError = new Error(
      `Cannot reach backend at ${API_BASE}. Is the server running?`
    );
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: ApiError = new Error(
      (data && (data.message as string)) || `Request failed (${res.status})`
    );
    err.code = data?.code;
    err.status = res.status;
    throw err;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>('GET', path, undefined, token),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>('POST', path, body, token),
  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>('PATCH', path, body, token),
  del: <T>(path: string, token?: string) =>
    request<T>('DELETE', path, undefined, token),
};

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
};

export function login(email: string, password: string) {
  return api.post<LoginResponse>('/api/auth/login', { email, password });
}