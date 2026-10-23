import { AccessError, resolveScope, type PortalIdentity } from '@/domain/access';
import { query } from '../database/connection';

export const SESSION_COOKIE = 'pedidos_session';
export function publicOrigin() {
  const configured = process.env.PEDIDOS_PUBLIC_URL;
  if (!configured) throw new AccessError('Configura el acceso de Pedidos Sugeridos.', 503);
  const url = new URL(configured);
  if (!['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new AccessError('El acceso requiere HTTPS.', 503);
  }
  return url.origin;
}
export function requireSameOrigin(request: Request) {
  if (request.headers.get('origin') !== publicOrigin()) throw new AccessError('Origen no permitido.');
}
export function sessionToken(request: Request) {
  const entries = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).filter(s => s.startsWith(`${SESSION_COOKIE}=`));
  if (entries.length !== 1) throw new AccessError('Ingresa a Pedidos Sugeridos desde Ecosistema.', 401);
  const token = entries[0].slice(SESSION_COOKIE.length + 1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new AccessError('Sesión inválida.', 401);
  return token;
}
export function sessionCookie(token: string, expires?: number) {
  const path = process.env.NEXT_PUBLIC_BASE_PATH || '/sugerido';
  if (!/^\/[A-Za-z0-9/_-]*$/.test(path)) throw new AccessError('Ruta de sesión inválida.', 503);
  const secure = publicOrigin().startsWith('https:') ? '; Secure' : '';
  const age = expires ? Math.max(0, Math.floor((expires - Date.now()) / 1000)) : 0;
  return `${SESSION_COOKIE}=${token}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${age}${secure}`;
}
export async function portalCall<T>(action: 'exchange' | 'validate' | 'logout', body: object): Promise<T> {
  const base = process.env.ECOSISTEMA_INTERNAL_URL, secret = process.env.SUGERIDO_SERVICE_SECRET;
  if (!base || !secret || secret.length < 32) throw new AccessError('Integración con Ecosistema no configurada.', 503);
  const endpoint = new URL(`${base.replace(/\/$/, '')}/sugerido-sso/${action}`);
  if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname))) {
    throw new AccessError('La conexión a Ecosistema requiere HTTPS.', 503);
  }
  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json', 'X-Sugerido-Service': secret }, body: JSON.stringify(body) });
  } catch { throw new AccessError('No se pudo validar la sesión con Ecosistema. Intenta nuevamente.', 503); }
  if (!response.ok) {
    if (response.status === 401) throw new AccessError('Sesión vencida o acceso inválido. Ingresa desde Ecosistema.', 401);
    if (response.status === 403) throw new AccessError('Tu cuenta no tiene acceso o asignación para Pedidos Sugeridos.');
    throw new AccessError('Ecosistema no pudo validar el acceso. Intenta nuevamente.', 503);
  }
  return response.json() as Promise<T>;
}

export async function scopeForIdentity(user: PortalIdentity) {
  // Current commercial assignments apply to every report version, not historical permissions.
  const rows = user.rol === 'ADMINISTRADOR' ? [] : await query<{ zone: string; seller: string; supervisor: string }>(`
    SELECT DISTINCT zonabase AS zone, nombreFFVV AS seller, nombreSSVV AS supervisor
    FROM ods.DIM_VENDEDORES
    WHERE version = (SELECT TOP (1) v.version FROM ods.REPORTE_VERSION v
      WHERE EXISTS (SELECT 1 FROM ods.DIM_VENDEDORES d WHERE d.version=v.version)
      ORDER BY TRY_CONVERT(int, SUBSTRING(v.version,2,19)) DESC)`);
  return resolveScope(user, rows.map(s => ({ zone: s.zone.trim(), seller: s.seller.trim(), supervisor: s.supervisor.trim() })));
}
export async function authorize(request: Request) {
  const user = await portalCall<PortalIdentity>('validate', { session: sessionToken(request) });
  return scopeForIdentity(user);
}
