const { io } = require('./client/node_modules/socket.io-client');

(async () => {
  const base = process.argv[2]; // https://<app>.azurewebsites.net
  const res = await fetch(base + '/config');
  const cfg = await res.json();
  console.log('config:', cfg);
  const url = cfg.webPubSub ? cfg.endpoint : base;
  const opts = cfg.webPubSub ? { path: cfg.path } : {};
  const socket = io(url, opts);

  const done = setTimeout(() => { console.log('TIMEOUT - no ack in 15s'); process.exit(1); }, 15000);

  socket.on('connect', () => console.log('connected, id=', socket.id));
  socket.on('connect_error', (e) => console.log('connect_error:', e.message));
  socket.on('joined', (d) => console.log('joined event:', d.code, d.participant?.name));
  socket.on('state', (s) => console.log('state event: status=', s.status, 'participants=', s.participants.length));

  socket.on('connect', () => {
    socket.emit('createSession', { name: 'NodeTest' }, (ack) => {
      console.log('createSession ack:', ack);
      clearTimeout(done);
      setTimeout(() => process.exit(0), 1500);
    });
  });
})().catch((e) => { console.error('ERR', e); process.exit(1); });
