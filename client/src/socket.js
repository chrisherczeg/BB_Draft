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
    return io(cfg.endpoint, { path: cfg.path, autoConnect: true });
  }
  return io({ autoConnect: true });
}

// A promise that resolves to the Socket.IO client instance.
const socketPromise = build();

export default socketPromise;
