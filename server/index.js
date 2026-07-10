const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const { SessionStore } = require('./sessionStore');

const PORT = process.env.PORT || 3001;
const app = express();
const server = http.createServer(app);

// Serve the contestant images and (in production) the built React client.
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

// Optionally offload connections to Azure Web PubSub for Socket.IO (free tier: 20 conns).
// Enabled only when a connection string is provided, so local dev needs no Azure resource.
const WPS_HUB = process.env.WEBPUBSUB_HUB || 'bbdraft';
let webPubSubEndpoint = null;
if (process.env.WEBPUBSUB_CONNECTION_STRING) {
  try {
    const { useAzureSocketIO } = require('@azure/web-pubsub-socket.io');
    useAzureSocketIO(io, {
      hub: WPS_HUB,
      connectionString: process.env.WEBPUBSUB_CONNECTION_STRING,
    });
    const match = /Endpoint=([^;]+)/i.exec(process.env.WEBPUBSUB_CONNECTION_STRING);
    if (match) webPubSubEndpoint = match[1].replace(/\/+$/, '');
    console.log('Azure Web PubSub for Socket.IO enabled.');
  } catch (err) {
    console.warn('Failed to enable Azure Web PubSub, falling back to direct Socket.IO:', err.message);
    webPubSubEndpoint = null;
  }
}

// Tells the client where to open its Socket.IO connection.
// With Web PubSub, clients connect to the service endpoint, not this server.
app.get('/config', (req, res) => {
  if (webPubSubEndpoint) {
    res.json({ webPubSub: true, endpoint: webPubSubEndpoint, path: `/clients/socketio/hubs/${WPS_HUB}` });
  } else {
    res.json({ webPubSub: false });
  }
});

const store = new SessionStore();

function roomOf(code) {
  return `session:${code}`;
}

function broadcast(session) {
  io.to(roomOf(session.code)).emit('state', store.serialize(session));
}
store.setBroadcaster(broadcast);

io.on('connection', (socket) => {
  let ctx = null; // { code, participantId }

  function attachTo(session, participant) {
    ctx = { code: session.code, participantId: participant.id };
    socket.join(roomOf(session.code));
    participant.connected = true;
    socket.emit('joined', {
      code: session.code,
      participant: { id: participant.id, token: participant.token, name: participant.name },
    });
    broadcast(session);
  }

  socket.on('createSession', ({ name }, cb = () => {}) => {
    const { session, participant } = store.createSession(name);
    attachTo(session, participant);
    cb({ ok: true, code: session.code });
  });

  socket.on('joinSession', ({ code, name }, cb = () => {}) => {
    const result = store.joinSession(String(code || '').toUpperCase(), name);
    if (result.error) return cb({ ok: false, error: result.error });
    attachTo(result.session, result.participant);
    cb({ ok: true, code: result.session.code });
  });

  socket.on('resume', ({ code, token }, cb = () => {}) => {
    const found = store.findByToken(String(code || '').toUpperCase(), token);
    if (!found) return cb({ ok: false, error: 'Could not rejoin session.' });
    attachTo(found.session, found.participant);
    cb({ ok: true, code: found.session.code });
  });

  socket.on('startDraft', (_payload, cb = () => {}) => {
    if (!ctx) return cb({ ok: false, error: 'Not in a session.' });
    const result = store.startDraft(ctx.code, ctx.participantId);
    if (result.error) return cb({ ok: false, error: result.error });
    broadcast(result.session);
    cb({ ok: true });
  });

  socket.on('pickCard', ({ position }, cb = () => {}) => {
    if (!ctx) return cb({ ok: false, error: 'Not in a session.' });
    const result = store.pickCard(ctx.code, ctx.participantId, position);
    if (result.error) return cb({ ok: false, error: result.error });
    broadcast(result.session);
    cb({ ok: true });
  });

  socket.on('disconnect', () => {
    if (!ctx) return;
    const session = store.get(ctx.code);
    if (!session) return;
    const participant = session.participants.find((p) => p.id === ctx.participantId);
    if (participant) participant.connected = false;
    broadcast(session);
  });
});

// SPA fallback: let the client router handle non-API routes.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(200).send('BB Draft server is running. Build the client to serve the UI.');
  });
});

server.listen(PORT, () => {
  console.log(`BB Draft server listening on http://localhost:${PORT}`);
});
