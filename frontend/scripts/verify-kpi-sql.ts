// Read-only comparison: standalone SQL against the web's calculation, V2 soles without filters.
import { readFile } from 'node:fs/promises';
import { getPool } from '../infrastructure/database/connection';
import { MssqlReportRepository } from '../infrastructure/database/mssql-report.repository';
import { calculateReport, type Query } from '../domain/report';

async function main() {
  const pool = await getPool();
  try {
    const script = await readFile(new URL('../../database/015_conciliar_kpi_web.sql', import.meta.url),'utf8');
    const result = await pool.request().batch(script);
    if (!Array.isArray(result.recordsets) || result.recordsets.length < 2) throw new Error('Expected KPI and market result sets');
    const sql = result.recordsets[0][0];
    const repo = new MssqlReportRepository();
    const version = (await repo.availableVersions()).find(v=>v.id==='V2');
    if (!version) throw new Error('V2 unavailable');
    const catalog = await repo.catalog('V2');
    const q: Query = {version:'V2',unit:'VALOR',units:[],franchises:[],brands:[],categories:[],zones:[],supervisors:[],sellers:[],clients:[],search:''};
    const snapshot = await repo.snapshot(q,[]);
    const web = calculateReport(catalog,snapshot,q,version,[]).totals;
    const comparison = [
      ['venta_actual_mensual',web.vta_act],['mercado_mensual',web.vta_mdo],
      ['market_share_actual_pct',web.ms_act*100],['market_share_ideal_pct',web.ms_ideal*100],
      ['estimacion_mensual',web.estimacion],['market_share_anterior_pct',web.ms_ant*100],
      ['market_share_territorial_pct',web.ms_territorio*100],
    ].map(([key,value])=>{
      const sqlValue = Number(sql[String(key)]), webValue = Number(value);
      const difference = Math.abs(sqlValue-webValue);
      return {kpi:key,sql:sqlValue,web:webValue,difference,matches:difference<=Math.max(1e-8,Math.abs(webValue)*1e-12)};
    });
    console.log(JSON.stringify({sql,comparison,marketRows:result.recordsets[1].length},null,2));
    if (comparison.some(c=>!c.matches)) throw new Error('SQL and web differ');
  } finally { await pool.close(); }
}
main().catch(error=>{console.error(error instanceof Error ? error.message : 'Comparison failed');process.exitCode=1;});
