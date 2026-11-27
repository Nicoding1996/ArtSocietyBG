import { DECOR_INFO, GENRE_INFO, RULES, buildPaintings, decorList, emptyDecorSupply, makeDecor, parseSize, sizeKey } from './content';
import { nextRandom, shuffle } from './rng';
import { computeResults } from './scoring';
import {
  DECOR_SHAPES,
  GENRES,
  type Action,
  type Decor,
  type DecorShape,
  type EndReason,
  type GameEvent,
  type GameState,
  type GameView,
  type Genre,
  type HatId,
  type IncomingFrom,
  type LogKind,
  type Painting,
  type PlayerState,
  type PlayerView,
  type TieBreak,
  type Tile,
} from './types';
import { canHang, coversStar, fits, gridOf, inside, isFull, matchingFrames, sameGenre } from './wall';

export interface NewPlayer {
  id: string;
  name: string;
  color: string;
  hat: HatId;
  isBot: boolean;
}

export type Result = { ok: true; events: GameEvent[] } | { ok: false; error: string };

const LOG_KEEP = 240;

function log(g: GameState, kind: LogKind, text: string, pid?: string) {
  g.log.push({ id: ++g.logSeq, kind, text, pid });
  if (g.log.length > LOG_KEEP) g.log.splice(0, g.log.length - LOG_KEEP);
}

export const describe = (p: Painting) => `\u201c${p.title}\u201d (${GENRE_INFO[p.genre].name}, ${p.w}\u00d7${p.h})`;

function emptyMuseum(): Record<Genre, Painting[]> {
  return { city: [], portrait: [], still: [], landscape: [] };
}

export function createGame(opts: { seed: number; players: NewPlayer[] }): { state: GameState; events: GameEvent[] } {
  const n = opts.players.length;
  if (n < RULES.minPlayers || n > RULES.maxPlayers) throw new Error(`Art Society needs ${RULES.minPlayers}-${RULES.maxPlayers} players`);
  const g: GameState = {
    seed: opts.seed >>> 0,
    rng: opts.seed >>> 0,
    round: 0,
    auctioneer: 0,
    players: [],
    supply: [],
    lots: [],
    museum: emptyMuseum(),
    prestige: { city: 0, portrait: 0, still: 0, landscape: 0 },
    decor: emptyDecorSupply(),
    decorSeq: 0,
    phase: { kind: 'setup' },
    end: null,
    log: [],
    logSeq: 0,
    results: null,
  };
  const r = () => nextRandom(g);
  const { supply, starters } = buildPaintings(r);
  g.supply = supply;
  const startCards = shuffle<number>(r, [...RULES.startCards]).slice(0, n);
  g.players = opts.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    hat: p.hat,
    isBot: p.isBot,
    connected: true,
    wall: [],
    assistant: null,
    excess: [],
    hand: Array.from({ length: RULES.cards }, (_, k) => k + 1),
    stack: [startCards[i]],
    bid: null,
    starter: starters[i],
    took: false,
    task: null,
  }));
  g.auctioneer = startCards.indexOf(Math.min(...startCards));
  log(g, 'round', 'The salon opens. Everyone hangs a starting painting over a star.');
  log(g, 'info', `${g.players[g.auctioneer].name} drew the lowest starting card (${startCards[g.auctioneer]}) and takes the gavel.`, g.players[g.auctioneer].id);
  return { state: g, events: [{ t: 'start' }] };
}

/** Players the game is waiting for right now. */
export function waitingOn(g: GameState): string[] {
  const ph = g.phase;
  switch (ph.kind) {
    case 'setup':
      return g.players.filter((p) => p.starter).map((p) => p.id);
    case 'select':
      return [g.players[g.auctioneer].id];
    case 'bid':
      return g.players.filter((p) => p.bid === null).map((p) => p.id);
    case 'acquire': {
      const out = g.players.filter((p) => p.task).map((p) => p.id);
      const picker = ph.order[ph.next];
      if (picker && !out.includes(picker)) out.unshift(picker);
      return out;
    }
    case 'over':
      return [];
  }
}

const isInt = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export function applyAction(g: GameState, pid: string, action: Action): Result {
  const p = g.players.find((x) => x.id === pid);
  if (!p) return { ok: false, error: 'You are not seated at this table.' };
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') return { ok: false, error: 'Unknown action.' };
  const events: GameEvent[] = [];
  const error = act(g, p, action, events);
  if (error) return { ok: false, error };
  return { ok: true, events };
}

function act(g: GameState, p: PlayerState, a: Action, ev: GameEvent[]): string | null {
  const ph = g.phase;
  switch (a.type) {
    case 'starter': {
      if (ph.kind !== 'setup') return 'The starting paintings are already up.';
      const s = p.starter;
      if (!s) return 'Your starting painting is already hanging.';
      if (!isInt(a.x, 0, RULES.wallW) || !isInt(a.y, 0, RULES.wallH) || !inside(s.w, s.h, a.x, a.y)) return 'That spot is off the wall.';
      if (!coversStar(s.w, s.h, a.x, a.y)) return 'The starting painting must cover at least one star.';
      p.wall.push({ tile: s, x: a.x, y: a.y });
      p.starter = null;
      ev.push({ t: 'starter', pid: p.id, tile: s, x: a.x, y: a.y });
      log(g, 'hang', `${p.name} hangs ${describe(s)} as a starting painting.`, p.id);
      if (g.players.every((x) => !x.starter)) startRound(g, ev);
      return null;
    }
    case 'auction': {
      if (ph.kind !== 'select') return 'This is not the time to choose paintings.';
      if (g.players[g.auctioneer] !== p) return 'Only the auctioneer chooses the paintings.';
      const want = g.players.length + 1;
      if (!Array.isArray(a.sizes) || a.sizes.length !== want) return `Choose exactly ${want} paintings.`;
      const need = new Map<string, number>();
      for (const k of a.sizes) {
        if (typeof k !== 'string' || !parseSize(k)) return 'Unknown painting size.';
        need.set(k, (need.get(k) ?? 0) + 1);
      }
      for (const [k, count] of need) {
        const have = g.supply.filter((t) => sizeKey(t.w, t.h) === k).length;
        if (have < count) return `Only ${have} painting${have === 1 ? '' : 's'} of size ${k.replace('x', '\u00d7')} left.`;
      }
      // The supply is shuffled, so the first tile of a size is a blind draw from that stack.
      const lots: Painting[] = [];
      for (const k of a.sizes) {
        const i = g.supply.findIndex((t) => sizeKey(t.w, t.h) === k);
        lots.push(g.supply.splice(i, 1)[0]);
      }
      lots.sort((x, y) => x.value - y.value || x.w - y.w);
      g.lots = lots;
      g.phase = { kind: 'bid' };
      for (const x of g.players) x.bid = null;
      ev.push({ t: 'lots', pid: p.id, lots: [...lots] });
      log(g, 'auction', `${p.name} puts up ${lots.length} paintings: ${lots.map((l) => `${GENRE_INFO[l.genre].short} ${l.w}\u00d7${l.h}`).join(', ')}.`, p.id);
      return null;
    }
    case 'bid': {
      if (ph.kind !== 'bid') return 'Bidding is closed.';
      if (p.bid !== null) return 'Your bid is already sealed.';
      if (!isInt(a.card, 1, RULES.cards) || !p.hand.includes(a.card)) return 'You do not hold that bid card.';
      p.bid = a.card;
      ev.push({ t: 'bid', pid: p.id });
      if (g.players.every((x) => x.bid !== null)) reveal(g, ev);
      return null;
    }
    case 'take': {
      if (ph.kind !== 'acquire') return 'Nothing is for sale right now.';
      if (ph.order[ph.next] !== p.id) return 'It is not your turn to choose.';
      const i = g.lots.findIndex((l) => l.id === a.lot);
      if (i < 0) return 'That painting is not on offer.';
      const tile = g.lots.splice(i, 1)[0];
      p.took = true;
      p.task = { queue: [{ tile, from: 'auction' }], rewards: [] };
      ph.next++;
      ev.push({ t: 'take', pid: p.id, tile, pick: ph.next });
      log(g, 'take', `${p.name} takes ${describe(tile)}.`, p.id);
      advance(g, p, ev);
      roundEnd(g, ev);
      return null;
    }
    case 'hang':
    case 'assist':
    case 'exchange':
    case 'excess':
    case 'decor':
    case 'swapDecor':
    case 'skipDecor':
    case 'discard':
    case 'done': {
      if (ph.kind !== 'acquire' || !p.task) return 'You have nothing to hang right now.';
      const err = taskAction(g, p, a, ev);
      if (err) return err;
      advance(g, p, ev);
      roundEnd(g, ev);
      return null;
    }
    default:
      return 'Unknown action.';
  }
}

function taskAction(g: GameState, p: PlayerState, a: Action, ev: GameEvent[]): string | null {
  const t = p.task!;
  const head = t.queue[0];
  const grid = gridOf(p.wall);
  switch (a.type) {
    case 'hang': {
      if (t.rewards.length) return 'Choose your decor tile first.';
      let tile: Tile;
      let from: IncomingFrom | 'assistant';
      if (a.which === 'assistant') {
        if (!p.assistant) return 'Your assistant is not holding anything.';
        if (head?.from === 'museum') return 'Hang the painting from the museum first.';
        tile = p.assistant;
        from = 'assistant';
      } else if (a.which === 'new') {
        if (!head) return 'You have nothing new to hang.';
        tile = head.tile;
        from = head.from;
      } else return 'Unknown tile.';
      if (!isInt(a.x, 0, RULES.wallW) || !isInt(a.y, 0, RULES.wallH)) return 'That spot is off the wall.';
      if (!canHang(grid, tile.w, tile.h, a.x, a.y)) {
        if (!inside(tile.w, tile.h, a.x, a.y)) return 'It must hang fully inside the wall.';
        return 'Tiles must hang on empty space, touching another tile along an edge.';
      }
      let matches: string[] = [];
      let faux: string[] = [];
      if (tile.kind === 'painting') {
        matches = matchingFrames(p.wall, grid, tile, a.x, a.y);
        faux = sameGenre(p.wall, grid, tile, a.x, a.y);
      }
      p.wall.push({ tile, x: a.x, y: a.y });
      if (a.which === 'assistant') p.assistant = null;
      else t.queue.shift();
      ev.push({ t: 'hang', pid: p.id, tile, x: a.x, y: a.y, from, matches, faux });
      if (tile.kind === 'painting') {
        log(g, 'hang', `${p.name} hangs ${describe(tile)}.`, p.id);
        if (faux.length) log(g, 'warn', `Faux pas! ${p.name}'s ${GENRE_INFO[tile.genre].name.toLowerCase()} touches another of its type: they will not score.`, p.id);
        if (matches.length) {
          t.rewards.push({ points: matches.length, from: 'frames' });
          log(g, 'decor', `${p.name} matched ${matches.length} frame${matches.length === 1 ? '' : 's'} and earns decor worth up to ${matches.length}.`, p.id);
        }
      } else log(g, 'decor', `${p.name} hangs a ${DECOR_INFO[tile.shape].name.toLowerCase()} (+${tile.points}).`, p.id);
      if (isFull(gridOf(p.wall)) && !g.end) trigger(g, ev, 'full', p);
      return null;
    }
    case 'assist': {
      if (t.rewards.length) return 'Choose your decor tile first.';
      if (!head) return 'You have nothing new to hand over.';
      if (head.from === 'museum') return 'A painting from the museum must be hung.';
      if (p.assistant) return 'Your assistant is already holding a tile.';
      p.assistant = head.tile;
      t.queue.shift();
      ev.push({ t: 'assist', pid: p.id, tile: head.tile, from: head.from });
      log(g, 'hang', `${p.name} gives ${head.tile.kind === 'painting' ? describe(head.tile) : `a ${DECOR_INFO[head.tile.shape].name.toLowerCase()}`} to their assistant.`, p.id);
      return null;
    }
    case 'exchange': {
      if (t.rewards.length) return 'Choose your decor tile first.';
      if (!head || head.from !== 'auction' || head.tile.kind !== 'painting') return 'Only a painting just bought at auction can be exchanged.';
      const mine = head.tile;
      if (fits(grid, mine.w, mine.h)) return 'That painting fits on your wall, so it must be hung (or given to your assistant).';
      const pile = g.museum[mine.genre];
      const i = pile.findIndex((m) => m.id === a.museum);
      if (i < 0) return `Choose a ${GENRE_INFO[mine.genre].name.toLowerCase()} from the museum.`;
      const got = pile[i];
      if (!fits(grid, got.w, got.h)) return 'That museum painting does not fit on your wall either.';
      pile.splice(i, 1, mine);
      t.queue[0] = { tile: got, from: 'museum' };
      ev.push({ t: 'exchange', pid: p.id, gave: mine, got });
      log(g, 'museum', `${p.name} exchanges ${describe(mine)} for ${describe(got)} from the museum.`, p.id);
      return null;
    }
    case 'excess': {
      if (t.rewards.length) return 'Choose your decor tile first.';
      if (!head || head.from !== 'auction' || head.tile.kind !== 'painting') return 'Only a painting just bought at auction can be stored as excess.';
      const mine = head.tile;
      if (fits(grid, mine.w, mine.h)) return 'That painting fits on your wall.';
      if (exchangeOptions(g, p).length) return 'A painting of the same type in the museum fits: exchange it instead.';
      p.excess.push(mine);
      t.queue.shift();
      ev.push({ t: 'excess', pid: p.id, tile: mine });
      log(g, 'warn', `${describe(mine)} does not fit. ${p.name} stores it as an excess painting (\u2212${RULES.excessPenalty}).`, p.id);
      if (g.decor['1x1'] > 0) {
        g.decor['1x1']--;
        t.queue.unshift({ tile: makeDecor('1x1', `d${++g.decorSeq}`), from: 'excess' });
      } else {
        // The supply has no 1-point decor left. The player may free one up by swapping decor on their
        // wall (see decorSwaps); with nothing to swap, advance() drops it.
        t.rewards.push({ points: 1, from: 'excess' });
      }
      if (p.excess.length >= RULES.excessLimit && !g.end) trigger(g, ev, 'excess', p);
      return null;
    }
    case 'decor': {
      const reward = t.rewards[0];
      if (!reward) return 'You have not earned any decor.';
      const k = reward.points;
      if (!Array.isArray(a.shapes) || !a.shapes.length || a.shapes.length > k) return 'Choose your decor.';
      const counts = new Map<DecorShape, number>();
      let total = 0;
      for (const s of a.shapes) {
        if (!(DECOR_SHAPES as readonly string[]).includes(s)) return 'Unknown decor.';
        counts.set(s, (counts.get(s) ?? 0) + 1);
        total += DECOR_INFO[s].points;
      }
      for (const [s, c] of counts) if (g.decor[s] < c) return `No ${DECOR_INFO[s].name.toLowerCase()} left in the supply.`;
      if (k < 4 && a.shapes.length !== 1) return 'Choose one decor tile.';
      if (total > k) return `Your decor may be worth at most ${k}.`;
      const tiles: Decor[] = a.shapes.map((s) => {
        g.decor[s]--;
        return makeDecor(s, `d${++g.decorSeq}`);
      });
      t.rewards.shift();
      const from: IncomingFrom = reward.from === 'excess' ? 'excess' : 'reward';
      t.queue.unshift(...tiles.map((tile) => ({ tile, from })));
      ev.push({ t: 'decor', pid: p.id, tiles, reward: k });
      log(g, 'decor', `${p.name} takes ${tiles.map((d) => `a ${DECOR_INFO[d.shape].name.toLowerCase()}`).join(' and ')}.`, p.id);
      return null;
    }
    case 'swapDecor': {
      if (!t.rewards.length) return 'Decor can only be swapped while you choose a decor tile.';
      if (!DECOR_SHAPES.some((s) => g.decor[s] === 0)) return 'Decor can only be swapped once the supply has run out of a size.';
      if (!(DECOR_SHAPES as readonly string[]).includes(a.shape)) return 'Unknown decor.';
      if (g.decor[a.shape] <= 0) return `No ${DECOR_INFO[a.shape].name.toLowerCase()} left in the supply.`;
      const sw = decorSwaps(g, p).find((s) => s.shape === a.shape && s.x === a.x && s.y === a.y);
      if (!sw) return 'A swap must exactly replace 2 or 3 decor tiles on your wall, at least one of a size that has run out.';
      const gone = new Set(sw.removed.map((d) => d.id));
      p.wall = p.wall.filter((h) => !gone.has(h.tile.id));
      for (const d of sw.removed) g.decor[d.shape]++;
      g.decor[sw.shape]--;
      const tile = makeDecor(sw.shape, `d${++g.decorSeq}`);
      p.wall.push({ tile, x: sw.x, y: sw.y });
      ev.push({ t: 'swapDecor', pid: p.id, removed: sw.removed, tile, x: sw.x, y: sw.y });
      log(g, 'decor', `${p.name} swaps ${decorList(sw.removed)} on their wall for a ${DECOR_INFO[sw.shape].name.toLowerCase()}, which puts them back in the supply.`, p.id);
      return null;
    }
    case 'skipDecor': {
      const reward = t.rewards[0];
      if (!reward) return 'You have not earned any decor.';
      if (DECOR_SHAPES.some((s) => g.decor[s] > 0 && DECOR_INFO[s].points <= reward.points)) return 'The supply still has decor of that value: take one.';
      t.rewards.shift();
      log(g, 'decor', `${p.name} goes without the decor.`, p.id);
      return null;
    }
    case 'discard': {
      if (t.rewards.length) return 'Choose your decor tile first.';
      if (!head || head.tile.kind !== 'decor') return 'Only decor can be put back.';
      if (fits(grid, head.tile.w, head.tile.h)) return 'That decor fits on your wall.';
      if (!p.assistant) return 'Your assistant can hold it for you.';
      g.decor[head.tile.shape]++;
      t.queue.shift();
      ev.push({ t: 'discard', pid: p.id, tile: head.tile });
      log(g, 'decor', `${p.name} has no room for the ${DECOR_INFO[head.tile.shape].name.toLowerCase()} and puts it back.`, p.id);
      return null;
    }
    case 'done': {
      if (t.rewards.length || t.queue.length) return 'You still have something to hang.';
      finishTask(p, ev);
      return null;
    }
  }
  return 'Unknown action.';
}

/** Museum paintings an unfitting auction painting could be exchanged for. */
export function exchangeOptions(g: Pick<GameState, 'museum'>, p: Pick<PlayerState, 'wall' | 'task'>): Painting[] {
  const head = p.task?.queue[0];
  if (!head || head.from !== 'auction' || head.tile.kind !== 'painting') return [];
  const grid = gridOf(p.wall);
  if (fits(grid, head.tile.w, head.tile.h)) return [];
  return g.museum[head.tile.genre].filter((m) => fits(grid, m.w, m.h));
}

export interface DecorSwap {
  /** The longer tile taken from the supply and hung at (x, y) in place of `removed`. */
  shape: DecorShape;
  x: number;
  y: number;
  /** The decor on the wall that goes back to the supply. */
  removed: Decor[];
  /** Sizes among `removed` that the supply had run out of. */
  frees: DecorShape[];
}

const SWAP_TARGETS: readonly DecorShape[] = ['2x1', '1x2', '3x1', '1x3'];

/**
 * Once the supply has run out of a decor size, a player may swap 2 or 3 decor tiles in a line on their
 * wall for one longer tile covering exactly the same spaces. The shorter tiles go back to the supply,
 * so the size that ran out can be taken again. Points do not change: decor scores its area.
 */
export function decorSwaps(g: Pick<GameState, 'decor'>, p: Pick<PlayerState, 'wall'>): DecorSwap[] {
  if (!DECOR_SHAPES.some((s) => g.decor[s] === 0)) return [];
  const grid = gridOf(p.wall);
  const out: DecorSwap[] = [];
  for (const shape of SWAP_TARGETS) {
    if (g.decor[shape] <= 0) continue;
    const { w, h } = DECOR_INFO[shape];
    for (let y = 0; y + h <= RULES.wallH; y++) {
      for (let x = 0; x + w <= RULES.wallW; x++) {
        // Every space must hold decor, and every tile involved must lie inside the rectangle.
        const covering = new Set<number>();
        let ok = true;
        for (let yy = y; yy < y + h && ok; yy++) {
          for (let xx = x; xx < x + w && ok; xx++) {
            const i = grid[yy * RULES.wallW + xx];
            if (i < 0 || p.wall[i].tile.kind !== 'decor') ok = false;
            else covering.add(i);
          }
        }
        if (!ok || covering.size < 2) continue;
        const removed: Decor[] = [];
        for (const i of covering) {
          const hung = p.wall[i];
          const tile = hung.tile;
          if (tile.kind !== 'decor' || hung.x < x || hung.y < y || hung.x + tile.w > x + w || hung.y + tile.h > y + h) {
            ok = false;
            break;
          }
          removed.push(tile);
        }
        if (!ok) continue;
        const frees = [...new Set(removed.map((d) => d.shape))].filter((s) => g.decor[s] === 0);
        if (frees.length) out.push({ shape, x, y, removed, frees });
      }
    }
  }
  return out;
}

function finishTask(p: PlayerState, ev: GameEvent[]) {
  p.task = null;
  ev.push({ t: 'done', pid: p.id });
}

/** Resolves everything that needs no decision, so the task always waits on a real choice. */
function advance(g: GameState, p: PlayerState, ev: GameEvent[]) {
  for (let guard = 0; guard < 50; guard++) {
    const t = p.task;
    if (!t) return;
    const grid = gridOf(p.wall);
    if (isFull(grid)) {
      // Decor earned in the round a wall is completed is not gained.
      t.rewards = [];
      t.queue = t.queue.filter((inc) => {
        if (inc.tile.kind !== 'decor') return true;
        g.decor[inc.tile.shape]++;
        return false;
      });
      if (!t.queue.length) finishTask(p, ev);
      return;
    }
    if (t.rewards.length) {
      const r = t.rewards[0];
      const k = r.points;
      if (!DECOR_SHAPES.some((s) => g.decor[s] > 0 && DECOR_INFO[s].points <= k)) {
        // A swap on the wall could put a tile of that value back in the supply: the player decides.
        if (decorSwaps(g, p).some((sw) => sw.frees.some((s) => DECOR_INFO[s].points <= k))) return;
        t.rewards.shift();
        log(g, 'decor', r.from === 'excess' ? `No 1-point decor is left in the supply, so ${p.name} gets none for the excess painting.` : 'The decor supply has nothing left of that value.', p.id);
        continue;
      }
      return;
    }
    const head = t.queue[0];
    if (head) {
      const stuck = p.assistant && !fits(grid, p.assistant.w, p.assistant.h);
      if (head.tile.kind === 'decor' && !fits(grid, head.tile.w, head.tile.h) && stuck) {
        g.decor[head.tile.shape]++;
        t.queue.shift();
        ev.push({ t: 'discard', pid: p.id, tile: head.tile });
        log(g, 'decor', `${p.name} has no room for the ${DECOR_INFO[head.tile.shape].name.toLowerCase()} and puts it back.`, p.id);
        continue;
      }
      return;
    }
    // Nothing new left: the player may still hang the assistant's tile, or finish.
    if (p.assistant && fits(grid, p.assistant.w, p.assistant.h)) return;
    finishTask(p, ev);
    return;
  }
}

function trigger(g: GameState, ev: GameEvent[], reason: EndReason, p: PlayerState | null) {
  g.end = { reason, pid: p?.id ?? null };
  ev.push({ t: 'trigger', reason, pid: p?.id ?? null });
  const why: Record<EndReason, string> = {
    full: `${p?.name}'s wall is complete!`,
    excess: `${p?.name} has stored a second excess painting.`,
    cards: 'The last bid cards have been played.',
    supply: 'The supply is running out of paintings.',
  };
  log(g, 'end', `${why[reason]} This is the final round.`, p?.id);
}

/** Positive if a's bidding stack beats b's: compare from the top card down. */
function compareStacks(a: PlayerState, b: PlayerState): { diff: number; depth: number } {
  const n = Math.max(a.stack.length, b.stack.length);
  for (let d = 0; d < n; d++) {
    const ca = a.stack[a.stack.length - 1 - d] ?? -1;
    const cb = b.stack[b.stack.length - 1 - d] ?? -1;
    if (ca !== cb) return { diff: ca - cb, depth: d };
  }
  return { diff: 0, depth: n };
}

function reveal(g: GameState, ev: GameEvent[]) {
  const bids: Record<string, number> = {};
  for (const p of g.players) {
    const card = p.bid!;
    bids[p.id] = card;
    p.hand.splice(p.hand.indexOf(card), 1);
    p.stack.push(card);
    p.bid = null;
    p.took = false;
  }
  const sorted = [...g.players].sort((a, b) => -compareStacks(a, b).diff || g.players.indexOf(a) - g.players.indexOf(b));
  const order = sorted.map((p) => p.id);
  const ties: TieBreak[] = [];
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (bids[a.id] !== bids[b.id]) continue;
    const { depth } = compareStacks(a, b);
    let tb = ties.find((x) => x.bid === bids[a.id]);
    if (!tb) ties.push((tb = { bid: bids[a.id], steps: [] }));
    tb.steps.push({
      winner: a.id,
      loser: b.id,
      depth,
      winnerCard: a.stack[a.stack.length - 1 - depth],
      loserCard: b.stack[b.stack.length - 1 - depth],
    });
  }
  g.phase = { kind: 'acquire', order, next: 0, bids, ties };
  ev.push({ t: 'reveal', bids, order, ties });
  log(g, 'bid', `Bids: ${sorted.map((p) => `${p.name} ${bids[p.id]}`).join(', ')}.`);
  for (const tb of ties) {
    for (const s of tb.steps) {
      const w = g.players.find((p) => p.id === s.winner)!;
      const l = g.players.find((p) => p.id === s.loser)!;
      log(g, 'bid', `Tie on ${tb.bid}: ${w.name}'s earlier card ${s.winnerCard} beats ${l.name}'s ${s.loserCard}.`);
    }
  }
  if (g.players.every((p) => p.hand.length === 0) && !g.end) trigger(g, ev, 'cards', null);
}

/** Moves a type's prestige marker. It may not share a space: it falls back to the first free one. */
export function advancePrestige(prestige: Record<Genre, number>, genre: Genre, amount: number): { from: number; to: number; landed: number } {
  const from = prestige[genre];
  const landed = from + amount;
  const taken = new Set(GENRES.filter((x) => x !== genre && prestige[x] > 0).map((x) => prestige[x]));
  let to = landed;
  while (to > 0 && taken.has(to)) to--;
  prestige[genre] = to;
  return { from, to, landed };
}

function roundEnd(g: GameState, ev: GameEvent[]) {
  const ph = g.phase;
  if (ph.kind !== 'acquire' || ph.next < ph.order.length || g.players.some((p) => p.task)) return;
  for (const tile of g.lots.splice(0)) {
    g.museum[tile.genre].push(tile);
    const move = advancePrestige(g.prestige, tile.genre, tile.value);
    ev.push({ t: 'museum', tile, ...move });
    const bumped = move.to !== move.landed ? ' (that space was taken, so it steps back)' : '';
    log(g, 'museum', `${describe(tile)} goes unsold to the museum. ${GENRE_INFO[tile.genre].name} prestige ${move.from} \u2192 ${move.to}${bumped}.`);
  }
  if (!g.end && g.supply.length < g.players.length + 1) trigger(g, ev, 'supply', null);
  if (g.end) return gameOver(g, ev);
  g.auctioneer = (g.auctioneer + 1) % g.players.length;
  startRound(g, ev);
}

function startRound(g: GameState, ev: GameEvent[]) {
  g.round++;
  g.phase = { kind: 'select' };
  const a = g.players[g.auctioneer];
  const final = g.players.every((p) => p.hand.length === 1);
  ev.push({ t: 'round', round: g.round, auctioneer: a.id, final });
  log(g, 'round', `Round ${g.round}${final ? ' (last bid cards)' : ''}: ${a.name} holds the gavel.`, a.id);
}

function gameOver(g: GameState, ev: GameEvent[]) {
  g.phase = { kind: 'over' };
  g.results = computeResults(g.players, g.prestige, g.end?.reason ?? 'cards');
  ev.push({ t: 'over' });
  const names = g.results.winners.map((id) => g.players.find((p) => p.id === id)!.name);
  log(g, 'end', `The season is over. ${names.join(' & ')} ${names.length > 1 ? 'share' : 'wins'} the evening.`);
}

/** What one client may see. Other players' hands, stacks and sealed bids stay hidden until the end. */
export function viewFor(g: GameState, pid: string | null): GameView {
  const over = g.phase.kind === 'over';
  const players: PlayerView[] = g.players.map((p) => {
    const open = p.id === pid || over;
    const { hand, stack, bid, ...rest } = p;
    return {
      ...rest,
      hand: open ? [...hand] : null,
      handCount: hand.length,
      stack: open ? [...stack] : null,
      stackTop: stack[stack.length - 1],
      stackCount: stack.length,
      bid: p.id === pid ? bid : null,
      hasBid: bid !== null,
    };
  });
  const supply: Record<string, number> = {};
  for (const t of g.supply) {
    const k = sizeKey(t.w, t.h);
    supply[k] = (supply[k] ?? 0) + 1;
  }
  const { rng: _rng, supply: _s, players: _p, ...rest } = g;
  return { ...rest, players, supply, supplyTotal: g.supply.length, you: pid };
}
