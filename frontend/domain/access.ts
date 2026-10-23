import { clientZoneKey, type Catalog, type Seller } from './report';

export class AccessError extends Error {
  constructor(message: string, public readonly status: 401 | 403 | 503 = 403) { super(message); }
}
export type PortalIdentity = { id_usuario: number; nombre: string; rol: string;
  representante_name: string | null; supervisor_name: string | null };
export type AccessScope = { userId: number; name: string; role: string; zones?: string[]; assignments?: Seller[] };

export function resolveScope(user: PortalIdentity, sellers: Seller[]): AccessScope {
  if (!Number.isSafeInteger(user.id_usuario) || user.id_usuario <= 0) throw new AccessError('Identidad inválida', 401);
  const base = { userId: user.id_usuario, name: user.nombre, role: user.rol };
  // Portal already verified the explicit SUGERIDO system grant, including for administrators.
  if (user.rol === 'ADMINISTRADOR') return base;
  if (!['REPRESENTANTE', 'SUPERVISOR'].includes(user.rol) || !user.supervisor_name?.trim()) {
    throw new AccessError('Tu cuenta no tiene una asignación comercial. Contacta al administrador.');
  }
  const assignments = sellers.filter(s => s.supervisor.trim() === user.supervisor_name!.trim()
    && (user.rol === 'SUPERVISOR' || (!!user.representante_name?.trim() && s.seller.trim() === user.representante_name.trim())));
  const zones = [...new Set(assignments.map(s => clientZoneKey(s.zone)))].sort();
  if (!zones.length || zones.some(z => !/^[A-Za-z]+[0-9]+$/.test(z))) {
    throw new AccessError('No tienes zonas comerciales asignadas. Contacta al administrador.');
  }
  return { ...base, zones, assignments: assignments.sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };
}

/** Clone scoped metadata: never mutate the shared catalog cache or leak other sellers on shared zones. */
export function scopeCatalog(catalog: Catalog, zones?: string[], assignments?: Seller[]): Catalog {
  if (zones === undefined) return catalog;
  const visible = assignments ?? catalog.sellers.filter(s => zones.includes(clientZoneKey(s.zone)));
  return { ...catalog, sellers: visible,
    clients: catalog.clients.filter(c => zones.includes(clientZoneKey(c.zona_cliente || ''))).map(c => {
      const assigned = visible.filter(s => clientZoneKey(s.zone) === clientZoneKey(c.zona_cliente || ''));
      return { ...c, vendedores: [...new Set(assigned.map(s => s.seller))],
        supervisor: [...new Set(assigned.map(s => s.supervisor))].join(' / ') };
    }) };
}
