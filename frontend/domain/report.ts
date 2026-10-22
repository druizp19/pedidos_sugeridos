import type { ClientOption, MatrixResponse, ClientMatrixResponse, MatrixBrand } from '@/types';

export type Version = { id: string; label: string; months: number; previousMonths: number; enabled: boolean; revision?: string; publishedAt?: string | null };
// Compatibility for summaries generated before ods.REPORTE_VERSION existed.
// Availability always comes from SQL; new version periods come from metadata.
export const VERSIONS: Version[] = [
  { id: 'V1', label: 'Enero – mayo 2026', months: 5, previousMonths: 5, enabled: true },
  { id: 'V2', label: 'Enero – agosto 2026', months: 8, previousMonths: 8, enabled: false },
];
export type Query = { version: string; unit: 'UNIDAD' | 'VALOR'; units: string[]; franchises: string[];
  brands: string[]; categories: string[]; zones: string[]; supervisors: string[]; sellers: string[];
  clients: string[]; search: string; client?: string; allowedZones?: string[] };
export type Material = { code: string; sku: string; unit: string; franchise: string; brand: string; market: string; competitor: boolean };
export type Seller = { zone: string; seller: string; supervisor: string };
export type Catalog = { materials: Material[]; clients: ClientOption[]; sellers: Seller[] };
export type Sale = { scope: 'main' | 'territory'; code: string; actual: number; previous: number };
export type Purchase = { ruc: string; code: string; actual: number };
export type DistributorSale = { code: string; distributor: string; actual: number };
export type Snapshot = { sales: Sale[]; purchases: Purchase[]; distributors: DistributorSale[] };
export const zoneCode = (zone: string) => zone.trim().split(' - ')[0];
// Commercial codes are matched by code; geographic segments retain their full name.
export const clientZoneKey = (zone: string) => {
  const value = zone.trim();
  return /^[A-Za-z][0-9]+(?: - |$)/.test(value) ? zoneCode(value) : value;
};
export function assignClientSellers(clients: ClientOption[], sellers: Seller[]): ClientOption[] {
  const byZone = new Map<string, string[]>();
  for (const seller of sellers) {
    const key = clientZoneKey(seller.zone);
    const name = seller.seller.trim();
    if (!key || !name) continue;
    const names = byZone.get(key) || [];
    if (!names.includes(name)) names.push(name);
    byZone.set(key, names);
  }
  return clients.map(client => {
    if ((client.zona_cliente || '').trim().toUpperCase().startsWith('CD')) {
      return {...client, vendedores: ['CADENAS'], supervisor: 'CADENAS'};
    }
    const names = byZone.get(clientZoneKey(client.zona_cliente || ''));
    return {...client, vendedores: names ? [...names] : ['Marketing'],
      supervisor: names ? client.supervisor : 'SUPERVISOR MKT'};
  });
}
export const brandKey = (m: Material) => JSON.stringify([m.unit, m.franchise, m.brand]);
/** Internal population derived from the same assignments used by options/detail.
 * undefined means no seller restriction; [] means no matching customers.
 * Client detail retains its own context, as before. Never accept this from HTTP.
 */
export function assignedClientRucs(clients: ClientOption[], q: Query): string[] | undefined {
  if (q.client || (!q.sellers.length && !q.supervisors.length)) return undefined;
  return clients.filter(c => (!q.supervisors.length || q.supervisors.includes(c.supervisor || ''))
    && (!q.sellers.length || (c.vendedores || []).some(s => q.sellers.includes(s))))
    .map(c => c.ruc);
}
export const categories = ['DIAMANTE','ORO','PLATA','BRONCE','PLOMO'];
export const matchesMaterial = (m: Material, q: Query) => m.brand.trim() !== '' && m.brand.trim().toUpperCase() !== 'COMPETIDORES'
  && (!q.units.length || q.units.includes(m.unit)) && (!q.franchises.length || q.franchises.includes(m.franchise))
  && (!q.brands.length || q.brands.includes(m.brand));
export function clientMatches(c: ClientOption, q: Query): boolean {
  return (!q.allowedZones || q.allowedZones.includes(zoneCode(c.zonabase || '')))
    && (!q.categories.length || q.categories.includes(c.categorizacion))
    && (!q.zones.length || q.zones.some(z => clientZoneKey(z) === clientZoneKey(c.zona_cliente || '')))
    && (!q.supervisors.length || q.supervisors.includes(c.supervisor || ''))
    && (!q.sellers.length || (c.vendedores || []).some(s => q.sellers.includes(s)));
}
type Amount = { actual: number; previous: number };
const zero = (): Amount => ({ actual: 0, previous: 0 });
const add = (a: Amount, b: Amount) => { a.actual += b.actual; a.previous += b.previous; };
function metrics(own: Amount, market: Amount, territoryOwn: Amount, territoryMarket: Amount, version: Version) {
  const share = (n: number, d: number) => d > 0 ? n / d : 0;
  const ms_act = share(own.actual, market.actual);
  const ms_ant = share(own.previous, market.previous);
  const ms_territorio = share(territoryOwn.actual, territoryMarket.actual);
  const ms_ideal = Math.max(ms_act, ms_ant, ms_territorio);
  return { vta_act: own.actual / version.months, vta_mdo: market.actual / version.months,
    ms_act, ms_ant, ms_territorio, ms_ideal, estimacion: market.actual / version.months * ms_ideal };
}

/** Ratios are recomputed at SKU, brand and total levels. Shared markets count once.
 * Selected client columns never change the main population, matching legacy behavior. */
export function calculateReport(catalog: Catalog, snapshot: Snapshot, q: Query, version: Version, columns: ClientOption[]): MatrixResponse | ClientMatrixResponse {
  const materials = new Map(catalog.materials.map(m => [m.code, m]));
  const main = new Map<string, Amount>(), territory = new Map<string, Amount>();
  const markets = new Map<string, Amount>(), territoryMarkets = new Map<string, Amount>();
  for (const row of snapshot.sales) {
    const m = materials.get(row.code); if (!m) continue;
    const values = row.scope === 'main' ? main : territory;
    const totals = row.scope === 'main' ? markets : territoryMarkets;
    if (!values.has(row.code)) values.set(row.code, zero());
    add(values.get(row.code)!, row);
    if (!totals.has(m.market)) totals.set(m.market, zero());
    add(totals.get(m.market)!, row);
  }
  const ownCatalog = catalog.materials.filter(m => matchesMaterial(m, q));
  const visible = ownCatalog.filter(m => q.client || main.has(m.code));
  const grouped = new Map<string, Material[]>();
  for (const m of visible) { const key = brandKey(m); grouped.set(key, [...(grouped.get(key) || []), m]); }
  const sumCodes = (items: Material[], values: Map<string, Amount>) => {
    const total = zero(); for (const m of items) add(total, values.get(m.code) || zero()); return total;
  };
  const sumMarkets = (items: Material[], values: Map<string, Amount>) => {
    const total = zero(); for (const market of new Set(items.map(m => m.market))) add(total, values.get(market) || zero()); return total;
  };
  const purchases = new Set(snapshot.purchases.filter(p => p.actual > 0).map(p => JSON.stringify([p.ruc, p.code])));
  const flags = (items: Material[]) => Object.fromEntries(columns.map(c => [c.cp_cliente,
    { compra: items.some(m => purchases.has(JSON.stringify([c.ruc, m.code]))) ? 'SI' as const : 'NO' as const, quintil: c.quintil }]));
  const distByCode = new Map<string, Record<string, number>>();
  for (const d of snapshot.distributors) {
    if (!distByCode.has(d.code)) distByCode.set(d.code, {});
    const values = distByCode.get(d.code)!;
    values[d.distributor] = (values[d.distributor] || 0) + d.actual / version.months;
  }
  const distFor = (items: Material[]) => {
    const values: Record<string, number> = {};
    for (const m of items) for (const [d, v] of Object.entries(distByCode.get(m.code) || {})) values[d] = (values[d] || 0) + v;
    return values;
  };
  const territorialGroups = new Map<string, Material[]>();
  for (const material of ownCatalog) {
    if (!q.client && !territory.has(material.code)) continue;
    const key = brandKey(material);
    const group = territorialGroups.get(key);
    if (group) group.push(material); else territorialGroups.set(key, [material]);
  }
  const brands: MatrixBrand[] = [...grouped.values()].map(items => {
    const m = items[0];
    const territorialItems = territorialGroups.get(brandKey(m)) || [];
    return { marca: m.brand, unidad_negocio: m.unit, franquicia: m.franchise,
      ...metrics(sumCodes(items, main), sumMarkets(items, markets), sumCodes(territorialItems, territory), sumMarkets(territorialItems, territoryMarkets), version),
      clients: flags(items), distribuidoras: distFor(items),
      skus: items.map(s => ({ sku: s.sku,
        ...metrics(main.get(s.code) || zero(), markets.get(s.market) || zero(), territory.get(s.code) || zero(), territoryMarkets.get(s.market) || zero(), version),
        clients: flags([s]), distribuidoras: distFor([s]) })).sort((a,b) => b.estimacion-a.estimacion) };
  }).filter(b => !q.search || b.marca.toLowerCase().includes(q.search.toLowerCase()) || b.skus.some(s => s.sku.toLowerCase().includes(q.search.toLowerCase())))
    .sort((a,b) => b.estimacion-a.estimacion);
  const totals = { marca: 'Total general', ...metrics(sumCodes(ownCatalog, main), sumMarkets(ownCatalog, markets), sumCodes(ownCatalog, territory), sumMarkets(ownCatalog, territoryMarkets), version), distribuidoras: distFor(visible) };
  const common = { unidad_medida: q.unit === 'VALOR' ? 'S/ SOLES' : 'UNIDAD', periodo: version.label, publicado_en: version.publishedAt ?? null, brands, totals, total_brands_count: brands.length };
  if (q.client) {
    const client = columns[0]; if (!client) throw new Error('Cliente no encontrado');
    return { ...common, client, distributors: Object.keys(totals.distribuidoras).sort((a,b) => totals.distribuidoras[b]-totals.distribuidoras[a]) };
  }
  return { ...common, client_columns: columns, total_clients_count: catalog.clients.filter(c => clientMatches(c, q)).length };
}
