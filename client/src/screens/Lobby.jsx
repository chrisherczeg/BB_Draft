export default function Lobby({ state, me, onStart, onLeave }) {
  const isLeader = state.leaderId === me.id;

  return (
    <div className="lobby">
      <div className="lobby__header">
        <div>
          <h2>Lobby</h2>
          <p className="muted">Waiting for the leader to start the draft.</p>
        </div>
        <div className="code-card">
          <span className="muted">Session code</span>
          <strong className="code-card__code">{state.code}</strong>
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">
          Drafters ({state.participants.length}/{state.maxParticipants})
        </div>
        <ul className="players">
          {state.participants.map((p) => (
            <li key={p.id} className="players__item">
              <span className={`dot ${p.connected ? 'dot--on' : 'dot--off'}`} />
              <span>{p.name}</span>
              {p.id === state.leaderId && <span className="tag">Leader</span>}
              {p.id === me.id && <span className="tag tag--you">You</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="lobby__actions">
        {isLeader ? (
          <button className="btn btn--primary" onClick={onStart}>
            Start draft
          </button>
        ) : (
          <p className="muted">Only the leader can start the draft.</p>
        )}
        <button className="btn btn--ghost" onClick={onLeave}>
          Leave
        </button>
      </div>
      <p className="hint">
        Once started, the draft order is randomized and no one else can join.
      </p>
    </div>
  );
}
