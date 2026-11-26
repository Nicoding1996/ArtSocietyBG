/**
 * Balance simulator: plays many bot-only games and prints statistics.
 * Usage: npm run sim -- [games=300]
 */
import { playBotGame } from './botgame';
import type { EndReason } from '../src/shared/types';

const games = Number(process.argv[2] ?? 300);

for (const n of [2, 3, 4]) {
  const reasons = new Map<EndReason, number>();
  let rounds = 0;
  let total = 0;
  let win = 0;
  let spread = 0;
  let ties = 0;
  let shared = 0;
  const parts = { prestige: 0, decor: 0, eyeline: 0, full: 0, corners: 0, excess: 0, faux: 0, paintings: 0 };
  const ev = { exchange: 0, assist: 0, excess: 0, decorTiles: 0, discard: 0, bidTies: 0 };
  const seatWins = new Array(n).fill(0);
  let minRounds = Infinity;
  let maxRounds = 0;
  const t0 = Date.now();
  for (let g = 0; g < games; g++) {
    const { s } = playBotGame(5000 + g * 7919 + n, n, {
      onEvents: (events) => {
        for (const e of events) {
          if (e.t === 'exchange') ev.exchange++;
          if (e.t === 'assist') ev.assist++;
          if (e.t === 'excess') ev.excess++;
          if (e.t === 'decor') ev.decorTiles += e.tiles.length;
          if (e.t === 'discard') ev.discard++;
          if (e.t === 'reveal') ev.bidTies += e.ties.length;
        }
      },
    });
    const res = s.results!;
    reasons.set(res.reason, (reasons.get(res.reason) ?? 0) + 1);
    rounds += s.round;
    minRounds = Math.min(minRounds, s.round);
    maxRounds = Math.max(maxRounds, s.round);
    for (const r of res.players) {
      total += r.total;
      parts.prestige += r.prestigePoints;
      parts.decor += r.decorPoints;
      parts.eyeline += r.eyelinePoints;
      parts.full += r.fullPoints;
      parts.corners += r.cornerPoints;
      parts.excess += r.excessPoints;
      parts.faux += r.genres.reduce((a, x) => a + x.faux, 0);
      parts.paintings += r.genres.reduce((a, x) => a + x.count, 0);
    }
    win += res.players[0].total;
    spread += res.players[0].total - res.players[res.players.length - 1].total;
    if (res.players.filter((r) => r.total === res.players[0].total).length > 1) ties++;
    if (res.winners.length > 1) shared++;
    for (const w of res.winners) seatWins[s.players.findIndex((p) => p.id === w)] += 1 / res.winners.length;
  }
  const pc = games * n;
  const f = (x: number, d = 1) => x.toFixed(d);
  console.log(`\n=== ${n} players, ${games} games (${f((Date.now() - t0) / games, 0)} ms/game) ===`);
  console.log(`rounds avg ${f(rounds / games)} (min ${minRounds}, max ${maxRounds}) | end: ${[...reasons].map(([k, v]) => `${k} ${f((v / games) * 100, 0)}%`).join(', ')}`);
  console.log(`score avg ${f(total / pc)} | winner ${f(win / games)} | spread ${f(spread / games)} | score ties ${f((ties / games) * 100, 0)}% | shared wins ${f((shared / games) * 100, 1)}%`);
  console.log(
    `per player: prestige ${f(parts.prestige / pc)}, decor ${f(parts.decor / pc)}, eyeline ${f(parts.eyeline / pc)}, full ${f(parts.full / pc)}, corners ${f(parts.corners / pc)}, excess ${f(parts.excess / pc)} | paintings ${f(parts.paintings / pc)} (faux pas ${f(parts.faux / pc)})`,
  );
  console.log(`per game: exchanges ${f(ev.exchange / games, 2)}, assists ${f(ev.assist / games, 2)}, excess ${f(ev.excess / games, 2)}, decor tiles ${f(ev.decorTiles / games)}, discards ${f(ev.discard / games, 2)}, bid ties ${f(ev.bidTies / games, 2)}`);
  console.log(`win share by seat: ${seatWins.map((w) => `${f((w / games) * 100, 0)}%`).join(' ')}`);
}
