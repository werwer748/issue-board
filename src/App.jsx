import { useState } from 'react';
import { DEFAULT_FILTERS } from './api.js';
import { useDashboard, useDebounced } from './useDashboard.js';
import Filters from './components/Filters.jsx';
import IssueList from './components/IssueList.jsx';
import LabelStats from './components/LabelStats.jsx';
import Releases from './components/Releases.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  const [source, setSource] = useState('snapshot');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [tab, setTab] = useState('issues');

  // 검색어는 타이핑이 멈춘 뒤 요청한다. 상태·라벨은 바로 반영.
  const query = useDebounced(filters.query, 250);
  const { data, error, loading, stale, retry } = useDashboard({
    source,
    query,
    state: filters.state,
    label: filters.label,
  });

  const updateFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const resetFilters = () => setFilters(DEFAULT_FILTERS);
  const isDirty =
    filters.query !== DEFAULT_FILTERS.query ||
    filters.state !== DEFAULT_FILTERS.state ||
    filters.label !== DEFAULT_FILTERS.label;
  // 요청 진행 중일 때만 스피너. 실패 후 남은 stale 결과는 흐리게만 표시한다.
  const pending = loading || query !== filters.query;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Herdr 이슈 대시보드</h1>
          <p className="muted">{data ? data.repository : 'herdrdev/herdr'} 공개 이슈와 릴리스</p>
        </div>
        <nav className="tabs" role="tablist" aria-label="보기 선택">
          <button role="tab" aria-selected={tab === 'issues'} className={tab === 'issues' ? 'active' : ''} onClick={() => setTab('issues')}>
            이슈
          </button>
          <button role="tab" aria-selected={tab === 'releases'} className={tab === 'releases' ? 'active' : ''} onClick={() => setTab('releases')}>
            릴리스
          </button>
        </nav>
      </header>

      {data?.warning && (
        <div className="banner warning" role="status">
          ⚠️ {data.warning}
        </div>
      )}

      {error && (
        <div className="banner error" role="alert">
          <span>{error}</span>
          <button onClick={retry}>다시 시도</button>
        </div>
      )}

      {!data && !error && <div className="placeholder">불러오는 중…</div>}

      {data && tab === 'issues' && (
        <main className="layout">
          <section className="panel issues-panel" aria-busy={pending}>
            <Filters
              filters={filters}
              labels={data.labels}
              onChange={updateFilter}
              onReset={resetFilters}
              canReset={isDirty}
            />
            <div className="result-bar">
              <span>
                전체 <strong>{data.total}</strong>개 중 <strong>{data.filtered}</strong>개
              </span>
              {pending && <span className="spinner" aria-label="불러오는 중" />}
            </div>
            {/* 하이라이트는 입력 중인 값이 아니라 서버에 보낸 검색어(디바운스된 값) 기준이다. */}
            <IssueList issues={data.issues} query={query} stale={pending || stale} onReset={resetFilters} />
          </section>
          <aside className="panel">
            <LabelStats labelCounts={data.labelCounts} total={data.total} />
          </aside>
        </main>
      )}

      {data && tab === 'releases' && (
        <main>
          <Releases releases={data.releases} />
        </main>
      )}

      <Footer data={data} source={source} onSourceChange={setSource} />
    </div>
  );
}
