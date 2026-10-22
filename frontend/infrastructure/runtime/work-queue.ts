import type { ReportCache } from '@/application/ports/report-cache';
export class BusyError extends Error { constructor(message = 'Hay varias consultas en curso. Intenta nuevamente en unos segundos.') { super(message); } }
type Task = { start: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
/** FIFO bounded admission queue. Active jobs hold their slot until completion/error. */
export class WorkQueue {
  private active = 0; private pending: Task[] = [];
  constructor(private concurrency = 4, private capacity = 60, private waitMs = 20000) {}
  get stats() { return { active: this.active, pending: this.pending.length, concurrency: this.concurrency }; }
  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency && this.pending.length >= this.capacity) return Promise.reject(new BusyError());
    return new Promise((resolve, reject) => {
      const start = () => { this.active++; Promise.resolve().then(work).then(resolve, reject).finally(() => {
        this.active--; const next = this.pending.shift(); if (next) { clearTimeout(next.timer); next.start(); }
      }); };
      if (this.active < this.concurrency) start();
      else {
        const task: Task = { start, reject, timer: setTimeout(() => {
          this.pending = this.pending.filter(t => t !== task); reject(new BusyError('La espera superó el límite. Vuelve a consultar.'));
        }, this.waitMs) };
        this.pending.push(task);
      }
    });
  }
}
/** TTL + LRU + byte limit. Concurrent identical requests share one promise. Failures are never cached. */
export class ResultCache implements ReportCache {
  private values = new Map<string, { value: unknown; expires: number; bytes: number }>();
  private flights = new Map<string, Promise<unknown>>(); private bytes = 0;
  constructor(private ttlMs = 120000, private maxBytes = 32 * 1024 * 1024) {}
  async get<T>(key: string, work: () => Promise<T>): Promise<T> {
    const hit = this.values.get(key);
    if (hit && hit.expires > Date.now()) { this.values.delete(key); this.values.set(key, hit); return hit.value as T; }
    if (hit) { this.bytes -= hit.bytes; this.values.delete(key); }
    const pending = this.flights.get(key); if (pending) return pending as Promise<T>;
    const promise = Promise.resolve().then(work).then(value => {
      const bytes = Buffer.byteLength(JSON.stringify(value));
      if (bytes <= this.maxBytes) {
        while (this.bytes + bytes > this.maxBytes && this.values.size) { const k = this.values.keys().next().value!; this.bytes -= this.values.get(k)!.bytes; this.values.delete(k); }
        this.values.set(key, { value, bytes, expires: Date.now() + this.ttlMs }); this.bytes += bytes;
      }
      return value;
    }).finally(() => this.flights.delete(key));
    this.flights.set(key, promise); return promise;
  }
}
