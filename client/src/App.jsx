import { useEffect, useState, useCallback } from 'react';
import socket from './socket';
import Home from './screens/Home.jsx';
import Lobby from './screens/Lobby.jsx';
import DraftBoard from './screens/DraftBoard.jsx';
import Complete from './screens/Complete.jsx';

const STORAGE_KEY = 'bbdraft.session';

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export default function App() {
  const [me, setMe] = useState(loadSaved); // { id, token, name, code }
  const [state, setState] = useState(null); // serialized session
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      // Attempt to rejoin an in-progress session after a reload/reconnect.
      const saved = loadSaved();
      if (saved?.code && saved?.token) {
        socket.emit('resume', { code: saved.code, token: saved.token }, (res) => {
          if (!res?.ok) {
            localStorage.removeItem(STORAGE_KEY);
            setMe(null);
            setState(null);
          }
        });
      }
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onJoined({ code, participant }) {
      const next = { ...participant, code };
      setMe(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    function onState(s) {
      setState(s);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('joined', onJoined);
    socket.on('state', onState);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('joined', onJoined);
      socket.off('state', onState);
    };
  }, []);

  const create = useCallback((name) => {
    setError('');
    socket.emit('createSession', { name }, (res) => {
      if (!res?.ok) setError(res?.error || 'Could not create session.');
    });
  }, []);

  const join = useCallback((code, name) => {
    setError('');
    socket.emit('joinSession', { code, name }, (res) => {
      if (!res?.ok) setError(res?.error || 'Could not join session.');
    });
  }, []);

  const startDraft = useCallback(() => {
    setError('');
    socket.emit('startDraft', {}, (res) => {
      if (!res?.ok) setError(res?.error || 'Could not start draft.');
    });
  }, []);

  const pickCard = useCallback((position) => {
    setError('');
    socket.emit('pickCard', { position }, (res) => {
      if (!res?.ok) setError(res?.error || 'Could not pick that card.');
    });
  }, []);

  const leave = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMe(null);
    setState(null);
    setError('');
  }, []);

  const banner = (
    <>
      {!connected && <div className="banner banner--warn">Reconnecting…</div>}
      {error && (
        <div className="banner banner--error" onClick={() => setError('')}>
          {error} <span className="banner__dismiss">✕</span>
        </div>
      )}
    </>
  );

  if (!me || !state) {
    return (
      <div className="app">
        {banner}
        <Home onCreate={create} onJoin={join} />
      </div>
    );
  }

  return (
    <div className="app">
      {banner}
      {state.status === 'lobby' && (
        <Lobby state={state} me={me} onStart={startDraft} onLeave={leave} />
      )}
      {state.status === 'drafting' && (
        <DraftBoard state={state} me={me} onPick={pickCard} />
      )}
      {state.status === 'complete' && (
        <Complete state={state} me={me} onLeave={leave} />
      )}
    </div>
  );
}
