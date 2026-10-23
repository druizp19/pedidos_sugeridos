import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveScope, scopeCatalog, type PortalIdentity } from '../domain/access';
import { clientMatches, clientZoneKey, type Catalog, type Seller } from '../domain/report';
import { parseQuery } from '../application/report-service';
import { createReportService } from '../composition/report-service';
import type { ReportRepository } from '../application/ports/report-repository';
import { GET, POST } from '../app/api/[...path]/route';
import { requireSameOrigin, sessionCookie, sessionToken } from '../infrastructure/auth/portal-session';

const sellers:Seller[]=[{zone:'AX01 - Norte',seller:'Uno',supervisor:'S1'},{zone:'AX01 - Norte',seller:'Dos',supervisor:'S1'},
  {zone:'A038 - Ayacucho',seller:'Tres',supervisor:'S1'},{zone:'A021 - Piura',seller:'Cuatro',supervisor:'S2'}];
const user:PortalIdentity={id_usuario:1,nombre:'Uno',rol:'REPRESENTANTE',representante_name:'Uno',supervisor_name:'S1'};
const client=(ruc:string,zona_cliente:string,zonabase:string)=>({ruc,cp_cliente:ruc,farmacia:ruc,categorizacion:'ORO',quintil:'Q2',zona_cliente,zonabase});
const catalog:Catalog={materials:[],sellers,clients:[client('own','AX01 - Norte','AX01'),client('marketing','LIMA','AX01'),client('team','A038 - Ayacucho','A038'),client('foreign','A021 - Piura','A021')]};

test('roles resolve only assigned zones, deny missing names and unknown roles; AX codes normalize',()=>{
  assert.equal(clientZoneKey('AX01 - Norte'),'AX01');
  assert.deepEqual(resolveScope(user,sellers).zones,['AX01']);
  assert.deepEqual(resolveScope({...user,rol:'SUPERVISOR',representante_name:null},sellers).zones,['A038','AX01']);
  for(const change of [{rol:'USUARIO'},{supervisor_name:null},{representante_name:null},{supervisor_name:'S2'}]) {
    assert.throws(()=>resolveScope({...user,...change},sellers));
  }
  const q=parseQuery({allowedZones:['A021'],allowedAssignments:sellers},['AX01']);
  assert.equal(q.allowedAssignments,undefined);
  assert.equal(clientMatches(catalog.clients[0],q),true);
  assert.equal(clientMatches(catalog.clients[1],q),false);
  assert.equal(clientMatches(catalog.clients[0],{...q,allowedZones:[]}),false);
});

test('shared-zone metadata, details, columns and cache remain scoped across users',async()=>{
  const untouched=structuredClone(catalog);
  const repo:ReportRepository={availableVersions:async()=>[{id:'V2',label:'V2',months:8,previousMonths:8,enabled:true,revision:'1'}],
    catalog:async()=>catalog,sales:async(q)=>{assert.ok(q.allowedZones?.length);return [];},
    clientPurchases:async(_q,columns)=>{assert.ok(columns.every(c=>c.ruc==='own'||c.ruc==='team'));return {purchases:[],distributors:[]};},
    snapshot:async()=>({sales:[],purchases:[],distributors:[]})};
  const service=createReportService(repo);
  const make=(identity:PortalIdentity)=>{const scope=resolveScope(identity,sellers);return {...parseQuery({version:'V2'},scope.zones),allowedAssignments:scope.assignments};};
  const q=make(user), q2=make({...user,id_usuario:2,representante_name:'Dos'});
  assert.deepEqual((await service.options(q)).vendedores,['Uno']);
  assert.deepEqual((await service.search(q)).items.map(c=>c.ruc),['own']);
  const first=await service.report({...q,client:'own'});
  const second=await service.report({...q2,client:'own'});
  assert.ok('client' in first && 'client' in second);
  assert.deepEqual(first.client.vendedores,['Uno']);
  assert.deepEqual(second.client.vendedores,['Dos']);
  await assert.rejects(()=>service.report({...q,client:'foreign'}));
  await assert.rejects(()=>service.report({...q,client:'marketing'}));
  const columns=await service.report({...q,clients:['foreign','own']});
  assert.ok('client_columns' in columns);
  assert.deepEqual(columns.client_columns.map(c=>c.ruc),['own']);
  const supervisor=make({...user,rol:'SUPERVISOR',representante_name:null});
  assert.deepEqual((await service.options(supervisor)).vendedores.sort(),['Dos','Tres','Uno']);
  assert.deepEqual(scopeCatalog(catalog,[],[]).clients,[]);
  assert.deepEqual(catalog,untouched);
});

test('every data route denies anonymous requests even with forged role and scope; methods and origins checked',async()=>{
  process.env.PEDIDOS_PUBLIC_URL='http://127.0.0.1:3010/sugerido';
  for(const path of ['versions','filters','search-clients','auth/session']) {
    const r=await GET(new Request(`http://127.0.0.1:3010/sugerido/api/${path}?rol=ADMINISTRADOR`));
    assert.equal(r.status,401,path);
  }
  for(const path of ['matrix','client-matrix','export-excel']) {
    const r=await POST(new Request(`http://127.0.0.1:3010/sugerido/api/${path}`,{method:'POST',headers:{Origin:'http://127.0.0.1:3010'},body:JSON.stringify({rol:'ADMINISTRADOR',allowedZones:['AX01']})}));
    assert.equal(r.status,401,path);
  }
  assert.equal((await GET(new Request('http://127.0.0.1:3010/sugerido/api/export-excel'))).status,405);
  assert.throws(()=>requireSameOrigin(new Request('http://127.0.0.1:3010',{headers:{Origin:'https://evil.invalid'}})));
  assert.throws(()=>requireSameOrigin(new Request('http://127.0.0.1:3010')));
  assert.throws(()=>sessionToken(new Request('http://127.0.0.1:3010',{headers:{Cookie:'pedidos_session=forged'}})));
  process.env.PEDIDOS_PUBLIC_URL='https://example.invalid/sugerido';
  assert.match(sessionCookie('a'.repeat(43),Date.now()+10000),/HttpOnly; SameSite=Lax; Max-Age=\d+; Secure/);
});
