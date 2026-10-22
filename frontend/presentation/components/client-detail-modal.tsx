"use client";

import { Button } from "@/components/ui/button";
import {
Dialog,
DialogContent,
DialogDescription,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
Building2,
DollarSign,
MapPin,
MinusSquare,
Package,
PlusSquare,
Search,
UserCheck,
Users
} from "lucide-react";
import { useClientDetail } from '../hooks/use-client-detail';
import { ClientDetailTable } from './client-detail-table';
import { ClientDetailSummary } from './client-detail-summary';
import { PublicationDate } from './publication-date';

import type { ClientDetailModalProps } from '../hooks/use-client-detail';
export function ClientDetailModal({
  isOpen,
  onClose,
  client,
  filters,
}: ClientDetailModalProps) {
  const {exporting,data,isLoading,error,searchTerm,setSearchTerm,sortField,sortDir,collapsedBrands,modalUnit,setModalUnit,fetchClientData,isSoles,handleSort,toggleBrand,handleExpandAll,getBrandKey,processedBrands,download}=useClientDetail({isOpen,onClose,client,filters});
  const clientInfo = data?.client || client;
  const totals = data?.totals || null;
  const distributors = data?.distributors || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[96vw] 2xl:max-w-[1480px] max-h-[92vh] flex flex-col gap-0 p-0 overflow-y-auto sm:overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl">
        <DialogHeader className="shrink-0 space-y-0 border-t-4 border-t-[#6a5cbc] border-b border-[#c4bee4] bg-[#f3f1f9] px-5 pb-4 pt-5 text-left dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pr-7">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c4bee4] bg-[#6a5cbc] text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Detalle comercial del cliente</p>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                    {clientInfo?.farmacia || clientInfo?.cp_cliente || "Detalle de cliente"}
                  </DialogTitle>
                  {(clientInfo?.categorizacion || clientInfo?.quintil) && <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{clientInfo.categorizacion || clientInfo.quintil}</span>}
                </div>
                <DialogDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>RUC <span className="font-medium tabular-nums text-slate-700 dark:text-slate-300">{clientInfo?.ruc || "—"}</span></span>
                  <span>Periodo <span className="font-medium text-slate-700 dark:text-slate-300">{data?.periodo || filters.version}</span></span>
                  <span>Versión <span className="font-medium text-slate-700 dark:text-slate-300">{filters.version}</span></span>
                  <PublicationDate value={data?.publicado_en} />
                </DialogDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-1">
              <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Unidad de medida del detalle">
                {(["UNIDAD", "S/ SOLES"] as const).map(unit => <button key={unit} type="button" aria-pressed={modalUnit === unit} onClick={() => setModalUnit(unit)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${modalUnit === unit ? "bg-[#6a5cbc] text-white shadow-sm dark:bg-[#6a5cbc] dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>
                  {unit === "UNIDAD" ? <Package className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}
                  {unit === "UNIDAD" ? "Unidades" : "Soles"}
                </button>)}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            {(clientInfo?.zona_cliente || clientInfo?.lima_provincias) && <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span><span className="mr-1.5 text-slate-400">Zona</span>{clientInfo.zona_cliente || clientInfo.lima_provincias}</span></span>}
            {clientInfo?.supervisor && <span className="flex items-center gap-2"><UserCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span><span className="mr-1.5 text-slate-400">Supervisor</span>{clientInfo.supervisor}</span></span>}
            {!!clientInfo?.vendedores?.length && <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span><span className="mr-1.5 text-slate-400">Vendedores</span>{clientInfo.vendedores.join(", ")}</span></span>}
          </div>
        </DialogHeader>

        <div className="shrink-0 bg-[#eeecf5] px-5 py-4 dark:bg-slate-950/30 sm:px-6"><ClientDetailSummary totals={totals} unidadMedida={modalUnit} loading={isLoading} /></div>

        {/* TOOLBAR: SEARCH & TREE EXPANSION */}
        <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64 sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar marca o SKU en este cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 focus:bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExpandAll(true)}
                className="h-8 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800"
              >
                <PlusSquare className="h-3.5 w-3.5 mr-1 text-slate-500" />
                Expandir Todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExpandAll(false)}
                className="h-8 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800"
              >
                <MinusSquare className="h-3.5 w-3.5 mr-1 text-slate-500" />
                Colapsar Todo
              </Button>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2 font-medium">
            <span>
              <Button variant="outline" size="sm" disabled={!data || exporting} className="mr-4 text-slate-600 dark:text-slate-300 font-semibold disabled:opacity-50" onClick={download}>{exporting?"Exportando…":"Exportar detalle"}</Button>
              Mostrando:{" "}
              <strong className="text-slate-800 dark:text-slate-200 font-bold">
                {processedBrands.length} marcas
              </strong>
            </span>
          </div>
        </div>

        {/* TABLE CONTAINER - EXACT LAYOUT OF IMAGE 2 with dynamic viewport height */}
        <div className="flex-1 overflow-auto relative min-h-[260px] sm:min-h-0 bg-white dark:bg-slate-900">
          {isLoading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/75 dark:bg-slate-950/75 backdrop-blur-2xs">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3 shadow-md">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Recalculando Pedidos Sugeridos para este cliente...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="space-y-3 p-12 text-center text-xs text-rose-600 font-medium">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchClientData} disabled={isLoading}>Reintentar</Button>
            </div>
          )}

          {!isLoading && !error && (
            <ClientDetailTable processedBrands={processedBrands} distributors={distributors} totals={totals} periodo={data?.periodo || filters.version} collapsedBrands={collapsedBrands} isSoles={isSoles} sortField={sortField} sortDir={sortDir} handleSort={handleSort} toggleBrand={toggleBrand} getBrandKey={getBrandKey} />
          )}
        </div>

        {/* FOOTER */}
        <div className="py-2.5 px-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-medium">
            Pedidos sugeridos ·{" "}
            <strong className="text-slate-700 dark:text-slate-300 font-bold">
              {clientInfo?.farmacia || clientInfo?.cp_cliente}
            </strong>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="bg-[#6a5cbc] hover:bg-[#594da3] text-white dark:bg-[#6a5cbc] dark:hover:bg-[#594da3] dark:text-white font-medium text-xs h-8 px-4"
          >
            Cerrar detalle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
