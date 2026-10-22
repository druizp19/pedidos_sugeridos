// Read-only local check. Does not save or print customer data.
// node --import tsx scripts/verify-dependent-filters.ts
import assert from 'node:assert/strict';
import { dependentOptions } from '../domain/dependent-filters';
import { initialFilters, selectAvailableVersion } from '../domain/report-filters';
import type { FilterData } from '../domain/report-contracts';
const base='http://127.0.0.1:3010/sugerido';
async function get(path:string){
 const response=await fetch(base+'/api/'+path,{signal:AbortSignal.timeout(90000)});
 const body=await response.json();assert.ok(response.ok&&body.success);return body.data;
}
async function main(){
 const version=selectAvailableVersion(await get('versions'));
 assert.ok(version);
 const started=performance.now();
 const data:FilterData=await get('filters?version='+version);
 const loadMs=performance.now()-started;
 assert.ok(data.relations);
 assert.ok(data.relations.materials.length);
 assert.ok(data.relations.clients.length);
 const samples=[];
 for(let i=0;i<200;i++){
  const seller=data.vendedores[i%data.vendedores.length];
  const start=performance.now();
  const result=dependentOptions(data,{...initialFilters,version,vendedor:seller});
  samples.push(performance.now()-start);
  const expected=[...new Set(data.relations.clients.filter(r=>r[3]===seller).map(r=>r[1]).filter(Boolean))].sort();
  assert.deepEqual([...result.zonas_base].sort(),expected);
 }
 const response=await fetch(base+'/api/matrix',{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({version,unidadMedida:'UNIDAD',unidadNegocio:data.unidades_negocio.slice(0,1)}),signal:AbortSignal.timeout(90000)});
 const matrix=await response.json();assert.ok(response.ok&&matrix.success);assert.ok(Number.isFinite(matrix.data.totals.vta_act));
 samples.sort((a,b)=>a-b);
 console.log(JSON.stringify({version,loadMs:Math.round(loadMs),materialCombinations:data.relations.materials.length,
 clientCombinations:data.relations.clients.length,relationsBytes:Buffer.byteLength(JSON.stringify(data.relations)),
 localOptionsP95Ms:+samples[189].toFixed(2),localOptionsMaxMs:+samples[199].toFixed(2),matrix:'OK'}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
