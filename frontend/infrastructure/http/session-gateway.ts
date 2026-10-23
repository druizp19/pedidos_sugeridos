import { getApiPath } from '@/lib/utils';
import type { AccessScope } from '@/domain/access';

export const SESSION_LOST = 'pedidos-session-lost';
export async function sessionRequest(action: 'session' | 'exchange' | 'logout', code?: string): Promise<AccessScope> {
  const response = await fetch(getApiPath(`/api/auth/${action}`), { credentials:'same-origin', cache:'no-store',
    method:action==='session'?'GET':'POST', headers:{'Content-Type':'application/json'},
    ...(action==='session'?{}:{body:JSON.stringify(code?{code}:{})}) });
  const result = await response.json();
  if(!response.ok || !result.success) throw new Error(result.error || 'No se pudo validar el acceso.');
  return result.data;
}
