import * as THREE from 'three';
import { RULES } from '../../shared/content';

export const TAU = Math.PI * 2;

/** Gallery wall cells in world units. Cells are 1.5 times wider than tall, like the printed grid. */
export const CELL_H = 0.32;
export const CELL_W = CELL_H * RULES.cellAspect;
export const GRID_W = RULES.wallW * CELL_W;
export const GRID_H = RULES.wallH * CELL_H;
/** Height of the grid's lower edge above the floor. */
export const GRID_BOTTOM = 1.42;
export const GRID_TOP = GRID_BOTTOM + GRID_H;
export const GRID_MID = (GRID_BOTTOM + GRID_TOP) / 2;
/** Wallpaper visible around the grid, inside the gilt moulding. */
export const MARGIN_X = 0.42;
export const MARGIN_Y = 0.3;
export const PANEL_W = GRID_W + 2 * MARGIN_X;
export const PANEL_H = GRID_H + 2 * MARGIN_Y;

/** The salon is square: each side's inner face is this far from the centre. */
export const ROOM = 8.6;
export const ROOM_H = 7.4;
export const TABLE_R = 3.3;
export const TABLE_TOP = 0.95;

/** 0 south (+z, the local player), 1 west, 2 north, 3 east: clockwise seen from above. */
export type Side = 0 | 1 | 2 | 3;

const OUT: [number, number][] = [
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 0],
];

/**
 * Room side for each seat, counted from the local player (0) round to their left. Your left-hand
 * neighbour sits on your left and the player before you on your right, as at a real table.
 */
export function sidesFor(n: number): Side[] {
  if (n <= 1) return [0];
  if (n === 2) return [0, 2];
  if (n === 3) return [0, 1, 3];
  return [0, 1, 2, 3];
}

export function outward(side: Side): THREE.Vector3 {
  const [x, z] = OUT[side];
  return new THREE.Vector3(x, 0, z);
}

/** rotation.y that turns an object's local +z towards the centre of the room from this side. */
export function inwardRotation(side: Side): number {
  const [x, z] = OUT[side];
  return Math.atan2(-x, -z);
}

export const polar = (r: number, a: number, y = 0) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
