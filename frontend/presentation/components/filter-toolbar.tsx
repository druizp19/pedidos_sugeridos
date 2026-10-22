"use client";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { FilterData,FilterState } from '@/domain/report-contracts';
import { MinusSquare,PlusSquare,RotateCcw,Search,SlidersHorizontal,Users } from 'lucide-react';
interface FilterToolbarProps {
  filterOptions: FilterData | null; filters: FilterState;
  onChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void; onOpenClientModal: () => void; onExpandAll?: (expand: boolean) => void;
  sortField?: string; sortDir?: 'asc' | 'desc';
}
const fields = [
  { key: 'unidadNegocio', label: 'Unidad de negocio', options: 'unidades_negocio' },
  { key: 'franquicia', label: 'Franquicia', options: 'franquicias' },
  { key: 'marca', label: 'Marca', options: 'marcas' },
  { key: 'quintil', label: 'Categorización', options: 'categorizaciones' },
  { key: 'zonaBase', label: 'Zona cliente', options: 'zonas_base' },
  { key: 'supervisor', label: 'Supervisor', options: 'supervisores' },
  { key: 'vendedor', label: 'Vendedor', options: 'vendedores' },
] as const;
export function FilterToolbar({ filterOptions, filters, onChange, onReset, onOpenClientModal, onExpandAll }: FilterToolbarProps) {
  const active = fields.filter(f => Boolean(filters[f.key])).length;
  return <section aria-label="Filtros del reporte" className="space-y-5 p-5">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Explora tu cartera</h3>{active > 0 && <Badge variant="secondary">{active} filtros</Badge>}</div><Button variant="ghost" size="sm" onClick={onReset} className="gap-2 text-muted-foreground"><RotateCcw size={13} />Limpiar filtros</Button></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
      {fields.map(field => <div key={field.key} className="flex min-w-0 flex-col gap-2"><label htmlFor={field.key} className="text-xs font-medium text-muted-foreground">{field.label}</label><SearchableSelect id={field.key} label={field.label} value={filters[field.key]} options={filterOptions?.[field.options] || []} disabled={!filterOptions} onValueChange={value => onChange(field.key, value)} /></div>)}
      <div className="flex min-w-0 flex-col gap-2"><p className="text-xs font-medium text-muted-foreground">Columnas de clientes</p><Button variant="outline" className="h-9 w-full gap-2 text-xs" onClick={onOpenClientModal}><Users size={14} />Clientes ({filters.selectedClients.length || 'Top 8'})</Button></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar marca o SKU" placeholder="Buscar marca o SKU…" value={filters.search} onChange={e => onChange('search', e.target.value)} className="h-9 bg-background pl-9 text-xs" /></div><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => onExpandAll?.(true)} className="gap-2"><PlusSquare size={14} />Expandir todo</Button><Button variant="ghost" size="sm" onClick={() => onExpandAll?.(false)} className="gap-2"><MinusSquare size={14} />Colapsar todo</Button></div></div>
  </section>;
}
