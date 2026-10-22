"use client";
import type { ClientColumn,FilterData,FilterState,MatrixResponse } from '@/domain/report-contracts';
import { initialFilters,resetFilters,updateFilter,selectAvailableVersion } from '@/domain/report-filters';
import { brandKey,type SortField } from '@/domain/report-view';
import { dependentOptions, reconcileFilters } from '@/domain/dependent-filters';
import { useCallback,useEffect,useMemo,useState } from 'react';
import { useReportQueries } from '../providers/report-provider';

export function useReportController() {
  const queries = useReportQueries();
  // Wait for discovery before requesting filters or data for any version.
  const [filters, setFilters] = useState(() => ({ ...initialFilters, version: '' }));
  const [options, setOptions] = useState<FilterData | null>(null);
  const [versions, setVersions] = useState<FilterData['versions']>([]);
  const [versionsReady, setVersionsReady] = useState(false);
  const [versionError, setVersionError] = useState('');
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [client, setClient] = useState<ClientColumn | null>(null);
  const [sort, setSort] = useState<SortField>('estimacion');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [collapsed, setCollapsed] = useState(new Set<string>());

  useEffect(() => {
    const control = new AbortController();
    let inFlight = false;
    const discover = async () => {
      if (inFlight || control.signal.aborted) return;
      inFlight = true;
      try {
        const available = (await queries.versions(control.signal)).filter(v => v.enabled);
        if (control.signal.aborted) return;
        setVersions(current => JSON.stringify(current) === JSON.stringify(available) ? current : available);
        setVersionError(available.length ? '' : 'Todavía no hay versiones disponibles para el reporte.');
        setFilters(current => {
          const version = selectAvailableVersion(available, current.version);
          return current.version === version ? current : updateFilter(current, 'version', version);
        });
      } catch (error) {
        if (!control.signal.aborted) setVersionError(error instanceof Error ? error.message : 'No se pudieron consultar las versiones.');
      } finally {
        inFlight = false;
        if (!control.signal.aborted) setVersionsReady(true);
      }
    };
    void discover();
    return () => control.abort();
  }, [queries, refresh]);

  const versionAvailable = versions.some(v => v.id === filters.version);

  useEffect(() => {
    if (!versionsReady || !versionAvailable) {
      setOptions(null); setClient(null); setData(null); setLoading(!versionsReady);
      return;
    }
    const control = new AbortController();
    setOptions(null); setClient(null); setData(null); setLoading(true); setError('');
    queries.filters(filters.version, control.signal).then(result => {
      if (!control.signal.aborted) setOptions(result);
    }).catch(error => {
      if (!control.signal.aborted) { setError(error.message); setLoading(false); }
    });
    return () => control.abort();
  }, [queries, filters.version, refresh, versionsReady, versionAvailable]);

  // Search is a local view operation; it must not trigger another SQL query.
  const query = JSON.stringify({ ...filters, search: '' });
  useEffect(() => {
    if (!options || !versionAvailable) return;
    const control = new AbortController();
    setLoading(true); setError(''); setData(null);
    const timer = setTimeout(() => {
      queries.matrix(JSON.parse(query) as FilterState, control.signal).then(result => {
        if (control.signal.aborted) return;
        setData(result); setCollapsed(new Set(result.brands.map(brandKey)));
      }).catch(error => { if (!control.signal.aborted) setError(error.message); })
        .finally(() => { if (!control.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); control.abort(); };
  }, [queries, options, query, refresh, versionAvailable]);

  const change = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => setFilters(current => reconcileFilters(options, updateFilter(current, key, value), key)), [options]);
  const reset = () => setFilters(resetFilters);
  const reload = () => setRefresh(value => value + 1);
  const expand = (yes: boolean) => setCollapsed(yes ? new Set() : new Set(data?.brands.map(brandKey) || []));
  const toggleBrand = (key: string) => setCollapsed(current => {
    const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next;
  });
  const changeSort = (field: SortField) => {
    setDirection(sort === field && direction === 'desc' ? 'asc' : 'desc'); setSort(field);
  };
  const visibleOptions = useMemo(() => options ? dependentOptions(options, filters) : null, [options, filters]);
  return { filters, options: visibleOptions, versions, data, error: versionError || error, loading, clientsOpen, setClientsOpen, client, setClient,
    sort, direction, collapsed, change, reset, reload, expand, toggleBrand, changeSort };
}
