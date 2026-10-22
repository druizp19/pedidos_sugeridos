import type { ClientSearch,ReportGateway } from '@/application/ports/report-gateway';
import type { FilterState } from '@/domain/report-contracts';
import { getApiPath } from '@/lib/utils';

export function reportPayload(f: FilterState) {
  const list = (value: string) => value ? [value] : [];
  return { version: f.version, unidadMedida: f.unidadMedida, unidadNegocio: list(f.unidadNegocio),
    franquicia: list(f.franquicia), marca: list(f.marca), categorizacion: list(f.quintil),
    zonaBase: list(f.zonaBase), supervisor: list(f.supervisor), vendedor: list(f.vendedor),
    selectedClients: f.selectedClients, search: f.search };
}
export function createHttpReportGateway(transport: typeof fetch = fetch): ReportGateway {
  async function request(path: string, options: RequestInit = {}) {
    const response = await transport(getApiPath(`/api/${path}`), {
      ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || (response.status === 503 ? 'Hay varias consultas en espera. Intenta nuevamente.' : 'No se pudo completar la consulta.'));
    }
    return response;
  }
  async function json<T>(path: string, options?: RequestInit): Promise<T> {
    const body = await (await request(path, options)).json();
    if (!body.success) throw new Error(body.error || 'Respuesta inválida del servidor.');
    return body.data as T;
  }
  const post = (filters: FilterState, signal?: AbortSignal, client?: string): RequestInit => ({
    method: 'POST', signal, body: JSON.stringify({ ...reportPayload(filters), client }),
  });
  return {
    versions: signal => json('versions', { signal }),
    filters: (version, signal) => json(`filters?version=${encodeURIComponent(version)}`, { signal }),
    matrix: (filters, signal) => json('matrix', post(filters, signal)),
    detail: (filters, client, signal) => json('client-matrix', post(filters, signal, client)),
    searchClients: (q: ClientSearch, signal) => json(`search-clients?${new URLSearchParams({
      version: q.version, q: q.term, category: q.category || '', zonaBase: q.zone || '', supervisor: q.supervisor || '', vendedor: q.seller || '',
    })}`, { signal }),
    export: async (filters, client) => (await request('export-excel', post(filters, undefined, client))).blob(),
  };
}
