"use client";
import type { ClientColumn,ClientDetailBrand,ClientInfo,ClientMatrixResponse,FilterState } from '@/domain/report-contracts';
import { selectReportRows } from '@/domain/report-view';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { useReportQueries } from '../providers/report-provider';
export interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientColumn | ClientInfo | null;
  filters: FilterState;
}

export type DetailSortField =
  | "marca"
  | "vta_act"
  | "vta_mdo"
  | "ms_act"
  | "ms_ant"
  | "ms_territorio"
  | "ms_ideal"
  | "estimacion"
  | string;


export function useClientDetail({isOpen,client,filters}:ClientDetailModalProps){
const queries=useReportQueries();
  const requestRef = useRef<AbortController | null>(null);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<ClientMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<DetailSortField>("estimacion");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set());
  const [modalUnit, setModalUnit] = useState<"UNIDAD" | "S/ SOLES">(
    filters.unidadMedida
  );

  // Sync unit when main filters change
  useEffect(() => {
    setModalUnit(filters.unidadMedida);
  }, [filters.unidadMedida]);

  // Fetch recalculated client matrix data
  const fetchClientData = useCallback(async () => {
    if (!client) return;
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    setData(null);
    setIsLoading(true);
    setError(null);

    const clientId = client.cp_cliente || client.ruc;

    try {
      const result = await queries.detail({...filters, unidadMedida:modalUnit}, clientId, controller.signal);
      if (!controller.signal.aborted) setData(result);
    } catch (e: unknown) {
      if (controller.signal.aborted) return;
      console.error("Error cargando desglose de cliente:", e);
      setError(e instanceof Error ? e.message : 'Error de conexión al servidor');
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [queries, client, modalUnit, filters.version, filters.unidadNegocio, filters.franquicia, filters.marca]);

  useEffect(() => {
    if (isOpen && client) {
      setSearchTerm("");
      setCollapsedBrands(new Set());
      fetchClientData();
    }
    return () => requestRef.current?.abort();
  }, [isOpen, client, modalUnit, fetchClientData]);

  const isSoles = modalUnit === "S/ SOLES";

  const handleSort = (field: DetailSortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "marca" ? "asc" : "desc");
    }
  };

  const toggleBrand = (brandKey: string) => {
    setCollapsedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brandKey)) next.delete(brandKey);
      else next.add(brandKey);
      return next;
    });
  };

  const handleExpandAll = (expand: boolean) => {
    if (expand) {
      setCollapsedBrands(new Set());
    } else {
      if (data?.brands) {
        setCollapsedBrands(
          new Set(
            data.brands.map(
              (b) => `${b.marca}__${b.unidad_negocio || ""}__${b.franquicia || ""}`
            )
          )
        );
      }
    }
  };

  const getBrandKey = (b: ClientDetailBrand) =>
    `${b.marca}__${b.unidad_negocio || ""}__${b.franquicia || ""}`;

  const processedBrands = useMemo(() => selectReportRows(data?.brands || [],searchTerm,sortField,sortDir),[data?.brands,searchTerm,sortField,sortDir]);

const download=async()=>{setExporting(true);try{await queries.export({...filters,unidadMedida:modalUnit,search:searchTerm},client?.ruc);}catch(e){setError(e instanceof Error?e.message:'No se pudo exportar.');}finally{setExporting(false);}};
return {exporting,data,isLoading,error,searchTerm,setSearchTerm,sortField,sortDir,collapsedBrands,modalUnit,setModalUnit,fetchClientData,isSoles,handleSort,toggleBrand,handleExpandAll,getBrandKey,processedBrands,download};
}
