"use client";
import type { ClientColumn,MatrixBrand,MatrixTotals } from '@/domain/report-contracts';
import { selectReportRows } from '@/domain/report-view';
import { useMemo,useState } from 'react';
export interface MatrixTableProps {
  brands: MatrixBrand[];
  totals: MatrixTotals | null;
  clientColumns: ClientColumn[];
  unidadMedida: "UNIDAD" | "S/ SOLES";
  searchTerm: string;
  sortField?: SortField;
  sortDir?: "asc" | "desc";
  onSort?: (field: SortField) => void;
  collapsedBrands?: Set<string>;
  onToggleBrand?: (brandId: string) => void;
  onExpandAll?: (expand: boolean) => void;
  onClientClick?: (client: ClientColumn) => void;
}

export type SortField =
  | "marca"
  | "vta_act"
  | "vta_mdo"
  | "ms_act"
  | "ms_ant"
  | "ms_territorio"
  | "ms_ideal"
  | "estimacion";


export function useMatrixTable({
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
  const isSoles = unidadMedida === "S/ SOLES";
  const getBrandId = (b: MatrixBrand) =>
    `${b.marca}__${b.unidad_negocio || ""}__${b.franquicia || ""}`;

  const [internalCollapsedBrands, setInternalCollapsedBrands] = useState<Set<string>>(new Set());
  const [internalSortField, setInternalSortField] = useState<SortField>("estimacion");
  const [internalSortDir, setInternalSortDir] = useState<"asc" | "desc">("desc");

  const sortField = externalSortField ?? internalSortField;
  const sortDir = externalSortDir ?? internalSortDir;
  const collapsedBrands = externalCollapsedBrands ?? internalCollapsedBrands;

  const toggleBrand = (brandId: string) => {
    if (externalOnToggleBrand) {
      externalOnToggleBrand(brandId);
    } else {
      setInternalCollapsedBrands((prev) => {
        const next = new Set(prev);
        if (next.has(brandId)) next.delete(brandId);
        else next.add(brandId);
        return next;
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (externalOnSort) {
      externalOnSort(field);
    } else {
      if (internalSortField === field) {
        setInternalSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setInternalSortField(field);
        setInternalSortDir(field === "marca" ? "asc" : "desc");
      }
    }
  };

  const processedBrands = useMemo(() => selectReportRows(brands,searchTerm,sortField,sortDir),[brands,searchTerm,sortField,sortDir]);

return {isSoles,getBrandId,sortField,sortDir,collapsedBrands,toggleBrand,handleSort,processedBrands};
}
