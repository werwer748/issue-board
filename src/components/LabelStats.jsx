const TOP = 10;

// 서버의 labelCounts(전체 데이터 기준, 정렬 완료)를 그대로 표시한다.
export default function LabelStats({ labelCounts = [], total }) {
  const items = labelCounts.slice(0, TOP);
  const max = items[0]?.count || 1;

  return (
    <section className="label-stats">
      <h2>라벨별 이슈</h2>
      <p className="muted small">전체 {total}개 이슈 기준 · 상위 {Math.min(TOP, labelCounts.length)}개 · 검색·필터와 무관</p>
      {items.length === 0 ? (
        <p className="muted">라벨 데이터가 없습니다.</p>
      ) : (
        <ol>
          {items.map(({ name, count }) => (
            <li key={name}>
              <div className="stat-row">
                <span>{name}</span>
                <span className="count">{count}</span>
              </div>
              <div className="bar">
                <span style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="muted small">한 이슈에 라벨이 여러 개면 각 라벨에 모두 포함됩니다.</p>
    </section>
  );
}
