import { applyAction, createGame, viewFor, waitingOn } from '../src/shared/engine';
import { botDecide } from '../src/shared/bot';
import { makeRng } from '../src/shared/rng';
import { PLAYER_COLORS, RULES } from '../src/shared/content';
import { GENRES, type GameEvent, type GameState } from '../src/shared/types';
import { gridOf, neighbours, WALL_H, WALL_W } from '../src/shared/wall';

/** Checks the invariants that must hold after every action. Throws with a description if one breaks. */
export function checkInvariants(s: GameState) {
  let paintings = s.supply.length + s.lots.length;
  let decor = Object.values(s.decor).reduce((a, b) => a + b, 0);
  for (const g of GENRES) paintings += s.museum[g].length;
  for (const p of s.players) {
    if (p.starter) paintings++;
    const grid = new Int16Array(WALL_W * WALL_H).fill(-1);
    p.wall.forEach((h, i) => {
      for (let y = h.y; y < h.y + h.tile.h; y++) {
        for (let x = h.x; x < h.x + h.tile.w; x++) {
          if (x < 0 || y < 0 || x >= WALL_W || y >= WALL_H) throw new Error(`${p.id}: tile ${h.tile.id} hangs off the wall`);
          if (grid[y * WALL_W + x] >= 0) throw new Error(`${p.id}: tiles overlap at ${x},${y}`);
          grid[y * WALL_W + x] = i;
        }
      }
    });
    const g = gridOf(p.wall);
    if (p.wall.length > 1) {
      p.wall.forEach((h) => {
        if (!neighbours(g, h.tile.w, h.tile.h, h.x, h.y).length) throw new Error(`${p.id}: tile ${h.tile.id} touches nothing`);
      });
    }
    for (const h of p.wall) h.tile.kind === 'painting' ? paintings++ : decor++;
    if (p.assistant) p.assistant.kind === 'painting' ? paintings++ : decor++;
    paintings += p.excess.length;
    for (const inc of p.task?.queue ?? []) inc.tile.kind === 'painting' ? paintings++ : decor++;
    if (p.hand.length + p.stack.length !== RULES.cards + 1) throw new Error(`${p.id}: lost a bid card`);
    if (new Set([...p.hand, ...p.stack.slice(1)]).size !== RULES.cards) throw new Error(`${p.id}: duplicated bid card`);
  }
  if (paintings !== 112 + s.players.length) throw new Error(`painting count is ${paintings}`);
  if (decor !== 108) throw new Error(`decor count is ${decor}`);
  const ups = GENRES.map((g) => s.prestige[g]).filter((v) => v > 0);
  if (new Set(ups).size !== ups.length) throw new Error(`prestige markers share a space: ${JSON.stringify(s.prestige)}`);
}

/**
 * Plays a full game where every seat is a bot, picking a random waiting player each step so that
 * simultaneous phases interleave. Throws if a bot makes an illegal move or the game stalls.
 */
export function playBotGame(
  seed: number,
  players: number,
  opts: { check?: boolean; onEvents?: (events: GameEvent[], s: GameState) => void } = {},
): { s: GameState; actions: number } {
  const { state: s, events } = createGame({
    seed,
    players: Array.from({ length: players }, (_, i) => ({
      id: `p${i}`,
      name: `Bot ${i}`,
      color: PLAYER_COLORS[i],
      hat: 'beret' as const,
      isBot: true,
    })),
  });
  opts.onEvents?.(events, s);
  const r = makeRng(seed ^ 0x9e3779b9);
  let actions = 0;
  while (s.phase.kind !== 'over') {
    const waiting = waitingOn(s);
    if (!waiting.length) throw new Error(`Game stalled in phase ${s.phase.kind}`);
    const pid = waiting[Math.floor(r() * waiting.length)];
    const a = botDecide(viewFor(s, pid), pid, r);
    if (!a) throw new Error(`Bot ${pid} had no move in phase ${s.phase.kind}: ${JSON.stringify(s.players.find((p) => p.id === pid)?.task)}`);
    const res = applyAction(s, pid, a);
    if (!res.ok) throw new Error(`Bot ${pid} made an illegal move ${JSON.stringify(a)}: ${res.error}`);
    opts.onEvents?.(res.events, s);
    if (opts.check) checkInvariants(s);
    if (++actions > 5000) throw new Error('Game did not finish');
  }
  return { s, actions };
}
