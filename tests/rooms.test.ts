import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botDecide } from '../src/shared/bot';
import { viewFor } from '../src/shared/engine';
import { scenesOf } from '../src/shared/content';
import type { ClientMessage, ServerMessage } from '../src/shared/types';
import { Room, cleanTokens, type Conn } from '../src/server/rooms';

/** A player's browser tab as the room sees it: a socket that records what the server sends. */
function tab(token: string) {
  const sent: ServerMessage[] = [];
  const ws = { readyState: 1, OPEN: 1, send: (s: string) => sent.push(JSON.parse(s) as ServerMessage) };
  const conn = { ws, token, room: null, pid: null, recent: [] } as unknown as Conn;
  return { conn, sent };
}

function seatOf(room: Room, conn: Conn) {
  const seat = room.addHuman(conn, `P-${conn.token}`);
  if (typeof seat === 'string') throw new Error(seat);
  return seat;
}

const send = (room: Room, conn: Conn, msg: ClientMessage) => room.handle(conn, msg);

/** Plays this human's move the way a bot would. */
function move(room: Room, conn: Conn, pid: string) {
  const action = botDecide(viewFor(room.game!, pid), pid, Math.random);
  if (!action) throw new Error('no move');
  send(room, conn, { t: 'act', action });
}

const player = (room: Room, id: string) => room.game!.players.find((p) => p.id === id)!;

describe('rooms: pausing and players who are away', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts with the autopilot setting off, and only the host changes it, in the lobby', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const b = tab('tok-b');
    seatOf(room, a.conn);
    seatOf(room, b.conn);
    expect(room.view().settings.autopilot).toBe(false);
    send(room, b.conn, { t: 'settings', autopilot: true });
    expect(room.settings.autopilot).toBe(false);
    expect(b.sent.some((m) => m.t === 'error')).toBe(true);
    send(room, a.conn, { t: 'settings', autopilot: true });
    expect(room.view().settings.autopilot).toBe(true);
    send(room, a.conn, { t: 'start' });
    send(room, a.conn, { t: 'settings', autopilot: false });
    expect(room.settings.autopilot).toBe(true);
  });

  it('the host picks the theme in the lobby, and the game is dealt in it', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const b = tab('tok-b');
    seatOf(room, a.conn);
    seatOf(room, b.conn);
    expect(room.view().settings.theme).toBe('classic');
    send(room, b.conn, { t: 'settings', theme: 'avatar' });
    expect(room.settings.theme).toBe('classic');
    send(room, a.conn, { t: 'settings', theme: 'pastel' as never });
    expect(room.settings.theme).toBe('classic');
    expect(a.sent.some((m) => m.t === 'error')).toBe(true);
    send(room, a.conn, { t: 'settings', theme: 'avatar' });
    // Changing one setting leaves the other as it was.
    expect(room.view().settings).toEqual({ autopilot: false, theme: 'avatar' });
    send(room, a.conn, { t: 'settings', autopilot: true });
    expect(room.view().settings).toEqual({ autopilot: true, theme: 'avatar' });
    send(room, a.conn, { t: 'start' });
    expect(room.game!.theme).toBe('avatar');
    expect(room.game!.supply.every((p) => scenesOf(p.genre, 'avatar').includes(p.scene))).toBe(true);
    send(room, a.conn, { t: 'settings', theme: 'classic' });
    expect(room.settings.theme).toBe('avatar');
  });

  it('pausing stops the bots until the player resumes', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    seatOf(room, a.conn);
    send(room, a.conn, { t: 'addBot' });
    send(room, a.conn, { t: 'addBot' });
    send(room, a.conn, { t: 'start' });
    const bots = room.game!.players.filter((p) => p.isBot);
    expect(bots.every((p) => p.starter)).toBe(true);
    send(room, a.conn, { t: 'pause', on: true });
    expect(room.paused).toBe(true);
    expect(room.view().paused).toBe(true);
    vi.advanceTimersByTime(10 * 60_000);
    // Nobody hung a starting painting while the game was paused.
    expect(bots.every((p) => p.starter)).toBe(true);
    send(room, a.conn, { t: 'pause', on: false });
    expect(room.paused).toBe(false);
    vi.advanceTimersByTime(30_000);
    expect(bots.every((p) => !p.starter)).toBe(true);
  });

  it('a move ends a pause', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const seat = seatOf(room, a.conn);
    send(room, a.conn, { t: 'addBot' });
    send(room, a.conn, { t: 'start' });
    send(room, a.conn, { t: 'pause', on: true });
    move(room, a.conn, seat.id);
    expect(room.paused).toBe(false);
  });

  it('cannot pause while another human is at the table, and a returning human ends a pause', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const b = tab('tok-b');
    seatOf(room, a.conn);
    const bSeat = seatOf(room, b.conn);
    send(room, a.conn, { t: 'start' });
    send(room, a.conn, { t: 'pause', on: true });
    expect(room.paused).toBe(false);
    expect(a.sent.at(-1)?.t).toBe('error');
    // Alone at the table (the other player's tab closed), the game may pause...
    room.detach(b.conn);
    send(room, a.conn, { t: 'pause', on: true });
    expect(room.paused).toBe(true);
    // ...until they come back.
    const b2 = tab('tok-b');
    room.attach(b2.conn, room.seatByToken('tok-b')!);
    expect(room.paused).toBe(false);
    expect(player(room, bSeat.id).connected).toBe(true);
  });

  it('with the autopilot off the game waits for a disconnected player, until the host lets a bot play', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const b = tab('tok-b');
    const aSeat = seatOf(room, a.conn);
    const bSeat = seatOf(room, b.conn);
    send(room, a.conn, { t: 'start' });
    move(room, a.conn, aSeat.id);
    room.detach(b.conn);
    vi.advanceTimersByTime(10 * 60_000);
    // The game waits: their starting painting is still in their hand and no bot plays for them.
    expect(player(room, bSeat.id).starter).not.toBeNull();
    expect(player(room, bSeat.id).autopilot).toBeFalsy();
    // Only the host may hand the seat over.
    send(room, a.conn, { t: 'handOver', id: bSeat.id });
    expect(player(room, bSeat.id).autopilot).toBe(true);
    vi.advanceTimersByTime(30_000);
    expect(player(room, bSeat.id).starter).toBeNull();
    // Coming back gives them their seat again.
    const b2 = tab('tok-b');
    room.attach(b2.conn, room.seatByToken('tok-b')!);
    expect(player(room, bSeat.id).autopilot).toBe(false);
    expect(player(room, bSeat.id).connected).toBe(true);
  });

  it('refuses a hand-over from someone who is not the host, or of a connected player', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const b = tab('tok-b');
    const c = tab('tok-c');
    const aSeat = seatOf(room, a.conn);
    const bSeat = seatOf(room, b.conn);
    const cSeat = seatOf(room, c.conn);
    send(room, a.conn, { t: 'start' });
    send(room, a.conn, { t: 'handOver', id: bSeat.id });
    expect(player(room, bSeat.id).autopilot).toBeFalsy();
    room.detach(c.conn);
    send(room, b.conn, { t: 'handOver', id: cSeat.id });
    expect(player(room, cSeat.id).autopilot).toBeFalsy();
    send(room, a.conn, { t: 'handOver', id: aSeat.id });
    expect(player(room, aSeat.id).autopilot).toBeFalsy();
  });

  it('with the autopilot on, a bot plays for a disconnected player after the grace period', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const b = tab('tok-b');
    const aSeat = seatOf(room, a.conn);
    const bSeat = seatOf(room, b.conn);
    send(room, a.conn, { t: 'settings', autopilot: true });
    send(room, a.conn, { t: 'start' });
    move(room, a.conn, aSeat.id);
    room.detach(b.conn);
    vi.advanceTimersByTime(5_000);
    expect(player(room, bSeat.id).starter).not.toBeNull();
    vi.advanceTimersByTime(40_000);
    expect(player(room, bSeat.id).autopilot).toBe(true);
    expect(player(room, bSeat.id).starter).toBeNull();
  });

  it('an idle player gets the autopilot only when the setting is on', () => {
    for (const on of [false, true]) {
      const room = new Room('TEST', () => undefined);
      const a = tab('tok-a');
      const aSeat = seatOf(room, a.conn);
      send(room, a.conn, { t: 'settings', autopilot: on });
      send(room, a.conn, { t: 'addBot' });
      send(room, a.conn, { t: 'start' });
      vi.advanceTimersByTime(10 * 60_000);
      expect(a.sent.some((m) => m.t === 'idle')).toBe(on);
      expect(player(room, aSeat.id).starter === null).toBe(on);
    }
  });

  it('an error while the autopilot plays is logged, and the room and its other bots carry on', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const aSeat = seatOf(room, a.conn);
    send(room, a.conn, { t: 'addBot' });
    send(room, a.conn, { t: 'addBot' });
    send(room, a.conn, { t: 'start' });
    const [, broken, fine] = room.game!.players;
    // Stands in for a bug: anything that reads this wall throws, the bots' planning included.
    (broken as unknown as { wall: null }).wall = null;
    // Before the guard, the error escaped the timer: on the server that ends every game.
    expect(() => vi.advanceTimersByTime(60_000)).not.toThrow();
    expect(errors).toHaveBeenCalled();
    // The broken seat is tried again when the game changes, not in a loop.
    expect(errors.mock.calls.length).toBeLessThan(20);
    expect(broken.starter).not.toBeNull();
    expect(fine.starter).toBeNull();
    send(room, a.conn, { t: 'act', action: { type: 'starter', x: 4, y: 4 } });
    expect(player(room, aSeat.id).starter).toBeNull();
  });

  it('a player who leaves is replaced by a bot whatever the setting', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const b = tab('tok-b');
    const aSeat = seatOf(room, a.conn);
    const bSeat = seatOf(room, b.conn);
    send(room, a.conn, { t: 'start' });
    move(room, a.conn, aSeat.id);
    room.leave(b.conn);
    vi.advanceTimersByTime(30_000);
    expect(player(room, bSeat.id).autopilot).toBe(true);
    expect(player(room, bSeat.id).starter).toBeNull();
  });
});

describe('rooms: coming back after closing the tab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('a new tab of the same browser takes back the seat of a closed tab, and keeps it on reload', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const b = tab('tok-b');
    seatOf(room, a.conn);
    const bSeat = seatOf(room, b.conn);
    send(room, a.conn, { t: 'start' });
    // The tab is closed.
    room.detach(b.conn);
    expect(player(room, bSeat.id).connected).toBe(false);
    const b2 = tab('tok-b-new-tab');
    expect(room.reclaim(b2.conn, ['tok-b'], false)?.id).toBe(bSeat.id);
    expect(player(room, bSeat.id).connected).toBe(true);
    expect(b2.sent.some((m) => m.t === 'game' && m.view.you === bSeat.id)).toBe(true);
    // The seat answers to the new tab's token now, which is what that tab sends when it reloads.
    expect(room.seatByToken('tok-b-new-tab')?.id).toBe(bSeat.id);
    expect(room.seatByToken('tok-b')).toBeUndefined();
  });

  it('a seat another tab is using stays put, unless a game that has started is joined', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const aSeat = seatOf(room, a.conn);
    send(room, a.conn, { t: 'addBot' });
    // A second tab in the lobby may be a second player on the same PC.
    const a2 = tab('tok-a-second-tab');
    expect(room.reclaim(a2.conn, ['tok-a'], false)).toBeNull();
    expect(room.seatByToken('tok-a')?.conn).toBe(a.conn);
    send(room, a.conn, { t: 'start' });
    expect(room.reclaim(a2.conn, ['tok-a'], false)).toBeNull();
    // Joining a game that has started can only mean that seat (say the first tab crashed).
    expect(room.reclaim(a2.conn, ['tok-a'], true)?.id).toBe(aSeat.id);
    expect(a.sent.at(-1)).toMatchObject({ t: 'error', message: 'You joined from another tab.' });
  });

  it('no seat comes back that its player left on purpose, nor a second seat for a tab that has one', () => {
    const room = new Room('TEST', () => undefined);
    const a = tab('tok-a');
    const b = tab('tok-b');
    seatOf(room, a.conn);
    seatOf(room, b.conn);
    send(room, a.conn, { t: 'addBot' });
    send(room, a.conn, { t: 'start' });
    room.leave(b.conn);
    expect(room.reclaim(tab('tok-c').conn, ['tok-b', 'tok-unknown'], true)).toBeNull();
    // The tab that left still has its own seat here (a bot plays it), so it takes no other.
    expect(room.reclaim(b.conn, ['tok-a'], true)).toBeNull();
    expect(room.seatByToken('tok-a')?.conn).toBe(a.conn);
  });

  it('a message carries only well-formed tokens, a few at most', () => {
    expect(cleanTokens('A'.repeat(16))).toEqual([]);
    expect(cleanTokens([1, null, 'short', 'x'.repeat(65), 'A'.repeat(16)])).toEqual(['A'.repeat(16)]);
    expect(cleanTokens(Array.from({ length: 9 }, (_, i) => `token-number-${i}-xx`))).toHaveLength(4);
  });
});
