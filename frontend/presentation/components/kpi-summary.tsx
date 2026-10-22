"use client";
import { Card,CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { MatrixTotals } from '@/domain/report-contracts';
import { cn,formatNumber,formatPercent } from '@/lib/utils';
import { ArrowUpRight,Globe,PieChart,Target,TrendingUp } from 'lucide-react';
export function KPISummary({ totals, unidadMedida, loading = false, compact = false }: { totals: MatrixTotals | null; unidadMedida: 'UNIDAD' | 'S/ SOLES'; loading?: boolean; compact?: boolean }) {
  const money = unidadMedida === 'S/ SOLES';
  const cards = [
    { label: 'Venta actual mensual', value: totals && formatNumber(totals.vta_act, money), note: money ? 'Soles / mes' : 'Unidades / mes', icon: TrendingUp },
    { label: 'Mercado mensual', value: totals && formatNumber(totals.vta_mdo, money), note: 'Total del mercado auditado', icon: Globe },
    { label: 'Market share actual', value: totals && formatPercent(totals.ms_act), note: 'Participación en la cartera', icon: PieChart },
    { label: 'Market share ideal', value: totals && formatPercent(totals.ms_ideal), note: 'Objetivo de recupero', icon: Target },
    { label: 'Estimación mensual', value: totals && formatNumber(totals.estimacion, money), note: 'Potencial mensual proyectado', icon: ArrowUpRight },
  ];
  return <section aria-label="Indicadores del reporte" aria-busy={loading} className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5", compact ? "grid-cols-2" : "grid-cols-1")}>
    {cards.map((card, index) => <Card key={card.label} className={cn('shadow-sm', index === 4 && 'border-primary/30 bg-primary/5')}><CardContent className={compact ? "p-3 sm:p-4" : "p-5"}><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-xs font-medium text-muted-foreground">{card.label}</h3><card.icon className="h-4 w-4 shrink-0 text-primary" /></div>{loading ? <Skeleton className="my-1 h-8 w-28" /> : <p className={cn('text-2xl font-semibold tracking-tight tabular-nums', index === 4 && 'text-primary')}>{card.value || '—'}</p>}<p className="mt-2 text-[11px] text-muted-foreground">{card.note}</p></CardContent></Card>)}
  </section>;
}
