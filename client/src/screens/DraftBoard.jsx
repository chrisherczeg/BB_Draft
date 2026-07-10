import { useEffect, useState, useMemo, useRef } from 'react';

// Plays assets/bb_draft_sound.mp3 every time the active drafter switches.
// Missing file = silent no-op.
function useTurnSound(currentPickerId) {
  const audioRef = useRef(null);
  const prevPickerRef = useRef(null);
  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio('/assets/bb_draft_sound.mp3');
    audioRef.current.preload = 'auto';
  }
  useEffect(() => {
    const picker = currentPickerId;
    const changed = picker && picker !== prevPickerRef.current;
    if (changed && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    prevPickerRef.current = picker;
  }, [currentPickerId]);
}

function useCountdown(deadline) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export default function DraftBoard({ state, me, onPick }) {
  const seconds = useCountdown(state.turnDeadline);
  useTurnSound(state.currentPickerId);
  const nameById = useMemo(
    () => Object.fromEntries(state.participants.map((p) => [p.id, p.name])),
    [state.participants]
  );

  const isMyTurn = state.currentPickerId === me.id;
  const pickerName = nameById[state.currentPickerId] || '—';

  // Group revealed picks by owner, following the draft order.
  const rostersByOwner = useMemo(() => {
    const map = Object.fromEntries(state.participants.map((p) => [p.id, []]));
    for (const card of state.cards) {
      if (card.revealed && card.ownerId && map[card.ownerId]) {
        map[card.ownerId].push(card.contestant);
      }
    }
    return map;
  }, [state.cards, state.participants]);

  const orderedParticipants = useMemo(
    () => state.draftOrder.map((id) => state.participants.find((p) => p.id === id)).filter(Boolean),
    [state.draftOrder, state.participants]
  );

  return (
    <div className="draft">
      <div className="draft__status">
        <div>
          <span className="muted">Pick {state.pickCount + 1} of {state.totalPicks}</span>
          <h2 className={isMyTurn ? 'turn turn--mine' : 'turn'}>
            {isMyTurn ? 'Your pick!' : `${pickerName}'s pick`}
          </h2>
        </div>
        <div className={`timer ${seconds !== null && seconds <= 10 ? 'timer--low' : ''}`}>
          <span className="timer__num">{seconds ?? '—'}</span>
          <span className="timer__label">sec</span>
        </div>
      </div>

      <div className="draft__body">
        <section className="board">
          <div className="board__grid">
            {state.cards.map((card) => {
              const takenByMe = card.ownerId === me.id;
              const disabled = !isMyTurn || card.revealed;
              return (
                <button
                  key={card.position}
                  className={
                    'card' +
                    (card.revealed ? ' card--revealed' : '') +
                    (isMyTurn && !card.revealed ? ' card--pickable' : '') +
                    (takenByMe ? ' card--mine' : '')
                  }
                  disabled={disabled}
                  onClick={() => !disabled && onPick(card.position)}
                  title={card.revealed ? card.contestant?.name : 'Face-down card'}
                >
                  {card.revealed && card.contestant ? (
                    <>
                      <img
                        className="card__img"
                        src={`/assets/${card.contestant.image}`}
                        alt={card.contestant.name}
                      />
                      <span className="card__name">{card.contestant.name}</span>
                      <span className="card__owner">
                        {nameById[card.ownerId]}{card.auto ? ' (auto)' : ''}
                      </span>
                    </>
                  ) : (
                    <span className="card__back">BB</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="rosters">
          <div className="panel__title">Rosters</div>
          {orderedParticipants.map((p) => (
            <div
              key={p.id}
              className={
                'roster' +
                (p.id === state.currentPickerId ? ' roster--active' : '') +
                (p.id === me.id ? ' roster--me' : '')
              }
            >
              <div className="roster__head">
                <span className={`dot ${p.connected ? 'dot--on' : 'dot--off'}`} />
                <span className="roster__name">{p.name}</span>
                {p.id === me.id && <span className="tag tag--you">You</span>}
                <span className="roster__count">{rostersByOwner[p.id]?.length || 0}</span>
              </div>
              <ul className="roster__picks">
                {(rostersByOwner[p.id] || []).map((c) => (
                  <li key={c.id} className="roster__pick">
                    <img
                      className="roster__thumb"
                      src={`/assets/${c.image}`}
                      alt={c.name}
                      title={c.name}
                    />
                    <span className="roster__pick-name">{c.name}</span>
                  </li>
                ))}
                {(rostersByOwner[p.id]?.length || 0) === 0 && (
                  <li className="muted small">No picks yet</li>
                )}
              </ul>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
