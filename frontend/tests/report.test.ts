import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assignedClientRucs,assignClientSellers,clientMatches,clientZoneKey,calculateReport,VERSIONS,type Catalog,type Query,type Snapshot} from '../domain/report';
import type {MatrixResponse,ClientMatrixResponse} from '../types';
import {parseQuery} from '../application/report-service';
import { createReportService } from '../composition/report-service';
import { configuredVersions, versionFromPeriod } from '../domain/report-versions';
import type {ReportRepository} from '../application/ports/report-repository';
const catalog:Catalog={materials:[
 {code:'001',sku:'001 - A',unit:'FARMA',franchise:'F',brand:'A',market:'M',competitor:false},
 {code:'002',sku:'002 - B',unit:'FARMA',franchise:'F',brand:'B',market:'M',competitor:false},
 {code:'003',sku:'Competidor',unit:'RESTO',franchise:'RESTO',brand:'COMPETIDORES',market:'M',competitor:true},
],clients:[{ruc:'0001',farmacia:'Cliente',cp_cliente:'0001 - Cliente',categorizacion:'ORO',quintil:'Q2'}],sellers:[]};
const q:Query={version:'V1',unit:'VALOR',units:[],franchises:[],brands:[],categories:[],zones:[],supervisors:[],sellers:[],clients:[],search:''};
const snapshot:Snapshot={sales:[
 {scope:'main',code:'001',actual:100,previous:200},{scope:'main',code:'002',actual:100,previous:100},{scope:'main',code:'003',actual:800,previous:700},
 {scope:'territory',code:'001',actual:300,previous:0},{scope:'territory',code:'002',actual:100,previous:0},{scope:'territory',code:'003',actual:600,previous:0},
],purchases:[{ruc:'0001',code:'001',actual:20}],distributors:[{code:'001',distributor:'D1',actual:60},{code:'001',distributor:'D2',actual:40}]};
const repository = (overrides: Partial<ReportRepository> = {}): ReportRepository => ({
 availableVersions:async()=>VERSIONS.map(v=>({...v,enabled:true})), catalog:async()=>catalog,
 sales:async()=>snapshot.sales, clientPurchases:async()=>({purchases:snapshot.purchases,distributors:snapshot.distributors}),
 snapshot:async()=>snapshot, ...overrides,
});

test('SQL population uses the same assignment as detail, including multiple sellers and fallbacks', async () => {
 const raw = [
  {...catalog.clients[0],ruc:'0001',zona_cliente:' cd03 ',supervisor:'Ignored'},
  {...catalog.clients[0],ruc:'0002',zona_cliente:'A021 - Piura',supervisor:'Comercial'},
  {...catalog.clients[0],ruc:'0003',zona_cliente:'MIRAFLORES',supervisor:'Ignored'},
  {...catalog.clients[0],ruc:'0004',zona_cliente:'',supervisor:'Ignored'},
 ];
 const clients=assignClientSellers(raw,[{zone:'A021',seller:'Uno',supervisor:'S'},{zone:'A021',seller:'Dos',supervisor:'S'}]);
 const cases: [Partial<Query>,string[]][] = [
  [{sellers:['CADENAS']},['0001']],
  [{supervisors:['CADENAS']},['0001']],
  [{sellers:['Uno','Dos']},['0002']],
  [{sellers:['Marketing']},['0003','0004']],
  [{supervisors:['SUPERVISOR MKT']},['0003','0004']],
  [{sellers:['Marketing'],supervisors:['Comercial']},[]],
  [{sellers:['missing']},[]],
 ];
 for(const [fields,expected] of cases){
  const filter={...q,...fields};
  let received:string[]|undefined;
  const service=createReportService(repository({catalog:async()=>({...catalog,clients}),sales:async(_,rucs)=>{received=rucs;return snapshot.sales;}}));
  await service.report(filter);
  assert.deepEqual(received,expected);
  assert.deepEqual(received,clients.filter(c=>clientMatches(c,filter)).map(c=>c.ruc));
 }
 assert.equal(assignedClientRucs(clients,q),undefined);
 assert.equal(assignedClientRucs(clients,{...q,client:'0002',sellers:['Marketing']}),undefined);
 assert.deepEqual(assignedClientRucs([{...clients[1],ruc:'0002\u00a0'}],{...q,sellers:['Uno']}),['0002\u00a0']);
 assert.equal('assignedClients' in parseQuery({assignedClients:['forged'],vendedor:['Marketing']}),false);
});
test('shared market counted once in totals; ratios recomputed, not added',()=>{
 const r=calculateReport(catalog,snapshot,q,VERSIONS[0],catalog.clients) as MatrixResponse;
 assert.equal(r.totals.vta_mdo,200);assert.equal(r.totals.vta_act,40);assert.equal(r.totals.ms_act,.2);
 assert.equal(r.totals.ms_territorio,.4);assert.equal(r.totals.estimacion,80);
 assert.equal(r.brands.find(b=>b.marca==='A')!.ms_ideal,.3);
});
test('brand filter preserves competitors in denominator',()=>{
 const r=calculateReport(catalog,snapshot,{...q,brands:['A']},VERSIONS[0],[]) as MatrixResponse;
 assert.equal(r.totals.vta_mdo,200);assert.equal(r.totals.ms_act,.1);assert.equal(r.brands.length,1);
});
test('V2 divisor 8 and distributor totals are not added to market sales',()=>{
 const r=calculateReport(catalog,snapshot,{...q,version:'V2',client:'0001'},VERSIONS[1],catalog.clients) as ClientMatrixResponse;
 assert.equal(r.totals.vta_act,25);assert.equal(r.totals.vta_mdo,125);
 assert.equal(r.totals.distribuidoras!.D1,7.5);assert.equal(r.totals.distribuidoras!.D2,5);
});
test('client flags and string RUC preserve leading zeros',()=>{
 const r=calculateReport(catalog,snapshot,q,VERSIONS[0],catalog.clients) as MatrixResponse;
 assert.equal(r.client_columns[0].ruc,'0001');
 assert.equal(r.brands.find(b=>b.marca==='A')!.clients['0001 - Cliente'].compra,'SI');
 assert.equal(r.brands.find(b=>b.marca==='B')!.clients['0001 - Cliente'].compra,'NO');
});
test('zero market has finite ratios and zero estimate',()=>{
 const r=calculateReport(catalog,{sales:[],purchases:[],distributors:[]},{...q,client:'0001'},VERSIONS[0],catalog.clients);
 assert.equal(r.totals.ms_act,0);assert.equal(r.totals.estimacion,0);
});
test('territorial benchmark includes own products absent from filtered sales',()=>{
 const c=structuredClone(catalog);c.materials.push({...c.materials[0],code:'004',sku:'004 - A2'});
 const s=structuredClone(snapshot);s.sales.push({scope:'territory',code:'004',actual:100,previous:0});
 const r=calculateReport(c,s,q,VERSIONS[0],[]) as MatrixResponse;
 assert.equal(r.brands.find(b=>b.marca==='A')!.ms_territorio,400/1100);
});
test('input validation rejects malformed lists, versions and metrics',()=>{
 assert.throws(()=>parseQuery({marca:"' OR 1=1 --"}));assert.throws(()=>parseQuery({version:'invalid'}));
 assert.throws(()=>parseQuery({unidadMedida:'X'}));assert.throws(()=>parseQuery({selectedClients:Array(101).fill('x')}));
 assert.deepEqual(parseQuery({marca:['B','A','A']}).brands,['A','B']);
});

test('30 simultaneous product filters share one snapshot and preserve report calculations', async () => {
 let calls = 0;
 const service = createReportService(repository({
  availableVersions: async () => VERSIONS.map(v => ({...v,enabled:true})),
  catalog: async () => catalog,
  sales: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return snapshot.sales; },
 }));
 const filters = Array.from({length:30}, (_, i) => ({...q, brands:[i % 2 ? 'A' : 'B'], search: i < 2 ? '' : String(i)}));
 const reports = await Promise.all(filters.map(filter => service.report(filter)));
 assert.equal(calls, 1);
 reports.forEach((report, i) => assert.deepEqual(report, calculateReport(catalog,snapshot,filters[i],VERSIONS[0],catalog.clients)));
 await service.report({...q, units:['FARMA']});
 await service.report({...q, franchises:['F']});
 assert.equal(calls, 1);
});

test('sales reuse isolates population, permissions and metric without depending on client columns', async () => {
 let calls = 0;
 const service = createReportService(repository({
  availableVersions: async () => VERSIONS.map(v => ({...v,enabled:true})),
  catalog: async () => catalog,
  sales: async () => { calls++; return snapshot.sales; },
 }));
 const variants: Query[] = [q, {...q,version:'V2'}, {...q,unit:'UNIDAD'}, {...q,zones:['A001']},
  {...q,categories:['ORO']}, {...q,supervisors:['Supervisor']}, {...q,sellers:['Seller']},
  {...q,allowedZones:[]}, {...q,allowedZones:['A001']}, {...q,clients:['missing']}, {...q,client:'0001'}];
 for (const filter of variants) await service.report(filter);
 assert.equal(calls, variants.length - 1);
});

test('changing client columns reuses sales while purchases and flags follow the selected clients', async () => {
 const c = structuredClone(catalog);
 c.clients.push({...c.clients[0],ruc:'0002',cp_cliente:'0002 - Otro'});
 let salesCalls = 0, purchaseCalls = 0;
 const service = createReportService(repository({
  catalog:async()=>c,
  sales:async()=>{salesCalls++;return snapshot.sales;},
  clientPurchases:async(_,columns)=>{
   purchaseCalls++;
   return {purchases:columns.map(client=>({ruc:client.ruc,code:client.ruc==='0001'?'001':'002',actual:20})),distributors:[]};
  },
 }));
 const reports = await Promise.all(Array.from({length:30},(_,i)=>service.report({...q,clients:[i%2?'0001':'0002']})));
 assert.equal(salesCalls,1);
 assert.equal(purchaseCalls,2);
 for (let i=0;i<reports.length;i++) {
  const report=reports[i] as MatrixResponse;
  assert.equal(report.totals.vta_act,40);
  assert.equal(report.client_columns[0].ruc,i%2?'0001':'0002');
  const brand=report.brands.find(b=>b.marca===(i%2?'A':'B'))!;
  assert.equal(brand.clients[report.client_columns[0].cp_cliente].compra,'SI');
 }
});

test('quarterly data survives short TTLs and all caches renew after a publication revision changes', async t => {
 let now=1000, revision='first', catalogCalls=0, salesCalls=0, purchaseCalls=0;
 t.mock.method(Date,'now',()=>now);
 const service=createReportService(repository({
  availableVersions:async()=>[{...VERSIONS[0],revision}],
  catalog:async()=>{catalogCalls++;const c=structuredClone(catalog);c.clients[0].supervisor=revision;return c;},
  sales:async()=>{salesCalls++;return snapshot.sales.map(s=>({...s,actual:s.actual*(revision==='first'?1:2)}));},
  clientPurchases:async()=>{purchaseCalls++;return {purchases:[],distributors:[]};},
 }));
 assert.equal((await service.report(q)).totals.vta_act,40);
 now+=6*60*1000;
 assert.equal((await service.report(q)).totals.vta_act,40);
 assert.deepEqual([catalogCalls,salesCalls,purchaseCalls],[1,1,1]);
 revision='corrected'; now+=16000;
 assert.equal((await service.report(q)).totals.vta_act,80);
 assert.deepEqual((await service.options(q)).supervisores,['corrected']);
 assert.deepEqual([catalogCalls,salesCalls,purchaseCalls],[2,2,2]);
});

test('an old in-flight revision cannot overwrite a corrected report', async () => {
 let revision='first', release!:()=>void, entered!:()=>void;
 const started=new Promise<void>(resolve=>{entered=resolve;});
 const gate=new Promise<void>(resolve=>{release=resolve;});
 const service=createReportService(repository({
  availableVersions:async()=>[{...VERSIONS[0],revision}],
  sales:async()=>{const old=revision==='first'; if(old){entered();await gate;}return snapshot.sales.map(s=>({...s,actual:s.actual*(old?1:2)}));},
 }),0);
 const old=service.report(q);await started;
 revision='second';
 assert.equal((await service.report(q)).totals.vta_act,80);
 release();assert.equal((await old).totals.vta_act,40);
 assert.equal((await service.report(q)).totals.vta_act,80);
});

test('legacy deliveries without publication metadata still renew within five minutes', async t => {
 let now=1000, calls=0;
 t.mock.method(Date,'now',()=>now);
 const service=createReportService(repository({
  availableVersions:async()=>[{...VERSIONS[0],revision:'legacy'}],
  sales:async()=>{calls++;return snapshot.sales;},
 }));
 await service.report(q);await service.report(q);
 assert.equal(calls,1);
 now+=300001;
 await service.report(q);
 assert.equal(calls,2);
});

test('client search counts all matches and uses client zone instead of base zone', async () => {
 const c=structuredClone(catalog);
 c.clients=Array.from({length:135},(_,i)=>({...catalog.clients[0],ruc:String(i),cp_cliente:`${i} - Cliente`,zona_cliente:'CD03',zonabase:'A021'}));
 c.clients.push({...catalog.clients[0],zona_cliente:'A021',zonabase:'CD03'});
 const service=createReportService(repository({catalog:async()=>c}));
 const result=await service.search({...q,zones:['CD03']});
 assert.equal(result.total,135);
 assert.equal(result.items.length,100);
 assert.equal(result.limit,100);
 assert.ok(result.items.every(c=>c.zona_cliente==='CD03'));
 assert.equal((await service.search({...q,zones:['CD03'],search:'no existe'})).total,0);
});

test('version discovery hides unavailable versions and detects newly published periods', async () => {
 let available = [{...VERSIONS[0], enabled:true}];
 const service = createReportService(repository({availableVersions:async()=>available}), 0);
 assert.deepEqual((await service.versions()).map(v=>v.id), ['V1']);
 await assert.rejects(service.report({...q,version:'V2'}), /resumen/);
 available = VERSIONS.map(v=>({...v,enabled:true}));
 assert.deepEqual((await service.versions()).map(v=>v.id), ['V1','V2']);
 assert.equal((await service.report({...q,version:'V2'})).totals.vta_act,25);
 available = [];
 assert.deepEqual(await service.versions(),[]);
 await assert.rejects(service.options(q), /disponible/);
 await assert.rejects(service.report(q), /resumen/);
});

test('new version uses published period and divisor without a hardcoded identifier', async () => {
 const v3 = versionFromPeriod({id:'V3',start:'2026-01-01',end:'2026-09-30',previousStart:'2025-01-01',previousEnd:'2025-09-30'});
 const service = createReportService(repository({availableVersions:async()=>[v3]}));
 assert.equal(parseQuery({version:'V3'}).version,'V3');
 assert.equal(v3.months,9);
 assert.equal(v3.previousMonths,9);
 assert.equal((await service.options({...q,version:'V3'})).periodo,'Enero – septiembre 2026');
 assert.equal((await service.report({...q,version:'V3'})).totals.vta_act,200/9);
 await assert.rejects(service.options({...q,version:'V99'}),/disponible/);
 await assert.rejects(service.search({...q,version:'V99'}),/disponible/);
});

test('version metadata supports year boundaries and rejects incomplete or overlapping months', () => {
 const row = {id:'V10',start:'2025-11-01',end:'2026-02-28',previousStart:'2024-11-01',previousEnd:'2025-02-28'};
 const version = versionFromPeriod(row);
 assert.equal(version.label,'Noviembre 2025 – febrero 2026');
 assert.equal(version.months,4);
 assert.deepEqual(configuredVersions([row]).map(v=>v.id),['V1','V2','V10']);
 assert.throws(()=>versionFromPeriod({...row,end:'2026-02-30'}),/DATA_VERSION_PERIOD/);
 assert.throws(()=>versionFromPeriod({...row,start:'2025-11-02'}),/DATA_VERSION_PERIOD/);
 assert.throws(()=>versionFromPeriod({...row,previousEnd:'2025-11-30'}),/DATA_VERSION_PERIOD/);
 assert.equal(versionFromPeriod({...row,start:'2026-02-01'}).months,1);
 assert.equal(versionFromPeriod({...row,start:'2026-02-01'}).label,'Febrero 2026');
});

test('sales card uses filtered report totals instead of global distributor sales', async () => {
 const service = createReportService(repository({
  availableVersions: async () => VERSIONS.map(v => ({...v,enabled:true})),
  catalog: async () => catalog, snapshot: async () => snapshot,
 }));
 const base={...q,version:'V2'};
 const all=await service.report(base);
 const filtered=await service.report({...base,brands:['A']});
 assert.equal(all.totals.vta_act,25);
 assert.equal(filtered.totals.vta_act,12.5);
 assert.equal('venta_actual_mensual_global' in filtered,false);
});


test('BI brand criterion includes own brands regardless of competitor flag', () => {
 const c=structuredClone(catalog);
 c.materials[0].competitor=true;
 c.materials[2].competitor=false;
 const r=calculateReport(c,snapshot,q,VERSIONS[0],[]) as MatrixResponse;
 assert.equal(r.totals.vta_act,40);
 assert.equal(r.totals.vta_mdo,200);
 assert.deepEqual(r.brands.map(b=>b.marca).sort(),['A','B']);
});


test('empty brands do not select markets but their sales remain in selected markets', () => {
 const c=structuredClone(catalog);
 c.materials[2].brand='';
 c.materials.push({...c.materials[2],code:'004',market:'OTHER',brand:'   '});
 const data=structuredClone(snapshot);
 data.sales.push({scope:'main',code:'004',actual:5000,previous:0});
 const r=calculateReport(c,data,q,VERSIONS[0],[]) as MatrixResponse;
 assert.equal(r.totals.vta_act,40);
 assert.equal(r.totals.vta_mdo,200);
 assert.deepEqual(r.brands.map(b=>b.marca).sort(),['A','B']);
});


test('CD zones override assigned sellers and marketing with CADENAS', () => {
 const clients = ['CD03',' cd01 ','Cd02'].map(zona_cliente => ({...catalog.clients[0], zona_cliente}));
 const assigned = assignClientSellers(clients,[{zone:'CD03',seller:'Otro vendedor',supervisor:'Otro supervisor'}]);
 for (const client of assigned) {
  assert.deepEqual(client.vendedores,['CADENAS']);
  assert.equal(client.supervisor,'CADENAS');
  assert.equal(clientMatches(client,{...q,sellers:['CADENAS'],supervisors:['CADENAS']}),true);
  assert.equal(clientMatches(client,{...q,sellers:['Marketing']}),false);
  assert.equal(clientMatches(client,{...q,sellers:['Otro vendedor']}),false);
 }
});

test('client zone assigns multiple sellers and marketing fallback without using base zone', () => {
 const clients = [
  {...catalog.clients[0], zona_cliente:'A021 - Piura', zonabase:'A999', supervisor:'Supervisor comercial'},
  {...catalog.clients[0], ruc:'0002', zona_cliente:'LIMA - MIRAFLORES', zonabase:'A021'},
  {...catalog.clients[0], ruc:'0003', zona_cliente:'A022'},
 ];
 const assigned=assignClientSellers(clients,[
  {zone:'A021 - Otra descripcion',seller:'Uno',supervisor:'S'},
  {zone:'A021',seller:'Dos',supervisor:'S'},
  {zone:'A022',seller:' ',supervisor:'S'},
 ]);
 assert.deepEqual(assigned[0].vendedores,['Uno','Dos']);
 assert.equal(assigned[0].supervisor,'Supervisor comercial');
 for (const c of assigned.slice(1)) {
  assert.deepEqual(c.vendedores,['Marketing']);
  assert.equal(c.supervisor,'SUPERVISOR MKT');
  assert.equal(clientMatches(c,{...q,sellers:['Marketing'],supervisors:['SUPERVISOR MKT']}),true);
 }
 assert.equal(clientZoneKey('LIMA - MIRAFLORES'),'LIMA - MIRAFLORES');
 assert.equal(clientMatches(assigned[1],{...q,zones:['LIMA - MIRAFLORES']}),true);
 assert.equal(clientMatches(assigned[1],{...q,zones:['LIMA - SURCO']}),false);
 assert.equal(clientMatches(assigned[1],{...q,sellers:['Uno']}),false);
});

test('filter relations use full authorized catalog, deduplicate tuples and do not query sales', async()=>{
 const clients=Array.from({length:1002},(_,i)=>({...catalog.clients[0],ruc:String(i),zonabase:'A021',zona_cliente:i===1001?'LAST':'A021',supervisor:'S',vendedores:['Uno','Dos']}));
 clients.push({...clients[0],ruc:'private',zonabase:'A022',zona_cliente:'SECRET',supervisor:'PRIVATE'});
 let catalogCalls=0;
 const service=createReportService(repository({catalog:async()=>{catalogCalls++;return {...catalog,clients};},sales:async()=>{throw new Error('must not query sales');}}));
 const result=await service.options({...q,allowedZones:['A021']});
 assert.equal(result.clients.length,1000);
 assert.equal(result.relations.clients.length,4);
 assert.ok(result.relations.clients.some(row=>row[1]==='LAST'));
 assert.ok(result.relations.clients.every(row=>row[1]!=='SECRET'));
 assert.deepEqual(result.relations.materials,[['FARMA','F','A'],['FARMA','F','B']]);
 await service.options({...q,allowedZones:['A021']}); assert.equal(catalogCalls,1);
});
