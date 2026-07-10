import { useEffect, useState, useCallback, useRef } from 'react';
import socketPromise from './socket';
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
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    let socket;
    let cleanup = () => {};

    function onConnect() {
      setConnected(true);
      // Attempt to rejoin an in-progress session after a reload/reconnect.
      const saved = loadSaved();
      if (saved?.code && saved?.token && socket) {
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
      console.log('[bbdraft] onJoined', code);
      const next = { ...participant, code };
      setMe(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    function onState(s) {
      console.log('[bbdraft] onState', s.status);
      setState(s);
    }

    socketPromise.then((s) => {
      socket = s;
      socketRef.current = s;
      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      s.on('joined', onJoined);
      s.on('state', onState);
      setConnected(s.connected);
      if (s.connected) onConnect();
      cleanup = () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.off('joined', onJoined);
        s.off('state', onState);
      };
    });

    return () => cleanup();
  }, []);

  const create = useCallback((name) => {
    setError('');
    console.log('[bbdraft] emit createSession, socket?', !!socketRef.current, socketRef.current?.connected);
    socketRef.current?.emit('createSession', { name }, (res) => {
      console.log('[bbdraft] createSession ack', res);
      if (!res?.ok) setError(res?.error || 'Could not create session.');
    });
  }, []);

  const join = useCallback((code, name) => {
    setError('');
    socketRef.current?.emit('joinSession', { code, name }, (res) => {
      if (!res?.ok) setError(res?.error || 'Could not join session.');
    });
  }, []);

  const startDraft = useCallback(() => {
    setError('');
    socketRef.current?.emit('startDraft', {}, (res) => {
      if (!res?.ok) setError(res?.error || 'Could not start draft.');
    });
  }, []);

  const pickCard = useCallback((position) => {
    setError('');
    socketRef.current?.emit('pickCard', { position }, (res) => {
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
