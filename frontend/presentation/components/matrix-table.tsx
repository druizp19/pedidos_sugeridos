"use client";

import { TableBody,TableCell,TableFooter,TableHead,TableHeader,TableRow } from '@/components/ui/table';
import { formatNumber,formatPercent } from "@/lib/utils";
import {
ArrowDown,
ArrowUp,
ArrowUpDown,
CornerDownRight
} from "lucide-react";
import React from "react";
import { useMatrixTable } from '../hooks/use-matrix-table';

import type { MatrixTableProps,SortField } from '../hooks/use-matrix-table';
export type { SortField } from '@/domain/report-view';
export function MatrixTable({
  brands,
  totals,
  clientColumns,
  unidadMedida,
  searchTerm,
  sortField: externalSortField,
  sortDir: externalSortDir,
  onSort: externalOnSort,
  collapsedBrands: externalCollapsedBrands,
  onToggleBrand: externalOnToggleBrand,
  onExpandAll: externalOnExpandAll,
  onClientClick,
}: MatrixTableProps) {
  const {isSoles,getBrandId,sortField,sortDir,collapsedBrands,toggleBrand,handleSort,processedBrands}=useMatrixTable({brands,totals,clientColumns,unidadMedida,searchTerm,sortField:externalSortField,sortDir:externalSortDir,onSort:externalOnSort,collapsedBrands:externalCollapsedBrands,onToggleBrand:externalOnToggleBrand,onExpandAll:externalOnExpandAll,onClientClick});
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#6a5cbc] dark:text-[#c4bee4] font-semibold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#6a5cbc] dark:text-[#c4bee4] font-semibold" />
    );
  };

  const getQuintilBadgeClass = (q: string) => {
    switch (q?.toUpperCase()) {
      case "DIAMANTE":
      case "Q1":
        return "bg-[#eeebf5] text-[#65568b] border border-[#dfd9ed] dark:bg-slate-800 dark:text-[#c4bee4] dark:border-slate-700";
      case "ORO":
      case "Q2":
        return "bg-[#f1ede3] text-[#796b46] border border-[#e4dece] dark:bg-slate-800 dark:text-[#d5c9a5] dark:border-slate-700";
      case "PLATA":
      case "Q3":
        return "bg-[#e9edf0] text-[#586875] border border-[#dce2e7] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      case "BRONCE":
      case "Q4":
        return "bg-[#ede7e2] text-[#806854] border border-[#e2d8cf] dark:bg-slate-800 dark:text-[#d1bead] dark:border-slate-700";
      case "PLOMO":
      case "Q5":
        return "bg-[#eceef0] text-[#5f6873] border border-[#dce0e5] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-500";
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Full-width Responsive Table Container with dynamic viewport height */}
      <div className="relative max-h-[calc(100vh-310px)] min-h-[420px] overflow-auto">
        <table
          key={`matrix-table-${unidadMedida}-${clientColumns.map((c) => c.cp_cliente).join("-")}`}
          className="w-full border-collapse text-left text-xs"
        >
          {/* LEVEL 1 HEADERS */}
          <TableHeader className="sticky top-0 z-30">
            <TableRow className="header-level-1">
              {/* Sticky Leftmost Header */}
              <TableHead
                rowSpan={2}
                tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("marca");} }} aria-sort={sortField === "marca" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("marca")}
                className="sticky left-0 top-0 z-40 min-w-[250px] sm:min-w-[280px] md:min-w-[320px] max-w-[380px] bg-[#6a5cbc] text-white p-2 sm:p-2.5 font-bold group cursor-pointer hover:bg-[#53459e] transition-colors border-r-2 border-[#53459e] select-none"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs [&>svg]:text-white">
                    Etiquetas de fila
                    {renderSortIcon("marca")}
                  </span>
                  <span className="bg-white/20 text-white text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full">
                    {processedBrands.length} marcas
                  </span>
                </div>
              </TableHead>

              {/* Central Metrics Span Header */}
              <TableHead
                colSpan={7}
                className="bg-[#6a5cbc] text-white p-2 text-center font-bold tracking-wider uppercase text-xs border-r border-white/20 select-none"
              >
                ANÁLISIS DE Pedidos Sugeridos
              </TableHead>

              {/* Level 1 Client Headers */}
              {clientColumns.map((c) => (
                <TableHead
                  key={`h1-${c.cp_cliente}`}
                  colSpan={2}
                  tabIndex={0} onKeyDown={event => {if(event.key === 'Enter' || event.key === ' '){event.preventDefault();onClientClick?.(c);}}} onClick={() => onClientClick?.(c)}
                  className="bg-[#c4bee4] hover:bg-[#b8afd9] dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 px-2 py-1.5 text-center font-bold border-r-2 border-white min-w-[135px] cursor-pointer transition-all duration-150 select-none group/cli relative hover:shadow-inner"
                  title={`Haga clic para ver el desglose recalculado de ${c.farmacia || c.cp_cliente}`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <div className="truncate text-xs font-bold group-hover/cli:text-[#6a5cbc] transition-colors" title={c.farmacia || c.cp_cliente}>
                      {c.farmacia || c.cp_cliente}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-normal flex items-center justify-center gap-1.5 mt-0.5">
                    <span>RUC: {c.ruc}</span>
                    <span className="text-[9px] bg-white/70 text-[#53459e] font-bold px-1 rounded group-hover/cli:bg-[#6a5cbc] group-hover/cli:text-white transition-colors">
                      Ver Share
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>

            {/* LEVEL 2 METRIC HEADERS */}
            <TableRow className="header-level-2 text-[11px] font-bold text-white uppercase tracking-wider">
              <TableHead
                tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("vta_act");} }} aria-sort={sortField === "vta_act" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("vta_act")}
                className="group cursor-pointer p-2 text-[#48405f] dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-[#e1dcef] dark:hover:bg-slate-700 text-right min-w-[95px] border-r border-white/20 select-none transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>VTA. ACT.</span>
                  {renderSortIcon("vta_act")}
                </div>
              </TableHead>

              <TableHead
                tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("vta_mdo");} }} aria-sort={sortField === "vta_mdo" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("vta_mdo")}
                className="group cursor-pointer p-2 text-[#48405f] dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-[#e1dcef] dark:hover:bg-slate-700 text-right min-w-[95px] border-r border-white/20 select-none transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>VTA. MDO.</span>
                  {renderSortIcon("vta_mdo")}
                </div>
              </TableHead>

              <TableHead
                tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("ms_act");} }} aria-sort={sortField === "ms_act" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("ms_act")}
                className="group cursor-pointer p-2 text-[#48405f] dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-[#e1dcef] dark:hover:bg-slate-700 text-right min-w-[80px] border-r border-white/20 select-none transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>MS. ACT.</span>
                  {renderSortIcon("ms_act")}
                </div>
              </TableHead>

              <TableHead
                tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("ms_ant");} }} aria-sort={sortField === "ms_ant" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("ms_ant")}
                className="group cursor-pointer p-2 text-[#48405f] dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-[#e1dcef] dark:hover:bg-slate-700 text-right min-w-[80px] border-r border-white/20 select-none transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>MS. ANT.</span>
                  {renderSortIcon("ms_ant")}
                </div>
              </TableHead>

              <TableHead
                tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("ms_territorio");} }} aria-sort={sortField === "ms_territorio" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("ms_territorio")}
                className="group cursor-pointer p-2 text-[#48405f] dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-[#e1dcef] dark:hover:bg-slate-700 text-right min-w-[95px] border-r border-white/20 select-none transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>MS. TERRITORIO</span>
                  {renderSortIcon("ms_territorio")}
                </div>
              </TableHead>

              <TableHead
                tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("ms_ideal");} }} aria-sort={sortField === "ms_ideal" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("ms_ideal")}
                className="group cursor-pointer p-2 text-[#48405f] dark:text-slate-200 bg-[#e3def0] dark:bg-slate-800 hover:bg-[#d7d0e8] dark:hover:bg-slate-700 text-right min-w-[90px] border-r border-white/20 select-none transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>MS. IDEAL</span>
                  {renderSortIcon("ms_ideal")}
                </div>
              </TableHead>

              <TableHead
                tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("estimacion");} }} aria-sort={sortField === "estimacion" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("estimacion")}
                className="group cursor-pointer p-2 text-[#48405f] dark:text-slate-200 bg-[#e3def0] dark:bg-slate-800 hover:bg-[#d7d0e8] dark:hover:bg-slate-700 text-right min-w-[110px] text-[#6a5cbc] dark:text-[#c4bee4] border-r-2 border-white select-none transition-colors font-semibold"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>ESTIMACION</span>
                  {renderSortIcon("estimacion")}
                </div>
              </TableHead>

              {/* Client Columns Subheaders */}
              {clientColumns.flatMap((c) => [
                <TableHead
                  key={`h2-compra-${c.cp_cliente}`}
                  className="p-1.5 text-center bg-[#e5e1f1] dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-[10px] min-w-[60px] border-r border-white/40"
                >
                  Compra
                </TableHead>,
                <TableHead
                  key={`h2-quintil-${c.cp_cliente}`}
                  className="p-1.5 text-center bg-[#e5e1f1] dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-[10px] border-r border-slate-300 min-w-[60px]"
                >
                  Quintil
                </TableHead>,
              ])}
            </TableRow>
          </TableHeader>

          {/* TABLE BODY */}
          <TableBody className="divide-y divide-slate-100">
            {processedBrands.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8 + clientColumns.length * 2}
                  className="p-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900"
                >
                  No se encontraron marcas ni productos para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              processedBrands.map((brand, brandIdx) => {
                const uniqueBrandKey = getBrandId(brand);
                const brandId = `${uniqueBrandKey}_${brandIdx}`;
                const isCollapsed = collapsedBrands.has(uniqueBrandKey);
                const hasSkus = brand.skus && brand.skus.length > 0;

                return (
                  <React.Fragment key={`brand-group-${brandId}`}>
                    {/* Brand Row (Summary Level) */}
                    <TableRow
                      key={`tr-brand-${brandId}`}
                      className="bg-[#f8fafc] hover:bg-slate-100 dark:bg-slate-800 transition-colors font-bold text-slate-900 dark:text-slate-100 border-t border-b border-slate-300 group"
                    >
                      {/* Sticky Brand Name */}
                      <TableCell className="sticky left-0 z-10 bg-[#f8fafc] group-hover:bg-slate-100 dark:bg-slate-800 p-2.5 border-r-2 border-slate-300">
                        <div
                          role="button" tabIndex={0} aria-expanded={!isCollapsed} onKeyDown={event => {if(event.key === 'Enter' || event.key === ' '){event.preventDefault();if(hasSkus)toggleBrand(uniqueBrandKey);}}} onClick={() => hasSkus && toggleBrand(uniqueBrandKey)}
                          className={`flex items-center gap-2 select-none ${hasSkus ? "cursor-pointer" : ""}`}
                        >
                          {hasSkus ? (
                            <span className="w-4 h-4 rounded bg-[#e4dff1] hover:bg-[#d7cfea] text-[#65568b] dark:bg-slate-700 dark:text-[#c4bee4] flex items-center justify-center text-[10px] shrink-0 transition-colors">
                              {isCollapsed ? "+" : "-"}
                            </span>
                          ) : (
                            <span className="w-4 h-4 shrink-0" />
                          )}
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-tight truncate">
                            {brand.marca}
                          </span>
                          {brand.franquicia && brand.franquicia !== "RESTO" && (
                            <span className="text-[10px] text-slate-500 font-normal truncate">
                              ({brand.franquicia})
                            </span>
                          )}
                          {hasSkus && (
                            <span className="rounded bg-slate-200 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 text-[10px] font-semibold">
                              {brand.skus.length}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Brand Metrics */}
                      <TableCell className="p-2 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                        {formatNumber(brand.vta_act, isSoles)}
                      </TableCell>
                      <TableCell className="p-2 text-right tabular-nums text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                        {formatNumber(brand.vta_mdo, isSoles)}
                      </TableCell>
                      <TableCell className="p-2 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                        {formatPercent(brand.ms_act)}
                      </TableCell>
                      <TableCell className="p-2 text-right tabular-nums text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                        {formatPercent(brand.ms_ant)}
                      </TableCell>
                      <TableCell className="p-2 text-right tabular-nums text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                        {formatPercent(brand.ms_territorio)}
                      </TableCell>
                      <TableCell className="p-2 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                        {formatPercent(brand.ms_ideal)}
                      </TableCell>
                      <TableCell className="p-2 text-right tabular-nums font-semibold text-[#53459e] dark:text-violet-300 bg-[#6a5cbc]/5 border-r-2 border-slate-300">
                        {formatNumber(brand.estimacion, isSoles)}
                      </TableCell>

                      {/* Client Values for Brand */}
                      {clientColumns.flatMap((c) => {
                        const clientVal = brand.clients?.[c.cp_cliente];
                        const compra = clientVal?.compra === "SI";
                        const quintil = clientVal?.quintil || c.quintil;

                        return [
                          <TableCell
                            key={`td-b-${brandId}-${c.cp_cliente}-compra`}
                            className="p-1.5 text-center border-r border-slate-200 dark:border-slate-700"
                          >
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                compra
                                  ? "bg-[#e5eee9] text-[#426353] dark:bg-[#253b32] dark:text-[#b8d2c3]"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                              }`}
                            >
                              {compra ? "SÍ" : "NO"}
                            </span>
                          </TableCell>,
                          <TableCell
                            key={`td-b-${brandId}-${c.cp_cliente}-quintil`}
                            className="p-1.5 text-center border-r border-slate-300"
                          >
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${getQuintilBadgeClass(
                                quintil
                              )}`}
                            >
                              {quintil || "-"}
                            </span>
                          </TableCell>,
                        ];
                      })}
                    </TableRow>

                    {/* SKU Rows (Detail Level) */}
                    {!isCollapsed &&
                      hasSkus &&
                      brand.skus.map((sku, skuIdx) => {
                        const skuId = `${brandId}__${sku.sku}_${skuIdx}`;
                        return (
                          <TableRow
                            key={`tr-sku-${skuId}`}
                            className="hover:bg-slate-50 dark:bg-slate-900/70 transition-colors text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 group border-b border-slate-100 dark:border-slate-800"
                          >
                            {/* Sticky SKU Name */}
                            <TableCell className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:bg-slate-900/70 p-2 pl-8 text-xs border-r-2 border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-1.5 truncate max-w-[340px]">
                                <CornerDownRight className="h-3 w-3 text-slate-400 shrink-0" />
                                <span title={sku.sku} className="truncate font-normal text-slate-700 dark:text-slate-300 text-xs">
                                  {sku.sku}
                                </span>
                              </div>
                            </TableCell>

                            {/* SKU Metrics */}
                            <TableCell className="p-1.5 text-right tabular-nums text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                              {formatNumber(sku.vta_act, isSoles)}
                            </TableCell>
                            <TableCell className="p-1.5 text-right tabular-nums text-slate-400 border-r border-slate-100 dark:border-slate-800">
                              {formatNumber(sku.vta_mdo, isSoles)}
                            </TableCell>
                            <TableCell className="p-1.5 text-right tabular-nums text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                              {formatPercent(sku.ms_act)}
                            </TableCell>
                            <TableCell className="p-1.5 text-right tabular-nums text-slate-400 border-r border-slate-100 dark:border-slate-800">
                              {formatPercent(sku.ms_ant)}
                            </TableCell>
                            <TableCell className="p-1.5 text-right tabular-nums text-slate-400 border-r border-slate-100 dark:border-slate-800">
                              {formatPercent(sku.ms_territorio)}
                            </TableCell>
                            <TableCell className="p-1.5 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                              {formatPercent(sku.ms_ideal)}
                            </TableCell>
                            <TableCell className="p-1.5 text-right tabular-nums font-semibold text-[#6a5cbc] dark:text-violet-300 bg-[#6a5cbc]/5 border-r-2 border-slate-200 dark:border-slate-700">
                              {formatNumber(sku.estimacion, isSoles)}
                            </TableCell>

                            {/* Client Values for SKU */}
                            {clientColumns.flatMap((c) => {
                              const clientVal = sku.clients?.[c.cp_cliente];
                              const compra = clientVal?.compra === "SI";
                              const quintil = clientVal?.quintil || c.quintil;

                              return [
                                <TableCell
                                  key={`td-s-${skuId}-${c.cp_cliente}-compra`}
                                  className="p-1.5 text-center border-r border-slate-100 dark:border-slate-800"
                                >
                                  <span
                                    className={`inline-block rounded-full px-1.5 py-0.2 text-[9px] font-semibold ${
                                      compra
                                        ? "bg-[#e5eee9] text-[#426353] dark:bg-[#253b32] dark:text-[#b8d2c3]"
                                        : "bg-slate-50 dark:bg-slate-900/70 text-slate-400"
                                    }`}
                                  >
                                    {compra ? "SÍ" : "NO"}
                                  </span>
                                </TableCell>,
                                <TableCell
                                  key={`td-s-${skuId}-${c.cp_cliente}-quintil`}
                                  className="p-1.5 text-center border-r border-slate-200 dark:border-slate-700"
                                >
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {quintil || "-"}
                                  </span>
                                </TableCell>,
                              ];
                            })}
                          </TableRow>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>

          {/* TABLE FOOTER (TOTAL GENERAL) */}
          {totals && (
            <TableFooter className="sticky bottom-0 z-30 font-bold text-xs shadow-md">
              <TableRow className="border-t-2 border-[#1d252d]">
                <TableCell className="sticky left-0 z-40 bg-[#1d252d] text-white p-2.5 border-r-2 border-white/20 tracking-wider font-semibold">
                  TOTAL GENERAL
                </TableCell>
                <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] text-white border-r border-white/10">
                  {formatNumber(totals.vta_act, isSoles)}
                </TableCell>
                <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] text-slate-300 font-normal border-r border-white/10">
                  {formatNumber(totals.vta_mdo, isSoles)}
                </TableCell>
                <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] text-[#c4bee4] font-bold border-r border-white/10">
                  {formatPercent(totals.ms_act)}
                </TableCell>
                <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] text-slate-300 font-normal border-r border-white/10">
                  {formatPercent(totals.ms_ant)}
                </TableCell>
                <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] text-slate-300 font-normal border-r border-white/10">
                  {formatPercent(totals.ms_territorio)}
                </TableCell>
                <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] text-white border-r border-white/10">
                  {formatPercent(totals.ms_ideal)}
                </TableCell>
                <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] text-[#c4bee4] border-r-2 border-white font-semibold">
                  {formatNumber(totals.estimacion, isSoles)}
                </TableCell>

                {/* Empty cells for client columns in totals */}
                {clientColumns.map((c) => (
                  <TableCell
                    key={`td-tot-${c.cp_cliente}`}
                    colSpan={2}
                    className="bg-[#1d252d] border-r border-white/10"
                  />
                ))}
              </TableRow>
            </TableFooter>
          )}
        </table>
      </div>
    </div>
  );
}
