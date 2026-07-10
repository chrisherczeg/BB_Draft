const roster = require('./data/roster');

const MAX_PARTICIPANTS = 16;
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
 * The draft is asynchronous: each drafter picks on their turn whenever they want,
 * with no time limit. The server is the source of truth for all state.
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
    };
    this.sessions.set(code, session);
    return { session, participant };
  }

  joinSession(code, name) {
    const session = this.sessions.get(code);
    if (!session) return { error: 'Session not found.' };
    const clean = String(name || '').trim();

    // Rejoin: if a drafter with this exact name (case-insensitive) already exists,
    // re-attach to that slot. This works mid-draft too, so anyone who closes their
    // browser can get back in with just their name + the session code. No password.
    const existing = session.participants.find(
      (p) => p.name.toLowerCase() === clean.toLowerCase()
    );
    if (existing) return { session, participant: existing };

    if (session.status !== 'lobby') {
      return { error: 'This draft has already started. To rejoin, enter the exact name you used.' };
    }
    if (session.participants.length >= MAX_PARTICIPANTS) {
      return { error: 'This session is full (16 max).' };
    }
    const participant = this._makeParticipant(clean);
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

  pickCard(code, participantId, position) {
    const session = this.sessions.get(code);
    if (!session) return { error: 'Session not found.' };
    if (session.status !== 'drafting') return { error: 'Draft is not active.' };
    if (this.currentPickerId(session) !== participantId) return { error: "It's not your turn." };
    const card = session.cards.find((c) => c.position === position);
    if (!card) return { error: 'Invalid card.' };
    if (card.revealed) return { error: 'That card is already taken.' };
    this._applyPick(session, participantId, card);
    return { session };
  }

  _applyPick(session, participantId, card) {
    card.revealed = true;
    card.ownerId = participantId;
    session.pickCount += 1;
    if (session.pickCount >= TOTAL_PICKS) {
      session.status = 'complete';
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
      totalPicks: TOTAL_PICKS,
      pickCount: session.pickCount,
      currentPickerId: session.status === 'drafting' ? this.currentPickerId(session) : null,
      draftOrder: session.draftOrder,
      participants: session.participants.map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
      cards: session.cards.map((c) => ({
        position: c.position,
        revealed: c.revealed,
        ownerId: c.ownerId,
        contestant: c.revealed ? contestantById[c.contestantId] : null,
      })),
    };
  }
}

module.exports = { SessionStore, MAX_PARTICIPANTS, TOTAL_PICKS };
