import { ParsedQs } from 'qs';

type QueryParam = string | ParsedQs | (string | ParsedQs)[] | undefined;

/**
 * Asegura que un parámetro de URL sea string
 */
export function ensureString(param: string | string[] | undefined): string {
  if (!param) {
    throw new Error('Parámetro requerido');
  }
  if (Array.isArray(param)) {
    if (param.length === 0) {
      throw new Error('Parámetro vacío');
    }
    return param[0]; // Tomar el primero si es array
  }
  return param;
}

/**
 * Convierte cualquier query param a string de manera segura
 */
function queryParamToString(param: string | ParsedQs | undefined): string | undefined {
  if (!param) return undefined;
  if (typeof param === 'string') return param;
  if (typeof param === 'object') {
    const values = Object.values(param);
    if (values.length > 0) {
      const first = values[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'number') return String(first);
      if (typeof first === 'boolean') return String(first);
    }
    return undefined;
  }
  return undefined;
}

/**
 * Asegura que un query param sea string
 */
export function ensureQueryString(param: QueryParam): string | undefined {
  if (!param) return undefined;
  
  if (Array.isArray(param)) {
    if (param.length === 0) return undefined;
    return queryParamToString(param[0]);
  }
  
  return queryParamToString(param);
}

/**
 * Asegura que un query param sea number
 */
export function ensureQueryNumber(param: QueryParam): number | undefined {
  const str = ensureQueryString(param);
  if (!str) return undefined;
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

/**
 * Asegura que un query param sea boolean
 */
export function ensureQueryBoolean(param: QueryParam): boolean | undefined {
  const str = ensureQueryString(param);
  if (!str) return undefined;
  return str.toLowerCase() === 'true' || str === '1';
}

/**
 * Asegura que un query param sea array de strings
 */
export function ensureQueryArray(param: QueryParam): string[] {
  if (!param) return [];
  
  if (Array.isArray(param)) {
    return param
      .map(item => queryParamToString(item))
      .filter((item): item is string => item !== undefined);
  }
  
  const result = queryParamToString(param);
  return result ? [result] : [];
}