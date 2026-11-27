import { DECOR_INFO } from './content';
import { decorSwaps, exchangeOptions, movableTiles, type DecorSwap } from './engine';
import { DECOR_SHAPES, type DecorShape, type GameState, type GameView, type Incoming, type Painting, type PlayerState } from './types';
import { fits, gridOf } from './wall';

/** Players a client view is waiting for (the same answer as the engine's waitingOn). */
export function waitingOnView(v: GameView): string[] {
  const ph = v.phase;
  switch (ph.kind) {
    case 'setup':
      return v.players.filter((p) => p.starter).map((p) => p.id);
    case 'select':
      return [v.players[v.auctioneer].id];
    case 'bid':
      return v.players.filter((p) => !p.hasBid).map((p) => p.id);
    case 'acquire': {
      const out = v.players.filter((p) => p.task).map((p) => p.id);
      const picker = ph.order[ph.next];
      if (picker && !out.includes(picker)) out.unshift(picker);
      return out;
    }
    case 'over':
      return [];
  }
}

/** Everything a player may legally do with their current task. Mirrors the engine's checks. */
export interface TaskOptions {
  /**
   * 'decor': choose decor from the supply; 'tile': handle the next tile; 'finish': nothing new is left,
   * but the assistant's tile could be hung or a tile hung this round moved.
   */
  stage: 'decor' | 'tile' | 'finish';
  reward: number;
  /** Why decor is being chosen: matching frames, or the 1-point tile that comes with an excess painting. */
  rewardFrom: 'frames' | 'excess' | null;
  /** A reward of 4 or more may be split over several decor tiles. */
  multi: boolean;
  /** Sizes in the supply that the reward may buy. */
  decorShapes: DecorShape[];
  /** Swaps on the wall that put sold-out sizes back in the supply, most useful first. */
  swaps: DecorSwap[];
  /** Nothing of the reward's value is left in the supply, so the player may go without (or swap first). */
  canSkipDecor: boolean;
  head: Incoming | null;
  headFits: boolean;
  canHangHead: boolean;
  canAssist: boolean;
  assistantFits: boolean;
  canHangAssistant: boolean;
  exchange: Painting[];
  canExcess: boolean;
  canDiscard: boolean;
  canDone: boolean;
  /** Tiles hung this round that can move now (not while decor waits to be chosen). */
  moves: string[];
}

export function taskOptions(g: Pick<GameState, 'museum' | 'decor'>, p: Pick<PlayerState, 'wall' | 'task' | 'assistant'>): TaskOptions | null {
  const t = p.task;
  if (!t) return null;
  const grid = gridOf(p.wall);
  const first = t.rewards[0] ?? null;
  const reward = first?.points ?? 0;
  const free = !first;
  const decorShapes = DECOR_SHAPES.filter((s) => g.decor[s] > 0 && DECOR_INFO[s].points <= reward);
  const head = t.queue[0] ?? null;
  const headFits = !!head && fits(grid, head.tile.w, head.tile.h);
  const assistantFits = !!p.assistant && fits(grid, p.assistant.w, p.assistant.h);
  const auctionPainting = !!head && head.from === 'auction' && head.tile.kind === 'painting';
  const exchange = free && auctionPainting && !headFits ? exchangeOptions(g, p) : [];
  return {
    stage: !free ? 'decor' : head ? 'tile' : 'finish',
    reward,
    rewardFrom: first?.from ?? null,
    multi: reward >= 4,
    decorShapes,
    swaps: first ? rankSwaps(decorSwaps(g, p), reward, g.decor) : [],
    canSkipDecor: !!first && decorShapes.length === 0,
    head,
    headFits,
    canHangHead: free && headFits,
    canAssist: free && !!head && head.from !== 'museum' && !p.assistant,
    assistantFits,
    canHangAssistant: free && assistantFits && head?.from !== 'museum',
    exchange,
    canExcess: free && auctionPainting && !headFits && exchange.length === 0,
    canDiscard: free && !!head && head.tile.kind === 'decor' && !headFits && !!p.assistant,
    canDone: free && !head,
    moves: free ? movableTiles(p) : [],
  };
}

/** Best first: frees the most tiles the reward can buy, then the most tiles, then the target size with the most left. */
function rankSwaps(swaps: DecorSwap[], reward: number, decor: Record<DecorShape, number>): DecorSwap[] {
  const useful = (s: DecorSwap) => s.removed.filter((d) => s.frees.includes(d.shape) && DECOR_INFO[d.shape].points <= reward).length;
  return swaps.sort((a, b) => useful(b) - useful(a) || b.removed.length - a.removed.length || decor[b.shape] - decor[a.shape] || a.y - b.y || a.x - b.x);
}
