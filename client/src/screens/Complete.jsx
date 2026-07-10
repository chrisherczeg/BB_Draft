import { useMemo } from 'react';

export default function Complete({ state, me, onLeave }) {
  const rostersByOwner = useMemo(() => {
    const map = Object.fromEntries(state.participants.map((p) => [p.id, []]));
    for (const card of state.cards) {
      if (card.revealed && card.ownerId && map[card.ownerId]) {
        map[card.ownerId].push(card.contestant);
      }
    }
    return map;
  }, [state.cards, state.participants]);

  const ordered = useMemo(
    () => state.draftOrder.map((id) => state.participants.find((p) => p.id === id)).filter(Boolean),
    [state.draftOrder, state.participants]
  );

  return (
    <div className="complete">
      <div className="complete__header">
        <h2>Draft complete! 🎉</h2>
        <p className="muted">All {state.totalPicks} houseguests have been drafted.</p>
      </div>

      <div className="complete__grid">
        {ordered.map((p) => (
          <div key={p.id} className={'result' + (p.id === me.id ? ' result--me' : '')}>
            <div className="result__head">
              <span className="result__name">{p.name}</span>
              {p.id === me.id && <span className="tag tag--you">You</span>}
              <span className="roster__count">{rostersByOwner[p.id]?.length || 0}</span>
            </div>
            <div className="result__picks">
              {(rostersByOwner[p.id] || []).map((c) => (
                <div key={c.id} className="result__pick">
                  <img src={`/assets/${c.image}`} alt={c.name} />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="complete__actions">
        <button className="btn btn--ghost" onClick={onLeave}>
          Back to home
        </button>
      </div>
    </div>
  );
}
