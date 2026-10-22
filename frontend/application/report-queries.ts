import type { FilterState } from '@/domain/report-contracts';
import type { ClientSearch,FileDownload,ReportGateway } from './ports/report-gateway';

/** Frontend use cases depend only on ports, never on fetch, React or SQL. */
export function createReportQueries(gateway: ReportGateway, files: FileDownload) {
  return {
    versions: (signal?: AbortSignal) => gateway.versions(signal),
    filters: (version: string, signal?: AbortSignal) => gateway.filters(version, signal),
    matrix: (filters: FilterState, signal?: AbortSignal) => gateway.matrix({ ...filters, search: '' }, signal),
    detail: (filters: FilterState, client: string, signal?: AbortSignal) => gateway.detail({ ...filters, search: '' }, client, signal),
    searchClients: (query: ClientSearch, signal?: AbortSignal) => gateway.searchClients(query, signal),
    async export(filters: FilterState, client?: string) {
      const file = await gateway.export(filters, client);
      files.save(file, `Pedidos_Sugeridos_${filters.version}${client ? '_Cliente' : ''}.xlsx`);
    },
  };
}
export type ReportQueries = ReturnType<typeof createReportQueries>;
