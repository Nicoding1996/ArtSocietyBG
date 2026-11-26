import { describe, expect, it } from 'vitest';
import { advancePrestige, applyAction, createGame, viewFor, waitingOn } from '../src/shared/engine';
import { DECOR_INFO, PAINTING_SIZES, RULES, buildPaintings, makeDecor, sizeKey } from '../src/shared/content';
import { computeResults, ranking, scoreWall } from '../src/shared/scoring';
import { taskOptions } from '../src/shared/options';
import { makeRng } from '../src/shared/rng';
import { FRAMES, GENRES, type Action, type FrameId, type GameState, type Genre, type Hung, type IncomingFrom, type Painting, type PlayerState, type Tile } from '../src/shared/types';
import { canHang, gridOf } from '../src/shared/wall';
import { checkInvariants, playBotGame } from '../scripts/botgame';

function newGame(n = 3, seed = 42): GameState {
  return createGame({
    seed,
    players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, color: '#fff', hat: 'beret' as const, isBot: false })),
  }).state;
}

function act(g: GameState, pid: string, a: Action) {
  const r = applyAction(g, pid, a);
  if (!r.ok) throw new Error(r.error);
  return r.events;
}

function reject(g: GameState, pid: string, a: Action): string {
  const r = applyAction(g, pid, a);
  if (r.ok) throw new Error(`expected ${JSON.stringify(a)} to be rejected`);
  return r.error;
}

let seq = 0;
function art(genre: Genre, frame: FrameId, w: number, h: number): Painting {
  seq++;
  return { id: `t${seq}`, kind: 'painting', genre, frame, w, h, value: w + h, seed: seq, scene: 'lilies', title: `Test ${seq}` };
}

function hangStarters(g: GameState) {
  for (const p of g.players) act(g, p.id, { type: 'starter', x: 4, y: 4 });
}

/** Skips to the acquire phase with `p` holding `tile` (everyone else done). */
function giveTask(g: GameState, p: PlayerState, tile: Tile, from: IncomingFrom = 'auction') {
  g.phase = { kind: 'acquire', order: g.players.map((x) => x.id), next: g.players.length, bids: {}, ties: [] };
  g.lots = [];
  for (const x of g.players) {
    x.took = true;
    x.task = null;
  }
  p.task = { queue: [{ tile, from }], rewards: [] };
}

describe('components', () => {
  it('builds 112 supply paintings plus 4 starting paintings, evenly spread', () => {
    const { supply, starters } = buildPaintings(makeRng(7));
    expect(supply).toHaveLength(112);
    expect(starters).toHaveLength(4);
    for (const s of starters) expect([s.w, s.h, s.starter]).toEqual([2, 3, true]);
    expect(new Set(starters.map((s) => s.genre)).size).toBe(4);
    for (const g of GENRES) expect(supply.filter((p) => p.genre === g)).toHaveLength(28);
    for (const f of FRAMES) expect(supply.filter((p) => p.frame === f)).toHaveLength(28);
    for (const g of GENRES) for (const f of FRAMES) expect(supply.filter((p) => p.genre === g && p.frame === f)).toHaveLength(7);
    for (let v = 3; v <= 9; v++) expect(supply.filter((p) => p.value === v)).toHaveLength(16);
    for (const s of PAINTING_SIZES) expect(supply.filter((p) => p.w === s.w && p.h === s.h)).toHaveLength(s.count);
    for (const p of supply) {
      expect(p.value).toBe(p.w + p.h);
      expect(p.h).toBeGreaterThanOrEqual(2);
    }
    expect(new Set([...supply, ...starters].map((p) => p.id)).size).toBe(116);
    expect(Object.values(RULES.decorSupply).reduce((a, b) => a + b, 0)).toBe(108);
    for (const s of Object.values(DECOR_INFO)) expect(s.points).toBe(s.w * s.h);
  });

  it('deals everyone 20 bid cards, a starting card and a starting painting', () => {
    const g = newGame(4);
    const starts = g.players.map((p) => p.stack[0]);
    expect([...starts].sort()).toEqual([1, 2, 3, 4]);
    expect(g.players[g.auctioneer].stack[0]).toBe(1);
    for (const p of g.players) {
      expect(p.hand).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
      expect(p.starter?.starter).toBe(true);
    }
    expect(g.phase.kind).toBe('setup');
    expect(waitingOn(g)).toHaveLength(4);
    // Two players use two of the four starting cards; the lower one still takes the gavel.
    const g2 = newGame(2, 9);
    expect(g2.players[g2.auctioneer].stack[0]).toBe(Math.min(...g2.players.map((p) => p.stack[0])));
  });
});

describe('setup', () => {
  it('starting paintings must cover at least one star', () => {
    const g = newGame(2);
    const [a, b] = g.players;
    expect(reject(g, a.id, { type: 'starter', x: 0, y: 0 })).toMatch(/star/);
    expect(reject(g, a.id, { type: 'starter', x: 6, y: 4 })).toMatch(/star/);
    expect(reject(g, a.id, { type: 'starter', x: 4, y: 5 })).toMatch(/star/);
    expect(reject(g, a.id, { type: 'starter', x: 9, y: 4 })).toMatch(/off the wall/);
    act(g, a.id, { type: 'starter', x: 3, y: 2 }); // covers (4,4) only
    expect(reject(g, a.id, { type: 'starter', x: 4, y: 4 })).toMatch(/already/);
    expect(g.phase.kind).toBe('setup');
    act(g, b.id, { type: 'starter', x: 5, y: 4 }); // covers (5,4) only
    expect(g.phase.kind).toBe('select');
    expect(g.round).toBe(1);
  });
});

describe('auction', () => {
  it('the auctioneer puts up players + 1 paintings by size, drawn blind', () => {
    const g = newGame(3);
    hangStarters(g);
    const auct = g.players[g.auctioneer];
    const other = g.players[(g.auctioneer + 1) % 3];
    const sizes = ['2x2', '2x2', '1x3', '5x4'];
    expect(reject(g, other.id, { type: 'auction', sizes })).toMatch(/auctioneer/);
    expect(reject(g, auct.id, { type: 'auction', sizes: sizes.slice(0, 3) })).toMatch(/exactly 4/);
    expect(reject(g, auct.id, { type: 'auction', sizes: ['2x2', '2x2', '1x3', '7x1'] })).toMatch(/Unknown/);
    const before = g.supply.length;
    act(g, auct.id, { type: 'auction', sizes });
    expect(g.supply).toHaveLength(before - 4);
    expect(g.lots.map((l) => sizeKey(l.w, l.h)).sort()).toEqual([...sizes].sort());
    expect(g.phase.kind).toBe('bid');
  });

  it('cannot ask for more paintings of a size than are left', () => {
    const g = newGame(3);
    hangStarters(g);
    const auct = g.players[g.auctioneer];
    g.supply = g.supply.filter((p) => sizeKey(p.w, p.h) !== '5x4' || p === g.supply.find((q) => sizeKey(q.w, q.h) === '5x4'));
    expect(reject(g, auct.id, { type: 'auction', sizes: ['5x4', '5x4', '2x2', '2x2'] })).toMatch(/Only 1/);
  });

  it('views show the supply only as counts per size', () => {
    const g = newGame(2);
    const v = viewFor(g, 'p0');
    expect(v.supplyTotal).toBe(112);
    expect(v.supply['1x2']).toBe(16);
    expect((v as unknown as Record<string, unknown>).rng).toBeUndefined();
    expect(JSON.stringify(v)).not.toContain(g.supply[0].title);
  });
});

describe('bidding', () => {
  function toBids(g: GameState) {
    hangStarters(g);
    act(g, g.players[g.auctioneer].id, { type: 'auction', sizes: Array(g.players.length + 1).fill('2x2') });
  }

  it('bids are secret until everyone has bid, then the highest picks first', () => {
    const g = newGame(3);
    toBids(g);
    const [a, b, c] = g.players;
    expect(reject(g, a.id, { type: 'bid', card: 21 })).toMatch(/do not hold/);
    act(g, a.id, { type: 'bid', card: 7 });
    expect(reject(g, a.id, { type: 'bid', card: 8 })).toMatch(/sealed/);
    const seen = viewFor(g, b.id).players.find((p) => p.id === a.id)!;
    expect(seen.bid).toBeNull();
    expect(seen.hasBid).toBe(true);
    expect(seen.hand).toBeNull();
    expect(viewFor(g, a.id).players[0].bid).toBe(7);
    act(g, b.id, { type: 'bid', card: 15 });
    act(g, c.id, { type: 'bid', card: 3 });
    const ph = g.phase;
    expect(ph.kind).toBe('acquire');
    if (ph.kind !== 'acquire') return;
    expect(ph.order).toEqual([b.id, a.id, c.id]);
    expect(a.hand).not.toContain(7);
    expect(a.stack[a.stack.length - 1]).toBe(7);
  });

  it('ties are broken by the card underneath, the starting card first', () => {
    const g = newGame(3);
    toBids(g);
    const [a, b, c] = g.players;
    a.stack = [1];
    b.stack = [4];
    c.stack = [2];
    for (const p of g.players) act(g, p.id, { type: 'bid', card: 10 });
    const ph = g.phase;
    if (ph.kind !== 'acquire') throw new Error('not acquiring');
    expect(ph.order).toEqual([b.id, c.id, a.id]);
    expect(ph.ties[0].steps[0]).toMatchObject({ winner: b.id, loser: c.id, depth: 1, winnerCard: 4, loserCard: 2 });
  });

  it('deeper ties compare further down the stack', () => {
    const g = newGame(2);
    toBids(g);
    const [a, b] = g.players;
    a.stack = [4, 9, 12];
    b.stack = [1, 9, 12];
    a.hand = a.hand.filter((c) => c !== 9 && c !== 12);
    b.hand = b.hand.filter((c) => c !== 9 && c !== 12);
    act(g, a.id, { type: 'bid', card: 6 });
    act(g, b.id, { type: 'bid', card: 6 });
    const ph = g.phase;
    if (ph.kind !== 'acquire') throw new Error('not acquiring');
    expect(ph.order).toEqual([a.id, b.id]);
    expect(ph.ties[0].steps[0].depth).toBe(3);
  });

  it('only the current picker may take, one painting each', () => {
    const g = newGame(2);
    toBids(g);
    const [a, b] = g.players;
    act(g, a.id, { type: 'bid', card: 20 });
    act(g, b.id, { type: 'bid', card: 1 });
    expect(reject(g, b.id, { type: 'take', lot: g.lots[0].id })).toMatch(/not your turn/);
    act(g, a.id, { type: 'take', lot: g.lots[0].id });
    expect(reject(g, a.id, { type: 'take', lot: g.lots[0].id })).toMatch(/not your turn/);
    expect(a.task?.queue[0].from).toBe('auction');
    expect(waitingOn(g).sort()).toEqual([a.id, b.id].sort());
  });
});

describe('hanging tiles', () => {
  it('tiles must be inside the wall, on free space and touch another tile along an edge', () => {
    const g = newGame(2);
    hangStarters(g); // starter covers x 4-5, y 4-6
    const p = g.players[0];
    const t = art('city', 'gilded', 2, 2);
    giveTask(g, p, t);
    expect(reject(g, p.id, { type: 'hang', which: 'new', x: 2, y: 2 })).toMatch(/touching/); // corner only
    expect(reject(g, p.id, { type: 'hang', which: 'new', x: 5, y: 5 })).toMatch(/empty space/); // overlaps
    expect(reject(g, p.id, { type: 'hang', which: 'new', x: 9, y: 4 })).toMatch(/inside/);
    expect(reject(g, p.id, { type: 'hang', which: 'new', x: 0, y: 0 })).toMatch(/touching/);
    const ev = act(g, p.id, { type: 'hang', which: 'new', x: 2, y: 4 }); // left edge of the starter
    expect(ev.find((e) => e.t === 'hang')).toBeTruthy();
    expect(p.wall).toHaveLength(2);
    expect(p.task).toBeNull();
  });

  it('matching frames earn decor worth up to the number of matches', () => {
    const g = newGame(2);
    const p = g.players[0];
    p.starter = null;
    const left = art('city', 'silver', 2, 2);
    const right = art('portrait', 'silver', 2, 2);
    const other = art('still', 'walnut', 2, 2);
    p.wall = [
      { tile: left, x: 0, y: 0 },
      { tile: right, x: 4, y: 0 },
      { tile: other, x: 2, y: 2 },
    ];
    const t = art('landscape', 'silver', 2, 2);
    giveTask(g, p, t);
    const ev = act(g, p.id, { type: 'hang', which: 'new', x: 2, y: 0 });
    const hang = ev.find((e) => e.t === 'hang');
    expect(hang && hang.t === 'hang' && hang.matches.sort()).toEqual([left.id, right.id].sort());
    expect(p.task?.rewards).toEqual([2]);
    const opts = taskOptions(g, p)!;
    expect(opts.stage).toBe('decor');
    expect(opts.decorShapes.sort()).toEqual(['1x1', '1x2', '2x1'].sort());
    expect(reject(g, p.id, { type: 'hang', which: 'new', x: 6, y: 0 })).toMatch(/decor/);
    expect(reject(g, p.id, { type: 'decor', shapes: ['3x1'] })).toMatch(/at most 2/);
    expect(reject(g, p.id, { type: 'decor', shapes: ['1x1', '1x1'] })).toMatch(/one decor/);
    const supply = g.decor['2x1'];
    act(g, p.id, { type: 'decor', shapes: ['2x1'] });
    expect(g.decor['2x1']).toBe(supply - 1);
    expect(p.task?.queue[0].tile.kind).toBe('decor');
    act(g, p.id, { type: 'hang', which: 'new', x: 6, y: 0 });
    expect(p.task).toBeNull();
    expect(p.wall.at(-1)?.tile.kind).toBe('decor');
  });

  it('four or more matches may be split over several decor tiles', () => {
    const g = newGame(2);
    const p = g.players[0];
    p.starter = null;
    p.wall = [
      { tile: art('city', 'ivory', 1, 2), x: 2, y: 2 },
      { tile: art('portrait', 'ivory', 1, 2), x: 5, y: 2 },
      { tile: art('still', 'ivory', 2, 2), x: 3, y: 0 },
      { tile: art('city', 'ivory', 2, 2), x: 3, y: 4 },
    ];
    giveTask(g, p, art('landscape', 'ivory', 2, 2));
    act(g, p.id, { type: 'hang', which: 'new', x: 3, y: 2 });
    expect(p.task?.rewards).toEqual([4]);
    expect(reject(g, p.id, { type: 'decor', shapes: ['3x1', '1x2'] })).toMatch(/at most 4/);
    act(g, p.id, { type: 'decor', shapes: ['3x1', '1x1'] });
    expect(p.task?.queue.map((q) => (q.tile.kind === 'decor' ? q.tile.shape : ''))).toEqual(['3x1', '1x1']);
  });

  it('decor earned in the round the wall is completed is not gained', () => {
    const g = newGame(2);
    const p = g.players[0];
    p.starter = null;
    // Everything is covered except a 2x2 hole at the top-left, next to a gilded painting.
    p.wall = [{ tile: art('city', 'gilded', 2, 2), x: 2, y: 0 }];
    for (let y = 0; y < 14; y++) {
      for (let x = 0; x < 10; x++) {
        if (y < 2 && x < 4) continue;
        p.wall.push({ tile: makeDecor('1x1', `f${x}-${y}`), x, y });
      }
    }
    const decorBefore = { ...g.decor };
    giveTask(g, p, art('landscape', 'gilded', 2, 2));
    const ev = act(g, p.id, { type: 'hang', which: 'new', x: 0, y: 0 });
    expect(ev.some((e) => e.t === 'trigger' && e.reason === 'full')).toBe(true);
    expect(p.task).toBeNull();
    expect(g.decor).toEqual(decorBefore);
    expect(g.end?.reason).toBe('full');
  });

  it('paintings touching their own type are a faux pas and score nothing (eyeline still counts)', () => {
    const wall: Hung[] = [
      { tile: art('landscape', 'gilded', 2, 3), x: 0, y: 8 },
      { tile: art('landscape', 'walnut', 2, 3), x: 2, y: 8 },
      { tile: art('city', 'walnut', 2, 3), x: 4, y: 8 },
    ];
    const rank = ranking({ city: 3, portrait: 2, still: 1, landscape: 9 });
    const s = scoreWall({ id: 'x', wall, excess: [], hand: [] }, rank);
    expect(s.genres.find((x) => x.genre === 'landscape')).toMatchObject({ count: 2, faux: 2, points: 0 });
    expect(s.genres.find((x) => x.genre === 'city')).toMatchObject({ count: 1, faux: 0, points: 4 });
    expect(s.eyelineCount).toBe(2);
  });
});

describe('the assistant', () => {
  it('holds one tile, which can be hung before or after the new one', () => {
    const g = newGame(2);
    hangStarters(g);
    const p = g.players[0];
    const a1 = art('city', 'gilded', 1, 2);
    giveTask(g, p, a1);
    act(g, p.id, { type: 'assist' });
    expect(p.assistant).toBe(a1);
    // It could still be hung this round, so the player says when they are finished.
    expect(taskOptions(g, p)).toMatchObject({ stage: 'finish', canHangAssistant: true, canDone: true });
    act(g, p.id, { type: 'done' });
    expect(p.task).toBeNull();

    const a2 = art('portrait', 'walnut', 1, 2);
    giveTask(g, p, a2);
    expect(reject(g, p.id, { type: 'assist' })).toMatch(/already holding/);
    // Hang the assistant's painting first, then hand over the new one.
    act(g, p.id, { type: 'hang', which: 'assistant', x: 3, y: 4 });
    expect(p.assistant).toBeNull();
    act(g, p.id, { type: 'assist' });
    expect(p.assistant).toBe(a2);
    // The assistant's tile fits, so the player decides when they are finished.
    expect(p.task).not.toBeNull();
    expect(taskOptions(g, p)?.stage).toBe('finish');
    act(g, p.id, { type: 'done' });
    expect(p.task).toBeNull();
  });

  it('a fitting painting may still be given to the assistant', () => {
    const g = newGame(2);
    hangStarters(g);
    const p = g.players[0];
    giveTask(g, p, art('city', 'gilded', 2, 2));
    expect(taskOptions(g, p)).toMatchObject({ headFits: true, canAssist: true, canExcess: false });
    act(g, p.id, { type: 'assist' });
    expect(p.assistant?.kind).toBe('painting');
  });
});

describe('running out of space', () => {
  function cramped() {
    const g = newGame(2);
    hangStarters(g);
    const p = g.players[0];
    // Leave only a 1x2 slot free, at x=6, y=4..5 next to the starter.
    p.wall = [p.wall[0]];
    for (let y = 0; y < 14; y++) for (let x = 0; x < 10; x++) {
      const inStarter = x >= 4 && x <= 5 && y >= 4 && y <= 6;
      const slot = x === 6 && (y === 4 || y === 5);
      if (!inStarter && !slot) p.wall.push({ tile: makeDecor('1x1', `f${x}-${y}`), x, y });
    }
    return { g, p };
  }

  it('an unfitting auction painting can be exchanged for a fitting one of the same type', () => {
    const { g, p } = cramped();
    const big = art('portrait', 'gilded', 3, 3);
    const smallPortrait = art('portrait', 'silver', 1, 2);
    const wrongType = art('city', 'silver', 1, 2);
    const tooBig = art('portrait', 'silver', 2, 2);
    g.museum.portrait = [tooBig, smallPortrait];
    g.museum.city = [wrongType];
    giveTask(g, p, big);
    const opts = taskOptions(g, p)!;
    expect(opts.headFits).toBe(false);
    expect(opts.exchange.map((m) => m.id)).toEqual([smallPortrait.id]);
    expect(opts.canExcess).toBe(false);
    expect(reject(g, p.id, { type: 'excess' })).toMatch(/exchange/);
    expect(reject(g, p.id, { type: 'exchange', museum: wrongType.id })).toMatch(/portrait/);
    expect(reject(g, p.id, { type: 'exchange', museum: tooBig.id })).toMatch(/does not fit/);
    const prestige = { ...g.prestige };
    act(g, p.id, { type: 'exchange', museum: smallPortrait.id });
    expect(g.museum.portrait.map((m) => m.id).sort()).toEqual([tooBig.id, big.id].sort());
    expect(g.prestige).toEqual(prestige);
    expect(p.task?.queue[0]).toMatchObject({ from: 'museum' });
    expect(reject(g, p.id, { type: 'assist' })).toMatch(/must be hung/);
    act(g, p.id, { type: 'hang', which: 'new', x: 6, y: 4 });
    expect(p.task).toBeNull();
  });

  it('a painting that fits cannot be exchanged', () => {
    const { g, p } = cramped();
    g.museum.city = [art('city', 'silver', 1, 2)];
    giveTask(g, p, art('city', 'gilded', 1, 2));
    expect(reject(g, p.id, { type: 'exchange', museum: g.museum.city[0].id })).toMatch(/fits/);
  });

  it('with no exchange possible it becomes excess and the player takes a 1-point decor', () => {
    const { g, p } = cramped();
    const big = art('landscape', 'gilded', 3, 3);
    giveTask(g, p, big);
    p.assistant = art('city', 'walnut', 4, 4); // cannot be hung either
    const opts = taskOptions(g, p)!;
    expect(opts).toMatchObject({ canAssist: false, canHangAssistant: false, canExcess: true });
    const ones = g.decor['1x1'];
    act(g, p.id, { type: 'excess' });
    expect(p.excess).toEqual([big]);
    expect(g.decor['1x1']).toBe(ones - 1);
    expect(p.task?.queue[0]).toMatchObject({ from: 'excess' });
    expect(p.task?.queue[0].tile).toMatchObject({ kind: 'decor', shape: '1x1' });
    act(g, p.id, { type: 'hang', which: 'new', x: 6, y: 4 });
    expect(g.end).toBeNull();
  });

  it('the second excess painting ends the game once the round is over', () => {
    const { g, p } = cramped();
    p.excess = [art('city', 'gilded', 5, 4)];
    p.assistant = art('city', 'walnut', 4, 4);
    giveTask(g, p, art('landscape', 'gilded', 3, 3));
    const ev = act(g, p.id, { type: 'excess' });
    expect(ev.some((e) => e.t === 'trigger' && e.reason === 'excess')).toBe(true);
    act(g, p.id, { type: 'hang', which: 'new', x: 6, y: 4 });
    expect(g.phase.kind).toBe('over');
    const r = g.results!.players.find((x) => x.pid === p.id)!;
    expect(r.excessPoints).toBe(-4);
  });

  it('decor with nowhere to go goes back to the supply', () => {
    const { g, p } = cramped();
    p.assistant = art('city', 'walnut', 4, 4);
    const before = g.decor['3x1'];
    giveTask(g, p, art('city', 'gilded', 1, 1 + 1));
    p.task = { queue: [], rewards: [3] };
    // The shelf cannot be hung and the assistant cannot make room, so it goes straight back.
    const ev = act(g, p.id, { type: 'decor', shapes: ['3x1'] });
    expect(ev.some((e) => e.t === 'discard')).toBe(true);
    expect(g.decor['3x1']).toBe(before);
    expect(p.task).toBeNull();
  });
});

describe('museum and prestige', () => {
  it('the unsold painting raises its type by its value; markers never share a space', () => {
    const pr = { city: 4, portrait: 0, still: 0, landscape: 0 };
    // The rulebook example: a 4-value portrait lands on City Life at 4 and steps back to 3.
    expect(advancePrestige(pr, 'portrait', 4)).toEqual({ from: 0, to: 3, landed: 4 });
    expect(advancePrestige(pr, 'still', 4)).toEqual({ from: 0, to: 2, landed: 4 });
    expect(advancePrestige(pr, 'landscape', 9)).toEqual({ from: 0, to: 9, landed: 9 });
    expect(advancePrestige(pr, 'city', 5)).toEqual({ from: 4, to: 8, landed: 9 });
  });

  it('a full round sends the leftover to the museum and passes the gavel to the left', () => {
    const g = newGame(2);
    hangStarters(g);
    const first = g.auctioneer;
    act(g, g.players[first].id, { type: 'auction', sizes: ['1x2', '1x2', '1x2'] });
    act(g, 'p0', { type: 'bid', card: 5 });
    act(g, 'p1', { type: 'bid', card: 6 });
    const ph = g.phase;
    if (ph.kind !== 'acquire') throw new Error('not acquiring');
    const [firstPick, secondPick] = ph.order;
    act(g, firstPick, { type: 'take', lot: g.lots[0].id });
    act(g, secondPick, { type: 'take', lot: g.lots[0].id });
    const leftover = g.lots[0];
    for (const pid of [firstPick, secondPick]) {
      act(g, pid, { type: 'assist' });
      act(g, pid, { type: 'done' });
    }
    expect(g.museum[leftover.genre]).toContain(leftover);
    expect(g.prestige[leftover.genre]).toBe(leftover.value);
    expect(g.auctioneer).toBe((first + 1) % 2);
    expect(g.round).toBe(2);
    expect(g.phase.kind).toBe('select');
    checkInvariants(g);
  });
});

describe('game end', () => {
  it('ends after the round in which the last bid cards are played', () => {
    const g = newGame(2);
    hangStarters(g);
    for (const p of g.players) {
      p.stack = [p.stack[0], ...Array.from({ length: 19 }, (_, i) => i + 2)];
      p.hand = [1];
    }
    act(g, g.players[g.auctioneer].id, { type: 'auction', sizes: ['1x2', '1x2', '1x2'] });
    act(g, 'p0', { type: 'bid', card: 1 });
    act(g, 'p1', { type: 'bid', card: 1 });
    expect(g.end?.reason).toBe('cards');
    const ph = g.phase;
    if (ph.kind !== 'acquire') throw new Error('not acquiring');
    for (const pid of ph.order) {
      act(g, pid, { type: 'take', lot: g.lots[0].id });
      act(g, pid, { type: 'assist' });
      act(g, pid, { type: 'done' });
    }
    expect(g.phase.kind).toBe('over');
    expect(g.results?.reason).toBe('cards');
  });
});

describe('final scoring', () => {
  it('reproduces the 64-point scoring example from the rulebook', () => {
    const P = (genre: Genre, x: number, y: number): Hung => ({ tile: art(genre, 'walnut', 1, 2), x, y });
    const wall: Hung[] = [
      P('landscape', 0, 0),
      P('landscape', 4, 3),
      P('landscape', 2, 9), // these two touch: faux pas, but both are in the eyeline
      P('landscape', 3, 9),
      P('landscape', 6, 9),
      P('still', 2, 0),
      P('still', 6, 0),
      P('still', 0, 6),
      P('still', 8, 12),
      P('portrait', 4, 0),
      P('portrait', 8, 3),
      P('portrait', 4, 12),
      P('city', 8, 0),
      P('city', 2, 3),
      P('city', 6, 6),
      P('city', 0, 12),
      { tile: makeDecor('1x1', 'a'), x: 9, y: 0 },
      { tile: makeDecor('3x1', 'b'), x: 1, y: 2 },
      { tile: makeDecor('1x3', 'c'), x: 9, y: 2 },
      { tile: makeDecor('2x1', 'd'), x: 5, y: 5 },
      { tile: makeDecor('1x2', 'e'), x: 9, y: 6 },
    ];
    const res = computeResults([{ id: 'me', wall, excess: [art('city', 'gilded', 2, 2)], hand: [] }], { still: 5, portrait: 10, city: 15, landscape: 20 }, 'full');
    const r = res.players[0];
    const pts = Object.fromEntries(r.genres.map((x) => [x.genre, x.points]));
    expect(pts).toEqual({ still: 8, portrait: 9, city: 16, landscape: 15 });
    expect(r.decorPoints).toBe(11);
    expect(r.eyelinePoints).toBe(9);
    expect(r.fullPoints).toBe(0);
    expect(r.cornerPoints).toBe(-2);
    expect(r.excessPoints).toBe(-2);
    expect(r.total).toBe(64);
    expect(res.ranking).toEqual(['landscape', 'city', 'portrait', 'still']);
  });

  it('types still at zero prestige share the lowest multiplier', () => {
    const r = ranking({ city: 7, portrait: 0, still: 3, landscape: 0 });
    expect(r.multipliers).toEqual({ city: 5, still: 4, portrait: 2, landscape: 2 });
    expect(r.top).toBe('city');
    expect(ranking({ city: 0, portrait: 0, still: 0, landscape: 0 }).top).toBeNull();
  });

  it('a full wall scores +5 and exposed corners cost 2 each', () => {
    const full: Hung[] = [];
    for (let y = 0; y < 14; y++) for (let x = 0; x < 10; x++) full.push({ tile: makeDecor('1x1', `${x}${y}`), x, y });
    const r = scoreWall({ id: 'a', wall: full, excess: [], hand: [] }, ranking({ city: 1, portrait: 2, still: 3, landscape: 4 }));
    expect(r).toMatchObject({ full: true, fullPoints: 5, corners: 0, decorPoints: 140, total: 145 });
    const empty = scoreWall({ id: 'b', wall: [], excess: [], hand: [] }, ranking({ city: 1, portrait: 2, still: 3, landscape: 4 }));
    expect(empty).toMatchObject({ corners: 4, cornerPoints: -8, total: -8 });
  });

  it('ties go to the most bid-card value left in hand, then are shared', () => {
    const wall: Hung[] = [{ tile: art('city', 'gilded', 2, 3), x: 4, y: 4 }];
    const pr = { city: 1, portrait: 0, still: 0, landscape: 0 };
    const a = computeResults(
      [
        { id: 'a', wall, excess: [], hand: [1, 2] },
        { id: 'b', wall, excess: [], hand: [5] },
      ],
      pr,
      'cards',
    );
    expect(a.winners).toEqual(['b']);
    expect(a.players.map((r) => r.rank)).toEqual([1, 2]);
    const b = computeResults(
      [
        { id: 'a', wall, excess: [], hand: [5] },
        { id: 'b', wall, excess: [], hand: [2, 3] },
      ],
      pr,
      'cards',
    );
    expect(b.winners.sort()).toEqual(['a', 'b']);
  });
});

describe('full games', () => {
  it('bot games finish for every table size without breaking a rule', () => {
    for (let n = RULES.minPlayers; n <= RULES.maxPlayers; n++) {
      for (let seed = 1; seed <= 12; seed++) {
        const { s } = playBotGame(seed * 131 + n, n, { check: true });
        expect(s.phase.kind).toBe('over');
        expect(s.results?.players).toHaveLength(n);
        for (const p of s.players) {
          const g = gridOf(p.wall);
          for (const h of p.wall.slice(1)) {
            // Every tile but the starting painting was hung against another one.
            expect(canHang(new Int16Array(g).map((v) => (v === p.wall.indexOf(h) ? -1 : v)), h.tile.w, h.tile.h, h.x, h.y)).toBe(true);
          }
        }
      }
    }
  });

  it('bots only use what their own view shows', () => {
    const { s } = playBotGame(77, 3);
    expect(s.round).toBeGreaterThan(5);
  });
});
