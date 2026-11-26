import { RULES } from './content';
import { GENRES, type EndReason, type GameResults, type Genre, type GenreScore, type Hung, type Painting, type PlayerResult } from './types';
import { fauxPasIds, gridOf, isFull, overlapsEyeline, uncoveredCorners } from './wall';

export interface Ranking {
  /** Types from most to least prestigious (types tied at zero keep a fixed order). */
  order: Genre[];
  multipliers: Record<Genre, number>;
  /** The x5 type, if any type has prestige at all. */
  top: Genre | null;
}

/**
 * Ranks the painting types by their prestige markers. Markers never tie above zero; every type
 * still at zero shares the lowest multiplier.
 */
export function ranking(prestige: Record<Genre, number>): Ranking {
  const order = [...GENRES].sort((a, b) => prestige[b] - prestige[a] || GENRES.indexOf(a) - GENRES.indexOf(b));
  const low = RULES.multipliers[RULES.multipliers.length - 1];
  const multipliers = {} as Record<Genre, number>;
  order.forEach((g, i) => (multipliers[g] = prestige[g] > 0 ? RULES.multipliers[i] : low));
  return { order, multipliers, top: prestige[order[0]] > 0 ? order[0] : null };
}

export interface Scorable {
  id: string;
  wall: readonly Hung[];
  excess: readonly Painting[];
  hand: readonly number[] | null;
}

export type WallScore = Omit<PlayerResult, 'rank'>;

/** Scores one wall against the given ranking. Works on live walls too (for the projected score). */
export function scoreWall(p: Scorable, rank: Ranking): WallScore {
  const g = gridOf(p.wall);
  const faux = fauxPasIds(p.wall, g);
  const paintings = p.wall.filter((h): h is Hung & { tile: Painting } => h.tile.kind === 'painting');
  const genres: GenreScore[] = rank.order.map((genre) => {
    const of = paintings.filter((h) => h.tile.genre === genre);
    const bad = of.filter((h) => faux.has(h.tile.id)).length;
    const multiplier = rank.multipliers[genre];
    return { genre, multiplier, count: of.length, faux: bad, points: (of.length - bad) * multiplier };
  });
  const prestigePoints = genres.reduce((s, x) => s + x.points, 0);
  let decorPoints = 0;
  for (const h of p.wall) if (h.tile.kind === 'decor') decorPoints += h.tile.points;
  // The eyeline counts every painting of the top type that reaches into the band, faux pas or not.
  const eyeline = rank.top ? paintings.filter((h) => h.tile.genre === rank.top && overlapsEyeline(h.y, h.tile.h)) : [];
  const full = isFull(g);
  const corners = uncoveredCorners(g);
  const total =
    prestigePoints +
    decorPoints +
    eyeline.length * RULES.eyelinePoints +
    (full ? RULES.fullPoints : 0) -
    corners * RULES.cornerPenalty -
    p.excess.length * RULES.excessPenalty;
  return {
    pid: p.id,
    genres,
    prestigePoints,
    decorPoints,
    eyelineCount: eyeline.length,
    eyelinePoints: eyeline.length * RULES.eyelinePoints,
    full,
    fullPoints: full ? RULES.fullPoints : 0,
    corners,
    cornerPoints: -corners * RULES.cornerPenalty,
    excess: p.excess.length,
    excessPoints: -p.excess.length * RULES.excessPenalty,
    total,
    handValue: (p.hand ?? []).reduce((s, c) => s + c, 0),
    fauxIds: [...faux],
    eyelineIds: eyeline.map((h) => h.tile.id),
  };
}

/** Final scores, ranks and winners. Ties go to the most bid-card value left in hand, then are shared. */
export function computeResults(players: Scorable[], prestige: Record<Genre, number>, reason: EndReason): GameResults {
  const rank = ranking(prestige);
  const scored = players.map((p) => scoreWall(p, rank));
  const better = (a: WallScore, b: WallScore) => a.total > b.total || (a.total === b.total && a.handValue > b.handValue);
  const results: PlayerResult[] = scored.map((s) => ({ ...s, rank: 1 + scored.filter((o) => better(o, s)).length }));
  results.sort((a, b) => a.rank - b.rank || players.findIndex((p) => p.id === a.pid) - players.findIndex((p) => p.id === b.pid));
  return {
    players: results,
    winners: results.filter((r) => r.rank === 1).map((r) => r.pid),
    multipliers: rank.multipliers,
    ranking: rank.order,
    top: rank.top,
    reason,
  };
}
