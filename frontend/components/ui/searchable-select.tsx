"use client";

import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchableSelectProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  onValueChange: (value: string) => void;
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

/** Search is local to the option list; only selecting an option changes the report. */
export function SearchableSelect({ id, label, value, options, disabled, onValueChange }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const term = normalize(search);
  const matches = useMemo(() => options.filter(option => normalize(option).includes(term)), [options, term]);

  function select(next: string) {
    onValueChange(next);
    setOpen(false);
    setSearch('');
  }

  return <Popover.Root open={open} onOpenChange={next => { setOpen(next); setSearch(''); }}>
    <Popover.Trigger asChild>
      <Button id={id} type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open}
        disabled={disabled} className="h-9 w-full justify-between gap-2 bg-background px-3 text-xs font-normal">
        <span className="truncate">{value || 'Todos'}</span><ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content align="start" sideOffset={5} collisionPadding={12}
        onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus(); }}
        className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
        <Command shouldFilter={false} loop label={`Opciones de ${label}`}>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input ref={input} value={search} onValueChange={setSearch} aria-label={`Buscar en ${label}`}
              placeholder="Escribe para buscar…" className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <Command.List className="max-h-60 overflow-y-auto overscroll-contain p-1" aria-label={label}>
            {!term && <Command.Item value="all" onSelect={() => select('')}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground">
              <Check className={cn('h-4 w-4 shrink-0', value ? 'opacity-0' : 'text-primary')} />Todos
            </Command.Item>}
            {matches.map(option => <Command.Item key={option} value={`option:${option}`} onSelect={() => select(option)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground">
              <Check className={cn('h-4 w-4 shrink-0', value === option ? 'text-primary' : 'opacity-0')} />
              <span className="break-words">{option}</span>
            </Command.Item>)}
            <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">No se encontraron opciones.</Command.Empty>
          </Command.List>
        </Command>
        <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span aria-live="polite">{matches.length} opciones</span>
          {value && <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => select('')}>Quitar filtro</Button>}
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
