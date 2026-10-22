"use client";
import { createReportQueries } from '@/application/report-queries';
import { browserFileDownload } from '@/infrastructure/browser/file-download';
import { createHttpReportGateway } from '@/infrastructure/http/report-gateway';
import { ReportProvider } from '@/presentation/providers/report-provider';
import DashboardPage from '@/presentation/screens/report-screen';
const queries = createReportQueries(createHttpReportGateway(), browserFileDownload);
export function ReportApp() {
  return <ReportProvider queries={queries}><DashboardPage /></ReportProvider>;
}
