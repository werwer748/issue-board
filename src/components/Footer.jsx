const SOURCE_LABEL = {
  snapshot: '스냅숏',
  live: '실시간',
  'snapshot-fallback': '스냅숏(실시간 실패로 대체)',
};

export default function Footer({ data, source, onSourceChange }) {
  return (
    <footer className="app-footer">
      <label>
        데이터{' '}
        <select value={source} onChange={(e) => onSourceChange(e.target.value)}>
          <option value="snapshot">스냅숏</option>
          <option value="live">실시간</option>
        </select>
      </label>
      {data && (
        <>
          <span>기준 시각: {data.capturedAt}</span>
          <span>
            출처:{' '}
            {/^https?:\/\//.test(data.source) ? (
              <a href={data.source} target="_blank" rel="noreferrer">{data.source}</a>
            ) : (
              SOURCE_LABEL[data.source] || data.source
            )}
          </span>
          {data.scope && <span>범위: {data.scope}</span>}
        </>
      )}
    </footer>
  );
}
