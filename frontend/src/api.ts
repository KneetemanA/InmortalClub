const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type ApiResponse<T> = { success: boolean; data: T; message?: string; total?: number; pagination?: { total: number; page: number; limit: number; totalPages: number } };

export async function api<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('inmortal_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({ success: false, message: 'Respuesta inválida del servidor' }));
  if (response.status === 401 && token) {
    localStorage.removeItem('inmortal_token');
    localStorage.removeItem('inmortal_user');
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!response.ok || !result.success) throw new Error(result.message || 'No se pudo completar la operación');
  return result;
}

export const money = (value: number | string = 0) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value));
export const date = (value?: string) => value ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
export const todayInput = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
