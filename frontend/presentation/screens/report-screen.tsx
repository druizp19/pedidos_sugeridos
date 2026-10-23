"use client";
import type { ReactNode } from 'react';
import { Alert,AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle,ArrowUpRight,CalendarDays,Layers } from 'lucide-react';
import { ClientDetailModal } from '../components/client-detail-modal';
import { ClientModal } from '../components/client-modal';
import { FilterToolbar } from '../components/filter-toolbar';
import { Header } from '../components/header';
import { KPISummary } from '../components/kpi-summary';
import { MatrixTable } from '../components/matrix-table';
import { useReportController } from '../hooks/use-report-controller';
import { PublicationDate } from '../components/publication-date';

export default function DashboardPage({ accountControl }: { accountControl?: ReactNode }) {
  const vm = useReportController();
  const { filters, data, options } = vm;
  return <div className="min-h-screen bg-background">
    <Header accountControl={accountControl} filters={filters} versions={vm.versions} onVersion={value => vm.change('version', value)} onUnitChange={value => vm.change('unidadMedida', value)} isLoading={vm.loading} hasReport={!!data} />
    <main className="mx-auto max-w-[1920px] space-y-6 px-4 py-7 lg:px-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-primary"><Layers size={14} />Inteligencia de negocios</div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">De la oportunidad al pedido</h2><p className="mt-2 text-sm text-muted-foreground">Analiza tu cartera, compara el mercado y prioriza cada visita.</p></div>
        <div className="flex flex-col gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground"><div className="flex items-center gap-2"><CalendarDays size={14} /><span>{data?.periodo || options?.periodo || 'Consultando período…'}</span><Badge variant="secondary">{filters.version}</Badge></div><PublicationDate value={data ? data.publicado_en : options?.publicado_en} /></div>
      </section>
      <KPISummary totals={data?.totals || null} unidadMedida={filters.unidadMedida} loading={vm.loading} />
      <Card className="shadow-sm"><FilterToolbar filterOptions={options} filters={filters} onChange={vm.change} onReset={vm.reset} onOpenClientModal={() => vm.setClientsOpen(true)} onExpandAll={vm.expand} sortField={vm.sort} sortDir={vm.direction} /></Card>
      {vm.error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription><div className="flex items-center justify-between gap-4"><span>{vm.error}</span><Button variant="outline" size="sm" onClick={vm.reload}>Reintentar</Button></div></AlertDescription></Alert>}
      <Card className="overflow-hidden shadow-sm" aria-busy={vm.loading}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div className="flex items-center gap-3"><h3 className="text-sm font-semibold">Matriz de oportunidades</h3><Badge variant="secondary">{data?.total_brands_count ?? '—'} marcas</Badge></div><p className="flex items-center gap-1 text-xs text-muted-foreground">Selecciona un cliente para ver su detalle<ArrowUpRight size={14} /></p></div>
        {vm.loading ? <div role="status" className="space-y-4 p-6"><p className="mb-5 text-sm text-muted-foreground">Preparando tu reporte…</p>{[0,1,2,3,4].map(row => <Skeleton key={row} className="h-10 w-full" />)}</div> : <MatrixTable brands={data?.brands || []} totals={data?.totals || null} clientColumns={data?.client_columns || []} unidadMedida={filters.unidadMedida} searchTerm={filters.search} sortField={vm.sort} sortDir={vm.direction} onSort={vm.changeSort} collapsedBrands={vm.collapsed} onToggleBrand={vm.toggleBrand} onExpandAll={vm.expand} onClientClick={vm.setClient} />}
        <div className="border-t bg-muted/20 px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">Promedios mensuales. Los clientes seleccionados agregan columnas de compra; los totales corresponden a los filtros de cartera, antes de la búsqueda.</div>
      </Card>
    </main>
    <ClientModal isOpen={vm.clientsOpen} onClose={() => vm.setClientsOpen(false)} selectedClients={filters.selectedClients} activeCategory={filters.quintil} activeZonaBase={filters.zonaBase} activeSupervisor={filters.supervisor} activeSeller={filters.vendedor} version={filters.version} onApply={value => vm.change('selectedClients', value)} />
    <ClientDetailModal key={filters.version + ':' + (vm.client?.ruc || '')} isOpen={!!vm.client} onClose={() => vm.setClient(null)} client={vm.client} filters={filters} />
  </div>;
}
