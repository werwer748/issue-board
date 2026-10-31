import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server/index.mjs';
import { readFile } from 'node:fs/promises';
const snapshot = JSON.parse(await readFile(new URL('../data/snapshot.json', import.meta.url)));
async function api(t, query='') {
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return fetch(`http://127.0.0.1:${server.address().port}/api/dashboard?${query}`);
}
test('default response reports totals and server aggregates', async t=>{
  const r=await api(t); assert.equal(r.status,200); const d=await r.json();
  assert.equal(d.total,snapshot.issues.length); assert.equal(d.filtered,d.issues.length);
  const expected=new Map();
  for(const i of snapshot.issues){ const names=[...new Set(i.labels.map(l=>l.name))]; for(const n of names.length?names:['라벨 없음']) expected.set(n,(expected.get(n)||0)+1); }
  assert.deepEqual(new Map(d.labelCounts.map(x=>[x.name,x.count])),expected);
  assert.deepEqual(d.labels,[...new Set(snapshot.issues.flatMap(i=>i.labels.map(l=>l.name)))].sort());
});
test('search, state and label are intersected on server',async t=>{
  const item=snapshot.issues[0]; const label=item.labels[0]?.name??'__unlabelled__';
  const r=await api(t,new URLSearchParams({query:`#${item.number}`,state:item.state,label})); const d=await r.json();
  assert.deepEqual(d.issues.map(x=>x.number),[item.number]); assert.equal(d.filtered,1);
});
test('empty results preserve global totals and aggregates',async t=>{
  const a=await (await api(t)).json(); const b=await (await api(t,'query=no-such-issue-unique-934789')).json();
  assert.equal(b.issues.length,0); assert.equal(b.filtered,0); assert.equal(b.total,snapshot.issues.length); assert.deepEqual(b.labelCounts,a.labelCounts);
});
test('invalid state returns a readable JSON error',async t=>{
  const r=await api(t,'state=invalid'); assert.equal(r.status,400); assert.equal(typeof (await r.json()).error,'string');
});
test('unknown label is an empty successful response',async t=>{
  const r=await api(t,'label=no-such-label-934789'); assert.equal(r.status,200); const d=await r.json(); assert.deepEqual(d.issues,[]); assert.equal(d.filtered,0);
});
