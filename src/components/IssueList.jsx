import Label from './Label.jsx';
import { formatDate } from '../format.js';

export default function IssueList({ issues, stale, onReset }) {
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
              {issue.title}
            </a>
            <div className="issue-meta">
              <span className="muted">#{issue.number}</span>
              <span className="muted">{formatDate(issue.created_at)} 작성</span>
              {issue.comments > 0 && <span className="muted">💬 {issue.comments}</span>}
              {issue.labels.map((l) => (
                <Label key={l.name} name={l.name} color={l.color} />
              ))}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
