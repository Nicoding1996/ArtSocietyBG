import type { GameEvent } from './types';

/**
 * Rough duration of the client animation for each event. The server waits this long before a bot
 * acts, so people can follow what happened.
 */
export function eventAnimationMs(e: GameEvent): number {
  switch (e.t) {
    case 'start':
      return 1800;
    case 'starter':
      return 700;
    case 'round':
      return 1500;
    case 'lots':
      return 2600;
    case 'reveal':
      return 2400 + e.ties.length * 900;
    case 'take':
      return 900;
    case 'hang':
      return 950;
    case 'assist':
      return 700;
    case 'exchange':
      return 1500;
    case 'excess':
      return 1300;
    case 'decor':
      return 500;
    case 'swapDecor':
      return 1100;
    case 'discard':
      return 400;
    case 'museum':
      return 2300;
    case 'trigger':
      return 2000;
    case 'over':
      return 2500;
    default:
      return 0;
  }
}

export function eventsAnimationMs(events: GameEvent[]): number {
  return events.reduce((sum, e) => sum + eventAnimationMs(e), 0);
}
