import { query } from './connection';
import { configuredVersions, type VersionPeriod } from '@/domain/report-versions';
import type { ReportRepository } from '@/application/ports/report-repository';
import { type Catalog, type Query, type Snapshot, type Material, type Seller, type Sale, type Purchase, type DistributorSale, categories, clientZoneKey, assignClientSellers, assignedClientRucs } from '@/domain/report';
import type { ClientOption } from '@/types';
const clean = (v: unknown) => String(v ?? '').trim();
type AvailableVersionRow = { [K in keyof VersionPeriod]: K extends 'id' ? string : string | null } & { revision: string | null };
function sqlClientZone(column: string) {
  const value = `LTRIM(RTRIM(${column}))`;
  const prefix = `LEFT(${value},CHARINDEX(' - ',${value}+' - ')-1)`;
  const firstDigit = `PATINDEX('%[0-9]%',${prefix})`;
  return `(CASE WHEN ${firstDigit}>1 AND LEFT(${prefix},CASE WHEN ${firstDigit}>0 THEN ${firstDigit}-1 ELSE 0 END) NOT LIKE '%[^A-Za-z]%'
    AND SUBSTRING(${prefix},CASE WHEN ${firstDigit}>0 THEN ${firstDigit} ELSE 1 END,500) NOT LIKE '%[^0-9]%'
    THEN ${prefix} ELSE ${value} END)`;
}
// Only internal SQL fragments are composed; every user value is a bound parameter.
function whereClients(q: Query, params: Record<string,string>, territory = false) {
  let seq = Object.keys(params).length;
  const list = (values: string[]) => values.map(value => { const key = `p${seq++}`; params[key] = value; return '@'+key; }).join(',');
  const clientZone = sqlClientZone('c.zona_cliente');
  const clauses = ['c.version=@version'];
  if (q.allowedZones) clauses.push(q.allowedZones.length ? `${clientZone} IN (${list(q.allowedZones)})` : '1=0');
  if (!territory) {
    if (q.client) { params.client = q.client; clauses.push('(c.ruc=@client OR c.cp_cliente=@client)'); }
    else {
      if(q.categories.length) clauses.push(`c.categorizacion IN (${list(q.categories)})`);
      if(q.zones.length) clauses.push(`${clientZone} IN (${list(q.zones.map(clientZoneKey))})`);
      if(q.supervisors.length || q.sellers.length) {
        clauses.push("EXISTS (SELECT 1 FROM OPENJSON(@assignedClients) WITH (ruc nvarchar(50) '$') a WHERE a.ruc=c.ruc)");
      }
    }
  } else clauses.push(`c.categorizacion IN (${list(categories)})`);
  return clauses.join(' AND ');
}

export class MssqlReportRepository implements ReportRepository {
  async availableVersions() {
    // Read the small publication catalog; indexed EXISTS checks avoid scanning
    // the fact table for DISTINCT versions. V1/V2 retain legacy compatibility.
    const rows = await query<AvailableVersionRow>(`
      IF OBJECT_ID(N'ods.REPORTE_VERSION', N'U') IS NOT NULL
        EXEC(N'SELECT p.version AS id,
          CONVERT(char(10), p.inicio_actual, 23) AS [start],
          CONVERT(char(10), p.fin_actual, 23) AS [end],
          CONVERT(char(10), p.inicio_anterior, 23) AS previousStart,
          CONVERT(char(10), p.fin_anterior, 23) AS previousEnd,
          CONVERT(varchar(33), p.generado_en, 126) AS revision
        FROM ods.REPORTE_VERSION p
        WHERE EXISTS (SELECT 1 FROM ods.FACT_VENTAS_AGREGADA f WHERE f.version = p.version)
          AND EXISTS (SELECT 1 FROM ods.DIM_MATERIAL m WHERE m.version = p.version)
          AND EXISTS (SELECT 1 FROM ods.DIM_CLIENTE c WHERE c.version = p.version)
        UNION ALL
        SELECT a.version, NULL, NULL, NULL, NULL, NULL
        FROM (VALUES (''V1''), (''V2'')) a(version)
        WHERE NOT EXISTS (SELECT 1 FROM ods.REPORTE_VERSION p WHERE p.version = a.version)
          AND EXISTS (SELECT 1 FROM ods.FACT_VENTAS_AGREGADA f WHERE f.version = a.version)
          AND EXISTS (SELECT 1 FROM ods.DIM_MATERIAL m WHERE m.version = a.version)
          AND EXISTS (SELECT 1 FROM ods.DIM_CLIENTE c WHERE c.version = a.version)');
      ELSE
        SELECT a.version AS id, CAST(NULL AS char(10)) AS [start],
          CAST(NULL AS char(10)) AS [end], CAST(NULL AS char(10)) AS previousStart,
          CAST(NULL AS char(10)) AS previousEnd, CAST(NULL AS varchar(33)) AS revision
        FROM (VALUES ('V1'), ('V2')) a(version)
        WHERE EXISTS (SELECT 1 FROM ods.FACT_VENTAS_AGREGADA f WHERE f.version = a.version)
          AND EXISTS (SELECT 1 FROM ods.DIM_MATERIAL m WHERE m.version = a.version)
          AND EXISTS (SELECT 1 FROM ods.DIM_CLIENTE c WHERE c.version = a.version);
    `);
    const configured = configuredVersions(rows.filter((row): row is VersionPeriod & { revision: string | null } =>
      row.start !== null && row.end !== null && row.previousStart !== null && row.previousEnd !== null));
    const available = new Set(rows.map(r => r.id));
    return configured.filter(v => available.has(v.id))
      .map(v => {
        const revision = rows.find(r => r.id === v.id)?.revision;
        // generado_en is stored by SYSUTCDATETIME; expose an explicit UTC timestamp.
        return {...v, revision: revision || 'legacy', publishedAt: revision ? `${revision}Z` : null};
      });
  }
  async catalog(version: string): Promise<Catalog> {
    // Queries run through the same bounded pool/queue, including metadata.
    const [materialRows, clientRows, sellerRows] = await Promise.all([
      query<Record<string, unknown>>(`SELECT codigo_presentacion,cp_presentacion,descripcion_presentacion,unidad_negocio,franquicia,marca_mkt,mercado,es_competidor FROM ods.DIM_MATERIAL WHERE version=@version`, {version}),
      query<ClientOption>(`SELECT ruc,farmacia,cp_cliente,categorizacion,quintil,lima_provincias,zonabase,zona_cliente,supervisor FROM ods.DIM_CLIENTE WHERE version=@version`, {version}),
      query<Record<string, unknown>>(`SELECT DISTINCT zonabase,nombreFFVV,nombreSSVV FROM ods.DIM_VENDEDORES WHERE version=@version`, {version}),
    ]);
    const seen = new Set<string>();
    const materials: Material[] = materialRows.map(r => {
      const code = clean(r.codigo_presentacion);
      if (seen.has(code)) throw new Error('DATA_DUPLICATE_MATERIAL'); seen.add(code);

      return { code, sku: clean(r.cp_presentacion) || `${code} - ${clean(r.descripcion_presentacion)}`, unit: clean(r.unidad_negocio),
        franchise: clean(r.franquicia), brand: clean(r.marca_mkt), market: clean(r.mercado), competitor: Boolean(r.es_competidor) };
    });
    const sellers: Seller[] = sellerRows.map(r => ({zone: clean(r.zonabase), seller: clean(r.nombreFFVV), supervisor: clean(r.nombreSSVV)}));
    const clients = clientRows.map(r => {
      const c = Object.fromEntries(Object.entries(r).map(([k,v]) => [k,clean(v)])) as unknown as ClientOption;
      // Preserve SQL business keys verbatim: NBSP-suffixed RUCs exist in V1.
      // Normalizing those keys here would merge distinct source records.
      c.ruc = String(r.ruc ?? '');
      c.cp_cliente = String(r.cp_cliente || `${c.ruc} - ${c.farmacia}`);
      return c;
    }).sort((a,b) => (a.quintil || 'Z').localeCompare(b.quintil || 'Z') || a.cp_cliente.localeCompare(b.cp_cliente));
    const clientKeys = new Set<string>();
    for (const c of clients) { if (clientKeys.has(c.ruc)) throw new Error('DATA_DUPLICATE_CLIENT'); clientKeys.add(c.ruc); }
    return { materials, clients: assignClientSellers(clients, sellers), sellers };
  }
  async sales(q: Query, assignedClients?: string[]): Promise<Sale[]> {
    const params: Record<string,string> = {version:q.version, metric:q.unit};
    if (!q.client && (q.sellers.length || q.supervisors.length)) {
      // The service supplies its cached domain assignment. Diagnostic callers
      // resolve the same rules from the catalog, never from a SQL copy.
      const rucs = assignedClients ?? assignedClientRucs((await this.catalog(q.version)).clients, q);
      params.assignedClients = JSON.stringify(rucs ?? []);
    }
    const base = whereClients(q, params), territory = whereClients(q, params, true);
    // Unfiltered totals include facts without a matching client, as in the BI.
    // An explicit population/access filter still requires the client relationship.
    const restrictClients = q.allowedZones !== undefined || !!q.client || q.categories.length > 0
      || q.zones.length > 0 || q.supervisors.length > 0 || q.sellers.length > 0;
    const populationFilter = restrictClients ? 'AND EXISTS (SELECT 1 FROM Population c WHERE c.ruc=f.ruc)' : '';
    return query<Sale>(`
      WITH Population AS (SELECT c.ruc,c.lima_provincias FROM ods.DIM_CLIENTE c WHERE ${base}),
      Regions AS (SELECT DISTINCT lima_provincias FROM Population)
      SELECT 'main' AS scope, f.codigo_presentacion AS code, SUM(f.venta_actual) AS actual,SUM(f.venta_anterior) AS previous
      FROM ods.FACT_VENTAS_AGREGADA f
      WHERE f.version=@version AND f.metrica=@metric ${populationFilter}
      GROUP BY f.codigo_presentacion
      UNION ALL
      SELECT 'territory',f.codigo_presentacion,SUM(f.venta_actual),SUM(f.venta_anterior)
      FROM ods.FACT_VENTAS_AGREGADA f
      WHERE f.version=@version AND f.metrica=@metric AND EXISTS (
        SELECT 1 FROM ods.DIM_CLIENTE c WHERE c.ruc=f.ruc AND ${territory}
        AND EXISTS (SELECT 1 FROM Regions r WHERE r.lima_provincias=c.lima_provincias))
      GROUP BY f.codigo_presentacion;`, params, 'matrix.sales');
  }
  async clientPurchases(q: Query, columns: ClientOption[]): Promise<Pick<Snapshot, 'purchases' | 'distributors'>> {
    let purchases: Purchase[] = [], distributors: DistributorSale[] = [];
    if (columns.length) {
      const p: Record<string,string> = {version:q.version,metric:q.unit};
      const keys = columns.map((c,i) => {p['c'+i] = c.ruc;return '@c'+i;}).join(',');
      purchases = await query<Purchase>(`SELECT ruc,codigo_presentacion AS code,SUM(venta_actual) AS actual
        FROM ods.FACT_VENTAS_AGREGADA WHERE version=@version AND metrica=@metric AND ruc IN (${keys})
        GROUP BY ruc,codigo_presentacion`, p, 'matrix.purchases');
      if (q.client) distributors = await query<DistributorSale>(`SELECT f.codigo_presentacion AS code,LTRIM(RTRIM(f.distribuidor)) AS distributor,SUM(f.venta_actual) AS actual
        FROM ods.FACT_VENTAS_AGREGADA f WHERE f.version=@version AND f.metrica=@metric AND f.ruc=@client
        AND NULLIF(LTRIM(RTRIM(f.distribuidor)),'') IS NOT NULL
        AND EXISTS (SELECT 1 FROM ods.DIM_MATERIAL m WHERE m.version=f.version AND m.codigo_presentacion=f.codigo_presentacion AND NULLIF(LTRIM(RTRIM(m.marca_mkt)), '') IS NOT NULL AND UPPER(LTRIM(RTRIM(m.marca_mkt))) <> 'COMPETIDORES')
        GROUP BY f.codigo_presentacion,LTRIM(RTRIM(f.distribuidor))`, {version:q.version,metric:q.unit,client:columns[0].ruc}, 'matrix.distributors');
    }
    return { purchases, distributors };
  }
  async snapshot(q: Query, columns: ClientOption[]): Promise<Snapshot> {
    const [sales, detail] = await Promise.all([this.sales(q), this.clientPurchases(q, columns)]);
    return { sales, ...detail };
  }
}
