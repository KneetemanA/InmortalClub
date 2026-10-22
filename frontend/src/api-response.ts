export type ApiResponse<T> = { success: boolean; data: T; message?: string; total?: number; pagination?: { total: number; page: number; limit: number; totalPages: number } };

export function unconfirmedChange(method: string) {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) ? ''
    : ' No se pudo confirmar si el cambio se guardó. Revisá el registro antes de volver a intentarlo.';
}

export async function readApiResponse<T>(response: Response, method = 'GET'): Promise<ApiResponse<T>> {
  const result: unknown = await response.json().catch(() => null);
  const json = result && typeof result === 'object' && 'success' in result && typeof result.success === 'boolean'
    ? result as ApiResponse<T> : null;
  if (response.status === 429) {
    const retry = response.headers.get('Retry-After');
    const seconds = retry ? (/^\d+$/.test(retry) ? Number(retry) : Math.ceil((Date.parse(retry) - Date.now()) / 1000)) : NaN;
    const wait = Number.isFinite(seconds) && seconds > 0 ? ` Volvé a intentar en ${Math.ceil(seconds)} segundos.` : ' Esperá un momento antes de volver a intentar.';
    throw new Error((json?.message || 'Se alcanzó el límite de solicitudes.') + wait);
  }
  if (json) return json;
  const message = response.status >= 500 ? `El servidor no está disponible temporalmente (HTTP ${response.status}).`
    : response.ok ? 'El servidor devolvió una respuesta inesperada.'
    : `No se pudo completar la solicitud (HTTP ${response.status}).`;
  throw new Error(message + unconfirmedChange(method));
}
