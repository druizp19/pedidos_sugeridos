import { VERSIONS, type Version } from './report';

export type VersionPeriod = {
  id: string;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
};
const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export const validVersionId = (id: string) => /^V[1-9]\d{0,18}$/.test(id);

function period(start: string, end: string) {
  const dates = [start, end].map(value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('DATA_VERSION_PERIOD');
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('DATA_VERSION_PERIOD');
    return date;
  });
  const [first, last] = dates;
  if (first > last || first.getUTCDate() !== 1
    || new Date(last.getTime() + 86400000).getUTCDate() !== 1) throw new Error('DATA_VERSION_PERIOD');
  return { first, last, months: (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth() + 1 };
}

export function versionFromPeriod(row: VersionPeriod): Version {
  if (!validVersionId(row.id)) throw new Error('DATA_VERSION_PERIOD');
  const current = period(row.start, row.end);
  const previous = period(row.previousStart, row.previousEnd);
  if (current.first <= previous.last && previous.first <= current.last) throw new Error('DATA_VERSION_PERIOD');
  const firstMonth = monthNames[current.first.getUTCMonth()];
  const lastMonth = monthNames[current.last.getUTCMonth()];
  const year = current.last.getUTCFullYear();
  const label = current.months === 1 ? `${firstMonth} ${year}`
    : current.first.getUTCFullYear() === year ? `${firstMonth} – ${lastMonth} ${year}`
    : `${firstMonth} ${current.first.getUTCFullYear()} – ${lastMonth} ${year}`;
  return { id: row.id, label: label[0].toUpperCase() + label.slice(1), months: current.months, previousMonths: previous.months, enabled: true };
}

/** Old summaries predate period metadata. Only V1/V2 have known legacy divisors. */
export function configuredVersions(periods: VersionPeriod[]): Version[] {
  const versions = new Map(VERSIONS.map(v => [v.id, { ...v, enabled: true }]));
  for (const row of periods) versions.set(row.id, versionFromPeriod(row));
  return [...versions.values()].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
}
