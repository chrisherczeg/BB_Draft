const roster = require('./data/roster');

const MAX_PARTICIPANTS = 16;
const TURN_SECONDS = Number(process.env.TURN_SECONDS) || 60;
const TOTAL_PICKS = roster.length; // 17

function randomId(len = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * In-memory session store + snake draft engine.
 * The server is the source of truth for all state and the turn timer.
 */
class SessionStore {
  constructor() {
    this.sessions = new Map(); // code -> session
    this.broadcast = () => {}; // set by index.js: (session) => void
  }

  setBroadcaster(fn) {
    this.broadcast = fn;
  }

  generateCode() {
    let code;
    do {
      code = randomId(4).toUpperCase();
    } while (this.sessions.has(code));
    return code;
  }

  get(code) {
    return this.sessions.get(code);
  }

  createSession(name) {
    const code = this.generateCode();
    const participant = this._makeParticipant(name);
    const session = {
      code,
      leaderId: participant.id,
      participants: [participant],
      status: 'lobby', // lobby | drafting | complete
      draftOrder: [],
      cards: [],
      pickCount: 0,
      turnDeadline: null,
      _timer: null,
    };
    this.sessions.set(code, session);
    return { session, participant };
  }

  joinSession(code, name) {
    const session = this.sessions.get(code);
    if (!session) return { error: 'Session not found.' };
    if (session.status !== 'lobby') return { error: 'This draft has already started.' };
    if (session.participants.length >= MAX_PARTICIPANTS) {
      return { error: 'This session is full (16 max).' };
    }
    const participant = this._makeParticipant(name);
    session.participants.push(participant);
    return { session, participant };
  }

  _makeParticipant(name) {
    const clean = String(name || '').trim().slice(0, 24) || 'Player';
    return {
      id: randomId(10),
      token: randomId(24),
      name: clean,
      connected: true,
    };
  }

  findByToken(code, token) {
    const session = this.sessions.get(code);
    if (!session) return null;
    const participant = session.participants.find((p) => p.token === token);
    if (!participant) return null;
    return { session, participant };
  }

  startDraft(code, participantId) {
    const session = this.sessions.get(code);
    if (!session) return { error: 'Session not found.' };
    if (session.leaderId !== participantId) return { error: 'Only the session leader can start the draft.' };
    if (session.status !== 'lobby') return { error: 'Draft already started.' };
    if (session.participants.length < 1) return { error: 'Need at least one drafter.' };

    // Randomize the snake draft order.
    session.draftOrder = shuffle(session.participants.map((p) => p.id));

    // Shuffle the roster into 17 face-down card positions (identity hidden until picked).
    const shuffledRoster = shuffle(roster);
    session.cards = shuffledRoster.map((contestant, position) => ({
      position,
      contestantId: contestant.id,
      revealed: false,
      ownerId: null,
    }));

    session.status = 'drafting';
    session.pickCount = 0;
    this._beginTurn(session);
    return { session };
  }

  /** Returns the participant id whose turn it currently is (snake order). */
  currentPickerId(session) {
    const n = session.draftOrder.length;
    if (n === 0) return null;
    const round = Math.floor(session.pickCount / n);
    const posInRound = session.pickCount % n;
    const index = round % 2 === 0 ? posInRound : n - 1 - posInRound;
    return session.draftOrder[index];
  }

  _beginTurn(session) {
    this._clearTimer(session);
    session.turnDeadline = Date.now() + TURN_SECONDS * 1000;
    const pickerId = this.currentPickerId(session);
    session._timer = setTimeout(() => {
      this._autoPick(session, pickerId);
    }, TURN_SECONDS * 1000);
  }

  _clearTimer(session) {
    if (session._timer) {
      clearTimeout(session._timer);
      session._timer = null;
    }
  }

  _autoPick(session, pickerId) {
    if (session.status !== 'drafting') return;
    if (this.currentPickerId(session) !== pickerId) return; // turn already advanced
    const remaining = session.cards.filter((c) => !c.revealed);
    if (remaining.length === 0) return;
    const card = remaining[Math.floor(Math.random() * remaining.length)];
    this._applyPick(session, pickerId, card, true);
    this.broadcast(session);
  }

  pickCard(code, participantId, position) {
    const session = this.sessions.get(code);
    if (!session) return { error: 'Session not found.' };
    if (session.status !== 'drafting') return { error: 'Draft is not active.' };
    if (this.currentPickerId(session) !== participantId) return { error: "It's not your turn." };
    const card = session.cards.find((c) => c.position === position);
    if (!card) return { error: 'Invalid card.' };
    if (card.revealed) return { error: 'That card is already taken.' };
    this._applyPick(session, participantId, card, false);
    return { session };
  }

  _applyPick(session, participantId, card, auto) {
    card.revealed = true;
    card.ownerId = participantId;
    card.auto = auto;
    session.pickCount += 1;
    if (session.pickCount >= TOTAL_PICKS) {
      session.status = 'complete';
      session.turnDeadline = null;
      this._clearTimer(session);
    } else {
      this._beginTurn(session);
    }
  }

  /** Public, sanitized state for clients. Hides identity of unrevealed cards. */
  serialize(session) {
    const contestantById = Object.fromEntries(roster.map((c) => [c.id, c]));
    return {
      code: session.code,
      status: session.status,
      leaderId: session.leaderId,
      maxParticipants: MAX_PARTICIPANTS,
      turnSeconds: TURN_SECONDS,
      totalPicks: TOTAL_PICKS,
      pickCount: session.pickCount,
      turnDeadline: session.turnDeadline,
      currentPickerId: session.status === 'drafting' ? this.currentPickerId(session) : null,
      draftOrder: session.draftOrder,
      participants: session.participants.map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
      cards: session.cards.map((c) => ({
        position: c.position,
        revealed: c.revealed,
        ownerId: c.ownerId,
        auto: c.auto || false,
        contestant: c.revealed ? contestantById[c.contestantId] : null,
      })),
    };
  }
}

module.exports = { SessionStore, MAX_PARTICIPANTS, TURN_SECONDS, TOTAL_PICKS };
