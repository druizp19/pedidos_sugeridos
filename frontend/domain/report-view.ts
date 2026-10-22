import type { ClientDetailBrand,MatrixBrand } from './report-contracts';
export type SortField = 'marca' | 'vta_act' | 'vta_mdo' | 'ms_act' | 'ms_ant' | 'ms_territorio' | 'ms_ideal' | 'estimacion';
export function brandKey(brand: { marca: string; unidad_negocio: string; franquicia: string }) {
  return `${brand.marca}__${brand.unidad_negocio || ''}__${brand.franquicia || ''}`;
}
function numericValue(row: object & { distribuidoras?: Record<string, number> }, field: string) {
  if (row.distribuidoras && Object.hasOwn(row.distribuidoras, field)) return Number(row.distribuidoras[field]) || 0;
  return field in row ? Number(Reflect.get(row, field)) || 0 : 0;
}
/** Creates a view without mutating the server response or recalculating its totals. */
export function selectReportRows<T extends MatrixBrand | ClientDetailBrand>(brands: T[], search: string, field: string, direction: 'asc' | 'desc'): T[] {
  const term = search.toLocaleLowerCase('es').trim();
  const sign = direction === 'asc' ? 1 : -1;
  return brands.filter(b => !term || b.marca.toLocaleLowerCase('es').includes(term) || b.skus.some(s => s.sku.toLocaleLowerCase('es').includes(term)))
    .toSorted((a, b) => sign * (field === 'marca' ? a.marca.localeCompare(b.marca, 'es') : numericValue(a, field) - numericValue(b, field)))
    .map(brand => ({ ...brand, skus: [...brand.skus].sort((a, b) => sign * (field === 'marca' ? a.sku.localeCompare(b.sku, 'es') : numericValue(a, field) - numericValue(b, field))) })) as T[];
}
