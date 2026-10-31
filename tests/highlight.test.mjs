import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parseFilters } from '../server/dashboard.mjs';
import { splitHighlight } from '../src/format.js';

const hit = text => ({ text, match: true });
const miss = text => ({ text, match: false });

test('English match ignores case but keeps the original letters', () => {
  assert.deepEqual(splitHighlight('macOS: large Kitty images', 'kITTY'), [
    miss('macOS: large '), hit('Kitty'), miss(' images'),
  ]);
});

test('Korean and Chinese titles are highlighted', () => {
  assert.deepEqual(splitHighlight('이슈 제목 검색 기능', '검색'), [
    miss('이슈 제목 '), hit('검색'), miss(' 기능'),
  ]);
  assert.deepEqual(splitHighlight('使用页面出现我的鼠标轨迹', '鼠标'), [
    miss('使用页面出现我的'), hit('鼠标'), miss('轨迹'),
  ]);
});

test('every repeated match is highlighted', () => {
  assert.deepEqual(splitHighlight('검색 결과에서 검색어 강조', '검색'), [
    hit('검색'), miss(' 결과에서 '), hit('검색'), miss('어 강조'),
  ]);
  assert.deepEqual(splitHighlight('Windows: windows Terminal', 'WINDOWS'), [
    hit('Windows'), miss(': '), hit('windows'), miss(' Terminal'),
  ]);
  assert.deepEqual(splitHighlight('aaaa', 'aa'), [hit('aa'), hit('aa')]);
  assert.deepEqual(splitHighlight('Kitty', 'kitty'), [hit('Kitty')]);
});

test('empty, blank, or lone-hash queries leave the title as is', () => {
  for (const query of ['', '   ', '#', ' # ', undefined, null]) {
    assert.deepEqual(splitHighlight('Add atomic session', query), [miss('Add atomic session')]);
  }
});

test('no match leaves the title as is', () => {
  assert.deepEqual(splitHighlight('Add atomic session', 'kitty'), [miss('Add atomic session')]);
});

test('query is normalized like the server: trim, then drop a leading #', () => {
  assert.deepEqual(splitHighlight('terminal attach omits Kitty images', '  #kitty  '), [
    miss('terminal attach omits '), hit('Kitty'), miss(' images'),
  ]);
  assert.deepEqual(splitHighlight('Issue #12 and 12', '##12'), [
    miss('Issue '), hit('#12'), miss(' and 12'),
  ]);
});

test('regex special characters are treated as plain text', () => {
  const title = 'Fix a.b (c++) [x] $5 a|b \\path ^start? end* {1}';
  for (const query of ['a.b', '(c++)', '[x]', '$5', 'a|b', '\\path', '^start?', 'end*', '{1}']) {
    assert.deepEqual(splitHighlight(title, query).filter(p => p.match), [hit(query)], query);
  }
  // '.'은 아무 글자가 아니라 실제 점에만 일치해야 한다.
  assert.deepEqual(splitHighlight('a.b.c', '.'), [miss('a'), hit('.'), miss('b'), hit('.'), miss('c')]);
  assert.deepEqual(splitHighlight('abc', '.*'), [miss('abc')]);
});

test('letters whose lowercase is longer (İ → i + U+0307) are matched like the server', () => {
  // 일치가 글자 중간에서 끝남: 'i'는 'İ'를 소문자로 바꾼 두 글자 중 앞 글자
  assert.deepEqual(splitHighlight('İstanbul', 'i'), [hit('İ'), miss('stanbul')]);
  assert.deepEqual(splitHighlight('İstanbul', 'I'), [hit('İ'), miss('stanbul')]);
  assert.deepEqual(splitHighlight('İstanbul', 'İ'), [hit('İ'), miss('stanbul')]);
  // 일치가 글자 중간에서 시작함: U+0307은 'İ'를 소문자로 바꾼 두 글자 중 뒤 글자
  assert.deepEqual(splitHighlight('İstanbul', '̇s'), [hit('İs'), miss('tanbul')]);
  // 'İ' 뒤쪽 위치도 원래 제목 위치로 정확히 되돌린다.
  assert.deepEqual(splitHighlight('Go to İstanbul', 'STANBUL'), [miss('Go to İ'), hit('stanbul')]);
  assert.deepEqual(splitHighlight('xİy', 'xi'), [hit('xİ'), miss('y')]);
  // 반복 일치도 글자를 겹치거나 쪼개지 않는다.
  assert.deepEqual(splitHighlight('İİ', 'i'), [hit('İ'), hit('İ')]);
  assert.deepEqual(splitHighlight('İİ', '̇'), [hit('İ'), hit('İ')]);
  // 서버처럼 'istanbul'은 'i̇stanbul'에 포함되지 않는다.
  assert.deepEqual(splitHighlight('İstanbul', 'istanbul'), [miss('İstanbul')]);
});

test('word-final sigma follows the server toLowerCase (Σ → ς)', () => {
  assert.deepEqual(splitHighlight('ΟΔΟΣ', 'ς'), [miss('ΟΔΟ'), hit('Σ')]);
  assert.deepEqual(splitHighlight('ΟΔΟΣ', 'σ'), [miss('ΟΔΟΣ')]);
});

test('highlight agrees with the server title search on every snapshot issue', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../data/snapshot.json', import.meta.url), 'utf8'));
  const titles = [...snapshot.issues.map(issue => issue.title), 'İstanbul', 'Go to İSTANBUL', 'ΟΔΟΣ'];
  for (const query of [
    'kitty', '  Windows ', '#agent', '鼠标', 'PANE', '`', '0.9.5', '544',
    'i', 'İ', 'istanbul', '̇', 'σ', 'ς',
  ]) {
    const normalized = parseFilters(new URLSearchParams({ query })).query;
    for (const title of titles) {
      const parts = splitHighlight(title, query);
      assert.equal(parts.map(p => p.text).join(''), title);
      assert.equal(parts.some(p => p.match), title.toLowerCase().includes(normalized), `${query} / ${title}`);
    }
  }
});
