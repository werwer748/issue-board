import { formatDate, summarize } from '../format.js';

export default function Releases({ releases = [] }) {
  if (releases.length === 0) {
    return <div className="panel empty"><p>표시할 릴리스가 없습니다.</p></div>;
  }
  return (
    <ul className="releases">
      {releases.map((r) => (
        <li key={r.tag_name} className="panel release">
          <div className="release-head">
            <a href={r.html_url} target="_blank" rel="noreferrer">
              <h2>{r.name || r.tag_name}</h2>
            </a>
            <span className="muted">{formatDate(r.published_at)}</span>
          </div>
          <ul className="release-summary">
            {summarize(r.body).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <a href={r.html_url} target="_blank" rel="noreferrer" className="small">
            전체 변경 내용 보기 ↗
          </a>
        </li>
      ))}
    </ul>
  );
}
