// Read-only diagnostic. Run with node --env-file=.env.local --import tsx scripts/profile-matrix.ts
import { performance } from 'node:perf_hooks';
import { MssqlReportRepository } from '../infrastructure/database/mssql-report.repository';
import { getPool } from '../infrastructure/database/connection';
import { calculateReport, categories, type Query } from '../domain/report';

async function measure<T>(stage: string, work: () => Promise<T>) {
  const start = performance.now();
  const result = await work();
  console.log(JSON.stringify({stage, ms:Math.round(performance.now()-start)}));
  return result;
}

async function main() {
  process.env.PEDIDOS_PERF = '1';
  const pool = await measure('connect', getPool);
  const schema = await pool.request().query(`
    SELECT OBJECT_NAME(c.object_id) AS tabla, c.name AS columna, TYPE_NAME(c.user_type_id) AS tipo, c.max_length
    FROM sys.columns c WHERE c.object_id IN (OBJECT_ID('ods.FACT_VENTAS_AGREGADA'),OBJECT_ID('ods.DIM_CLIENTE'))
      AND c.name IN ('version','metrica','ruc','codigo_presentacion');
    SELECT OBJECT_NAME(i.object_id) AS tabla, i.name AS indice, c.name AS columna, ic.key_ordinal, ic.is_included_column
    FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
    JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
    WHERE i.object_id IN (OBJECT_ID('ods.FACT_VENTAS_AGREGADA'),OBJECT_ID('ods.DIM_CLIENTE'))
    ORDER BY tabla, indice, ic.key_ordinal, c.name;
  `);
  console.log(JSON.stringify({schema:schema.recordsets}));
  const repo = new MssqlReportRepository();
  const versions = await measure('versions',()=>repo.availableVersions());
  const version = versions.find(v=>v.id === (process.argv[2] || 'V2'));
  if (!version) throw new Error('Version unavailable');
  const catalog = await measure('catalog',()=>repo.catalog(version.id));
  const q: Query = {version:version.id,unit:'UNIDAD',units:[],franchises:[],brands:[],categories:[],zones:[],supervisors:[],sellers:[],clients:[],search:''};
  const columns = catalog.clients.filter(c=>categories.includes(c.categorizacion)).slice(0,8);
  const snapshot = await measure('snapshot',()=>repo.snapshot(q,columns));
  const report = await measure('calculate',async()=>calculateReport(catalog,snapshot,q,version,columns));
  const json = await measure('serialize',async()=>JSON.stringify(report));
  console.log(JSON.stringify({materials:catalog.materials.length,clients:catalog.clients.length,sales:snapshot.sales.length,purchases:snapshot.purchases.length,brands:report.brands.length,responseBytes:Buffer.byteLength(json),totals:report.totals}));
}
main().catch(error=>{ console.error(error instanceof Error ? error.message : 'Diagnostic failed'); process.exitCode=1; })
  .finally(async()=>{ try { await (await getPool()).close(); } catch {} });
