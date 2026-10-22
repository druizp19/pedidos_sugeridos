"use client";
import type { ReportQueries } from '@/application/report-queries';
import { createContext,useContext,type ReactNode } from 'react';
const Context = createContext<ReportQueries | null>(null);
export function ReportProvider({ queries, children }: { queries: ReportQueries; children: ReactNode }) {
  return <Context.Provider value={queries}>{children}</Context.Provider>;
}
export function useReportQueries() {
  const queries = useContext(Context);
  if (!queries) throw new Error('ReportProvider is required');
  return queries;
}
