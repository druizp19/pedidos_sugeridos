"use client";
import { TableBody,TableCell,TableFooter,TableHead,TableHeader,TableRow } from '@/components/ui/table';
import type { ClientDetailBrand,ClientDetailTotals } from '@/domain/report-contracts';
import { formatNumber,formatPercent } from '@/lib/utils';
import { ArrowDown,ArrowUp,ArrowUpDown,CornerDownRight } from 'lucide-react';
import React from 'react';
import { distributorLabel } from './distributor-label';
type DetailSortField=string;
interface Props { processedBrands:ClientDetailBrand[]; distributors:string[]; totals:ClientDetailTotals|null; periodo:string; collapsedBrands:Set<string>; isSoles:boolean; sortField:string; sortDir:'asc'|'desc'; handleSort:(field:string)=>void; toggleBrand:(key:string)=>void; getBrandKey:(brand:ClientDetailBrand)=>string; }
export function ClientDetailTable({processedBrands,distributors,totals,periodo,collapsedBrands,isSoles,sortField,sortDir,handleSort,toggleBrand,getBrandKey}:Props){
  const renderSortIcon = (field: DetailSortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
      );
    }
    return sortDir === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#6a5cbc] dark:text-violet-200 font-semibold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#6a5cbc] dark:text-violet-200 font-semibold" />
    );
  };

return (            <table className="w-full border-separate border-spacing-0 text-left text-xs bg-white dark:bg-slate-900">
              {/* LEVEL 1 HEADERS */}
              <TableHeader className="sticky top-0 z-30">
                <TableRow className="header-level-1">
                  {/* Left Sticky Header */}
                  <TableHead
                    rowSpan={2}
                    tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("marca");} }} aria-sort={sortField === "marca" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("marca")}
                    className="sticky left-0 top-0 z-40 min-w-[250px] sm:min-w-[280px] md:min-w-[320px] max-w-[420px] bg-[#6a5cbc] dark:bg-[#6a5cbc] text-white dark:text-white p-2 sm:p-2.5 font-bold group cursor-pointer hover:bg-[#594da3] dark:hover:bg-[#594da3] transition-colors border-r-2 border-slate-200 dark:border-slate-700 select-none shadow-none"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs [&>svg]:text-white">
                        Etiquetas de fila
                        {renderSortIcon("marca")}
                      </span>
                      <span className="bg-white/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        {processedBrands.length} marcas
                      </span>
                    </div>
                  </TableHead>

                  {/* Central Spanning Header */}
                  <TableHead
                    colSpan={7}
                    className="bg-[#6a5cbc] dark:bg-[#6a5cbc] text-white dark:text-white p-2 text-center font-semibold tracking-wide text-xs border-l border-slate-200 dark:border-slate-700 select-none"
                  >
                    ANÁLISIS DE Pedidos Sugeridos
                  </TableHead>

                  {/* Right Spanning Header for Distributors */}
                  {distributors.length > 0 && (
                    <TableHead
                      colSpan={distributors.length}
                      className="bg-[#c4bee4] dark:bg-[#c4bee4] text-[#1d252d] dark:text-[#1d252d] p-2 text-center font-semibold tracking-wide text-xs border-l-2 border-slate-200 dark:border-slate-700 select-none shadow-none"
                    >
                      COMPRAS POR DISTRIBUIDOR (PROM. MENSUAL · {periodo})
                    </TableHead>
                  )}
                </TableRow>

                {/* LEVEL 2 METRIC HEADERS */}
                <TableRow className="header-level-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  <TableHead
                    tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("vta_act");} }} aria-sort={sortField === "vta_act" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("vta_act")}
                    className="group cursor-pointer p-2 text-slate-700 dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-right min-w-[105px] border-r border-slate-200 dark:border-slate-700 select-none transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>VTA. ACT.</span>
                      {renderSortIcon("vta_act")}
                    </div>
                  </TableHead>

                  <TableHead
                    tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("vta_mdo");} }} aria-sort={sortField === "vta_mdo" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("vta_mdo")}
                    className="group cursor-pointer p-2 text-slate-700 dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-right min-w-[105px] border-r border-slate-200 dark:border-slate-700 select-none transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>VTA. MDO.</span>
                      {renderSortIcon("vta_mdo")}
                    </div>
                  </TableHead>

                  <TableHead
                    tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("ms_act");} }} aria-sort={sortField === "ms_act" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("ms_act")}
                    className="group cursor-pointer p-2 text-slate-700 dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-right min-w-[90px] border-r border-slate-200 dark:border-slate-700 select-none transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>MS. ACT.</span>
                      {renderSortIcon("ms_act")}
                    </div>
                  </TableHead>

                  <TableHead
                    tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("ms_ant");} }} aria-sort={sortField === "ms_ant" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("ms_ant")}
                    className="group cursor-pointer p-2 text-slate-700 dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-right min-w-[90px] border-r border-slate-200 dark:border-slate-700 select-none transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>MS. ANT.</span>
                      {renderSortIcon("ms_ant")}
                    </div>
                  </TableHead>

                  <TableHead
                    tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("ms_territorio");} }} aria-sort={sortField === "ms_territorio" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("ms_territorio")}
                    className="group cursor-pointer p-2 text-slate-700 dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-right min-w-[105px] border-r border-slate-200 dark:border-slate-700 select-none transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>MS. TERRITORIO</span>
                      {renderSortIcon("ms_territorio")}
                    </div>
                  </TableHead>

                  <TableHead
                    tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("ms_ideal");} }} aria-sort={sortField === "ms_ideal" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("ms_ideal")}
                    className="group cursor-pointer p-2 text-slate-700 dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-right min-w-[95px] border-r border-slate-200 dark:border-slate-700 select-none transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>MS. IDEAL</span>
                      {renderSortIcon("ms_ideal")}
                    </div>
                  </TableHead>

                  <TableHead
                    tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();handleSort("estimacion");} }} aria-sort={sortField === "estimacion" ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} onClick={() => handleSort("estimacion")}
                    className="group cursor-pointer p-2 text-slate-700 dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-right min-w-[120px] text-[#6a5cbc] dark:text-violet-200 select-none transition-colors font-semibold border-r-2 border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>ESTIMACION</span>
                      {renderSortIcon("estimacion")}
                    </div>
                  </TableHead>

                  {/* Distributor Dynamic Subheaders */}
                  {distributors.map((dist) => (
                    <TableHead
                      key={dist}
                      onClick={() => handleSort(dist)}
                      className="group cursor-pointer p-2 text-slate-700 dark:text-slate-200 bg-[#eeebf6] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-right min-w-[140px] max-w-[200px] border-r border-slate-200 dark:border-slate-700 select-none transition-colors text-[10px]"
                      title={dist}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span className="truncate">{distributorLabel(dist)}</span>
                        {renderSortIcon(dist)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              {/* TABLE BODY */}
              <TableBody className="divide-y divide-slate-100">
                {processedBrands.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8 + distributors.length}
                      className="p-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900"
                    >
                      No se encontraron marcas ni productos para los filtros seleccionados en este cliente.
                    </TableCell>
                  </TableRow>
                ) : (
                  processedBrands.map((brand, brandIdx) => {
                    const brandKey = getBrandKey(brand);
                    const brandId = `modal_b_${brandKey}_${brandIdx}`;
                    const isCollapsed = collapsedBrands.has(brandKey);
                    const hasSkus = brand.skus && brand.skus.length > 0;

                    return (
                      <React.Fragment key={brandId}>
                        {/* Brand Row */}
                        <TableRow className="bg-[#f4f7f9] hover:bg-slate-100 dark:bg-slate-800 transition-colors font-bold text-slate-900 dark:text-slate-100 border-t border-b border-slate-300 group">
                          {/* Sticky Brand Name Column */}
                          <TableCell className="sticky left-0 z-10 bg-[#f4f7f9] group-hover:bg-slate-100 dark:bg-slate-800 p-2.5 border-r-2 border-slate-300 shadow-2xs">
                            <div
                              onClick={() => hasSkus && toggleBrand(brandKey)}
                              className={`flex items-center gap-2 select-none ${
                                hasSkus ? "cursor-pointer" : ""
                              }`}
                            >
                              {hasSkus ? (
                                <span className="w-4 h-4 rounded bg-[#c4bee4] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] shrink-0 transition-colors">
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
                                  {brand.skus.length} SKU{brand.skus.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Brand 7 Metrics */}
                          <TableCell className="p-2 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                            {formatNumber(brand.vta_act, isSoles)}
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums text-slate-600 dark:text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                            {formatNumber(brand.vta_mdo, isSoles)}
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                            {formatPercent(brand.ms_act)}
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums text-slate-600 dark:text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                            {formatPercent(brand.ms_ant)}
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums text-slate-600 dark:text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                            {formatPercent(brand.ms_territorio)}
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                            {formatPercent(brand.ms_ideal)}
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums font-semibold text-[#594b99] dark:text-violet-200 bg-[#f0edf8] dark:bg-violet-950/20 border-r-2 border-slate-300">
                            {formatNumber(brand.estimacion, isSoles)}
                          </TableCell>

                          {/* Brand Distributor Sales */}
                          {distributors.map((dist) => {
                            const val = brand.distribuidoras?.[dist] || 0;
                            return (
                              <TableCell
                                key={dist}
                                className="p-2 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-800/70 border-r border-slate-200 dark:border-slate-700"
                              >
                                {val > 0 ? formatNumber(val, isSoles) : "-"}
                              </TableCell>
                            );
                          })}
                        </TableRow>

                        {/* SKU Rows */}
                        {!isCollapsed &&
                          hasSkus &&
                          brand.skus.map((sku, skuIdx) => {
                            const skuId = `${brandId}__sku_${skuIdx}`;
                            return (
                              <TableRow
                                key={skuId}
                                className="hover:bg-slate-50 dark:bg-slate-900/70 transition-colors text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 group border-b border-slate-100 dark:border-slate-800"
                              >
                                {/* Sticky SKU Name Column */}
                                <TableCell className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:bg-slate-900/70 p-2 pl-8 text-xs border-r-2 border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center gap-1.5 truncate max-w-[380px]">
                                    <CornerDownRight className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span
                                      title={sku.sku}
                                      className="truncate font-normal text-slate-700 dark:text-slate-300 text-xs"
                                    >
                                      {sku.sku}
                                    </span>
                                  </div>
                                </TableCell>

                                {/* SKU 7 Metrics */}
                                <TableCell className="p-1.5 text-right tabular-nums text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                                  {formatNumber(sku.vta_act, isSoles)}
                                </TableCell>
                                <TableCell className="p-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                  {formatNumber(sku.vta_mdo, isSoles)}
                                </TableCell>
                                <TableCell className="p-1.5 text-right tabular-nums text-slate-600 dark:text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                  {formatPercent(sku.ms_act)}
                                </TableCell>
                                <TableCell className="p-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                  {formatPercent(sku.ms_ant)}
                                </TableCell>
                                <TableCell className="p-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                  {formatPercent(sku.ms_territorio)}
                                </TableCell>
                                <TableCell className="p-1.5 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                                  {formatPercent(sku.ms_ideal)}
                                </TableCell>
                                <TableCell className="p-1.5 text-right tabular-nums font-semibold text-[#6a5cbc] dark:text-violet-200 bg-[#f0edf8] dark:bg-violet-950/20 border-r-2 border-slate-200 dark:border-slate-700">
                                  {formatNumber(sku.estimacion, isSoles)}
                                </TableCell>

                                {/* SKU Distributor Sales */}
                                {distributors.map((dist) => {
                                  const val = sku.distribuidoras?.[dist] || 0;
                                  return (
                                    <TableCell
                                      key={dist}
                                      className="p-1.5 text-right tabular-nums text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800"
                                    >
                                      {val > 0 ? formatNumber(val, isSoles) : "-"}
                                    </TableCell>
                                  );
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
                <TableFooter className="sticky bottom-0 z-30 font-bold text-xs shadow-sm">
                  <TableRow className="border-t-2 border-slate-300 dark:border-slate-600">
                    <TableCell className="sticky left-0 z-40 bg-[#1d252d] dark:bg-[#1d252d] text-white p-2.5 border-r-2 border-white/10 tracking-wider font-semibold shadow-sm">
                      TOTAL GENERAL
                    </TableCell>
                    <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] dark:bg-[#1d252d] text-white border-r border-white/10">
                      {formatNumber(totals.vta_act, isSoles)}
                    </TableCell>
                    <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] dark:bg-[#1d252d] text-slate-300 font-normal border-r border-white/10">
                      {formatNumber(totals.vta_mdo, isSoles)}
                    </TableCell>
                    <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] dark:bg-[#1d252d] text-[#c4bee4] font-bold border-r border-white/10">
                      {formatPercent(totals.ms_act)}
                    </TableCell>
                    <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] dark:bg-[#1d252d] text-slate-300 font-normal border-r border-white/10">
                      {formatPercent(totals.ms_ant)}
                    </TableCell>
                    <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] dark:bg-[#1d252d] text-slate-300 font-normal border-r border-white/10">
                      {formatPercent(totals.ms_territorio)}
                    </TableCell>
                    <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] dark:bg-[#1d252d] text-white border-r border-white/10">
                      {formatPercent(totals.ms_ideal)}
                    </TableCell>
                    <TableCell className="p-2.5 text-right tabular-nums bg-[#1d252d] dark:bg-[#1d252d] text-[#c4bee4] font-semibold border-r-2 border-white/10">
                      {formatNumber(totals.estimacion, isSoles)}
                    </TableCell>

                    {/* Total General Distributor Sales */}
                    {distributors.map((dist) => {
                      const val = totals.distribuidoras?.[dist] || 0;
                      return (
                        <TableCell
                          key={dist}
                          className="p-2.5 text-right tabular-nums bg-[#1d252d] dark:bg-[#1d252d] text-[#c4bee4] font-bold border-r border-white/10"
                        >
                          {formatNumber(val, isSoles)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableFooter>
              )}
            </table>);
}
