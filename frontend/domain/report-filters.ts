import type { FilterData, FilterState } from './report-contracts';
export function selectAvailableVersion(versions: Pick<FilterData['versions'][number], 'id' | 'enabled'>[], current = ''): string {
  const available = versions.filter(v => v.enabled);
  if (available.some(v => v.id === current)) return current;
  return available.map(v => v.id).sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))[0] || '';
}
export const initialFilters: FilterState = { version: 'V1', vendedor: '', unidadMedida: 'UNIDAD', unidadNegocio: '', franquicia: '', marca: '', quintil: '', zonaBase: '', supervisor: '', search: '', selectedClients: [] };
export function updateFilter<K extends keyof FilterState>(state: FilterState, key: K, value: FilterState[K]): FilterState {
  if (key === 'version') return { ...initialFilters, selectedClients: [], version: String(value), unidadMedida: state.unidadMedida };
  return { ...state, [key]: value, ...(['quintil', 'zonaBase', 'supervisor', 'vendedor'].includes(key) ? { selectedClients: [] } : {}) };
}
export const resetFilters = (state: FilterState): FilterState => ({ ...initialFilters, selectedClients: [], version: state.version, unidadMedida: state.unidadMedida });
