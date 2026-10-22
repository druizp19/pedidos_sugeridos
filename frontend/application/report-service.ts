import { calculateReport, clientMatches, categories, assignedClientRucs, type Query, type Version } from '@/domain/report';
import { validVersionId } from '@/domain/report-versions';
import type { ReportRepository } from './ports/report-repository';
import type { ReportCaches } from './ports/report-cache';
export class InputError extends Error {}
export function parseQuery(body: Record<string, unknown>, allowedZones?: string[]): Query {
  const array = (key: string, max = 100): string[] => {
    const input = body[key] ?? [];
    if (!Array.isArray(input) || input.length > max || input.some(x => typeof x !== 'string' || x.length > 400)) throw new InputError(`Filtro inválido: ${key}`);
    return [...new Set(input.map(x => (x as string).trim()).filter(Boolean))].sort();
  };
  if (body.unidadMedida !== undefined && !['UNIDAD','S/ SOLES'].includes(String(body.unidadMedida))) throw new InputError('Métrica inválida');
  if (body.client !== undefined && (typeof body.client !== 'string' || !body.client.trim() || body.client.length > 400)) throw new InputError('Cliente inválido');
  const search = String(body.search || ''); if (search.length > 150) throw new InputError('Búsqueda demasiado larga');
  const version = String(body.version || 'V1'); if (!validVersionId(version)) throw new InputError('Versión inválida');
  const cat = array('categorizacion').map(c => ({Q1:'DIAMANTE',Q2:'ORO',Q3:'PLATA',Q4:'BRONCE',Q5:'PLOMO'}[c] || c));
  return { version, unit: body.unidadMedida === 'S/ SOLES' ? 'VALOR' : 'UNIDAD', units: array('unidadNegocio'), franchises: array('franquicia'),
    brands: array('marca'), categories: cat, zones: array('zonaBase'), supervisors: array('supervisor'), sellers: array('vendedor'),
    clients: array('selectedClients',100), search, client: body.client as string | undefined, allowedZones };
}
export class ReportService {
  constructor(private repo: ReportRepository, private caches: ReportCaches) {}
  async versions(): Promise<Version[]> {
    const versions = await this.caches.versions.get('versions', async () => (await this.repo.availableVersions()).filter(v => v.enabled));
    // Historical summaries without publication metadata cannot signal corrections.
    // Give them a five-minute generation until their metadata is installed.
    return versions.map(v => !v.revision || v.revision === 'legacy'
      ? {...v, revision: `legacy:${Math.floor(Date.now() / 300000)}`} : v);
  }
  private async catalog(version: Version) {
    return this.caches.catalogs.get(JSON.stringify(version), () => this.repo.catalog(version.id));
  }
  async options(q: Query) {
    const versions = await this.versions();
    const version = versions.find(v => v.id === q.version);
    if (!version) throw new InputError('Esta versión aún no está disponible para el reporte.');
    const catalog = await this.catalog(version);
    const clients = catalog.clients.filter(c => clientMatches(c,q));
    const own = catalog.materials.filter(m => m.brand.trim() !== '' && m.brand.trim().toUpperCase() !== 'COMPETIDORES');
    // Send distinct dimension combinations, never the full customer population.
    // Access restrictions apply before reducing the tuples.
    const scoped = catalog.clients.filter(c => clientMatches(c, {...q, categories:[], zones:[], supervisors:[], sellers:[]}));
    const distinct = <T extends string[]>(rows: T[]): T[] => [...new Map(rows.map(row => [JSON.stringify(row), row])).values()];
    const relations = {
      materials: distinct(own.map(m => [m.unit, m.franchise, m.brand] as [string,string,string])),
      clients: distinct(scoped.flatMap(c => (c.vendedores?.length ? c.vendedores : ['']).map(seller =>
        [c.categorizacion, c.zona_cliente || '', c.supervisor || '', seller] as [string,string,string,string]))),
    };
    const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();
    return { relations, versions, periodo: version.label, publicado_en: version.publishedAt ?? null, units:['UNIDAD','S/ SOLES'],
      unidades_negocio: unique(own.map(m=>m.unit)), franquicias:unique(own.map(m=>m.franchise)), marcas:unique(own.map(m=>m.brand)),
      categorizaciones:[...categories], quintiles:['Q1','Q2','Q3','Q4','Q5'],
      zonas_base:unique(clients.map(c=>c.zona_cliente || '')), supervisores:unique(clients.map(c=>c.supervisor || '')),
      vendedores:unique(clients.flatMap(c=>c.vendedores || [])), clients:clients.filter(c=>categories.includes(c.categorizacion)).slice(0,1000), total_clients:clients.length };
  }
  async search(q: Query) {
    const version = (await this.versions()).find(v => v.id === q.version);
    if (!version) throw new InputError('Esta versión aún no está disponible para el reporte.');
    const catalog = await this.catalog(version); const term = q.search.trim().toLocaleLowerCase('es');
    const matches = catalog.clients.filter(c => clientMatches(c,q) && (!term || `${c.ruc} ${c.farmacia} ${c.cp_cliente}`.toLocaleLowerCase('es').includes(term)));
    return { items: matches.slice(0,100), total: matches.length, limit: 100 };
  }
  async report(q: Query) {
    const versions = await this.versions(); const version = versions.find(v => v.id === q.version);
    if (!version?.enabled) throw new InputError('Esta versión aún no tiene un resumen generado.');
    return this.caches.reports.get(JSON.stringify({q, version}), async () => {
      const catalog = await this.catalog(version);
      // Client columns are independent of the matrix population, but cannot bypass access scope.
      const permitted = catalog.clients.filter(c => clientMatches(c,{...q,categories:[],zones:[],supervisors:[],sellers:[]}));
      const columns = q.client ? permitted.filter(c=>c.ruc === q.client || c.cp_cliente === q.client).slice(0,1)
        : q.clients.length ? permitted.filter(c=>q.clients.includes(c.ruc)||q.clients.includes(c.cp_cliente))
        : catalog.clients.filter(c=>clientMatches(c,q) && categories.includes(c.categorizacion)).slice(0,8);
      if (q.client && !columns.length) throw new InputError('Cliente no disponible para esta sesión.');
      // Material filters are applied by calculateReport, not by the SQL snapshot.
      // Retain every population/access dimension and the exact selected business keys.
      const snapshotQuery: Query = { ...q, units: [], franchises: [], brands: [], search: '', clients: [] };
      const salesKey = JSON.stringify({ version, query: snapshotQuery });
      const purchasesKey = JSON.stringify({ version, metric: q.unit, allowedZones: q.allowedZones,
        columns: columns.map(c => c.ruc), detail: !!q.client });
      const [sales, purchases] = await Promise.all([
        this.caches.sales.get(salesKey, () => this.repo.sales(snapshotQuery, assignedClientRucs(catalog.clients, snapshotQuery))),
        this.caches.purchases.get(purchasesKey, () => this.repo.clientPurchases(snapshotQuery, columns)),
      ]);
      const snapshot = { sales, ...purchases };
      const report = calculateReport(catalog, snapshot, q, version, columns);
      return report;
    });
  }
}
