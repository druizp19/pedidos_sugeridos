import sql from 'mssql';
import { WorkQueue } from '../runtime/work-queue';
const state = globalThis as typeof globalThis & { pedidosPool?: Promise<sql.ConnectionPool>; pedidosQueue?: WorkQueue };
export const databaseQueue = state.pedidosQueue ??= new WorkQueue(4, 60, 20000);
export function getPool(): Promise<sql.ConnectionPool> {
  if (!state.pedidosPool) {
    if (!process.env.DB_USER || !process.env.DB_PASSWORD) throw new Error('DB_CONFIGURATION');
    const pool = new sql.ConnectionPool({ server: process.env.DB_SERVER || '172.17.2.181',
      database: process.env.DB_DATABASE || 'DTM_PEDIDOS_SUGERIDOS', port: Number(process.env.DB_PORT || 1433),
      user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      options: { encrypt: process.env.DB_ENCRYPT === 'true', trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true' },
      pool: { max: 4, min: 0, idleTimeoutMillis: 30000 }, connectionTimeout: 10000, requestTimeout: 60000 });
    pool.on('error', () => { state.pedidosPool = undefined; void pool.close(); });
    state.pedidosPool = pool.connect().catch(error => { state.pedidosPool = undefined; throw error; });
  }
  return state.pedidosPool;
}
export async function query<T>(text: string, params: Record<string, string> = {}, label = 'query'): Promise<T[]> {
  const queuedAt = performance.now();
  return databaseQueue.run(async () => {
    const startedAt = performance.now();
    const request = (await getPool()).request();
    for (const [name, value] of Object.entries(params)) {
      // Match the indexed column types. RUCs and commercial labels remain Unicode.
      const type = name === 'version' ? sql.VarChar(20) : name === 'metric' ? sql.VarChar(10)
        : name === 'assignedClients' ? sql.NVarChar(sql.MAX) : sql.NVarChar(500);
      request.input(name, type, value);
    }
    const result = await request.query<T>(text);
    if (process.env.PEDIDOS_PERF === '1') console.info('[pedidos-sql]', JSON.stringify({
      label, queueMs:Math.round(startedAt-queuedAt), sqlMs:Math.round(performance.now()-startedAt), rows:result.recordset?.length || 0,
    }));
    return result.recordset;
  });
}
