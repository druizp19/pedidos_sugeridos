import { NextResponse } from 'next/server';
import { parseQuery, InputError } from '@/application/report-service';
import { createReportService } from '@/composition/report-service';
import { MssqlReportRepository } from '@/infrastructure/database/mssql-report.repository';
import { BusyError } from '@/infrastructure/runtime/work-queue';

import { workbook } from '@/infrastructure/export/workbook';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const service = createReportService(new MssqlReportRepository());
const json = (data: unknown, status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function body(request: Request): Promise<Record<string,unknown>> {
  if (Number(request.headers.get('content-length') || 0)>65536) throw new InputError('Solicitud demasiado grande.');
  const text=await request.text(); if(text.length>65536)throw new InputError('Solicitud demasiado grande.');
  try { const parsed=JSON.parse(text || '{}'); if(!parsed || Array.isArray(parsed)||typeof parsed!=='object')throw new Error();return parsed; }
  catch {throw new InputError('Solicitud JSON inválida.');}
}
async function handle(request: Request) {
  try {
    const url=new URL(request.url);const action=url.pathname.split('/api/')[1];
    const origin=request.headers.get('origin');
    if(request.method!=='GET' && origin && new URL(origin).host!==(request.headers.get('host') || url.host))return json({success:false,error:'Origen no permitido.'},403);
    const b=request.method==='GET' ? Object.fromEntries(url.searchParams) : await body(request);
    if(action==='search-clients') {
      b.search=b.q || b.search || ''; b.categorizacion=b.category?[b.category]:[];
      b.zonaBase=typeof b.zonaBase==='string'&&b.zonaBase?[b.zonaBase]:[];
      b.supervisor=typeof b.supervisor==='string'&&b.supervisor?[b.supervisor]:[];
      b.vendedor=typeof b.vendedor==='string'&&b.vendedor?[b.vendedor]:[];
    }
    const q=parseQuery(b);
    if(action==='versions')return json({success:true,data:await service.versions()});
    if(action==='filters')return json({success:true,data:await service.options(q)});
    if(action==='search-clients')return json({success:true,data:await service.search(q)});
    if(action==='matrix'||action==='client-matrix'||action==='export-excel') {
      if(action==='client-matrix'&&!q.client)throw new InputError('Selecciona un cliente.');
      const data=await service.report(q);
      if(action==='export-excel')return new Response(new Uint8Array(await workbook(data,q.version)),{headers:{
        'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':`attachment; filename="Pedidos_Sugeridos_${q.version}.xlsx"`,'Cache-Control':'no-store'}});
      return json({success:true,data});
    }
    return json({success:false,error:'Ruta no encontrada.'},404);
  } catch(error) {
    if(error instanceof InputError)return json({success:false,error:error.message},400);
    if(error instanceof BusyError)return NextResponse.json({success:false,error:error.message},{status:503,headers:{'Retry-After':'5','Cache-Control':'no-store'}});
    const code=error instanceof Error?error.message:'';
    const known:Record<string,string>={DB_CONFIGURATION:'Configura la conexión SQL en .env.local.',DATA_DUPLICATE_CLIENT:'Hay RUC duplicados en el catálogo de esta versión.',
      DATA_DUPLICATE_MATERIAL:'Hay materiales duplicados en esta versión.',DATA_UNCLASSIFIED_MATERIAL:'Hay productos sin clasificación de competidor.',
      DATA_VERSION_PERIOD:'Hay una versión con períodos inválidos. Revisa la configuración del resumen.'};
    console.error('[pedidos-api]',error instanceof Error ? error.name : 'UnknownError');
    return json({success:false,error:known[code] || 'No se pudo consultar el modelo. Comprueba la conexión SQL y el resumen de la versión.'},500);
  }
}
export const GET=handle;export const POST=handle;export const DELETE=handle;
