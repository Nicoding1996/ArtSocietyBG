import { DECOR_INFO, PAINTING_SIZES, RULES, makeDecor, sizeKey } from './content';
import { taskOptions } from './options';
import { ranking } from './scoring';
import { GENRES, type Action, type DecorShape, type GameView, type Genre, type Painting, type PlayerView, type Tile } from './types';
import {
  WALL_H,
  WALL_W,
  borderCells,
  cornersCovered,
  emptyCells,
  fauxPasIds,
  gridOf,
  legalSpots,
  matchingFrames,
  overlapsEyeline,
  sameGenre,
  starterSpots,
  type Grid,
} from './wall';

type Rand = () => number;

/** What the bot believes about the end of the game, derived only from its own view. */
interface Outlook {
  /** Expected points per painting of each type at the end. */
  est: Record<Genre, number>;
  /** Chance each type ends as the most prestigious (eyeline bonus). */
  top: Record<Genre, number>;
  progress: number;
}

function outlook(v: GameView): Outlook {
  const fill = Math.max(...v.players.map((p) => 1 - emptyCells(gridOf(p.wall)) / (WALL_W * WALL_H)));
  const cards = 1 - (v.players[0]?.handCount ?? RULES.cards) / RULES.cards;
  const progress = Math.min(1, Math.max(fill * 1.15, cards * 1.3, v.round / 14));
  const rank = ranking(v.prestige);
  const est = {} as Record<Genre, number>;
  const top = {} as Record<Genre, number>;
  const temp = 7 * (1 - progress) + 1;
  let z = 0;
  for (const g of GENRES) {
    est[g] = 3.5 + (rank.multipliers[g] - 3.5) * (0.3 + 0.7 * progress);
    top[g] = Math.exp(v.prestige[g] / temp);
    z += top[g];
  }
  for (const g of GENRES) top[g] /= z;
  return { est, top, progress };
}

interface Spot {
  x: number;
  y: number;
  score: number;
}

/** How good it is to hang `tile` at (x, y) on this wall. */
function spotScore(o: Outlook, me: PlayerView, grid: Grid, faux: Set<string>, tile: Tile, x: number, y: number): number {
  let s = 0;
  if (tile.kind === 'painting') {
    const same = sameGenre(me.wall, grid, tile, x, y);
    if (same.length) {
      s -= 0.6;
      for (const id of same) if (!faux.has(id)) s -= o.est[tile.genre];
    } else s += o.est[tile.genre];
    const m = matchingFrames(me.wall, grid, tile, x, y).length;
    s += Math.min(m, 3) * 0.85 + Math.max(0, m - 3) * 0.85;
    if (overlapsEyeline(y, tile.h)) s += RULES.eyelinePoints * o.top[tile.genre];
    s += tile.w * tile.h * 0.05 * (1 - o.progress * 0.5);
  } else s += tile.points;
  s += cornersCovered(tile.w, tile.h, x, y) * RULES.cornerPenalty * 0.9;
  // Prefer snug spots, and avoid leaving single cells nothing but small decor can fill.
  const border = borderCells(grid, tile.w, tile.h, x, y);
  let contact = 2 * (tile.w + tile.h) - border.length;
  for (const c of border) {
    if (c.v >= 0) {
      contact++;
      continue;
    }
    let open = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (nx < 0 || ny < 0 || nx >= WALL_W || ny >= WALL_H) continue;
      if (nx >= x && nx < x + tile.w && ny >= y && ny < y + tile.h) continue;
      if (grid[ny * WALL_W + nx] < 0) open++;
    }
    if (open === 0) s -= 0.8;
  }
  s += contact * 0.1;
  return s;
}

function bestSpot(o: Outlook, me: PlayerView, tile: Tile, rand: Rand): Spot | null {
  const grid = gridOf(me.wall);
  const faux = fauxPasIds(me.wall, grid);
  let best: Spot | null = null;
  for (const { x, y } of legalSpots(grid, tile.w, tile.h)) {
    const score = spotScore(o, me, grid, faux, tile, x, y) + rand() * 0.05;
    if (!best || score > best.score) best = { x, y, score };
  }
  return best;
}

/** Rough worth of taking a painting this round. */
function lotValue(o: Outlook, v: GameView, me: PlayerView, lot: Painting, rand: Rand): number {
  const spot = bestSpot(o, me, lot, rand);
  if (spot) return spot.score;
  const grid = gridOf(me.wall);
  const swaps = v.museum[lot.genre].filter((m) => legalSpots(grid, m.w, m.h).length > 0);
  let swap = -Infinity;
  for (const m of swaps) swap = Math.max(swap, (bestSpot(o, me, m, rand)?.score ?? -3) - 0.2);
  if (swap > -Infinity) return swap;
  if (!me.assistant) return 0.2;
  return -RULES.excessPenalty + 1;
}

function softPick<T>(items: T[], score: (t: T) => number, temp: number, rand: Rand): T {
  const w = items.map((t) => Math.exp(score(t) / temp));
  let x = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    x -= w[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

function chooseSizes(o: Outlook, v: GameView, me: PlayerView, rand: Rand): string[] {
  const want = v.players.length + 1;
  const left: Record<string, number> = { ...v.supply };
  const probe = (w: number, h: number): Painting => ({ id: '?', kind: 'painting', genre: 'city', frame: 'gilded', w, h, value: w + h, seed: 0, scene: '', title: '' });
  const avg = GENRES.reduce((s, g) => s + o.est[g], 0) / 4;
  const scores = new Map<string, number>();
  for (const s of PAINTING_SIZES) {
    const k = sizeKey(s.w, s.h);
    if (!left[k]) continue;
    // Judge the shape only: type and frame stay hidden until the reveal.
    const spot = bestSpot({ ...o, est: { city: avg, portrait: avg, still: avg, landscape: avg }, top: { city: 0, portrait: 0, still: 0, landscape: 0 } }, me, probe(s.w, s.h), rand);
    scores.set(k, spot ? spot.score + (s.w + s.h) * 0.08 : -3);
  }
  const out: string[] = [];
  for (let i = 0; i < want; i++) {
    const keys = [...scores.keys()].filter((k) => left[k] > 0);
    if (!keys.length) break;
    const k = softPick(keys, (key) => scores.get(key)!, 1.4, rand);
    out.push(k);
    left[k]--;
  }
  // Fall back to any sizes still available (never expected, but keeps the bot legal).
  for (const k of Object.keys(left)) while (out.length < want && left[k]-- > 0) out.push(k);
  return out;
}

function chooseBid(o: Outlook, v: GameView, me: PlayerView, rand: Rand): number {
  const hand = [...(me.hand ?? [])].sort((a, b) => a - b);
  const values = v.lots.map((l) => lotValue(o, v, me, l, rand)).sort((a, b) => b - a);
  const n = v.players.length;
  const gap = values[0] - (values[n - 1] ?? values[values.length - 1]);
  const importance = Math.max(0, Math.min(1, gap / 5));
  const emptiest = Math.min(...v.players.map((p) => emptyCells(gridOf(p.wall))));
  const roundsLeft = Math.max(1, Math.min(hand.length, Math.ceil(emptiest / 9) + 1));
  const spare = hand.length - roundsLeft;
  if (importance < 0.18 && spare > 0) return hand[0];
  const q = 0.2 + 0.8 * importance + (rand() - 0.5) * 0.25;
  const idx = Math.max(0, Math.min(hand.length - 1, Math.round((hand.length - 1) * q)));
  return hand[idx];
}

function choosePick(o: Outlook, v: GameView, me: PlayerView, rand: Rand): string {
  const ph = v.phase.kind === 'acquire' ? v.phase : null;
  const last = !!ph && ph.next === ph.order.length - 1;
  const mine = (g: Genre) => me.wall.filter((h) => h.tile.kind === 'painting' && h.tile.genre === g).length;
  const others = (g: Genre) => {
    const rest = v.players.filter((p) => p.id !== me.id);
    return rest.reduce((s, p) => s + p.wall.filter((h) => h.tile.kind === 'painting' && h.tile.genre === g).length, 0) / Math.max(1, rest.length);
  };
  let best = v.lots[0];
  let bestScore = -Infinity;
  for (const lot of v.lots) {
    let s = lotValue(o, v, me, lot, rand);
    if (last) {
      // The painting left behind goes to the museum and lifts its type's prestige.
      const leftover = v.lots.find((l) => l !== lot);
      if (leftover) s += (mine(leftover.genre) - others(leftover.genre)) * leftover.value * 0.05 * (0.5 + o.progress);
    }
    if (s > bestScore) {
      bestScore = s;
      best = lot;
    }
  }
  return best.id;
}

function chooseDecor(o: Outlook, me: PlayerView, shapes: DecorShape[], reward: number, multi: boolean, decor: Record<DecorShape, number>, rand: Rand): DecorShape[] {
  const worth = (s: DecorShape) => {
    const spot = bestSpot(o, me, makeDecor(s, '?'), rand);
    return spot ? spot.score : me.assistant ? -5 : DECOR_INFO[s].points * 0.4;
  };
  if (!multi) {
    let best = shapes[0];
    let score = -Infinity;
    for (const s of shapes) {
      const w = worth(s);
      if (w > score) {
        score = w;
        best = s;
      }
    }
    return [best];
  }
  const left = { ...decor };
  const out: DecorShape[] = [];
  let budget = reward;
  while (budget > 0) {
    const options = shapes.filter((s) => left[s] > 0 && DECOR_INFO[s].points <= budget);
    if (!options.length) break;
    options.sort((a, b) => worth(b) - worth(a));
    const s = options[0];
    out.push(s);
    left[s]--;
    budget -= DECOR_INFO[s].points;
  }
  return out.length ? out : [shapes[0]];
}

function taskStep(o: Outlook, v: GameView, me: PlayerView, rand: Rand): Action | null {
  const opt = taskOptions(v, me);
  if (!opt) return null;
  if (opt.stage === 'decor') {
    if (!opt.decorShapes.length) {
      // The supply has run out of what the reward can buy: swap decor on the wall to free some up.
      const useful = opt.swaps.find((s) => s.frees.some((f) => DECOR_INFO[f].points <= opt.reward));
      return useful ? { type: 'swapDecor', shape: useful.shape, x: useful.x, y: useful.y } : { type: 'skipDecor' };
    }
    return { type: 'decor', shapes: chooseDecor(o, me, opt.decorShapes, opt.reward, opt.multi, v.decor, rand) };
  }
  const aide = me.assistant;
  const aideSpot = opt.canHangAssistant && aide ? bestSpot(o, me, aide, rand) : null;
  if (opt.stage === 'finish') {
    if (aide && aideSpot && (aide.kind === 'decor' || aideSpot.score > 0.4 * o.est[aide.genre])) return { type: 'hang', which: 'assistant', x: aideSpot.x, y: aideSpot.y };
    return { type: 'done' };
  }
  const head = opt.head!;
  if (head.from === 'museum') {
    const s = bestSpot(o, me, head.tile, rand);
    return s ? { type: 'hang', which: 'new', x: s.x, y: s.y } : null;
  }
  if (opt.headFits) {
    const s = bestSpot(o, me, head.tile, rand)!;
    if (aide && aideSpot && aideSpot.score >= Math.max(2, s.score + 0.5)) return { type: 'hang', which: 'assistant', x: aideSpot.x, y: aideSpot.y };
    if (head.tile.kind === 'painting' && s.score < 0 && opt.canAssist) return { type: 'assist' };
    return { type: 'hang', which: 'new', x: s.x, y: s.y };
  }
  if (head.tile.kind === 'decor') {
    if (opt.canAssist) return { type: 'assist' };
    if (aideSpot) return { type: 'hang', which: 'assistant', x: aideSpot.x, y: aideSpot.y };
    return opt.canDiscard ? { type: 'discard' } : null;
  }
  if (opt.exchange.length) {
    let best = opt.exchange[0];
    let score = -Infinity;
    for (const m of opt.exchange) {
      const sc = bestSpot(o, me, m, rand)?.score ?? -Infinity;
      if (sc > score) {
        score = sc;
        best = m;
      }
    }
    return { type: 'exchange', museum: best.id };
  }
  if (opt.canAssist) return { type: 'assist' };
  if (aideSpot) return { type: 'hang', which: 'assistant', x: aideSpot.x, y: aideSpot.y };
  return opt.canExcess ? { type: 'excess' } : null;
}

/** Picks a legal action for `me`, using only what `me` can see. Null when nothing is asked of them. */
export function botDecide(v: GameView, me: string, rand: Rand = Math.random): Action | null {
  const p = v.players.find((x) => x.id === me);
  if (!p) return null;
  const ph = v.phase;
  const o = outlook(v);
  switch (ph.kind) {
    case 'setup': {
      if (!p.starter) return null;
      const spots = starterSpots(p.starter.w, p.starter.h);
      const s = spots[Math.floor(rand() * spots.length)];
      return { type: 'starter', x: s.x, y: s.y };
    }
    case 'select':
      if (v.players[v.auctioneer]?.id !== me) return null;
      return { type: 'auction', sizes: chooseSizes(o, v, p, rand) };
    case 'bid':
      if (p.hasBid || !p.hand?.length) return null;
      return { type: 'bid', card: chooseBid(o, v, p, rand) };
    case 'acquire':
      if (p.task) return taskStep(o, v, p, rand);
      if (ph.order[ph.next] === me && v.lots.length) return { type: 'take', lot: choosePick(o, v, p, rand) };
      return null;
    case 'over':
      return null;
  }
}

/**
 * Plain legal moves for `me`, in a fixed order, for when botDecide has none or fails: the server tries
 * them until the engine accepts one. Moving tiles is left out, since the game never needs a move to go on.
 */
export function fallbackActions(v: GameView, me: string): Action[] {
  const p = v.players.find((x) => x.id === me);
  if (!p) return [];
  const ph = v.phase;
  const out: Action[] = [];
  switch (ph.kind) {
    case 'setup': {
      const s = p.starter ? starterSpots(p.starter.w, p.starter.h)[0] : undefined;
      if (s) out.push({ type: 'starter', x: s.x, y: s.y });
      break;
    }
    case 'select': {
      const want = v.players.length + 1;
      const sizes: string[] = [];
      for (const [k, n] of Object.entries(v.supply)) for (let i = 0; i < n && sizes.length < want; i++) sizes.push(k);
      out.push({ type: 'auction', sizes });
      break;
    }
    case 'bid':
      if (p.hand?.length) out.push({ type: 'bid', card: Math.min(...p.hand) });
      break;
    case 'acquire': {
      if (!p.task) {
        if (v.lots.length) out.push({ type: 'take', lot: v.lots[0].id });
        break;
      }
      const o = taskOptions(v, p);
      if (!o) break;
      if (o.stage === 'decor') {
        if (o.decorShapes.length) out.push({ type: 'decor', shapes: [o.decorShapes[0]] });
        for (const s of o.swaps) out.push({ type: 'swapDecor', shape: s.shape, x: s.x, y: s.y });
        out.push({ type: 'skipDecor' });
        break;
      }
      const grid = gridOf(p.wall);
      const spot = (t: Tile | null | undefined) => (t ? legalSpots(grid, t.w, t.h)[0] : undefined);
      const head = o.canHangHead ? spot(o.head?.tile) : undefined;
      if (head) out.push({ type: 'hang', which: 'new', x: head.x, y: head.y });
      for (const m of o.exchange) out.push({ type: 'exchange', museum: m.id });
      if (o.canAssist) out.push({ type: 'assist' });
      if (o.canDiscard) out.push({ type: 'discard' });
      if (o.canExcess) out.push({ type: 'excess' });
      if (o.canDone) out.push({ type: 'done' });
      const aide = o.canHangAssistant ? spot(p.assistant) : undefined;
      if (aide) out.push({ type: 'hang', which: 'assistant', x: aide.x, y: aide.y });
      break;
    }
    case 'over':
      break;
  }
  return out;
}
