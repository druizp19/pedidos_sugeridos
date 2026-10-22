"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search,Users } from "lucide-react";
import { useClientSelection } from '../hooks/use-client-selection';

import type { ClientModalProps } from '../hooks/use-client-selection';
export function ClientModal({
  isOpen,
  onClose,
  selectedClients,
  activeCategory,
  activeZonaBase,
  activeSupervisor,
  activeSeller,
  version,
  onApply,
}: ClientModalProps) {
 const {searchResults,searchTerm,setSearchTerm,tempSelected,isSearching,filteredClients,totalAvailableCount,toggleClient,handleSelectTop,handleSelectAll,handleClear,handleSave,error}=useClientSelection({isOpen,onClose,selectedClients,activeCategory,activeZonaBase,activeSupervisor,activeSeller,version,onApply});
  const getBadgeVariant = (q: string) => {
    switch (q?.toUpperCase()) {
      case "Q1": return "q1";
      case "Q2": return "q2";
      case "Q3": return "q3";
      case "Q4": return "q4";
      case "Q5": return "q5";
      default: return "secondary";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] flex flex-col p-0 sm:max-w-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Seleccionar columnas de clientes (máximo 100)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Categoría activa:{" "}
                <strong className="text-primary">
                  {activeCategory || "Todas las categorías"}
                </strong>{" "}
                &bull; Disponibles: <strong>{totalAvailableCount ?? '—'}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && <p role="alert" className="px-5 py-3 text-sm text-destructive">{error}</p>}
        {/* Search & Quick Actions Bar */}
        <div className="p-4 pb-2 space-y-3 bg-muted/30 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por RUC, Farmacia o Código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 bg-white dark:bg-slate-900 text-xs h-9"
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-[#6a5cbc] border-t-transparent" />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Selección rápida:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectTop(8)}
                disabled={!searchResults || isSearching}
                className="h-7 px-2 text-[11px]"
              >
                Top 8
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectTop(16)}
                disabled={!searchResults || isSearching}
                className="h-7 px-2 text-[11px]"
              >
                Top 16
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={!searchResults || isSearching}
                className="h-7 px-2 text-[11px]"
              >
                Seleccionar visibles
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 px-2 text-[11px] text-slate-500 hover:text-red-600"
              >
                Limpiar
              </Button>
            </div>

            <div className="text-slate-600 dark:text-slate-400 font-medium text-xs">
              Seleccionados:{" "}
              <span className="font-bold text-primary">{tempSelected.length}</span>
            </div>
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
          {totalAvailableCount !== null && totalAvailableCount > filteredClients.length && (
            <div className="mb-2 p-2 px-3 text-[11px] font-medium text-[#53459e] bg-[#ede9fe] rounded-md border border-[#ddd6fe]">
              Mostrando {filteredClients.length} de {totalAvailableCount} clientes. Escribe en el buscador para encontrar otros clientes de esta selección.
            </div>
          )}
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isSearching || (!searchResults && !error) ? 'Buscando clientes…' : error ? 'No se pudo cargar la lista de clientes.' : 'No se encontraron clientes para el filtro actual.'}
            </div>
          ) : (
            filteredClients.map((client) => {
              const isChecked = tempSelected.includes(client.cp_cliente);
              return (
                <div
                  key={client.cp_cliente}
                  onClick={() => toggleClient(client.cp_cliente)}
                  className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors ${
                    isChecked ? "bg-primary/10" : "hover:bg-slate-50 dark:bg-slate-900/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      aria-label={`Seleccionar ${client.farmacia || client.ruc}`}
                      onClick={event => event.stopPropagation()}
                      checked={isChecked}
                      onCheckedChange={() => toggleClient(client.cp_cliente)}
                    />
                    <div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {client.cp_cliente}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        RUC: {client.ruc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {client.zona_cliente && (
                      <span className="text-[10px] text-[#6a5cbc] bg-purple-50 px-1.5 py-0.5 rounded font-semibold border border-purple-200">
                        {client.zona_cliente}
                      </span>
                    )}
                    {client.quintil && (
                      <Badge variant={getBadgeVariant(client.quintil)} className="text-[10px] px-1.5 py-0">
                        {client.quintil}
                      </Badge>
                    )}
                    {client.categorizacion && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        {client.categorizacion}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="bg-[#6a5cbc] hover:bg-[#53459e] text-white font-bold text-xs"
          >
            Aplicar Selección ({tempSelected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
