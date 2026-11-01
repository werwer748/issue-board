import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterDashboard } from '../server/dashboard.mjs';
import { issuePercentage } from '../src/format.js';

for (const [count, total, expected] of [
  [5, 12, 42],
  [1, 3, 33],
  [1, 8, 13],
  [0, 26, 0],
  [26, 26, 100],
  [0, 0, 0],
  [5, 0, 0],
]) {
  test(`${count} of ${total} issues rounds to ${expected}%`, () => {
    assert.equal(issuePercentage(count, total), expected);
  });
}

test('label percentages use all issues, including unlabelled issues, regardless of filters', () => {
  const data = {
    issues: [
      { number: 1, title: 'First', state: 'open', labels: ['bug', 'api'] },
      { number: 2, title: 'Second', state: 'closed', labels: ['bug'] },
      { number: 3, title: 'Third', state: 'open', labels: [] },
    ],
  };
  for (const filters of [{}, { query: 'first', state: 'open', label: 'api' }, { query: 'missing' }]) {
    const dashboard = filterDashboard(data, filters);
    const percentages = Object.fromEntries(dashboard.labelCounts.map(({ name, count }) => [
      name, issuePercentage(count, dashboard.total),
    ]));
    assert.deepEqual(percentages, { bug: 67, api: 33, '라벨 없음': 33 });
  }
});
