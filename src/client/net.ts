import type { ClientMessage, ServerMessage } from '../shared/types';

function randomToken(): string {
  // crypto.randomUUID needs a secure context; LAN play over http:// does not have one.
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const TOKEN_KEY = 'artsociety.token';
const ROOM_KEY = 'artsociety.room';

/** Per-tab identity, so a page reload rejoins the same seat and two tabs can be two players. */
function sessionToken(): string {
  let t = sessionStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = randomToken();
    sessionStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

export type NetStatus = 'connecting' | 'open' | 'closed';

export class Net {
  readonly token = sessionToken();
  status: NetStatus = 'connecting';
  private ws: WebSocket | null = null;
  private retry = 0;
  private offset = 0;
  private handlers = new Set<(m: ServerMessage) => void>();
  private statusHandlers = new Set<(s: NetStatus) => void>();

  get room(): string | null {
    return sessionStorage.getItem(ROOM_KEY);
  }

  set room(code: string | null) {
    if (code) sessionStorage.setItem(ROOM_KEY, code);
    else sessionStorage.removeItem(ROOM_KEY);
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
      setTimeout(() => this.connect(), delay);
    };
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private setStatus(s: NetStatus) {
    this.status = s;
    for (const h of this.statusHandlers) h(s);
  }
}
