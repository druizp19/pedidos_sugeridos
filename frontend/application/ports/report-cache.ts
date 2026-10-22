/** Cache port: implementations must share in-flight loads and never cache failures. */
export interface ReportCache {
  get<T>(key: string, load: () => Promise<T>): Promise<T>;
}
export interface ReportCaches {
  reports: ReportCache;
  sales: ReportCache;
  purchases: ReportCache;
  catalogs: ReportCache;
  versions: ReportCache;
}
