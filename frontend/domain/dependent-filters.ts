import type { FilterData, FilterState } from './report-contracts';

const productKeys = ['unidadNegocio', 'franquicia', 'marca'] as const;
const clientKeys = ['quintil', 'zonaBase', 'supervisor', 'vendedor'] as const;
type FacetKey = typeof productKeys[number] | typeof clientKeys[number];
const optionKeys = {
  unidadNegocio: 'unidades_negocio', franquicia: 'franquicias', marca: 'marcas',
  quintil: 'categorizaciones', zonaBase: 'zonas_base', supervisor: 'supervisores', vendedor: 'vendedores',
} as const;
const sortUnique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b,'es'));

/** Each facet ignores its own selection so users can choose another value.
 * Product and commercial dimensions stay independent: missing purchases are opportunities.
 */
export function dependentOptions(data: FilterData, state: FilterState): FilterData {
  if (!data.relations) return data;
  const result = {...data};
  for (const keys of [productKeys, clientKeys]) {
    const rows = keys === productKeys ? data.relations.materials : data.relations.clients;
    keys.forEach((key, index) => {
      const matches = rows.filter(row => keys.every((other, position) => other === key || !state[other] || row[position] === state[other]));
      result[optionKeys[key]] = sortUnique(matches.map(row => row[index])).filter(value => key !== 'quintil' || data.categorizaciones.includes(value));
    });
  }
  return result;
}

/** New choice wins. Keep other choices only if their combination still exists.
 * Reconcile atomically, before requesting the next matrix, with no cascading requests.
 */
export function reconcileFilters(data: FilterData | null, state: FilterState, changed: keyof FilterState): FilterState {
  if (!data?.relations) return state;
  const keys: readonly FacetKey[] | undefined = (productKeys as readonly string[]).includes(changed) ? productKeys
    : (clientKeys as readonly string[]).includes(changed) ? clientKeys : undefined;
  if (!keys) return state;
  const rows = keys === productKeys ? data.relations.materials : data.relations.clients;
  const next = {...state};
  const retained = [changed as FacetKey];
  for (const key of keys) {
    if (key === changed || !next[key]) continue;
    const candidate = [...retained, key];
    if (!rows.some(row => candidate.every(field => !next[field] || row[keys.indexOf(field)] === next[field]))) next[key] = '';
    else retained.push(key);
  }
  return next;
}
