/** Read-only integration checks against the configured SQL database. Never changes accounts or assignments. */
import { loadEnvConfig } from '@next/env';
import assert from 'node:assert/strict';
import { query, getPool } from '../infrastructure/database/connection';
import { scopeForIdentity } from '../infrastructure/auth/portal-session';
import { createReportService } from '../composition/report-service';
import { MssqlReportRepository } from '../infrastructure/database/mssql-report.repository';
import { parseQuery } from '../application/report-service';
import { clientZoneKey } from '../domain/report';
import type { AccessScope, PortalIdentity } from '../domain/access';

loadEnvConfig(process.cwd());
async function main() {
  const users=await query<PortalIdentity>(`SELECT id_usuario,nombre,rol,representante_name,supervisor_name
    FROM MET_PROD.PORTAL.USUARIOS WHERE id_usuario BETWEEN 267 AND 313 AND estado='ACTIVO'`);
  assert.equal(users.length,47);
  const scopes: AccessScope[]=[];
  for(const user of users) scopes.push(await scopeForIdentity(user));
  assert.equal(scopes.filter(s=>s.role==='REPRESENTANTE').length,42);
  assert.equal(scopes.filter(s=>s.role==='SUPERVISOR').length,5);
  const repo=new MssqlReportRepository(), service=createReportService(repo);
  const versions=await service.versions();
  const version=[...versions].sort((a,b)=>b.id.localeCompare(a.id,'en',{numeric:true}))[0];
  assert.ok(version);
  for(const id of [304,267,309]) {
    const scope: AccessScope=scopes.find(s=>s.userId===id)!;
    const q={...parseQuery({version:version.id},scope.zones),allowedAssignments:scope.assignments};
    const options=await service.options(q);
    assert.ok(options.clients.every(c=>scope.zones!.includes(clientZoneKey(c.zona_cliente||''))));
    assert.ok(options.vendedores.every(s=>scope.assignments!.some(a=>a.seller===s)));
    const sales=await repo.sales(q);
    const params:Record<string,string>={version:version.id,metric:'UNIDAD'};
    const labels=scope.assignments!.map(a=>a.zone);
    const zones=[...new Set(labels.flatMap(label=>[label,clientZoneKey(label)]))];
    const placeholders=zones.map((z,i)=>{params['z'+i]=z;return '@z'+i;}).join(',');
    const independent=await query<{actual:number;previous:number;clients:number}>(`
      SELECT (SELECT COUNT(*) FROM ods.DIM_CLIENTE c WHERE c.version=@version AND LTRIM(RTRIM(c.zona_cliente)) IN (${placeholders})) AS clients,
        SUM(f.venta_actual) actual,SUM(f.venta_anterior) previous
      FROM ods.FACT_VENTAS_AGREGADA f WHERE f.version=@version AND f.metrica=@metric
      AND EXISTS(SELECT 1 FROM ods.DIM_CLIENTE c WHERE c.version=f.version AND c.ruc=f.ruc
        AND LTRIM(RTRIM(c.zona_cliente)) IN (${placeholders}))`,params);
    assert.equal(options.total_clients,independent[0].clients);
    for(const key of ['actual','previous'] as const) {
      const total=sales.filter(s=>s.scope==='main').reduce((sum,s)=>sum+Number(s[key]),0);
      assert.ok(Math.abs(total-Number(independent[0][key]))<0.01,`${id}: ${key}`);
    }
    const report=await service.report(q);
    assert.ok('client_columns' in report);
    assert.ok(report.client_columns.every(c=>scope.zones!.includes(clientZoneKey(c.zona_cliente||''))));
    console.log(JSON.stringify({userId:id,role:scope.role,zones:scope.zones,clients:options.total_clients,sqlTotalsVerified:true}));
  }
  console.log('47 asignaciones válidas; SQL, catálogos y matrices de representante y supervisor verificados.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Verification failed');process.exitCode=1;})
  .finally(async()=>{await (await getPool()).close();});
