import { DECOR_INFO } from './content';
import { exchangeOptions } from './engine';
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
  /** 'decor': choose a matching-frame reward; 'tile': handle the next tile; 'finish': only the assistant is left. */
  stage: 'decor' | 'tile' | 'finish';
  reward: number;
  /** A reward of 4 or more may be split over several decor tiles. */
  multi: boolean;
  decorShapes: DecorShape[];
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
}

export function taskOptions(g: Pick<GameState, 'museum' | 'decor'>, p: Pick<PlayerState, 'wall' | 'task' | 'assistant'>): TaskOptions | null {
  const t = p.task;
  if (!t) return null;
  const grid = gridOf(p.wall);
  const reward = t.rewards[0] ?? 0;
  const free = !t.rewards.length;
  const head = t.queue[0] ?? null;
  const headFits = !!head && fits(grid, head.tile.w, head.tile.h);
  const assistantFits = !!p.assistant && fits(grid, p.assistant.w, p.assistant.h);
  const auctionPainting = !!head && head.from === 'auction' && head.tile.kind === 'painting';
  const exchange = free && auctionPainting && !headFits ? exchangeOptions(g, p) : [];
  return {
    stage: !free ? 'decor' : head ? 'tile' : 'finish',
    reward,
    multi: reward >= 4,
    decorShapes: DECOR_SHAPES.filter((s) => g.decor[s] > 0 && DECOR_INFO[s].points <= reward),
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
  };
}
