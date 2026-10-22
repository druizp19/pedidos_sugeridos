"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { MatrixTotals } from "@/domain/report-contracts";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface Props {
  totals: MatrixTotals | null;
  unidadMedida: "UNIDAD" | "S/ SOLES";
  loading: boolean;
}

export function ClientDetailSummary({ totals, unidadMedida, loading }: Props) {
  const money = unidadMedida === "S/ SOLES";
  const items = [
    { label: "Venta actual", value: totals && formatNumber(totals.vta_act, money), note: money ? "Soles por mes" : "Unidades por mes" },
    { label: "Mercado", value: totals && formatNumber(totals.vta_mdo, money), note: "Promedio mensual auditado" },
    { label: "Share actual", value: totals && formatPercent(totals.ms_act), note: "Participación en el cliente" },
    { label: "Share ideal", value: totals && formatPercent(totals.ms_ideal), note: "Objetivo de recupero" },
    { label: "Pedido sugerido", value: totals && formatNumber(totals.estimacion, money), note: "Estimación mensual" },
  ];
  return <section aria-label="Indicadores del cliente" aria-busy={loading} className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-5">
    {items.map((item, index) => <div key={item.label} className={cn("min-w-0 px-4 py-3.5 sm:px-5", index < 4 ? "border-b border-r border-slate-100 dark:border-slate-800 lg:border-b-0" : "col-span-2 bg-[#6a5cbc] dark:bg-[#6a5cbc] lg:col-span-1")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={cn("text-xs font-medium", index === 4 ? "text-white/90" : "text-slate-500 dark:text-slate-400")}>{item.label}</h3>
        {index === 4 && <ArrowUpRight className="h-4 w-4 text-white/90" />}
      </div>
      {loading ? <Skeleton className="my-2 h-8 w-24" /> : <p className={cn("mt-1.5 text-2xl font-semibold tracking-tight tabular-nums", index === 4 ? "text-white" : "text-slate-800 dark:text-slate-100")}>{item.value ?? "—"}</p>}
      <p className={cn("mt-1 text-[11px]", index === 4 ? "text-white/85" : "text-slate-500 dark:text-slate-400")}>{item.note}</p>
    </div>)}
  </section>;
}
