import Label from './Label.jsx';
import { formatDate, splitHighlight } from '../format.js';

function HighlightedTitle({ title, query }) {
  return splitHighlight(title, query).map((part, i) =>
    part.match ? <mark key={i} className="highlight">{part.text}</mark> : part.text,
  );
}

export default function IssueList({ issues, query, stale, onReset }) {
  if (issues.length === 0) {
    return (
      <div className="empty">
        <p>조건에 맞는 이슈가 없습니다.</p>
        <button onClick={onReset}>조건 초기화</button>
      </div>
    );
  }

  return (
    <ul className={`issue-list${stale ? ' stale' : ''}`}>
      {issues.map((issue) => (
        <li key={issue.number} className="issue">
          <span className={`state ${issue.state}`}>{issue.state === 'open' ? '열림' : '닫힘'}</span>
          <div className="issue-body">
            <a href={issue.html_url} target="_blank" rel="noreferrer" className="issue-title">
              <HighlightedTitle title={issue.title} query={query} />
            </a>
            <div className="issue-meta">
              <span className="muted">#{issue.number}</span>
              <span className="muted">{formatDate(issue.created_at)} 작성</span>
              {issue.comments > 0 && <span className="muted">💬 {issue.comments}</span>}
              {issue.labels.map((l) => {
                // live 응답에는 문자열 라벨도 섞여 올 수 있다.
                const name = typeof l === 'string' ? l : l.name;
                return <Label key={name} name={name} color={typeof l === 'string' ? undefined : l.color} />;
              })}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
