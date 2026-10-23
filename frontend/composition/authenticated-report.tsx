'use client';
import { useEffect, useRef, useState } from 'react';
import { ReportApp } from './report-app';
import { sessionRequest, SESSION_LOST } from '@/infrastructure/http/session-gateway';
import type { AccessScope } from '@/domain/access';
import { AccountMenu } from '@/presentation/components/account-menu';

export function AuthenticatedReport({ portalUrl }: { portalUrl: string }) {
  const [user,setUser]=useState<AccessScope|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [loggingOut,setLoggingOut]=useState(false);
  const initial=useRef<Promise<AccessScope>|null>(null);
  useEffect(()=>{
    let active=true, ready=false;
    // StrictMode may rerun the effect: exchange a one-use code only once.
    if(!initial.current){
      const params=new URLSearchParams(window.location.hash.slice(1));
      const code=params.get('sso_code');
      if(window.location.hash) window.history.replaceState(null,'',window.location.pathname+window.location.search);
      for(const key of ['sugerido_auth','sugerido_token','sugerido_user']) { try { localStorage.removeItem(key); } catch {} }
      initial.current=sessionRequest(code?'exchange':'session',code||undefined);
    }
    initial.current.then(value=>{ready=true;if(active)setUser(value);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    const lost=()=>{setUser(null);setError('Tu sesión o asignación cambió. Ingresa nuevamente desde Ecosistema.');};
    const refresh=()=>{
      if(!ready || document.visibilityState!=='visible')return;
      sessionRequest('session').then(value=>{if(active){setUser(value);setError('');}})
        .catch(e=>{if(active){setUser(null);setError(e.message);}});
    };
    window.addEventListener(SESSION_LOST,lost);
    window.addEventListener('focus',refresh);
    return ()=>{active=false;window.removeEventListener(SESSION_LOST,lost);window.removeEventListener('focus',refresh);};
  },[]);
  async function logout(){
    setLoggingOut(true); setError('');
    try { await sessionRequest('logout'); setUser(null); window.location.assign(portalUrl); }
    catch(e){setError(e instanceof Error?e.message:'No se pudo cerrar la sesión.');}
    finally { setLoggingOut(false); }
  }
  if(!user)return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
    <div className="max-w-lg rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="mb-3 text-xl font-semibold">Pedidos Sugeridos</h1>
      <p role="status">{loading?'Validando tu acceso…':error||'Ingresa desde Ecosistema para consultar tus zonas asignadas.'}</p>
      {!loading&&<a className="mt-6 inline-block rounded bg-blue-700 px-4 py-2 text-white" href={portalUrl}>Ir a Ecosistema</a>}
    </div>
  </main>;
  return <ReportApp key={`${user.userId}:${JSON.stringify(user.assignments)}`}
    accountControl={<AccountMenu name={user.name} role={user.role} zones={user.zones} onLogout={logout} loggingOut={loggingOut} error={error} />} />;
}
