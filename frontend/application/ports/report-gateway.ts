import type { ClientMatrixResponse,ClientSearchResult,FilterData,FilterState,MatrixResponse } from '@/domain/report-contracts';

export type ClientSearch = { version: string; term: string; category?: string; zone?: string; supervisor?: string; seller?: string };
export interface ReportGateway {
  versions(signal?: AbortSignal): Promise<FilterData['versions']>;
  filters(version: string, signal?: AbortSignal): Promise<FilterData>;
  matrix(filters: FilterState, signal?: AbortSignal): Promise<MatrixResponse>;
  detail(filters: FilterState, client: string, signal?: AbortSignal): Promise<ClientMatrixResponse>;
  searchClients(query: ClientSearch, signal?: AbortSignal): Promise<ClientSearchResult>;
  export(filters: FilterState, client?: string): Promise<Blob>;
}
export interface FileDownload { save(file: Blob, filename: string): void }
