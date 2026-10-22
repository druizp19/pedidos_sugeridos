import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialFilters, updateFilter, resetFilters, selectAvailableVersion } from '../domain/report-filters';
import { selectReportRows } from '../domain/report-view';
import { createReportQueries } from '../application/report-queries';
import { createHttpReportGateway } from '../infrastructure/http/report-gateway';
import type { MatrixBrand, FilterState } from '../domain/report-contracts';
import { formatPublicationDate } from '../lib/utils';

test('opening a report defaults to the latest available version, not V1', () => {
  assert.equal(selectAvailableVersion([{id:'V1',enabled:true},{id:'V2',enabled:true}]),'V2');
  assert.equal(selectAvailableVersion([{id:'V2',enabled:true},{id:'V10',enabled:true},{id:'V9',enabled:true}]),'V10');
  assert.equal(selectAvailableVersion([{id:'V1',enabled:true},{id:'V2',enabled:false}]),'V1');
  assert.equal(selectAvailableVersion([]),'');
});

test('manual refresh preserves a chosen historical version and replaces one no longer available', () => {
  const versions = [{id:'V1',enabled:true},{id:'V2',enabled:true},{id:'V3',enabled:true}];
  assert.equal(selectAvailableVersion(versions,'V1'),'V1');
  assert.equal(selectAvailableVersion(versions,'V4'),'V3');
});

test('switching version clears incompatible filters while preserving the metric', () => {
  const current: FilterState = { ...initialFilters, unidadMedida: 'S/ SOLES', marca: 'A', selectedClients: ['0001'] };
  const next = updateFilter(current, 'version', 'V2');
  assert.equal(next.unidadMedida, 'S/ SOLES'); assert.equal(next.version, 'V2');
  assert.equal(next.marca, ''); assert.deepEqual(next.selectedClients, []);
  assert.deepEqual(current.selectedClients, ['0001']);
  assert.equal(resetFilters(next).version, 'V2');
});
test('changing a population filter clears client columns; searching keeps them', () => {
  const filters = { ...initialFilters, selectedClients: ['0001'] };
  assert.deepEqual(updateFilter(filters, 'vendedor', 'A').selectedClients, []);
  assert.deepEqual(updateFilter(filters, 'search', 'SKU').selectedClients, ['0001']);
});
test('sorting and search do not mutate source response or remove sibling SKUs', () => {
  const metrics = { vta_act: 1, vta_mdo: 3, ms_act: .3, ms_ant: .2, ms_territorio: .4, ms_ideal: .4, estimacion: 2, clients: {} };
  const brands: MatrixBrand[] = [{ ...metrics, marca: 'A', unidad_negocio: 'U', franquicia: 'F', skus: [
    { ...metrics, sku: '001', estimacion: 1 }, { ...metrics, sku: '002', estimacion: 5 },
  ] }];
  const selected = selectReportRows(brands, '001', 'estimacion', 'desc');
  assert.deepEqual(selected[0].skus.map(s => s.sku), ['002', '001']);
  assert.deepEqual(brands[0].skus.map(s => s.sku), ['001', '002']);
  assert.equal(selectReportRows(brands, 'missing', 'marca', 'asc').length, 0);
});
test('use cases preserve export filters, suppress search only for matrix and forward cancellation', async () => {
  const requests: { url: string; body: Record<string, unknown>; signal?: AbortSignal | null }[] = [];
  const transport: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body || '{}')), signal: init?.signal });
    return String(url).endsWith('export-excel') ? new Response('xlsx') : Response.json({ success: true, data: {} });
  };
  const downloads: string[] = [];
  const queries = createReportQueries(createHttpReportGateway(transport), { save: (_, name) => downloads.push(name) });
  const filters = { ...initialFilters, version: 'V2', vendedor: 'Vendedor', search: 'SKU', selectedClients: ['0001'] };
  const control = new AbortController();
  await queries.matrix(filters, control.signal);
  await queries.export(filters);
  assert.equal(requests[0].signal, control.signal); assert.equal(requests[0].body.search, '');
  assert.equal(requests[1].body.search, 'SKU'); assert.deepEqual(requests[1].body.vendedor, ['Vendedor']);
  assert.deepEqual(requests[1].body.selectedClients, ['0001']);
  assert.deepEqual(downloads, ['Pedidos_Sugeridos_V2.xlsx']);
});
test('HTTP failures are surfaced and never trigger a download', async () => {
  const transport: typeof fetch = async () => Response.json({ error: 'Cola llena' }, { status: 503 });
  let downloaded = false;
  const queries = createReportQueries(createHttpReportGateway(transport), { save: () => { downloaded = true; } });
  await assert.rejects(queries.export(initialFilters), /Cola llena/);
  assert.equal(downloaded, false);
});

test('client search preserves the true total separately from the limited visible list', async () => {
  let requested = '';
  const result={items:[],total:135,limit:100};
  const transport:typeof fetch=async url=>{requested=String(url);return Response.json({success:true,data:result});};
  const queries=createReportQueries(createHttpReportGateway(transport),{save:()=>{}});
  assert.deepEqual(await queries.searchClients({version:'V2',term:'',zone:'CD03'}),result);
  assert.equal(new URL(requested,'http://localhost').searchParams.get('zonaBase'),'CD03');
});

// Publication timestamps are UTC; display is explicitly Lima, including midnight boundaries.
test('publication date uses Lima time and does not invent dates for historical deliveries', () => {
  assert.equal(formatPublicationDate(null), null);
  assert.equal(formatPublicationDate(undefined), null);
  assert.equal(formatPublicationDate('invalid'), null);
  const result = formatPublicationDate('2026-10-20T02:30:00.1234567Z');
  assert.match(result!, /19/);
  assert.match(result!, /21:30/);
});
