import * as THREE from 'three';
import { RULES } from '../../shared/content';
import type { Hung, Painting, Tile } from '../../shared/types';
import { ease, type Tweens } from './fx';
import { CELL_H, CELL_W, GRID_H, GRID_MID, GRID_TOP, GRID_W, PANEL_H, PANEL_W, ROOM, inwardRotation, outward, type Side } from './layout';
import { brass, gold, mahogany, walnut } from './materials';
import { WALL_STYLES, labelTexture, plaqueTexture, toTexture, wallpaperTexture } from './textures';
import { ghostify, ring, tileMesh } from './tiles';

export const ASSIST_SCALE = 0.55;
export const STAGE_SCALE = 0.58;
export const EXCESS_SCALE = 0.5;
/** Local x of the assistant's easel and of the excess pile, either side of the panel. */
const ASSIST_X = PANEL_W / 2 + 0.95;
const EXCESS_X = -(PANEL_W / 2 + 0.95);

export type GhostState = 'ok' | 'bad' | 'pinned' | 'preview';

const GHOST_COLORS: Record<GhostState, string> = { ok: '#8dffb8', bad: '#ff6b6b', pinned: '#ffd76a', preview: '#9fd3ff' };

interface Placed {
  tile: Tile;
  obj: THREE.Group;
}

/** Rectangle outline made of four thin bars, centred on the origin. */
function outlineRect(w: number, h: number, thick: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const bars: [number, number, number, number][] = [
    [w + thick, thick, 0, h / 2],
    [w + thick, thick, 0, -h / 2],
    [thick, h, -w / 2, 0],
    [thick, h, w / 2, 0],
  ];
  for (const [bw, bh, x, y] of bars) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mat);
    m.position.set(x, y, 0);
    g.add(m);
  }
  return g;
}

/** A dashed rectangle outline as one mesh, centred on the origin, with a dash at each end of every side. */
function dashedRect(w: number, h: number, thick: number, mat: THREE.Material, dash = 0.11, gap = 0.07): THREE.Group {
  const pos: number[] = [];
  const quad = (x0: number, y0: number, x1: number, y1: number) => pos.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y0, 0, x1, y1, 0, x0, y1, 0);
  const run = (len: number, at: (a: number, b: number) => void) => {
    const n = Math.max(1, Math.round((len + gap) / (dash + gap)));
    const d = (len - (n - 1) * gap) / n;
    for (let i = 0; i < n; i++) at(-len / 2 + i * (d + gap), -len / 2 + i * (d + gap) + d);
  };
  const t = thick / 2;
  run(w, (a, b) => {
    quad(a, h / 2 - t, b, h / 2 + t);
    quad(a, -h / 2 - t, b, -h / 2 + t);
  });
  run(h, (a, b) => {
    quad(-w / 2 - t, a, -w / 2 + t, b);
    quad(w / 2 - t, a, w / 2 + t, b);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat));
  return g;
}

/** Takes an outline off the wall and frees its bars and its own material. */
function freeOutline(o: THREE.Group) {
  o.removeFromParent();
  for (const c of o.children) (c as THREE.Mesh).geometry.dispose();
  ((o.children[0] as THREE.Mesh | undefined)?.material as THREE.Material | undefined)?.dispose();
}

/** Centre of a w x h rectangle at cell (x, y), in wall-local coordinates. */
export function cellLocal(x: number, y: number, w: number, h: number, z = 0): THREE.Vector3 {
  return new THREE.Vector3(-GRID_W / 2 + (x + w / 2) * CELL_W, GRID_TOP - (y + h / 2) * CELL_H, z);
}

/** One player's gallery wall: the panel, everything hung on it, the assistant, excess paintings and tiles in hand. */
export class GalleryWall {
  readonly group = new THREE.Group();
  readonly gridPlane: THREE.Mesh;
  readonly backing: THREE.MeshStandardMaterial;
  readonly light: THREE.SpotLight;
  side: Side = 0;
  private hung = new Map<string, Placed>();
  private staging: Placed[] = [];
  private assistant: Placed | null = null;
  private excess: Placed[] = [];
  private ghost: { key: string; obj: THREE.Group; outline: THREE.Group; fill: THREE.Mesh } | null = null;
  private ghostMats = new Map<GhostState, THREE.MeshBasicMaterial>();
  private marks: THREE.Group[] = [];
  /** Dashed outlines on the tiles hung this round that can still move. */
  private movable: THREE.Group[] = [];
  private movableMat = new THREE.MeshBasicMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false });
  /** The tile picked up to be moved, and the outline of the space it left. */
  private lifted: { id: string; hole: THREE.Group } | null = null;
  private spots: THREE.Mesh;
  private spotCanvas: HTMLCanvasElement;
  private spotTex: THREE.CanvasTexture;
  private plaque: THREE.Mesh;
  private flashes: { obj: THREE.Group; mat: THREE.MeshBasicMaterial; age: number; life: number }[] = [];
  private t = Math.random() * 10;

  constructor(
    readonly pid: string,
    name: string,
    color: string,
    style: number,
  ) {
    const st = WALL_STYLES[style % WALL_STYLES.length];
    this.backing = new THREE.MeshStandardMaterial({ color: st.stripe, roughness: 0.78 });
    this.backing.color.multiplyScalar(0.92);
    const g = this.group;

    // The wallpapered panel with the printed grid.
    const paper = new THREE.MeshStandardMaterial({ map: toTexture(wallpaperTexture(st)), roughness: 0.82 });
    const dark = new THREE.MeshStandardMaterial({ color: '#120c0a', roughness: 0.9 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(PANEL_W, PANEL_H, 0.06), [dark, dark, dark, dark, paper, dark]);
    panel.position.set(0, GRID_MID, -0.03);
    panel.receiveShadow = true;
    g.add(panel);
    const moulding = new THREE.Mesh(ring(PANEL_W + 0.3, PANEL_H + 0.3, PANEL_W - 0.01, PANEL_H - 0.01, 0.05, 0.03, 3), gold);
    moulding.position.set(0, GRID_MID, -0.02);
    moulding.castShadow = true;
    g.add(moulding);
    const inner = new THREE.Mesh(ring(PANEL_W + 0.05, PANEL_H + 0.05, PANEL_W - 0.01, PANEL_H - 0.01, 0.012, 0.006, 1), walnut());
    inner.position.set(0, GRID_MID, -0.005);
    g.add(inner);

    // Raycast target for placing tiles; never drawn.
    this.gridPlane = new THREE.Mesh(new THREE.PlaneGeometry(GRID_W, GRID_H), new THREE.MeshBasicMaterial({ visible: false }));
    this.gridPlane.position.set(0, GRID_MID, 0.002);
    this.gridPlane.userData.wall = pid;
    g.add(this.gridPlane);

    // Soft highlight of the cells a tile could cover.
    const [sc] = [document.createElement('canvas')];
    sc.width = RULES.wallW * 32;
    sc.height = RULES.wallH * 32;
    this.spotCanvas = sc;
    this.spotTex = new THREE.CanvasTexture(sc);
    this.spotTex.colorSpace = THREE.SRGBColorSpace;
    this.spots = new THREE.Mesh(new THREE.PlaneGeometry(GRID_W, GRID_H), new THREE.MeshBasicMaterial({ map: this.spotTex, transparent: true, depthWrite: false }));
    this.spots.position.set(0, GRID_MID, 0.0025);
    this.spots.visible = false;
    this.spots.renderOrder = 2;
    g.add(this.spots);

    // Name plate and the player's colour.
    this.plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.31), new THREE.MeshStandardMaterial({ map: toTexture(plaqueTexture(name, color)), metalness: 0.6, roughness: 0.35 }));
    this.plaque.position.set(0, GRID_TOP + 0.62, 0.05);
    g.add(this.plaque);
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.02), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.5 }));
    ribbon.position.set(0, GRID_TOP + 0.43, 0.06);
    g.add(ribbon);

    // Brass picture lights over the panel.
    for (const x of [-1.35, 1.35]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8), brass);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(x, GRID_TOP + 0.36, 0.14);
      const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.62, 20, 1, true, 0, Math.PI), brass);
      hood.rotation.set(0, 0, Math.PI / 2);
      hood.position.set(x, GRID_TOP + 0.34, 0.3);
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.56, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff1c8').multiplyScalar(2.4) }));
      bulb.rotation.z = Math.PI / 2;
      bulb.position.set(x, GRID_TOP + 0.31, 0.3);
      g.add(arm, hood, bulb);
    }
    this.light = new THREE.SpotLight('#ffe7c2', 7, 9, 0.66, 0.8, 1.4);
    this.light.position.set(0, GRID_TOP + 1.3, 2.2);
    this.light.target.position.set(0, GRID_MID - 0.3, 0);
    g.add(this.light, this.light.target);

    this.buildEasel();
    this.buildExcessCorner();
  }

  private buildEasel() {
    const g = this.group;
    const legH = 2.05;
    for (const [dx, tilt] of [
      [-0.32, 0.12],
      [0.32, -0.12],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, legH, 0.045), walnut());
      leg.position.set(ASSIST_X + dx, legH / 2, 0.55);
      leg.rotation.set(-0.08, 0, tilt);
      leg.castShadow = true;
      g.add(leg);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.045, legH * 1.02, 0.045), walnut());
    back.position.set(ASSIST_X, legH / 2, 0.22);
    back.rotation.x = 0.22;
    g.add(back);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.14), walnut());
    ledge.position.set(ASSIST_X, 1.18, 0.62);
    ledge.castShadow = true;
    g.add(ledge);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.15),
      new THREE.MeshStandardMaterial({ map: toTexture(labelTexture('ASSISTANT', { w: 512, h: 124, bg: '#3a2a18', size: 66 })), roughness: 0.5, metalness: 0.2 }),
    );
    sign.position.set(ASSIST_X, 1.06, 0.7);
    g.add(sign);
  }

  private buildExcessCorner() {
    const g = this.group;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.15),
      new THREE.MeshStandardMaterial({ map: toTexture(labelTexture('EXCESS \u22122', { w: 512, h: 124, bg: '#5a1720', size: 66 })), roughness: 0.5, metalness: 0.2 }),
    );
    sign.position.set(EXCESS_X, 0.08, 0.75);
    sign.rotation.x = -1.1;
    g.add(sign);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.5), mahogany());
    bench.position.set(EXCESS_X, 0.04, 0.32);
    bench.receiveShadow = true;
    g.add(bench);
  }

  setSide(side: Side) {
    this.side = side;
    const n = outward(side);
    this.group.position.copy(n.multiplyScalar(ROOM - 0.06));
    this.group.rotation.y = inwardRotation(side);
    this.group.updateMatrixWorld(true);
  }

  setName(name: string, color: string) {
    const mat = this.plaque.material as THREE.MeshStandardMaterial;
    mat.map?.dispose();
    mat.map = toTexture(plaqueTexture(name, color));
    mat.needsUpdate = true;
  }

  // ---------- coordinates ----------

  toWorld(local: THREE.Vector3): THREE.Vector3 {
    return this.group.localToWorld(local.clone());
  }

  cellWorld(x: number, y: number, w: number, h: number): THREE.Vector3 {
    return this.toWorld(cellLocal(x, y, w, h, 0.02));
  }

  /** Grid cell under a world point on the grid plane. */
  cellAt(world: THREE.Vector3): { x: number; y: number } | null {
    const p = this.group.worldToLocal(world.clone());
    const x = Math.floor((p.x + GRID_W / 2) / CELL_W);
    const y = Math.floor((GRID_TOP - p.y) / CELL_H);
    if (x < 0 || y < 0 || x >= RULES.wallW || y >= RULES.wallH) return null;
    return { x, y };
  }

  /** A camera pose looking straight at the wall: the point to look at and where to stand. */
  pose(distance: number, lift = 0): { target: THREE.Vector3; position: THREE.Vector3 } {
    const target = this.toWorld(new THREE.Vector3(0, GRID_MID + lift, 0));
    const position = this.toWorld(new THREE.Vector3(0, GRID_MID + lift + 0.2, distance));
    return { target, position };
  }

  /** Where tiles waiting to be hung hover, in world space. */
  stagingWorld(i = 0): THREE.Vector3 {
    return this.toWorld(new THREE.Vector3(ASSIST_X, 3.2 + i * 0.12, 0.75 + i * 0.08));
  }

  assistantWorld(): THREE.Vector3 {
    return this.toWorld(new THREE.Vector3(ASSIST_X, 1.65, 0.58));
  }

  excessWorld(i: number): THREE.Vector3 {
    return this.toWorld(new THREE.Vector3(EXCESS_X - 0.2 + i * 0.28, 0.42, 0.35 + i * 0.04));
  }

  /** Where the assistant's easel and excess pile are drawn are fixed; expose the panel height for framing. */
  static readonly panelHeight = PANEL_H;

  // ---------- hung tiles ----------

  private makeHung(h: Hung): Placed {
    const obj = tileMesh(h.tile, { backing: this.backing });
    obj.position.copy(cellLocal(h.x, h.y, h.tile.w, h.tile.h, 0.003));
    this.group.add(obj);
    return { tile: h.tile, obj };
  }

  hasTile(id: string): boolean {
    return this.hung.has(id);
  }

  tileObject(id: string): THREE.Object3D | null {
    return this.hung.get(id)?.obj ?? this.staging.find((s) => s.tile.id === id)?.obj ?? (this.assistant?.tile.id === id ? this.assistant.obj : null);
  }

  /** Makes the wall match `wall` exactly (no animation). */
  syncWall(wall: readonly Hung[]) {
    const ids = new Set(wall.map((h) => h.tile.id));
    for (const [id, p] of this.hung) {
      if (!ids.has(id)) {
        this.group.remove(p.obj);
        this.hung.delete(id);
      }
    }
    // An outline leaves with its tile (a decor swap can take a marked tile off the wall).
    for (const m of this.marks) if (!ids.has(m.userData.tile as string)) freeOutline(m);
    this.marks = this.marks.filter((m) => ids.has(m.userData.tile as string));
    for (const h of wall) {
      const p = this.hung.get(h.tile.id);
      // A tile moved this round goes to where it hangs now.
      if (p) p.obj.position.copy(cellLocal(h.x, h.y, h.tile.w, h.tile.h, 0.003));
      else this.hung.set(h.tile.id, this.makeHung(h));
    }
  }

  /** Slides a hung tile to (x, y), lifting it a little off the wall on the way. */
  async moveAnimated(id: string, x: number, y: number, tw: Tweens): Promise<THREE.Vector3 | null> {
    const p = this.hung.get(id);
    if (!p) return null;
    const obj = p.obj;
    obj.visible = true;
    const from = obj.position.clone();
    const to = cellLocal(x, y, p.tile.w, p.tile.h, 0.003);
    await tw.add(
      560,
      (t) => {
        obj.position.lerpVectors(from, to, t);
        obj.position.z += Math.sin(t * Math.PI) * 0.35;
      },
      ease.inOut,
    );
    obj.position.copy(to);
    return this.cellWorld(x, y, p.tile.w, p.tile.h);
  }

  /** Takes a tile off the wall while it is being moved, leaving an outline of its space (null puts it back). */
  setLifted(id: string | null) {
    if (this.lifted?.id === id) return;
    if (this.lifted) {
      const back = this.hung.get(this.lifted.id);
      if (back) back.obj.visible = true;
      freeOutline(this.lifted.hole);
      this.lifted = null;
    }
    const p = id ? this.hung.get(id) : null;
    if (!id || !p) return;
    p.obj.visible = false;
    const hole = outlineRect(p.tile.w * CELL_W - 0.03, p.tile.h * CELL_H - 0.03, 0.018, new THREE.MeshBasicMaterial({ color: '#d9cdb8', transparent: true, opacity: 0.45, depthWrite: false }));
    hole.position.copy(p.obj.position).setZ(0.006);
    hole.userData.overlay = true;
    this.group.add(hole);
    this.lifted = { id, hole };
  }

  /** Outlines the tiles that a click would pick up to move. */
  showMovable(ids: string[]) {
    for (const o of this.movable) {
      o.removeFromParent();
      for (const c of o.children) (c as THREE.Mesh).geometry.dispose();
    }
    this.movable = [];
    for (const id of ids) {
      const p = this.hung.get(id);
      if (!p) continue;
      const o = dashedRect(p.tile.w * CELL_W - 0.05, p.tile.h * CELL_H - 0.05, 0.022, this.movableMat);
      o.position.copy(p.obj.position).setZ(0.092);
      o.userData.overlay = true;
      this.group.add(o);
      this.movable.push(o);
    }
  }

  /** Hangs a tile with a flight from `from` (world) and a little settle. */
  async hangAnimated(h: Hung, from: THREE.Vector3 | null, tw: Tweens, fromScale = STAGE_SCALE): Promise<THREE.Vector3> {
    if (this.hung.has(h.tile.id)) return this.cellWorld(h.x, h.y, h.tile.w, h.tile.h);
    const placed = this.makeHung(h);
    this.hung.set(h.tile.id, placed);
    const obj = placed.obj;
    const to = obj.position.clone();
    const start = from ? this.group.worldToLocal(from.clone()) : to.clone().add(new THREE.Vector3(0, 0, 0.9));
    const s0 = from ? fromScale : 0.2;
    obj.scale.setScalar(s0);
    obj.position.copy(start);
    await tw.add(
      700,
      (t) => {
        obj.position.lerpVectors(start, to, t);
        obj.position.z += Math.sin(t * Math.PI) * 0.6;
        obj.scale.setScalar(s0 + (1 - s0) * t);
      },
      ease.inOut,
    );
    await tw.add(220, (t) => obj.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.035), ease.out);
    return this.cellWorld(h.x, h.y, h.tile.w, h.tile.h);
  }

  // ---------- assistant, excess and tiles in hand ----------

  private placeSmall(tile: Tile, scale: number): THREE.Group {
    const obj = tileMesh(tile, { scale, backing: this.backing });
    this.group.add(obj);
    return obj;
  }

  setStaging(tiles: Tile[]) {
    const keep: Placed[] = [];
    for (const s of this.staging) {
      if (tiles.some((t) => t.id === s.tile.id)) keep.push(s);
      else this.group.remove(s.obj);
    }
    for (const t of tiles) if (!keep.some((k) => k.tile.id === t.id)) keep.push({ tile: t, obj: this.placeSmall(t, STAGE_SCALE) });
    keep.sort((a, b) => tiles.findIndex((t) => t.id === a.tile.id) - tiles.findIndex((t) => t.id === b.tile.id));
    keep.forEach((s, i) => {
      s.obj.position.copy(this.group.worldToLocal(this.stagingWorld(keep.length - 1 - i)));
      s.obj.userData.bob = i * 0.7;
    });
    this.staging = keep;
  }

  /** Removes a tile in hand and returns where it was (world). */
  takeStaged(id: string): THREE.Vector3 | null {
    const i = this.staging.findIndex((s) => s.tile.id === id);
    if (i < 0) return null;
    const [s] = this.staging.splice(i, 1);
    const at = this.toWorld(s.obj.position);
    this.group.remove(s.obj);
    return at;
  }

  setAssistant(tile: Tile | null) {
    if (this.assistant && this.assistant.tile.id === tile?.id) return;
    if (this.assistant) this.group.remove(this.assistant.obj);
    this.assistant = null;
    if (!tile) return;
    const obj = this.placeSmall(tile, ASSIST_SCALE);
    obj.position.copy(this.group.worldToLocal(this.assistantWorld()));
    obj.position.y = 1.2 + (tile.h * CELL_H * ASSIST_SCALE) / 2 + 0.02;
    obj.rotation.x = -0.12;
    this.assistant = { tile, obj };
  }

  assistantTileId(): string | null {
    return this.assistant?.tile.id ?? null;
  }

  takeAssistant(): THREE.Vector3 | null {
    if (!this.assistant) return null;
    const at = this.toWorld(this.assistant.obj.position);
    this.group.remove(this.assistant.obj);
    this.assistant = null;
    return at;
  }

  setExcess(list: Painting[]) {
    const keep: Placed[] = [];
    for (const e of this.excess) {
      if (list.some((p) => p.id === e.tile.id)) keep.push(e);
      else this.group.remove(e.obj);
    }
    for (const p of list) if (!keep.some((k) => k.tile.id === p.id)) keep.push({ tile: p, obj: this.placeSmall(p, EXCESS_SCALE) });
    keep.forEach((e, i) => {
      e.obj.position.copy(this.group.worldToLocal(this.excessWorld(i)));
      e.obj.position.y = 0.08 + (e.tile.h * CELL_H * EXCESS_SCALE) / 2;
      e.obj.rotation.set(-0.18, 0, (i - 0.5) * 0.08);
    });
    this.excess = keep;
  }

  // ---------- placing ----------

  /** Shows a translucent tile at (x, y) with an outline coloured by state. */
  setGhost(tile: Tile, x: number, y: number, state: GhostState) {
    const key = tile.id;
    if (!this.ghost || this.ghost.key !== key) {
      this.clearGhost();
      const obj = tileMesh(tile, { backing: this.backing, urgent: true });
      ghostify(obj, 0.82);
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(tile.w * CELL_W, tile.h * CELL_H), this.ghostMat(state, 0.18));
      const outline = outlineRect(tile.w * CELL_W, tile.h * CELL_H, 0.035, this.ghostMat(state, 0.95));
      obj.userData.overlay = fill.userData.overlay = outline.userData.overlay = true;
      obj.renderOrder = 3;
      this.group.add(obj, fill, outline);
      this.ghost = { key, obj, outline, fill };
    }
    const g = this.ghost;
    const at = cellLocal(x, y, tile.w, tile.h, 0);
    g.obj.position.copy(at).setZ(state === 'bad' ? 0.07 : 0.05);
    g.fill.position.copy(at).setZ(0.004);
    g.outline.position.copy(at).setZ(0.09);
    g.fill.material = this.ghostMat(state, 0.18);
    for (const c of g.outline.children) (c as THREE.Mesh).material = this.ghostMat(state, 0.95);
    g.obj.visible = true;
  }

  clearGhost() {
    if (!this.ghost) return;
    this.group.remove(this.ghost.obj, this.ghost.outline, this.ghost.fill);
    this.ghost = null;
    this.setMarks([], []);
  }

  private ghostMat(state: GhostState, opacity: number): THREE.MeshBasicMaterial {
    const key = `${state}`;
    let base = this.ghostMats.get(key as GhostState);
    if (!base) {
      base = new THREE.MeshBasicMaterial({ color: GHOST_COLORS[state], transparent: true, depthWrite: false });
      this.ghostMats.set(key as GhostState, base);
    }
    if (opacity === 0.95) return base;
    const k = `${state}:${opacity}`;
    let m = this.ghostMats.get(k as GhostState);
    if (!m) {
      m = base.clone();
      m.opacity = opacity;
      this.ghostMats.set(k as GhostState, m);
    }
    return m;
  }

  /** Outlines the tiles a placement would match (gold) or clash with (red). */
  setMarks(matches: string[], faux: string[]) {
    for (const m of this.marks) freeOutline(m);
    this.marks = [];
    const add = (id: string, color: string) => {
      const p = this.hung.get(id);
      if (!p) return;
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
      const o = outlineRect(p.tile.w * CELL_W - 0.02, p.tile.h * CELL_H - 0.02, 0.03, mat);
      o.position.copy(p.obj.position).setZ(0.085);
      o.userData.tile = id;
      o.userData.overlay = true;
      this.group.add(o);
      this.marks.push(o);
    };
    for (const id of matches) add(id, '#ffd76a');
    for (const id of faux) add(id, '#ff5a5a');
  }

  /** Highlights every cell that some legal placement of a w x h tile would cover. */
  showSpots(spots: { x: number; y: number }[] | null, w = 1, h = 1) {
    if (!spots) {
      this.spots.visible = false;
      return;
    }
    const on = new Uint8Array(RULES.wallW * RULES.wallH);
    for (const s of spots) for (let y = s.y; y < s.y + h; y++) for (let x = s.x; x < s.x + w; x++) on[y * RULES.wallW + x] = 1;
    const ctx = this.spotCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.spotCanvas.width, this.spotCanvas.height);
    for (let y = 0; y < RULES.wallH; y++) {
      for (let x = 0; x < RULES.wallW; x++) {
        if (!on[y * RULES.wallW + x]) continue;
        ctx.fillStyle = 'rgba(160,255,200,0.11)';
        ctx.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
        ctx.strokeStyle = 'rgba(170,255,210,0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x * 32 + 2, y * 32 + 2, 28, 28);
      }
    }
    this.spotTex.needsUpdate = true;
    this.spots.visible = true;
  }

  /** A short glow around some tiles (frame matches, faux pas, scoring highlights). */
  flash(ids: string[], color: string, life = 1.4) {
    for (const id of ids) {
      const p = this.hung.get(id);
      if (!p) continue;
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      const o = outlineRect(p.tile.w * CELL_W - 0.01, p.tile.h * CELL_H - 0.01, 0.05, mat);
      o.position.copy(p.obj.position).setZ(0.1);
      o.userData.overlay = true;
      this.group.add(o);
      this.flashes.push({ obj: o, mat, age: 0, life });
    }
  }

  /** Steady outlines used during the final scoring; cleared with clearMarks. */
  mark(ids: string[], color: string) {
    for (const id of ids) {
      const p = this.hung.get(id);
      if (!p) continue;
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
      const o = outlineRect(p.tile.w * CELL_W - 0.03, p.tile.h * CELL_H - 0.03, 0.04, mat);
      o.position.copy(p.obj.position).setZ(0.095);
      o.userData.tile = id;
      o.userData.overlay = true;
      this.group.add(o);
      this.marks.push(o);
    }
  }

  clearMarks() {
    this.setMarks([], []);
  }

  tileIds(): string[] {
    return [...this.hung.keys()];
  }

  update(dt: number) {
    this.t += dt;
    for (const s of this.staging) {
      const b = (s.obj.userData.bob as number) ?? 0;
      s.obj.rotation.y = Math.sin(this.t * 0.9 + b) * 0.18;
      s.obj.position.y += Math.sin(this.t * 1.6 + b) * 0.0012;
    }
    for (const f of this.flashes) {
      f.age += dt;
      const k = f.age / f.life;
      f.mat.opacity = Math.max(0, Math.sin(Math.min(1, k) * Math.PI)) * (0.6 + 0.4 * Math.sin(f.age * 18));
    }
    for (const f of this.flashes.filter((x) => x.age >= x.life)) freeOutline(f.obj);
    this.flashes = this.flashes.filter((x) => x.age < x.life);
    if (this.ghost) {
      const pulse = 0.75 + Math.sin(this.t * 5) * 0.2;
      for (const c of this.ghost.outline.children) ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = pulse;
    }
    if (this.movable.length) this.movableMat.opacity = 0.5 + Math.sin(this.t * 2.6) * 0.22;
  }

  dispose() {
    this.group.removeFromParent();
  }
}
