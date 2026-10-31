import { UNLABELLED } from '../api.js';

export default function Filters({ filters, labels = [], onChange, onReset, canReset }) {
  // 선택한 라벨이 목록에 없더라도(예: 데이터 소스 변경) 선택값은 보이도록 유지
  const options = labels.includes(filters.label) || filters.label === 'all' || filters.label === UNLABELLED
    ? labels
    : [...labels, filters.label];

  return (
    <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
      <label className="field grow">
        <span className="sr-only">제목 또는 번호 검색</span>
        <input
          type="search"
          placeholder="제목 또는 #번호 검색"
          value={filters.query}
          onChange={(e) => onChange('query', e.target.value)}
        />
      </label>
      <label className="field">
        <span className="sr-only">상태</span>
        <select value={filters.state} onChange={(e) => onChange('state', e.target.value)}>
          <option value="all">모든 상태</option>
          <option value="open">열림</option>
          <option value="closed">닫힘</option>
        </select>
      </label>
      <label className="field">
        <span className="sr-only">라벨</span>
        <select value={filters.label} onChange={(e) => onChange('label', e.target.value)}>
          <option value="all">모든 라벨</option>
          <option value={UNLABELLED}>라벨 없음</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="secondary" onClick={onReset} disabled={!canReset}>
        초기화
      </button>
    </form>
  );
}
