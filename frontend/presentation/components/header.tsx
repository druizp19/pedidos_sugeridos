"use client";
import type { ReactNode } from 'react';
import { Alert,AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import type { FilterData,FilterState } from '@/domain/report-contracts';
import { getApiPath } from '@/lib/utils';
import { BarChart2,Coins,FileSpreadsheet,Moon,Package,Sun } from 'lucide-react';
import { useExport } from '../hooks/use-export';
import { useTheme } from '../hooks/use-theme';
interface HeaderProps {
  accountControl?: ReactNode;
  filters: FilterState; versions: FilterData['versions']; onVersion: (v: string) => void;
  onUnitChange: (u: FilterState['unidadMedida']) => void; isLoading: boolean; hasReport: boolean;
}
export function Header({ accountControl, filters, versions, onVersion, onUnitChange, isLoading, hasReport }: HeaderProps) {
  const { dark, toggle } = useTheme();
  const { exporting, error, download } = useExport();
  return <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
    <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
      <div className="flex items-center gap-5">
        <img src={getApiPath(dark ? '/humanova-light.png' : '/humanova-medifarma-dark.png')} className="h-auto w-28 sm:w-32" alt="Humanova Medifarma" />
        <div className="border-l pl-5"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">Gestión comercial</p><h1 className="text-lg font-semibold tracking-tight sm:text-xl">Pedidos Sugeridos</h1></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={versions.some(v => v.id === filters.version) ? filters.version : ''} onValueChange={onVersion} disabled={!versions.length}>
          <SelectTrigger aria-label="Versión de datos" className="w-[235px] bg-card text-xs"><SelectValue placeholder={versions.length ? 'Seleccionar versión' : 'Sin versiones disponibles'} /></SelectTrigger>
          <SelectContent>{versions.filter(v => v.enabled).map(v => <SelectItem key={v.id} value={v.id}>{v.id} · {v.label}</SelectItem>)}</SelectContent>
        </Select>
        {accountControl}
        <div role="group" aria-label="Unidad de medida" className="flex rounded-lg border bg-muted/50 p-1">
          {(['UNIDAD', 'S/ SOLES'] as const).map(unit => <Button key={unit} size="sm" variant={filters.unidadMedida === unit ? 'default' : 'ghost'} aria-pressed={filters.unidadMedida === unit} onClick={() => onUnitChange(unit)} className="gap-2">{unit === 'UNIDAD' ? <Package size={14} /> : <Coins size={14} />}{unit === 'UNIDAD' ? 'Unidades' : 'Soles'}</Button>)}
        </div>
        <Button onClick={() => download(filters)} disabled={exporting || isLoading || !hasReport} variant="outline" className="gap-2 bg-card"><FileSpreadsheet size={16} />{exporting ? 'Exportando…' : 'Exportar Excel'}</Button>
        <Button asChild variant="ghost" size="icon"><a aria-label="Abrir Power BI" title="Reporte Power BI" href="https://app.powerbi.com/reportEmbed?reportId=bfebef73-a89e-4277-a63a-5696af17f567&autoAuth=true&ctid=c646feee-bdad-4c72-b8a2-bf167f36afaf" target="_blank" rel="noopener noreferrer"><BarChart2 size={17} /></a></Button>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? 'Tema claro' : 'Tema oscuro'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</Button>
      </div>
    </div>
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
  </header>;
}
