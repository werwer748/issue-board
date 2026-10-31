export const DEFAULT_FILTERS = { query: '', state: 'all', label: 'all' };
export const UNLABELLED = '__unlabelled__';

export class ApiError extends Error {}

// 서버가 필터·집계를 모두 처리한다. 프런트는 응답을 그대로 그린다.
export async function fetchDashboard({ source, query, state, label }, signal) {
  const params = new URLSearchParams({ source, query, state, label });
  let res;
  try {
    res = await fetch(`/api/dashboard?${params}`, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('서버에 연결하지 못했습니다.');
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // JSON이 아닌 응답은 아래에서 처리
  }

  if (!res.ok) {
    const detail = body && typeof body.error === 'string' ? body.error : `HTTP ${res.status}`;
    throw new ApiError(`데이터를 불러오지 못했습니다: ${detail}`);
  }
  if (!body || !Array.isArray(body.issues)) {
    throw new ApiError('서버 응답 형식이 올바르지 않습니다.');
  }
  return body;
}
