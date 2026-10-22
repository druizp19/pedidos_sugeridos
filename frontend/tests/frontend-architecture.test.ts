import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(root, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(root, entry.name)] : []);
}
test('presentation cannot bypass application ports with HTTP, SQL or infrastructure imports', () => {
  for (const file of files('presentation')) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|from\s+['"](?:mssql|@\/infrastructure|@\/lib\/api)/, file);
  }
});
test('frontend domain and use cases remain independent of React, Next and infrastructure', () => {
  for (const file of ['domain/report-contracts.ts', 'domain/report-filters.ts', 'domain/report-view.ts', 'application/report-queries.ts', 'application/ports/report-gateway.ts']) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /from\s+['"](?:react|next|@\/infrastructure|@\/presentation)/, file);
  }
});

 test('domain and application depend only on ports, not concrete adapters', () => {
  for (const file of [...files('domain'), ...files('application')]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /from\s+['"](?:react|next|@\/infrastructure|@\/presentation|@\/composition)/, file);
  }
});
