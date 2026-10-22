import {test} from 'node:test';import assert from 'node:assert/strict';
import {WorkQueue,BusyError,ResultCache} from '../infrastructure/runtime/work-queue';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
test('50 callers complete without exceeding SQL concurrency',async()=>{
 const q=new WorkQueue(4,60,2000);let active=0,max=0;
 await Promise.all(Array.from({length:50},()=>q.run(async()=>{active++;max=Math.max(max,active);await delay(2);active--;return 1;})));
 assert.equal(max,4);await delay(0);assert.equal(q.stats.pending,0);assert.equal(q.stats.active,0);
});
test('queue rejects overflow, expires pending tasks and releases slots after error',async()=>{
 const q=new WorkQueue(1,1,10);let release!:()=>void;
 const first=q.run(()=>new Promise<void>(r=>{release=r;}));await delay(0);
 const pending=q.run(async()=>1);const assertion=assert.rejects(pending,BusyError);
 await assert.rejects(q.run(async()=>2),BusyError);await assertion;release();await first;await delay(0);
 await assert.rejects(q.run(async()=>{throw new Error('failure')}));await delay(0);
 assert.equal(await q.run(async()=>3),3);
});
test('cache deduplicates concurrent queries and separates versions',async()=>{
 const cache=new ResultCache(1000);let calls=0;const work=async()=>{calls++;await delay(2);return {value:calls};};
 await Promise.all(Array.from({length:50},()=>cache.get('V1',work)));assert.equal(calls,1);
 await cache.get('V2',work);assert.equal(calls,2);
});
test('cache expires and never caches failed queries',async()=>{
 const cache=new ResultCache(5);let calls=0;
 await assert.rejects(cache.get('x',async()=>{throw new Error('sql')}));
 await cache.get('x',async()=>++calls);await delay(15);await cache.get('x',async()=>++calls);assert.equal(calls,2);
});
