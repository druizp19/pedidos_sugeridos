/** Read-only integration: real portal repositories and SSO service, real Next handlers.
 * Uses an in-process transport instead of binding a server port. No login/activity writes.
 * Run after building Ecosistema backend. Pass its absolute directory as argument.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { loadEnvConfig } from '@next/env';
import { GET, POST } from '../app/api/[...path]/route';
import { getPool } from '../infrastructure/database/connection';
import ExcelJS from 'exceljs';

loadEnvConfig(process.cwd());
async function main() {
  if(!process.argv[2])throw new Error('Indica la carpeta backend de Ecosistema.');
  const root=resolve(process.argv[2]), req=createRequire(resolve(root,'package.json'));
  const portalEnv=req('dotenv').parse(readFileSync(resolve(root,'.env')));
  const {ConfigService}=req('@nestjs/config');
  const {DatabaseService}=req('./dist/database/database.service');
  const {MssqlUserRepository}=req('./dist/infrastructure/adapters/out/persistence/mssql-user.repository');
  const {MssqlSistemaRepository}=req('./dist/infrastructure/adapters/out/persistence/mssql-sistema.repository');
  const {SugeridoSsoService}=req('./dist/sistemas/sugerido-sso.service');
  const {GenerateSistemaLaunchUrlUseCase}=req('./dist/core/application/use-cases/sistemas/generate-sistema-launch-url.use-case');
  const config=new ConfigService(portalEnv), db=new DatabaseService(config);
  const originalFetch=globalThis.fetch;
  await db.onModuleInit();
  try {
    const users=new MssqlUserRepository(db), systems=new MssqlSistemaRepository(db);
    const sso=new SugeridoSsoService(config,users,systems);
    const launch=new GenerateSistemaLaunchUrlUseCase(users,systems,{}, {recordSystemOpen:async()=>{}},
      {isEnabled:async()=>false},'unused',undefined,portalEnv.SUGERIDO_PUBLIC_URL,undefined,'12h',sso);
    globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=new URL(String(input));
      assert.ok(url.toString().startsWith(process.env.ECOSISTEMA_INTERNAL_URL!.replace(/\/$/,'')+'/sugerido-sso/'));
      try {
        sso.authenticateService(new Headers(init?.headers).get('X-Sugerido-Service'));
        const payload=JSON.parse(String(init?.body));
        const action=url.pathname.split('/').at(-1);
        const value=action==='exchange'?await sso.exchange(payload.code):action==='validate'?await sso.validate(payload.session):sso.logout(payload.session);
        return Response.json(value);
      }catch(e){const error=e as {getStatus?:()=>number;message:string};return Response.json({message:error.message},{status:error.getStatus?.()||500});}
    }) as typeof fetch;
    const origin=new URL(process.env.PEDIDOS_PUBLIC_URL!).origin;
    const api=async(path:string,cookie='',body?:object)=>{
      const request=new Request(`${origin}/sugerido/api/${path}`,{method:body?'POST':'GET',
        headers:{Origin:origin,...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
      return body?POST(request):GET(request);
    };
    const login=async(id:number)=>{
      const result=await launch.execute(id,2);
      assert.equal(result.ssoToken,undefined);
      const code=new URLSearchParams(new URL(result.launchUrl).hash.slice(1)).get('sso_code');
      const response=await api('auth/exchange','',{code});
      assert.equal(response.status,200,await response.clone().text());
      assert.match(response.headers.get('set-cookie')!,/HttpOnly/);
      assert.equal((await api('auth/exchange','',{code})).status,401);
      return response.headers.get('set-cookie')!.split(';')[0];
    };
    const a=await login(304),b=await login(267),sup=await login(309);
    const data=async(path:string,cookie:string)=>{
      const response=await api(path,cookie);assert.equal(response.status,200,await response.clone().text());return (await response.json()).data;
    };
    const ayacucho=await data('filters?version=V2',a),norte=await data('filters?version=V2',b),team=await data('filters?version=V2',sup);
    assert.equal(ayacucho.total_clients,68);assert.equal(norte.total_clients,141);assert.equal(team.total_clients,1380);
    const own=ayacucho.clients[0].ruc,foreign=norte.clients[0].ruc;
    assert.equal((await api('client-matrix',a,{version:'V2',client:foreign,rol:'ADMINISTRADOR',allowedZones:['AX01']})).status,400);
    assert.equal((await api('export-excel',a,{version:'V2',client:foreign})).status,400);
    const detail=await api('client-matrix',a,{version:'V2',client:own});
    assert.equal(detail.status,200);assert.equal((await detail.json()).data.client.ruc,own);
    const exported=await api('export-excel',a,{version:'V2',selectedClients:[own,foreign]});
    assert.equal(exported.status,200);
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await exported.arrayBuffer()) as never);
    const text=JSON.stringify(workbook.worksheets.map(sheet=>sheet.getSheetValues()));
    assert.ok(!text.includes(norte.clients[0].cp_cliente));
    assert.ok(workbook.worksheets.length>0);
    assert.equal((await api('auth/logout',a,{})).status,200);
    assert.equal((await api('filters?version=V2',a)).status,401);
    sso.revokeUser(267);
    assert.equal((await api('filters?version=V2',b)).status,401);
    assert.equal((await api('filters?version=V2')).status,401);
    console.log(JSON.stringify({launch:true,exchange:true,replayDenied:true,representatives:[68,141],supervisorClients:1380,
      foreignDetailDenied:true,foreignExportDenied:true,excelReadBack:true,logoutRevoked:true,portalLogoutRevoked:true,anonymousDenied:true}));
  } finally { globalThis.fetch=originalFetch;await db.onModuleDestroy(); }
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Verification failed');process.exitCode=1;})
  .finally(async()=>{await(await getPool()).close();});
