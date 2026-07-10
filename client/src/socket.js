import { io } from 'socket.io-client';

// Ask the server where to connect. With Azure Web PubSub enabled, clients connect
// to the Web PubSub service endpoint (not this origin); locally we use same-origin.
async function build() {
  let cfg = { webPubSub: false };
  try {
    const res = await fetch('/config');
    if (res.ok) cfg = await res.json();
  } catch {
    // fall back to same-origin Socket.IO
  }

  if (cfg.webPubSub && cfg.endpoint) {
    console.log('[bbdraft] connecting to Web PubSub', cfg.endpoint, cfg.path);
    const s = io(cfg.endpoint, { path: cfg.path, autoConnect: true });
    s.on('connect', () => console.log('[bbdraft] socket connect', s.id));
    s.on('connect_error', (e) => console.log('[bbdraft] connect_error', e.message));
    s.on('disconnect', (r) => console.log('[bbdraft] disconnect', r));
    return s;
  }
  console.log('[bbdraft] connecting same-origin');
  return io({ autoConnect: true });
}

// A promise that resolves to the Socket.IO client instance.
const socketPromise = build();

export default socketPromise;
