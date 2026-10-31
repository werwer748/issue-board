import { readFile } from 'node:fs/promises';

const defaultSnapshotPath = new URL('../data/snapshot.json', import.meta.url);
const compareNames = (left, right) => left.localeCompare(right, 'ko');

export class BadRequest extends Error {}

export function parseFilters(params) {
  const source = params.get('source') ?? 'snapshot';
  const state = params.get('state') ?? 'all';
  if (!['snapshot', 'live'].includes(source)) {
    throw new BadRequest('source must be snapshot or live');
  }
  if (!['all', 'open', 'closed'].includes(state)) {
    throw new BadRequest('state must be all, open, or closed');
  }
  return {
    source,
    state,
    query: (params.get('query') ?? '').trim().replace(/^#/, '').toLowerCase(),
    label: params.get('label') ?? 'all',
  };
}

function labelNames(issue) {
  return [...new Set((issue.labels ?? []).map(label =>
    typeof label === 'string' ? label : label.name,
  ))];
}

export function filterDashboard(data, { query = '', state = 'all', label = 'all' } = {}) {
  const counts = new Map();
  const labels = new Set();
  const issues = [];
  for (const issue of data.issues) {
    const names = labelNames(issue);
    for (const name of names) labels.add(name);
    for (const name of names.length ? names : ['라벨 없음']) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const matchesQuery = !query || issue.title.toLowerCase().includes(query)
      || String(issue.number).includes(query);
    const matchesState = state === 'all' || issue.state === state;
    const matchesLabel = label === 'all' || (label === '__unlabelled__'
      ? names.length === 0 : names.includes(label));
    if (matchesQuery && matchesState && matchesLabel) issues.push(issue);
  }
  return {
    ...data,
    warning: data.warning ?? null,
    issues,
    total: data.issues.length,
    filtered: issues.length,
    labels: [...labels].sort(compareNames),
    labelCounts: [...counts].map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || compareNames(a.name, b.name)),
  };
}

async function loadLive(snapshot, fetchImpl, timeoutMs) {
  const baseUrl = `https://api.github.com/repos/${snapshot.repository}`;
  const signal = AbortSignal.timeout(timeoutMs);
  const get = async path => {
    const response = await fetchImpl(`${baseUrl}/${path}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'issue-board' },
      signal,
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid GitHub response');
    return data;
  };
  const [entries, releases] = await Promise.all([
    get('issues?state=all&per_page=30'),
    get('releases?per_page=3'),
  ]);
  const issues = entries.filter(issue => !issue.pull_request);
  if (issues.some(issue => typeof issue.title !== 'string'
    || !Number.isInteger(issue.number) || !['open', 'closed'].includes(issue.state)
    || !Array.isArray(issue.labels)
    || issue.labels.some(label => typeof label !== 'string'
      && (!label || typeof label.name !== 'string')))) {
    throw new Error('Invalid GitHub issues');
  }
  return {
    ...snapshot,
    capturedAt: new Date().toISOString(),
    source: 'live',
    warning: null,
    issues,
    releases,
  };
}

export async function getDashboard(params, {
  snapshotPath = process.env.SNAPSHOT_PATH ?? defaultSnapshotPath,
  fetchImpl = globalThis.fetch,
  liveTimeoutMs = 5000,
} = {}) {
  // Validate before file or network I/O, including on live requests.
  const filters = parseFilters(params);
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  let data = snapshot;
  if (filters.source === 'live') {
    try {
      data = await loadLive(snapshot, fetchImpl, liveTimeoutMs);
    } catch {
      data = {
        ...snapshot,
        source: 'snapshot-fallback',
        warning: snapshot.warning ?? '실시간 데이터를 가져오지 못해 저장된 스냅샷을 표시합니다.',
      };
    }
  }
  return filterDashboard(data, filters);
}
