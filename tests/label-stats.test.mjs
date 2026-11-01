import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterDashboard } from '../server/dashboard.mjs';
import { issuePercentage, labelBarAriaLabel } from '../src/format.js';

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

test('label bar aria-label names the label, count and percentage', () => {
  assert.equal(labelBarAriaLabel('bug', 5, 12), 'bug: 5개, 전체의 42%');
  assert.equal(labelBarAriaLabel('라벨 없음', 0, 0), '라벨 없음: 0개, 전체의 0%');
});

test('label bar aria-label uses the same percentage as the visible text', () => {
  const data = {
    issues: [
      { number: 1, title: 'First', state: 'open', labels: ['bug', 'api'] },
      { number: 2, title: 'Second', state: 'closed', labels: ['bug'] },
      { number: 3, title: 'Third', state: 'open', labels: [] },
    ],
  };
  const dashboard = filterDashboard(data, { query: 'first' });
  const labels = dashboard.labelCounts.map(({ name, count }) => {
    const label = labelBarAriaLabel(name, count, dashboard.total);
    assert.ok(label.endsWith(`전체의 ${issuePercentage(count, dashboard.total)}%`));
    return label;
  });
  assert.deepEqual(labels, ['bug: 2개, 전체의 67%', '라벨 없음: 1개, 전체의 33%', 'api: 1개, 전체의 33%']);
});
