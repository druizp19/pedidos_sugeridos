import type { Catalog, Query, Snapshot, Version } from '@/domain/report';
import type { ClientOption } from '@/types';
export interface ReportRepository {
  availableVersions(): Promise<Version[]>;
  catalog(version: string): Promise<Catalog>;
  sales(query: Query, assignedClients?: string[]): Promise<Snapshot['sales']>;
  clientPurchases(query: Query, columns: ClientOption[]): Promise<Pick<Snapshot, 'purchases' | 'distributors'>>;
  snapshot(query: Query, columns: ClientOption[]): Promise<Snapshot>;
}
