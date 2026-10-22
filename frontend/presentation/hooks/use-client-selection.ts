"use client";
import type { ClientSearchResult } from '@/domain/report-contracts';
import React,{ useState } from 'react';
import { useReportQueries } from '../providers/report-provider';
export interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClients: string[];
  activeCategory: string;
  activeZonaBase?: string;
  activeSupervisor?: string;
  activeSeller?: string;
  version: string;
  onApply: (selected: string[]) => void;
}


export function useClientSelection({isOpen,onClose,selectedClients,activeCategory,activeZonaBase,activeSupervisor,activeSeller,version,onApply}:ClientModalProps){
 const queries=useReportQueries(); const [error,setError]=useState<string|null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSelected, setTempSelected] = useState<string[]>(selectedClients);
  const [result, setResult] = useState<{key: string; data: ClientSearchResult} | null>(null);
  const searchKey = JSON.stringify([version, searchTerm.trim(), activeCategory, activeZonaBase, activeSupervisor, activeSeller]);
  const searchResults = result?.key === searchKey ? result.data : null;
  const [isSearching, setIsSearching] = useState(false);

  // Sync tempSelected when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedClients);
      setSearchTerm("");
      setResult(null);
    }
  }, [isOpen, selectedClients]);

  // Server-side search when user types in search box
  React.useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true); setError(null);
    const timer = setTimeout(async () => {
      try {
        const result = await queries.searchClients({term:searchTerm.trim(),version,seller:activeSeller,category:activeCategory,zone:activeZonaBase,supervisor:activeSupervisor},controller.signal);
        if (!controller.signal.aborted) setResult({key: searchKey, data: result});
      } catch (e) {
        if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'No se pudo buscar clientes.'); setResult(null); }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [queries, isOpen, searchKey, searchTerm, activeCategory, activeZonaBase, activeSupervisor, activeSeller, version]);

  // The server applies zona_cliente and counts the entire matching population.
  // Never substitute the truncated initial catalog or results from older filters.
  const filteredClients = searchResults?.items || [];
  const totalAvailableCount = searchResults?.total ?? null;

  const toggleClient = (cp: string) => {
    setTempSelected((prev) =>
      prev.includes(cp) ? prev.filter((item) => item !== cp) : prev.length < 100 ? [...prev, cp] : prev
    );
  };

  const handleSelectTop = (n: number) => {
    const top = filteredClients.slice(0, n).map((c) => c.cp_cliente);
    setTempSelected(top);
  };

  const handleSelectAll = () => {
    setTempSelected(filteredClients.map((c) => c.cp_cliente));
  };

  const handleClear = () => {
    setTempSelected([]);
  };

  const handleSave = () => {
    onApply(tempSelected.slice(0,100));
    onClose();
  };


return {searchResults,searchTerm,setSearchTerm,tempSelected,isSearching,filteredClients,totalAvailableCount,toggleClient,handleSelectTop,handleSelectAll,handleClear,handleSave,error};
}
