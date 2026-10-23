'use client';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Loader2, LogOut, MapPin, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AccountMenuProps = {
  name: string; role: string; zones?: string[];
  onLogout: () => void; loggingOut: boolean; error: string;
};

export function AccountMenu({ name, role, zones, onLogout, loggingOut, error }: AccountMenuProps) {
  const roleLabel = ({ ADMINISTRADOR: 'Administrador', SUPERVISOR: 'Supervisor', REPRESENTANTE: 'Representante' } as Record<string,string>)[role] || role;
  return <Popover.Root>
    <Popover.Trigger asChild>
      <button type="button" aria-label={`Cuenta de ${name}`} className="flex h-10 items-center gap-2 rounded-lg border bg-card px-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound size={15} /></span>
        <span className="hidden min-w-0 sm:block"><span className="block max-w-[145px] truncate text-[11px] font-medium">{name}</span><span className="block text-[10px] text-muted-foreground">{roleLabel}</span></span>
        <ChevronDown size={13} className="shrink-0 text-muted-foreground" />
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="z-50 w-80 max-w-[calc(100vw-24px)] rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none">
        <div className="border-b p-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mi cuenta</p><p className="text-sm font-semibold leading-snug">{name}</p><p className="mt-1 text-xs text-muted-foreground">{roleLabel}</p></div>
        <div className="p-4"><p className="mb-2 flex items-center gap-1.5 text-xs font-medium"><MapPin size={14} className="text-primary" />{zones?'Zonas asignadas':'Acceso de administrador'}</p>
          {zones ? <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">{zones.map(zone=><span key={zone} className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">{zone}</span>)}</div> : <p className="text-xs text-muted-foreground">Todas las zonas comerciales.</p>}
        </div>
        <div className="border-t p-2"><Button type="button" variant="ghost" disabled={loggingOut} onClick={onLogout} className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive">{loggingOut?<Loader2 size={15} className="animate-spin" />:<LogOut size={15} />}{loggingOut?'Cerrando sesión…':'Cerrar sesión'}</Button>
          {error&&<p role="alert" className="px-2 pb-2 text-xs text-destructive">{error}</p>}
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
