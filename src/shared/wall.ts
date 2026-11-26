import { RULES } from './content';
import type { Hung, Painting } from './types';

/** Gallery wall geometry. Cells are addressed (x, y) with x from the left and y from the top. */
export const WALL_W = RULES.wallW;
export const WALL_H = RULES.wallH;

/** For each cell, the index of the hung tile covering it, or -1. */
export type Grid = Int16Array;

export function gridOf(wall: readonly Hung[]): Grid {
  const g = new Int16Array(WALL_W * WALL_H).fill(-1);
  wall.forEach((h, i) => {
    for (let y = h.y; y < h.y + h.tile.h; y++) for (let x = h.x; x < h.x + h.tile.w; x++) g[y * WALL_W + x] = i;
  });
  return g;
}

export function inside(w: number, h: number, x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + w <= WALL_W && y + h <= WALL_H;
}

export function isFree(g: Grid, w: number, h: number, x: number, y: number): boolean {
  if (!inside(w, h, x, y)) return false;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g[yy * WALL_W + xx] >= 0) return false;
  return true;
}

/** Indices of hung tiles that share at least one cell edge with the rectangle (corners don't count). */
export function neighbours(g: Grid, w: number, h: number, x: number, y: number): number[] {
  const out: number[] = [];
  const add = (i: number) => {
    if (i >= 0 && !out.includes(i)) out.push(i);
  };
  for (let yy = y; yy < y + h; yy++) {
    if (x > 0) add(g[yy * WALL_W + x - 1]);
    if (x + w < WALL_W) add(g[yy * WALL_W + x + w]);
  }
  for (let xx = x; xx < x + w; xx++) {
    if (y > 0) add(g[(y - 1) * WALL_W + xx]);
    if (y + h < WALL_H) add(g[(y + h) * WALL_W + xx]);
  }
  return out;
}

function touchesAny(g: Grid, w: number, h: number, x: number, y: number): boolean {
  for (let yy = y; yy < y + h; yy++) {
    if (x > 0 && g[yy * WALL_W + x - 1] >= 0) return true;
    if (x + w < WALL_W && g[yy * WALL_W + x + w] >= 0) return true;
  }
  for (let xx = x; xx < x + w; xx++) {
    if (y > 0 && g[(y - 1) * WALL_W + xx] >= 0) return true;
    if (y + h < WALL_H && g[(y + h) * WALL_W + xx] >= 0) return true;
  }
  return false;
}

/** The placement rule: fully inside the grid, on empty cells, touching another tile along an edge. */
export function canHang(g: Grid, w: number, h: number, x: number, y: number): boolean {
  return isFree(g, w, h, x, y) && touchesAny(g, w, h, x, y);
}

export function legalSpots(g: Grid, w: number, h: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y + h <= WALL_H; y++) for (let x = 0; x + w <= WALL_W; x++) if (canHang(g, w, h, x, y)) out.push({ x, y });
  return out;
}

export function fits(g: Grid, w: number, h: number): boolean {
  for (let y = 0; y + h <= WALL_H; y++) for (let x = 0; x + w <= WALL_W; x++) if (canHang(g, w, h, x, y)) return true;
  return false;
}

export function emptyCells(g: Grid): number {
  let n = 0;
  for (let i = 0; i < g.length; i++) if (g[i] < 0) n++;
  return n;
}

export const isFull = (g: Grid) => emptyCells(g) === 0;

export function coversStar(w: number, h: number, x: number, y: number): boolean {
  return RULES.stars.some(([sx, sy]) => sx >= x && sx < x + w && sy >= y && sy < y + h);
}

/** Where a starting painting may go: inside the grid and covering at least one star. */
export function starterSpots(w: number, h: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y + h <= WALL_H; y++) for (let x = 0; x + w <= WALL_W; x++) if (coversStar(w, h, x, y)) out.push({ x, y });
  return out;
}

export function overlapsEyeline(y: number, h: number): boolean {
  return y <= RULES.eyeBottom && y + h - 1 >= RULES.eyeTop;
}

export function uncoveredCorners(g: Grid): number {
  return RULES.corners.filter(([x, y]) => g[y * WALL_W + x] < 0).length;
}

export function cornersCovered(w: number, h: number, x: number, y: number): number {
  return RULES.corners.filter(([cx, cy]) => cx >= x && cx < x + w && cy >= y && cy < y + h).length;
}

/** Paintings already on the wall that would touch a painting hung at (x, y). */
function touchingPaintings(wall: readonly Hung[], g: Grid, w: number, h: number, x: number, y: number): Painting[] {
  return neighbours(g, w, h, x, y)
    .map((i) => wall[i].tile)
    .filter((t): t is Painting => t.kind === 'painting');
}

/** Ids of touching paintings with the same frame style: their count is the decor reward. */
export function matchingFrames(wall: readonly Hung[], g: Grid, p: Painting, x: number, y: number): string[] {
  return touchingPaintings(wall, g, p.w, p.h, x, y)
    .filter((t) => t.frame === p.frame)
    .map((t) => t.id);
}

/** Ids of touching paintings of the same type (a faux pas). */
export function sameGenre(wall: readonly Hung[], g: Grid, p: Painting, x: number, y: number): string[] {
  return touchingPaintings(wall, g, p.w, p.h, x, y)
    .filter((t) => t.genre === p.genre)
    .map((t) => t.id);
}

/** Every painting on the wall that touches another painting of its type. */
export function fauxPasIds(wall: readonly Hung[], g: Grid = gridOf(wall)): Set<string> {
  const out = new Set<string>();
  wall.forEach((hp) => {
    if (hp.tile.kind !== 'painting') return;
    const p = hp.tile;
    for (const i of neighbours(g, p.w, p.h, hp.x, hp.y)) {
      const t = wall[i].tile;
      if (t.kind === 'painting' && t.genre === p.genre && t.id !== p.id) {
        out.add(p.id);
        out.add(t.id);
      }
    }
  });
  return out;
}

/** Cells of the rectangle's outline that lie inside the grid, with what is on them (-1 empty). */
export function borderCells(g: Grid, w: number, h: number, x: number, y: number): { x: number; y: number; v: number }[] {
  const out: { x: number; y: number; v: number }[] = [];
  for (let yy = y; yy < y + h; yy++) {
    if (x > 0) out.push({ x: x - 1, y: yy, v: g[yy * WALL_W + x - 1] });
    if (x + w < WALL_W) out.push({ x: x + w, y: yy, v: g[yy * WALL_W + x + w] });
  }
  for (let xx = x; xx < x + w; xx++) {
    if (y > 0) out.push({ x: xx, y: y - 1, v: g[(y - 1) * WALL_W + xx] });
    if (y + h < WALL_H) out.push({ x: xx, y: y + h, v: g[(y + h) * WALL_W + xx] });
  }
  return out;
}
