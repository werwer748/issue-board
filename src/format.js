const dateFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

export function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
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
