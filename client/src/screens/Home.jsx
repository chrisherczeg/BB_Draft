import { useState } from 'react';

export default function Home({ onCreate, onJoin }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('menu'); // menu | join

  const trimmedName = name.trim();

  return (
    <div className="home">
      <h1 className="home__title">Big Brother Draft</h1>
      <p className="home__subtitle">Live snake draft · 17 houseguests · pick at your own pace</p>

      <label className="field">
        <span>Your name</span>
        <input
          autoFocus
          value={name}
          maxLength={24}
          placeholder="e.g. Chris"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      {mode === 'menu' && (
        <div className="home__actions">
          <button
            className="btn btn--primary"
            disabled={!trimmedName}
            onClick={() => onCreate(trimmedName)}
          >
            Create a session
          </button>
          <button
            className="btn"
            disabled={!trimmedName}
            onClick={() => setMode('join')}
          >
            Join a session
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="home__join">
          <label className="field">
            <span>Session code</span>
            <input
              value={code}
              maxLength={4}
              placeholder="ABCD"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <div className="home__actions">
            <button
              className="btn btn--primary"
              disabled={!trimmedName || code.trim().length < 4}
              onClick={() => onJoin(code.trim().toUpperCase(), trimmedName)}
            >
              Join
            </button>
            <button className="btn" onClick={() => setMode('menu')}>
              Back
            </button>
          </div>
          <p className="hint">
            Coming back after closing your browser? Enter the same name and code to
            rejoin your spot — even mid-draft.
          </p>
        </div>
      )}
    </div>
  );
}
