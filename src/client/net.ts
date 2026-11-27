import type { ClientMessage, ServerMessage } from '../shared/types';

function randomToken(): string {
  // crypto.randomUUID needs a secure context; LAN play over http:// does not have one.
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const TOKEN_KEY = 'artsociety.token';
const ROOM_KEY = 'artsociety.room';
const SEATS_KEY = 'artsociety.seats';
/** How long the browser remembers its seats. Rooms close long before, 30 minutes after the last player goes. */
const SEAT_MEMORY_MS = 24 * 60 * 60_000;
/** One per tab that played in the room (the server reads no more). */
const SEATS_PER_ROOM = 4;

/** Per-tab identity, so a page reload rejoins the same seat and two tabs can be two players. */
function sessionToken(): string {
  let t = sessionStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = randomToken();
    sessionStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

/** Seats this browser held, by room code: the tokens of their tabs, newest first, and when the room was last seen. */
type SeatMemory = Record<string, { tokens: string[]; at: number }>;

function loadSeats(): SeatMemory {
  const out: SeatMemory = {};
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SEATS_KEY) ?? '{}');
    const now = Date.now();
    for (const [code, e] of Object.entries(raw && typeof raw === 'object' ? raw : {})) {
      if (!Array.isArray(e?.tokens) || typeof e.at !== 'number' || now - e.at > SEAT_MEMORY_MS) continue;
      out[code] = { tokens: e.tokens.filter((t: unknown): t is string => typeof t === 'string').slice(0, SEATS_PER_ROOM), at: e.at };
    }
  } catch {
    // Unreadable: start afresh.
  }
  return out;
}

function saveSeats(seats: SeatMemory) {
  try {
    localStorage.setItem(SEATS_KEY, JSON.stringify(seats));
  } catch {
    // Storage blocked or full: reloads still keep the seat, only a closed tab cannot come back.
  }
}

const roomCode = (s: string | null) => (s ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);

export type NetStatus = 'connecting' | 'open' | 'closed';

export class Net {
  readonly token = sessionToken();
  status: NetStatus = 'connecting';
  private ws: WebSocket | null = null;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private offset = 0;
  private handlers = new Set<(m: ServerMessage) => void>();
  private statusHandlers = new Set<(s: NetStatus) => void>();

  constructor() {
    // Leaving the page closes the connection at once, so the table sees the player go even when the
    // browser keeps the page in its back-forward cache (with the socket still open, the player would
    // look present until they came back). Coming back to a cached page connects again.
    window.addEventListener('pagehide', () => {
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = null;
      const ws = this.ws;
      this.ws = null;
      ws?.close();
    });
    window.addEventListener('pageshow', (e) => {
      if (e.persisted && !this.ws) this.connect();
    });
  }

  get room(): string | null {
    return sessionStorage.getItem(ROOM_KEY);
  }

  set room(code: string | null) {
    if (code) sessionStorage.setItem(ROOM_KEY, code);
    else sessionStorage.removeItem(ROOM_KEY);
  }

  /** This tab has a seat in `code`. The browser remembers it, so if the tab is closed, a new tab can take the seat back. */
  rememberSeat(code: string) {
    const seats = loadSeats();
    const k = roomCode(code);
    seats[k] = { tokens: [this.token, ...(seats[k]?.tokens ?? []).filter((t) => t !== this.token)].slice(0, SEATS_PER_ROOM), at: Date.now() };
    saveSeats(seats);
  }

  /** This tab left `code`, or the room is gone: no other tab takes its seat back. */
  forgetSeat(code: string) {
    const seats = loadSeats();
    const k = roomCode(code);
    const tokens = (seats[k]?.tokens ?? []).filter((t) => t !== this.token);
    if (tokens.length) seats[k] = { tokens, at: seats[k].at };
    else delete seats[k];
    saveSeats(seats);
  }

  /** The tokens of the seats this browser held in `code`, newest first. */
  seatsIn(code: string): string[] {
    return loadSeats()[roomCode(code)]?.tokens ?? [];
  }

  /** Where a tab without a seat looks for one of the browser's seats: the invite link's room, else the latest room. */
  private resumeRoom(): string | null {
    const seats = loadSeats();
    const linked = roomCode(new URLSearchParams(location.search).get('room'));
    if (linked) return seats[linked] ? linked : null;
    let latest: string | null = null;
    for (const [code, e] of Object.entries(seats)) if (!latest || e.at > seats[latest].at) latest = code;
    return latest;
  }

  on(fn: (m: ServerMessage) => void) {
    this.handlers.add(fn);
  }

  onStatus(fn: (s: NetStatus) => void) {
    this.statusHandlers.add(fn);
  }

  /** Server clock estimate, for countdowns. */
  now(): number {
    return Date.now() + this.offset;
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;
    this.setStatus('connecting');
    ws.onopen = () => {
      this.retry = 0;
      this.setStatus('open');
      this.send({ t: 'hello', token: this.token, room: this.room ?? undefined });
      // This tab has no seat: one of the browser's seats may be free because its tab was closed.
      // The server hands it over only if no tab is using it, so two tabs can still be two players.
      const code = this.room ? null : this.resumeRoom();
      if (code) this.send({ t: 'resume', code, tokens: this.seatsIn(code) });
    };
    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if ('serverTime' in msg) this.offset = msg.serverTime - Date.now();
      for (const h of this.handlers) h(msg);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.setStatus('closed');
      const delay = Math.min(8000, 500 * 2 ** this.retry++);
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.connect();
      }, delay);
    };
  }

  /** False when the connection is down and nothing was sent. */
  send(msg: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  private setStatus(s: NetStatus) {
    this.status = s;
    for (const h of this.statusHandlers) h(s);
  }
}
