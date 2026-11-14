import { ITINERARY, describe, isSameSelection, type Selection } from '../data/derive';

interface Props {
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onClose: () => void;
}

export function SelectionDetail({ selection, onSelect, onClose }: Props) {
  const { color, label, title, body, href } = describe(selection);
  const i = ITINERARY.findIndex((s) => isSameSelection(s, selection));
  const prev = ITINERARY[i - 1];
  const next = ITINERARY[i + 1];

  return (
    <div className="detail">
      <div className="detail-top">
        <div className="label" style={{ color }}>{label}</div>
        <button className="close-btn" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      <div className="detail-actions">
        {href && <a href={href} target="_blank" rel="noopener">Open in Google Maps ↗</a>}
        <button className="text-btn" disabled={!prev} onClick={() => prev && onSelect(prev)}>‹ Prev</button>
        <button className="text-btn" disabled={!next} onClick={() => next && onSelect(next)}>Next ›</button>
      </div>
    </div>
  );
}
