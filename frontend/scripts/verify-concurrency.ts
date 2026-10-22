// Read-only HTTP checks against a locally running PRODUCTION build.
// Run: node --import tsx scripts/verify-concurrency.ts [http://127.0.0.1:3010/sugerido]
// One burst of 30 requests, then 50 warm requests. No writes, retries or saved customer data.
import assert from 'node:assert/strict';
import type { ClientSearchResult, FilterData, MatrixResponse } from '../domain/report-contracts';

const base = process.argv[2] || 'http://127.0.0.1:3010/sugerido';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Use a local production instance.');
async function request<T>(path: string, body?: object) {
  const started = performance.now();
  const response = await fetch(`${base}/api/${path}`, {
    ...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}),
    signal: AbortSignal.timeout(90000),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(`${path}: HTTP ${response.status}`);
  return {data:result.data as T, ms:Math.round(performance.now()-started)};
}
function summary(times: number[]) {
  const ordered=[...times].sort((a,b)=>a-b);
  return {p50Ms:ordered[Math.ceil(ordered.length*.50)-1],p95Ms:ordered[Math.ceil(ordered.length*.95)-1],maxMs:ordered.at(-1)};
}
async function main() {
  const versions=await request<FilterData['versions']>('versions');
  const version=versions.data.filter(v=>v.enabled).map(v=>v.id).sort((a,b)=>b.localeCompare(a,'en',{numeric:true}))[0];
  assert.ok(version);
  const options=await request<FilterData>(`filters?version=${version}`);
  console.log(JSON.stringify({stage:'discovery',version,versionsMs:versions.ms,filtersMs:options.ms}));
  const common={version,unidadMedida:'UNIDAD'};
  const variants=[
    common,
    {...common,unidadMedida:'S/ SOLES'},
    {...common,unidadNegocio:options.data.unidades_negocio.slice(0,1)},
    {...common,categorizacion:['DIAMANTE']},
    {...common,zonaBase:options.data.zonas_base.slice(0,1)},
    {...common,vendedor:options.data.vendedores.includes('CADENAS')?['CADENAS']:options.data.vendedores.slice(0,1)},
  ];
  const expected=new Map<number,MatrixResponse['totals']>();
  for (const [stage,count] of [['cold-reports',30],['warm-reports',50]] as const) {
    const started=performance.now();
    const results=await Promise.allSettled(Array.from({length:count},async(_,i)=>{
      const index=i%variants.length;
      const result=await request<MatrixResponse>('matrix',variants[index]);
      assert.ok(Number.isFinite(result.data.totals.vta_mdo));
      if (expected.has(index)) assert.deepEqual(result.data.totals,expected.get(index));
      else expected.set(index,result.data.totals);
      return result.ms;
    }));
    const passed=results.filter((r):r is PromiseFulfilledResult<number>=>r.status==='fulfilled');
    console.log(JSON.stringify({stage,count,passed:passed.length,failed:count-passed.length,
      elapsedMs:Math.round(performance.now()-started),...summary(passed.map(r=>r.value))}));
    if(passed.length!==count) throw new Error('Concurrent requests failed; inspect server logs before repeating.');
  }
  const search=await request<ClientSearchResult>(`search-clients?version=${version}&zonaBase=${encodeURIComponent(options.data.zonas_base[0]||'')}`);
  assert.ok(search.data.total>=search.data.items.length);
  assert.ok(search.data.items.length<=search.data.limit);
  const matrix=await request<MatrixResponse>('matrix',common);
  const columns=matrix.data.client_columns.slice(0,2).map(c=>c.ruc);
  if(columns.length) {
    const changed=await request<MatrixResponse>('matrix',{...common,selectedClients:columns});
    assert.deepEqual(changed.data.totals,matrix.data.totals);
    const detail=await request<{totals:MatrixResponse['totals']}>('client-matrix',{...common,client:columns[0]});
    assert.ok(Number.isFinite(detail.data.totals.vta_act));
    console.log(JSON.stringify({stage:'columns-and-detail',columnsMs:changed.ms,detailMs:detail.ms}));
  }
  for(const body of [common,{...common,client:columns[0]}].slice(0,columns.length?2:1)){
    const start=performance.now();
    const response=await fetch(`${base}/api/export-excel`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
    assert.equal(response.status,200);
    const bytes=new Uint8Array(await response.arrayBuffer());
    assert.equal(String.fromCharCode(bytes[0],bytes[1]),'PK');
    console.log(JSON.stringify({stage:'export',detail:'client' in body,ms:Math.round(performance.now()-start),bytes:bytes.length}));
  }
  const invalid=await fetch(`${base}/api/matrix`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"version":"invalid"}'});
  assert.equal(invalid.status,400);
  console.log(JSON.stringify({stage:'validation',searchTotal:search.data.total,shown:search.data.items.length,invalidRequestStatus:invalid.status}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Validation failed');process.exitCode=1;});
