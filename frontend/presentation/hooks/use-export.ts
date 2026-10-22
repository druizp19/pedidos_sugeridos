"use client";
import type { FilterState } from '@/domain/report-contracts';
import { useState } from 'react';
import { useReportQueries } from '../providers/report-provider';
export function useExport() {
  const queries = useReportQueries();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  async function download(filters: FilterState) {
    setExporting(true); setError('');
    try { await queries.export(filters); }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudo exportar.'); }
    finally { setExporting(false); }
  }
  return { exporting, error, download };
}
