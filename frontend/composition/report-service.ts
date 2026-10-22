import { ReportService } from '@/application/report-service';
import type { ReportRepository } from '@/application/ports/report-repository';
import { ResultCache } from '@/infrastructure/runtime/work-queue';

/** Per-process, bounded delivery caches. Only composition chooses the adapter. */
export function createReportService(repo: ReportRepository, versionCacheTtlMs = 15000) {
  const deliveryTtl = 24 * 60 * 60 * 1000;
  return new ReportService(repo, {
    reports: new ResultCache(deliveryTtl),
    sales: new ResultCache(deliveryTtl, 48 * 1024 * 1024),
    purchases: new ResultCache(deliveryTtl, 16 * 1024 * 1024),
    catalogs: new ResultCache(deliveryTtl, 128 * 1024 * 1024),
    versions: new ResultCache(versionCacheTtlMs),
  });
}
