import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboard } from './api.js';

// 입력이 바뀔 때마다 요청하되, 이전 요청은 취소하고
// 마지막 요청의 응답만 화면에 반영한다(오래된 응답이 최신 입력을 덮어쓰지 않도록).
export function useDashboard(params) {
  const [data, setData] = useState(null);
  // 화면에 있는 data가 어떤 조건의 응답인지 기억해, 요청이 실패해도 이전 결과임을 알 수 있게 한다.
  const [dataKey, setDataKey] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const latestId = useRef(0);

  const { source, query, state, label } = params;
  const key = JSON.stringify([source, query, state, label]);

  useEffect(() => {
    const id = ++latestId.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchDashboard({ source, query, state, label }, controller.signal)
      .then((body) => {
        if (id !== latestId.current) return;
        setData(body);
        setDataKey(key);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError' || id !== latestId.current) return;
        setError(err.message || '알 수 없는 오류가 발생했습니다.');
        setLoading(false);
      });

    return () => controller.abort();
  }, [source, query, state, label, retryKey]);

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  return { data, error, loading, stale: data !== null && dataKey !== key, retry };
}

export function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
