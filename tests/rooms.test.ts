import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botDecide } from '../src/shared/bot';
import { viewFor } from '../src/shared/engine';
import type { ClientMessage, ServerMessage } from '../src/shared/types';
import { Room, type Conn } from '../src/server/rooms';

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
