// GitHub 라벨 색상에 맞춰 글자색(검정/흰색)을 고른다.
function textColor(hex) {
  const n = parseInt(hex, 16);
  if (Number.isNaN(n) || hex.length !== 6) return '#111';
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111' : '#fff';
}

export default function Label({ name, color }) {
  const hex = /^[0-9a-f]{6}$/i.test(color || '') ? color : 'd0d7de';
  return (
    <span className="label" style={{ background: `#${hex}`, color: textColor(hex) }}>
      {name}
    </span>
  );
}
