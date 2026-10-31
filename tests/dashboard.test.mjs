import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createApiServer } from '../server/index.mjs';

const snapshotPath = process.env.SNAPSHOT_PATH ?? new URL('../data/snapshot.json', import.meta.url);
let snapshot;
let api;
let base;

async function start(t, options) {
  const server = createApiServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

async function request(baseUrl, query = '', options) {
  const response = await fetch(`${baseUrl}/api/dashboard${query}`, options);
  return { response, body: await response.json() };
}

before(async () => {
  snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  api = createApiServer({ snapshotPath, fetchImpl: () => { throw new Error('offline'); } });
  api.listen(0, '127.0.0.1');
  await once(api, 'listening');
  base = `http://127.0.0.1:${api.address().port}`;
});

after(() => api && new Promise(resolve => api.close(resolve)));

test('default response uses all 26 real issues and preserves snapshot metadata', async () => {
  const { response, body } = await request(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(body.total, 26);
  assert.equal(body.filtered, 26);
  assert.deepEqual(body.issues, snapshot.issues);
  for (const key of ['repository', 'capturedAt', 'source', 'scope', 'releases']) {
    assert.deepEqual(body[key], snapshot[key]);
  }
  assert.equal(body.warning, null);
  assert.deepEqual(body.labels, [
    'agent-detection', 'api', 'bug', 'duplicate', 'feature-req', 'input',
    'integrations', 'kitty-protocol', 'linux', 'macos', 'maintainer-needed',
    'p1', 'p2', 'performance', 'remote', 'rendering', 'sessions', 'triaged', 'ui', 'windows',
  ]);
  assert.deepEqual(body.labelCounts.slice(0, 5), [
    { name: 'triaged', count: 14 }, { name: 'p2', count: 12 },
    { name: 'duplicate', count: 8 }, { name: 'input', count: 8 }, { name: 'macos', count: 7 },
  ]);
});

for (const [query, numbers] of [
  ['?query=%20kItTy%20', [5442, 5408, 5398]],
  ['?query=%20%235441%20', [5441]],
  ['?query=544', [5442, 5441]],
  ['?query=鼠标', [5396]],
  ['?query=windows&state=open&label=sessions', [5434, 5391]],
  ['?query=windows&state=closed&label=sessions', []],
  ['?label=unknown-label', []],
  ['?label=__unlabelled__', []],
  ['?query=no-such-issue-at-all', []],
]) {
  test(`filter ${query} keeps global totals and label statistics`, async () => {
    const { response, body } = await request(base, query);
    const { body: all } = await request(base);
    assert.equal(response.status, 200);
    assert.deepEqual(body.issues.map(issue => issue.number), numbers);
    assert.equal(body.filtered, numbers.length);
    assert.equal(body.total, 26);
    assert.deepEqual(body.labels, all.labels);
    assert.deepEqual(body.labelCounts, all.labelCounts);
    assert.deepEqual(body.releases, all.releases);
  });
}

for (const [state, count] of [['open', 12], ['closed', 14], ['all', 26]]) {
  test(`state=${state}`, async () => {
    const { body } = await request(base, `?state=${state}`);
    assert.equal(body.filtered, count);
    assert.ok(body.issues.every(issue => state === 'all' || issue.state === state));
  });
}

test('empty search and a lone hash match all issues', async () => {
  for (const query of ['?query=', '?query=%20%20', '?query=%23']) {
    const { body } = await request(base, query);
    assert.equal(body.filtered, 26);
  }
});

test('invalid state and source return JSON 400 before loading data', async t => {
  const url = await start(t, { snapshotPath: '/missing/snapshot.json' });
  for (const query of ['?state=invalid', '?state=OPEN', '?state=', '?source=invalid', '?source=live&state=invalid']) {
    const { response, body } = await request(url, query);
    assert.equal(response.status, 400);
    assert.equal(typeof body.error, 'string');
  }
});

test('unsupported methods return 405 with Allow: GET', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
    const response = await fetch(`${base}/api/dashboard`, { method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET');
    if (method !== 'HEAD') assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('unknown paths return JSON 404', async () => {
  const response = await fetch(`${base}/api/unknown`);
  assert.equal(response.status, 404);
  assert.equal(typeof (await response.json()).error, 'string');
});

test('snapshot read failures return JSON 500 without leaking paths', async t => {
  const url = await start(t, { snapshotPath: '/missing/private/snapshot.json' });
  const { response, body } = await request(url);
  assert.equal(response.status, 500);
  assert.deepEqual(body, { error: 'Unable to load dashboard' });
});

test('live network failure falls back to snapshot and applies the same filters', async () => {
  const { response, body } = await request(base, '?source=live&query=%235441&state=closed&label=api');
  assert.equal(response.status, 200);
  assert.equal(body.source, 'snapshot-fallback');
  assert.ok(body.warning);
  assert.equal(body.total, 26);
  assert.equal(body.filtered, 1);
  assert.equal(body.issues[0].number, 5441);
  assert.equal(body.capturedAt, snapshot.capturedAt);
  assert.deepEqual(body.releases, snapshot.releases);
});

for (const [name, fetchImpl] of [
  ['HTTP error', async () => new Response('{}', { status: 403 })],
  ['malformed JSON', async () => new Response('{')],
  ['wrong response shape', async () => Response.json({ message: 'bad data' })],
  ['invalid issue', async () => Response.json([{ number: 1, title: null }])],
  ['timeout', async (_url, { signal }) => {
    await new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  }],
]) {
  test(`live ${name} returns snapshot fallback`, async t => {
    const url = await start(t, { snapshotPath, fetchImpl, liveTimeoutMs: 20 });
    const { response, body } = await request(url, '?source=live');
    assert.equal(response.status, 200);
    assert.equal(body.source, 'snapshot-fallback');
    assert.ok(body.warning);
    assert.deepEqual(body.issues, snapshot.issues);
  });
}

test('live data excludes PRs, deduplicates labels, counts unlabelled issues, and filters', async t => {
  const liveIssues = [
    { number: 1, title: 'First issue', state: 'open', labels: [{ name: 'bug' }, { name: 'bug' }] },
    { number: 2, title: 'Second issue', state: 'closed', labels: [] },
    { number: 3, title: 'Third issue', state: 'open', labels: ['api'] },
    { number: 4, title: 'Pull request', state: 'open', labels: ['pr-only'], pull_request: {} },
  ];
  const releases = [{ tag_name: 'v-next' }];
  const urls = [];
  const url = await start(t, {
    snapshotPath,
    fetchImpl: async (url, options) => {
      urls.push(url);
      assert.ok(options.signal);
      return Response.json(url.includes('/issues?') ? liveIssues : releases);
    },
  });
  const { response, body } = await request(url, '?source=live&label=__unlabelled__&state=closed&query=SECOND');
  assert.equal(response.status, 200);
  assert.equal(body.source, 'live');
  assert.equal(body.warning, null);
  assert.equal(body.repository, snapshot.repository);
  assert.equal(body.scope, snapshot.scope);
  assert.ok(Number.isFinite(Date.parse(body.capturedAt)));
  assert.equal(body.total, 3);
  assert.equal(body.filtered, 1);
  assert.deepEqual(body.issues, [liveIssues[1]]);
  assert.deepEqual(body.labels, ['api', 'bug']);
  assert.deepEqual(body.labelCounts, [
    { name: '라벨 없음', count: 1 }, { name: 'api', count: 1 }, { name: 'bug', count: 1 },
  ]);
  assert.deepEqual(body.releases, releases);
  assert.deepEqual(urls, [
    `https://api.github.com/repos/${snapshot.repository}/issues?state=all&per_page=30`,
    `https://api.github.com/repos/${snapshot.repository}/releases?per_page=3`,
  ]);
});

test('snapshot warnings are preserved, including during fallback', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'issue-board-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'snapshot.json');
  await writeFile(path, JSON.stringify({ ...snapshot, warning: 'Existing warning' }));
  const url = await start(t, { snapshotPath: path, fetchImpl: () => { throw new Error('offline'); } });
  for (const query of ['', '?source=live']) {
    const { body } = await request(url, query);
    assert.equal(body.warning, 'Existing warning');
  }
});
