import { randomBytes, randomInt } from 'node:crypto';
import type { WebSocket } from 'ws';
import { applyAction, createGame, viewFor, waitingOn, type Result } from '../shared/engine';
import { botDecide, fallbackActions } from '../shared/bot';
import { BOT_NAMES, PLAYER_COLORS, RULES } from '../shared/content';
import { eventsAnimationMs } from '../shared/timing';
import {
  HATS,
  type Action,
  type ClientMessage,
  type GameEvent,
  type GameState,
  type HatId,
  type LobbyPlayer,
  type RoomSettings,
  type RoomView,
  type ServerMessage,
} from '../shared/types';
import { guarded } from './guard';

const FAST = process.env.ART_SOCIETY_FAST === '1';
/** How long a disconnected player's seat waits before the autopilot plays for them. */
const AFK_GRACE_MS = FAST ? 3000 : 20_000;
/** How long a disconnected lobby player keeps their seat (covers page reloads). */
const LOBBY_GRACE_MS = 20_000;
/** A connected player who sits on a decision this long gets the autopilot until they act again. */
const IDLE_MS = FAST ? 15_000 : 120_000;
const ROOM_IDLE_MS = 30 * 60_000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const REACTIONS = ['👏', '😮', '😂', '🎨', '🔥', '😭', '👑', '🤝'];

export interface Conn {
  ws: WebSocket;
  token: string | null;
  room: Room | null;
  pid: string | null;
  recent: number[];
}

interface Seat extends LobbyPlayer {
  token: string | null;
  conn: Conn | null;
  disconnectedAt: number;
  left: boolean;
  idle: boolean;
  /** The host let a bot play this seat while its player is disconnected; cleared when they come back. */
  handedOver: boolean;
}

function send(conn: Conn | null, msg: ServerMessage) {
  if (conn && conn.ws.readyState === conn.ws.OPEN) conn.ws.send(JSON.stringify(msg));
}

/** A session token as the page makes them. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** Seat tokens from a message: well-formed ones only, and no more than a browser keeps per room. */
export function cleanTokens(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === 'string' && TOKEN_RE.test(t)).slice(0, 4) : [];
}

export function cleanName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : '';
  const name = s.replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 18);
  return name || 'Collector';
}

const newId = () => 'p_' + randomBytes(5).toString('hex');

export class Room {
  readonly seats: Seat[] = [];
  hostId = '';
  status: 'lobby' | 'game' = 'lobby';
  game: GameState | null = null;
  lastActivity = Date.now();
  /** Chosen by the host in the lobby. */
  settings: RoomSettings = { autopilot: false };
  /** The only human at the table paused the game; the bots wait. */
  paused = false;
  private botTimer: NodeJS.Timeout | null = null;
  private watchTimer: NodeJS.Timeout | null = null;
  private busyUntil = 0;
  /** When each player the game is waiting on started waiting (for the idle autopilot). */
  private waitSince = new Map<string, number>();
  /** Seats the autopilot found no legal move for. They wait until the game changes, so it never tries in a loop. */
  private stuck = new Set<string>();

  constructor(
    readonly code: string,
    private readonly onEmpty: (room: Room) => void,
  ) {}

  // ---------- membership ----------

  seatByToken(token: string): Seat | undefined {
    return this.seats.find((s) => s.token === token);
  }

  addHuman(conn: Conn, name: string): Seat | string {
    if (this.status !== 'lobby') return 'That game has already started.';
    if (this.seats.length >= RULES.maxPlayers) return `That room is full (${RULES.maxPlayers} collectors at most).`;
    const seat: Seat = {
      id: newId(),
      name: this.uniqueName(cleanName(name)),
      color: this.freeColor(),
      hat: HATS[this.seats.length % HATS.length],
      isBot: false,
      connected: true,
      token: conn.token,
      conn: null,
      disconnectedAt: 0,
      left: false,
      idle: false,
      handedOver: false,
    };
    this.seats.push(seat);
    if (!this.hostId) this.hostId = seat.id;
    this.attach(conn, seat);
    return seat;
  }

  /**
   * Gives `conn` a seat its browser held here before (the tab was closed): the first one that no tab is
   * using, or with `takeOver` the newest even if a tab is using it. A tab with a seat here takes no other,
   * and a seat whose player left on purpose stays with the bot. The seat moves to this tab's token, so
   * this tab's reloads find it from now on. Null if there is no such seat.
   */
  reclaim(conn: Conn, tokens: readonly string[], takeOver: boolean): Seat | null {
    if (!conn.token || this.seatByToken(conn.token)) return null;
    const mine = tokens.map((t) => this.seatByToken(t)).filter((s): s is Seat => !!s && !s.isBot && !s.left);
    const seat = mine.find((s) => !s.conn) ?? (takeOver ? mine[0] : undefined);
    if (!seat) return null;
    seat.token = conn.token;
    this.attach(conn, seat);
    return seat;
  }

  attach(conn: Conn, seat: Seat) {
    if (seat.conn && seat.conn !== conn) {
      send(seat.conn, { t: 'error', message: 'You joined from another tab.' });
      seat.conn.room = null;
      seat.conn.pid = null;
    }
    seat.conn = conn;
    seat.connected = true;
    seat.left = false;
    // Back at the table: the seat is theirs again.
    seat.handedOver = false;
    conn.room = this;
    conn.pid = seat.id;
    this.touch();
    if (this.game) {
      const p = this.game.players.find((x) => x.id === seat.id);
      if (p) p.connected = true;
    }
    // A pause is only for a player alone with the bots.
    if (this.paused && this.connectedHumans() > 1) this.setPaused(false);
    this.broadcastRoom();
    if (this.game) {
      this.broadcastGame([]);
      this.schedule();
    }
  }

  detach(conn: Conn) {
    const seat = this.seats.find((s) => s.conn === conn);
    conn.room = null;
    conn.pid = null;
    if (!seat) return;
    seat.conn = null;
    seat.connected = false;
    seat.disconnectedAt = Date.now();
    if (this.game) {
      const p = this.game.players.find((x) => x.id === seat.id);
      if (p) p.connected = false;
      this.broadcastGame([]);
    }
    this.broadcastRoom();
    this.schedule();
  }

  leave(conn: Conn) {
    const seat = this.seats.find((s) => s.conn === conn);
    this.detach(conn);
    if (!seat) return;
    if (this.status === 'lobby') this.removeSeat(seat.id);
    else seat.left = true;
    this.fixHost();
    this.broadcastRoom();
    this.schedule();
  }

  private removeSeat(id: string) {
    const i = this.seats.findIndex((s) => s.id === id);
    if (i >= 0) this.seats.splice(i, 1);
    this.fixHost();
    if (!this.seats.some((s) => !s.isBot)) this.onEmpty(this);
  }

  private fixHost() {
    const host = this.seats.find((s) => s.id === this.hostId);
    if (host && !host.isBot && !host.left && host.conn) return;
    const next = this.seats.find((s) => !s.isBot && !s.left && s.conn) ?? (host && !host.isBot && !host.left ? host : undefined);
    if (next) this.hostId = next.id;
  }

  /** Periodic housekeeping: lobby seats of vanished players, host hand-over, idle rooms. */
  tick(now: number) {
    if (this.status === 'lobby') {
      for (const s of [...this.seats]) {
        if (!s.isBot && !s.conn && now - s.disconnectedAt > LOBBY_GRACE_MS) this.removeSeat(s.id);
      }
    }
    const before = this.hostId;
    this.fixHost();
    if (before !== this.hostId) this.broadcastRoom();
    const anyone = this.seats.some((s) => s.conn);
    if (!anyone && now - this.lastActivity > ROOM_IDLE_MS) this.onEmpty(this);
    if (anyone) this.lastActivity = now;
  }

  private touch() {
    this.lastActivity = Date.now();
  }

  private uniqueName(name: string, except?: string): string {
    let n = name;
    let i = 2;
    while (this.seats.some((s) => s.id !== except && s.name.toLowerCase() === n.toLowerCase())) n = `${name} ${i++}`;
    return n;
  }

  private freeColor(): string {
    return PLAYER_COLORS.find((c) => !this.seats.some((s) => s.color === c)) ?? PLAYER_COLORS[0];
  }

  view(): RoomView {
    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      players: this.seats.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        hat: s.hat,
        isBot: s.isBot,
        connected: s.isBot || (!!s.conn && !s.left),
      })),
      settings: { ...this.settings },
      paused: this.paused,
    };
  }

  private connectedHumans(): number {
    return this.seats.filter((s) => !s.isBot && !!s.conn && !s.left).length;
  }

  private setPaused(on: boolean) {
    if (this.paused === on) return;
    this.paused = on;
    // Waiting starts afresh after a pause, so nobody counts as idle for the time it lasted.
    if (!on) this.waitSince.clear();
  }

  broadcastRoom() {
    const room = this.view();
    const serverTime = Date.now();
    for (const s of this.seats) if (s.conn) send(s.conn, { t: 'room', room, you: s.id, serverTime });
  }

  broadcastGame(events: GameEvent[]) {
    if (!this.game) return;
    const serverTime = Date.now();
    for (const s of this.seats) {
      if (s.conn) send(s.conn, { t: 'game', view: viewFor(this.game, s.id), events, serverTime });
    }
  }

  // ---------- messages ----------

  handle(conn: Conn, msg: ClientMessage) {
    const seat = this.seats.find((s) => s.conn === conn);
    if (!seat) return;
    this.touch();
    // Any message proves the player is back at the table.
    if (seat.idle) {
      seat.idle = false;
      this.waitSince.delete(seat.id);
      this.schedule();
    }
    const isHost = seat.id === this.hostId;
    const err = (message: string) => send(conn, { t: 'error', message });

    switch (msg.t) {
      case 'profile': {
        if (this.status !== 'lobby') return err('You can only change your look in the lobby.');
        if (msg.name !== undefined) seat.name = this.uniqueName(cleanName(msg.name), seat.id);
        if (msg.color !== undefined) {
          if (!PLAYER_COLORS.includes(msg.color)) return err('Unknown colour.');
          if (this.seats.some((s) => s !== seat && s.color === msg.color)) return err('That colour is taken.');
          seat.color = msg.color;
        }
        if (msg.hat !== undefined) {
          if (!HATS.includes(msg.hat as HatId)) return err('Unknown hat.');
          seat.hat = msg.hat;
        }
        this.broadcastRoom();
        return;
      }
      case 'addBot': {
        if (!isHost || this.status !== 'lobby') return err('Only the host can add bots.');
        if (this.seats.length >= RULES.maxPlayers) return err('The table is full.');
        const name = BOT_NAMES.find((n) => !this.seats.some((s) => s.name === n)) ?? `Bot ${this.seats.length}`;
        this.seats.push({
          id: newId(),
          name,
          color: this.freeColor(),
          hat: HATS[randomInt(HATS.length)],
          isBot: true,
          connected: true,
          token: null,
          conn: null,
          disconnectedAt: 0,
          left: false,
          idle: false,
          handedOver: false,
        });
        this.broadcastRoom();
        return;
      }
      case 'removeBot': {
        if (!isHost || this.status !== 'lobby') return err('Only the host can remove bots.');
        const bot = this.seats.find((s) => s.id === msg.id && s.isBot);
        if (bot) this.removeSeat(bot.id);
        this.broadcastRoom();
        return;
      }
      case 'start': {
        if (!isHost || this.status !== 'lobby') return err('Only the host can start the game.');
        if (this.seats.length < RULES.minPlayers) return err(`You need at least ${RULES.minPlayers} collectors. Add a bot!`);
        const { state, events } = createGame({
          seed: randomInt(2 ** 31),
          players: this.seats.map((s) => ({ id: s.id, name: s.name, color: s.color, hat: s.hat, isBot: s.isBot })),
        });
        this.game = state;
        for (const p of state.players) p.connected = this.seats.find((s) => s.id === p.id)?.conn != null || p.isBot;
        this.status = 'game';
        this.busyUntil = Date.now();
        this.waitSince.clear();
        this.broadcastRoom();
        this.afterChange(events);
        return;
      }
      case 'toLobby':
        if (!isHost) return err('Only the host can do that.');
        if (this.game && this.game.phase.kind !== 'over') return err('The game is still running.');
        this.endGame();
        return;
      case 'act':
        return this.act(seat, msg.action);
      case 'chat': {
        const text = typeof msg.text === 'string' ? msg.text.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, 240) : '';
        if (!text) return;
        if (!this.rateOk(conn, 6, 6000)) return err('Slow down a little!');
        for (const s of this.seats) send(s.conn, { t: 'chat', pid: seat.id, name: seat.name, color: seat.color, text });
        return;
      }
      case 'back':
        return;
      case 'settings': {
        if (!isHost || this.status !== 'lobby') return err('Only the host can change the settings, in the lobby.');
        this.settings.autopilot = msg.autopilot === true;
        this.broadcastRoom();
        return;
      }
      case 'handOver': {
        if (!isHost || !this.game || this.game.phase.kind === 'over') return err('Only the host can do that during a game.');
        const target = this.seats.find((s) => s.id === msg.id);
        if (!target || target.isBot || target === seat) return err('That seat cannot be handed to a bot.');
        if (target.conn) return err(`${target.name} is at the table again.`);
        if (target.left || target.handedOver) return;
        target.handedOver = true;
        this.schedule();
        return;
      }
      case 'pause': {
        if (!this.game || this.game.phase.kind === 'over') return;
        if (msg.on === true) {
          if (this.connectedHumans() > 1) return err('Other collectors are at the table, so the game cannot pause.');
          this.setPaused(true);
        } else this.setPaused(false);
        this.broadcastRoom();
        this.schedule();
        return;
      }
      case 'react':
        if (!REACTIONS.includes(msg.emoji)) return;
        if (!this.rateOk(conn, 8, 4000)) return;
        for (const s of this.seats) send(s.conn, { t: 'react', pid: seat.id, emoji: msg.emoji });
        return;
    }
  }

  private rateOk(conn: Conn, max: number, windowMs: number): boolean {
    const now = Date.now();
    conn.recent = conn.recent.filter((t) => now - t < windowMs);
    if (conn.recent.length >= max) return false;
    conn.recent.push(now);
    return true;
  }

  private endGame() {
    this.clearTimers();
    this.game = null;
    this.status = 'lobby';
    this.paused = false;
    this.waitSince.clear();
    this.stuck.clear();
    for (const s of this.seats) s.handedOver = false;
    for (const s of [...this.seats]) if (s.left || (!s.isBot && !s.conn)) this.removeSeat(s.id);
    this.broadcastRoom();
  }

  private act(seat: Seat, action: Action) {
    if (!this.game) return send(seat.conn, { t: 'error', message: 'No game is running.' });
    const res = applyAction(this.game, seat.id, action);
    if (!res.ok) return send(seat.conn, { t: 'error', message: res.error });
    seat.idle = false;
    this.waitSince.delete(seat.id);
    // Playing a move ends a pause.
    if (this.paused) {
      this.setPaused(false);
      this.broadcastRoom();
    }
    this.afterChange(res.events);
  }

  private afterChange(events: GameEvent[]) {
    const now = Date.now();
    // The game has changed, so a seat the autopilot was stuck on may have a move now.
    this.stuck.clear();
    this.busyUntil = Math.max(this.busyUntil, now) + eventsAnimationMs(events);
    this.broadcastGame(events);
    this.schedule();
  }

  // ---------- bots, autopilot and idle players ----------

  private clearTimers() {
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.watchTimer) clearTimeout(this.watchTimer);
    this.botTimer = this.watchTimer = null;
  }

  /**
   * Whether a bot plays this seat right now: bots, players who left, seats the host handed over while
   * their player is away, and, only if the room allows it, players away for a while or sitting idle.
   */
  private autopilot(seat: Seat, now: number): boolean {
    if (seat.isBot || seat.left) return true;
    if (!seat.conn && seat.handedOver) return true;
    if (!this.settings.autopilot) return false;
    return seat.idle || (!seat.conn && now - seat.disconnectedAt >= AFK_GRACE_MS);
  }

  /** Copies who is on autopilot into the game state, for the player cards. True if anything changed. */
  private syncAutopilot(now: number): boolean {
    let changed = false;
    for (const p of this.game?.players ?? []) {
      const s = this.seats.find((x) => x.id === p.id);
      if (!s || s.isBot) continue;
      const on = this.autopilot(s, now);
      if (!!p.autopilot !== on) {
        p.autopilot = on;
        changed = true;
      }
    }
    return changed;
  }

  private schedule() {
    this.clearTimers();
    const g = this.game;
    if (!g || g.phase.kind === 'over') return;
    const now = Date.now();
    if (this.syncAutopilot(now)) this.broadcastGame([]);
    if (this.paused) return;
    // With nobody watching, the table pauses instead of racing to the end.
    if (!this.seats.some((s) => s.conn && !s.isBot)) return;

    const waiting = waitingOn(g);
    for (const id of [...this.waitSince.keys()]) if (!waiting.includes(id)) this.waitSince.delete(id);
    for (const id of waiting) if (!this.waitSince.has(id)) this.waitSince.set(id, Math.max(now, this.busyUntil));
    const seats = waiting.map((id) => this.seats.find((s) => s.id === id)).filter((s): s is Seat => !!s);

    const auto = seats.find((s) => this.autopilot(s, now) && !this.stuck.has(s.id));
    if (auto) {
      const think = FAST ? 120 : auto.isBot ? 650 + randomInt(650) : 450;
      this.botTimer = setTimeout(() => guarded(`room ${this.code}: autopilot`, () => this.runAutopilot(auto.id)), Math.max(0, this.busyUntil - now) + think);
    }
    // Wake up when an absent player's grace runs out or a present one has been idle too long (only
    // when the room lets the autopilot stand in; otherwise the game simply waits for them).
    const wake: number[] = [];
    for (const s of seats) {
      if (!this.settings.autopilot || this.autopilot(s, now) || s.isBot) continue;
      if (!s.conn) wake.push(s.disconnectedAt + AFK_GRACE_MS);
      else wake.push((this.waitSince.get(s.id) ?? now) + IDLE_MS);
    }
    if (wake.length) {
      const at = Math.min(...wake);
      this.watchTimer = setTimeout(() => guarded(`room ${this.code}: idle check`, () => this.checkIdle()), Math.max(50, at - now + 20));
    }
  }

  private checkIdle() {
    const g = this.game;
    if (!g) return;
    if (!this.settings.autopilot || this.paused) return this.schedule();
    const now = Date.now();
    for (const id of waitingOn(g)) {
      const s = this.seats.find((x) => x.id === id);
      if (!s || s.isBot || !s.conn || s.idle) continue;
      if (now - (this.waitSince.get(id) ?? now) >= IDLE_MS) {
        s.idle = true;
        send(s.conn, { t: 'idle' });
      }
    }
    this.schedule();
  }

  private runAutopilot(pid: string) {
    const g = this.game;
    if (!g || g.phase.kind === 'over') return;
    let res: Result | null = null;
    try {
      const view = viewFor(g, pid);
      let choice: Action | null = null;
      try {
        choice = botDecide(view, pid, Math.random);
      } catch (err) {
        console.error(`[room ${this.code}] the bot failed to choose a move for ${pid}:`, err);
      }
      if (choice) {
        res = applyAction(g, pid, choice);
        if (!res.ok) console.warn(`[room ${this.code}] autopilot move rejected (${res.error}):`, choice);
      }
      // Plain legal moves keep the game going when the bot has no answer.
      for (const a of res?.ok ? [] : fallbackActions(view, pid)) {
        res = applyAction(g, pid, a);
        if (res.ok) break;
      }
    } catch (err) {
      console.error(`[room ${this.code}] the autopilot failed for ${pid}:`, err);
      res = null;
    }
    if (res?.ok) return this.afterChange(res.events);
    // Trying again at once would fail the same way, over and over. This seat waits until the game
    // changes or its player comes back, and the other seats carry on meanwhile.
    console.error(`[room ${this.code}] the autopilot found no legal move for ${pid} (${g.phase.kind}); it waits until the game changes.`);
    this.stuck.add(pid);
    this.schedule();
  }

  dispose() {
    this.clearTimers();
    for (const s of this.seats) {
      if (s.conn) {
        send(s.conn, { t: 'left' });
        s.conn.room = null;
        s.conn.pid = null;
      }
    }
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor() {
    setInterval(() => {
      const now = Date.now();
      // One room's trouble must not stop the housekeeping of the others.
      for (const r of this.rooms.values()) guarded(`room ${r.code}: housekeeping`, () => r.tick(now));
    }, 5000).unref();
  }

  private newCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < 4; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  create(): Room {
    const room = new Room(this.newCode(), (r) => this.remove(r));
    this.rooms.set(room.code, room);
    return room;
  }

  remove(room: Room) {
    if (this.rooms.get(room.code) !== room) return;
    room.dispose();
    this.rooms.delete(room.code);
  }

  get size() {
    return this.rooms.size;
  }
}
