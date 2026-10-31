const dateFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

export function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
}

// 제목을 검색어와 일치하는 조각/아닌 조각으로 나눈다. 원래 글자(대소문자 포함)는 그대로 둔다.
// 찾는 방식은 서버(server/dashboard.mjs)와 같다: 검색어는 앞뒤 공백 제거 → 맨 앞 # 제거 → 소문자,
// 제목은 toLowerCase()한 문자열에서 부분 문자열로 찾는다. 특수문자는 일반 글자로 취급된다.
export function splitHighlight(text, query) {
  const needle = String(query ?? '').trim().replace(/^#/, '').toLowerCase();
  if (!needle) return [{ text, match: false }];

  // 소문자로 바꾸면 길이가 달라지는 글자가 있다(İ → i + U+0307).
  // 소문자 문자열의 각 위치가 원래 제목의 어느 글자(시작~끝)에서 왔는지 기록한다.
  const lower = text.toLowerCase();
  const charStart = [];
  const charEnd = [];
  let at = 0;
  for (const ch of text) {
    for (let k = ch.toLowerCase().length; k > 0; k--) {
      charStart.push(at);
      charEnd.push(at + ch.length);
    }
    at += ch.length;
  }

  const parts = [];
  let done = 0; // 원래 제목에서 여기까지 조각으로 나눴다
  let from = 0; // 소문자 문자열에서 다음에 찾을 위치
  for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, from)) {
    // 일치가 글자 중간에서 시작하거나 끝나면 그 원래 글자 전체를 강조한다.
    const start = charStart[i];
    const end = charEnd[i + needle.length - 1];
    if (start > done) parts.push({ text: text.slice(done, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    done = end;
    // 이미 강조한 글자의 나머지 부분에서는 다시 찾지 않는다.
    from = i + needle.length;
    while (from < lower.length && charStart[from] < end) from++;
  }
  if (done < text.length) parts.push({ text: text.slice(done), match: false });
  return parts;
}

// 릴리스 본문(markdown)에서 앞쪽 항목 몇 줄만 평문으로 뽑는다.
export function summarize(body, max = 4) {
  const lines = String(body ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) =>
      l
        .replace(/^[-*]\s+/, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`|\*\*/g, ''),
    );
  return lines.length > max ? [...lines.slice(0, max), `외 ${lines.length - max}개 항목`] : lines;
}
