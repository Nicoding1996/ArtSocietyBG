import * as THREE from 'three';
import { MOVEMENT_INFO, RULES } from '../../shared/content';
import { MOVEMENTS, type Artwork, type MovementId } from '../../shared/types';
import { ART_H, ART_W, artCanvas } from '../art/generate';
import { L, TAU, faceOut, polar } from './layout';
import { gold, marble, walnut } from './board';
import { badgeTexture, toTexture } from './textures';
import { ease, type Tweens } from './fx';

const textures = new Map<string, THREE.CanvasTexture>();
// Same size as a finished painting: WebGL keeps the texture's storage, so the image can be swapped in place.
const placeholder = (() => {
  const c = document.createElement('canvas');
  c.width = ART_W;
  c.height = ART_H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d8ccb4';
  ctx.fillRect(0, 0, ART_W, ART_H);
  return c;
})();

/** Texture for an artwork; starts as a blank canvas and fills in once painted. */
export function artTexture(art: Artwork): THREE.CanvasTexture {
  const key = `${art.movement}:${art.seed}:${art.kind}`;
  let t = textures.get(key);
  if (t) return t;
  t = new THREE.CanvasTexture(placeholder);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  textures.set(key, t);
  const tex = t;
  artCanvas(art, (canvas) => {
    tex.image = canvas;
    tex.needsUpdate = true;
  });
  return t;
}

const backMat = new THREE.MeshStandardMaterial({ color: '#cdbf9f', roughness: 0.9 });
const legGeo = new THREE.CylinderGeometry(0.028, 0.035, 1, 8);

export function makeFramed(art: Artwork, width: number, ornate: boolean): THREE.Group {
  const g = new THREE.Group();
  const W = width;
  const H = width * 1.25;
  const plane = new THREE.PlaneGeometry(W, H);
  const mat = new THREE.MeshStandardMaterial({ map: artTexture(art), roughness: 0.62 });
  const painting = new THREE.Mesh(plane, mat);
  painting.position.z = 0.025;
  // Shown on both faces so every gallery reads from anywhere around the table.
  const back = new THREE.Mesh(plane, mat);
  back.rotation.y = Math.PI;
  back.position.z = -0.025;
  const core = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.04), backMat);
  g.add(painting, back, core);
  const fw = ornate ? W * 0.12 : W * 0.075;
  const fd = ornate ? 0.12 : 0.08;
  const bars: [number, number, number, number][] = [
    [W + fw * 2, fw, 0, H / 2 + fw / 2],
    [W + fw * 2, fw, 0, -H / 2 - fw / 2],
    [fw, H, -W / 2 - fw / 2, 0],
    [fw, H, W / 2 + fw / 2, 0],
  ];
  const frameMat = ornate || art.kind === 'masterpiece' ? gold : walnut();
  for (const [bw, bh, x, y] of bars) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, fd), frameMat);
    m.position.set(x, y, 0);
    m.castShadow = true;
    g.add(m);
  }
  if (ornate) {
    for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const boss = new THREE.Mesh(new THREE.SphereGeometry(fw * 0.55, 16, 12), gold);
      boss.position.set((x * (W + fw)) / 2, (y * (H + fw)) / 2, 0);
      g.add(boss);
    }
  }
  return g;
}

/** A painting on a little easel, with a ribbon in the owner's colour. */
function makeEasel(art: Artwork, color: string): THREE.Group {
  const g = new THREE.Group();
  const master = art.kind === 'masterpiece';
  const W = master ? 1.02 : 0.84;
  const H = W * 1.25;
  const legH = 1.35 + (master ? 0.2 : 0);
  const framed = makeFramed(art, W, master);
  framed.position.set(0, 0.55 + H / 2, 0.06);
  framed.rotation.x = -0.12;
  g.add(framed);
  const legs: [number, number, number][] = [
    [-W * 0.38, 0.12, 0.08],
    [W * 0.38, -0.12, 0.08],
    [0, 0, -0.28],
  ];
  for (const [x, tilt, z] of legs) {
    const leg = new THREE.Mesh(legGeo, walnut());
    leg.scale.y = legH;
    leg.position.set(x * 0.9, legH / 2 - 0.02, z);
    leg.rotation.z = tilt;
    leg.rotation.x = z < 0 ? -0.22 : 0.05;
    leg.castShadow = true;
    g.add(leg);
  }
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(W * 1.05, 0.05, 0.14), walnut());
  ledge.position.set(0, 0.52, 0.1);
  g.add(ledge);
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.08, 0.03),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.5 }),
  );
  ribbon.position.set(0, 0.42, 0.17);
  g.add(ribbon);
  return g;
}

interface Placed {
  art: Artwork;
  obj: THREE.Group;
}

export class Gallery {
  readonly group = new THREE.Group();
  private owners: { id: string; color: string }[] = [];
  private placed = new Map<string, Placed[]>();
  private columns: { m: MovementId; drums: THREE.Mesh[]; gem: THREE.Mesh; badge: THREE.Sprite; value: number }[] = [];
  private columnGroup = new THREE.Group();
  private lot: THREE.Group | null = null;
  private lotHolder = new THREE.Group();
  readonly lotLight = new THREE.SpotLight('#fff1d6', 0, 22, 0.42, 0.6, 1.2);
  private t = 0;

  constructor() {
    this.group.add(this.lotHolder);
    this.lotLight.position.set(0, 12, 0);
    this.lotLight.target.position.set(0, L.plinthTop, 0);
    this.group.add(this.lotLight, this.lotLight.target);
  }

  /** One slender column per movement: a lantern of three glass drums that light up with its trend. */
  async buildColumns() {
    const drumGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.34, 24);
    const baseGeo = new THREE.CylinderGeometry(0.27, 0.32, 0.2, 24);
    const ringGeo = new THREE.TorusGeometry(0.19, 0.026, 8, 32);
    const gemGeo = new THREE.OctahedronGeometry(0.22);
    this.group.add(this.columnGroup);
    for (let k = 0; k < MOVEMENTS.length; k++) {
      const m = MOVEMENTS[k];
      const info = MOVEMENT_INFO[m];
      const a = Math.PI / 2 + (k * TAU) / MOVEMENTS.length;
      const pos = polar(L.trendR, a, L.plinthTop);
      const base = new THREE.Mesh(baseGeo, marble());
      base.position.copy(pos).setY(L.plinthTop + 0.1);
      base.castShadow = true;
      this.columnGroup.add(base);
      const drums: THREE.Mesh[] = [];
      for (let lvl = 0; lvl < RULES.trendMax; lvl++) {
        const d = new THREE.Mesh(
          drumGeo,
          new THREE.MeshPhysicalMaterial({
            color: '#3a3440',
            roughness: 0.08,
            metalness: 0,
            transparent: true,
            opacity: 0.35,
            clearcoat: 1,
            emissive: info.color,
            emissiveIntensity: 0,
          }),
        );
        d.position.copy(pos).setY(L.plinthTop + 0.2 + 0.19 + lvl * 0.4);
        this.columnGroup.add(d);
        drums.push(d);
        const ring = new THREE.Mesh(ringGeo, gold);
        ring.rotation.x = Math.PI / 2;
        ring.position.copy(d.position).setY(d.position.y + 0.19);
        this.columnGroup.add(ring);
      }
      const gem = new THREE.Mesh(
        gemGeo,
        new THREE.MeshPhysicalMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 0.5, roughness: 0.1, metalness: 0.1, clearcoat: 1 }),
      );
      gem.position.copy(pos);
      gem.castShadow = true;
      this.columnGroup.add(gem);
      const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: toTexture(await badgeTexture(m, info.color)), depthWrite: false }));
      badge.scale.setScalar(0.55);
      this.columnGroup.add(badge);
      this.columns.push({ m, drums, gem, badge, value: -1 });
    }
  }

  setTrends(trends: Record<MovementId, number>, animate = false) {
    for (const col of this.columns) {
      const v = trends[col.m];
      if (v === col.value) continue;
      const flash = animate && col.value >= 0;
      col.value = v;
      col.drums.forEach((d, i) => {
        const mat = d.material as THREE.MeshPhysicalMaterial;
        const lit = i < v;
        mat.emissiveIntensity = lit ? (flash ? 2.4 : 1) : 0;
        mat.color.set(lit ? MOVEMENT_INFO[col.m].color : '#3a3440');
        mat.opacity = lit ? 0.92 : 0.35;
      });
    }
  }

  setOwners(owners: { id: string; color: string }[]) {
    const same = owners.length === this.owners.length && owners.every((o, i) => this.owners[i]?.id === o.id);
    if (!same) {
      for (const list of this.placed.values()) for (const p of list) this.group.remove(p.obj);
      this.placed.clear();
    }
    this.owners = owners;
  }

  /** Position and facing of the n-th artwork in a player's sector. */
  slot(pid: string, index: number, total: number): { pos: THREE.Vector3; rot: number } {
    const k = Math.max(0, this.owners.findIndex((o) => o.id === pid));
    const n = Math.max(1, this.owners.length);
    const sector = TAU / n;
    const center = Math.PI / 2 + k * sector;
    const rows = L.rows.map((r) => ({ ...r, cap: Math.max(2, Math.floor((r.r * sector * 0.86) / 1.18)) }));
    let row = 0;
    let i = index;
    while (row < rows.length - 1 && i >= rows[row].cap) {
      i -= rows[row].cap;
      row++;
    }
    const before = rows.slice(0, row).reduce((s, r) => s + r.cap, 0);
    // The last row squeezes together instead of spilling into a neighbour's sector.
    const inRow = row === rows.length - 1 ? total - before : Math.min(rows[row].cap, total - before);
    const spacing = Math.min((sector * 0.86) / Math.max(1, inRow), 1.18 / rows[row].r);
    const a = center + (i - (inRow - 1) / 2) * spacing;
    return { pos: polar(rows[row].r, a, rows[row].y), rot: faceOut(a) };
  }

  /** Makes the galleries match the players' collections. Returns newly created objects. */
  sync(players: { id: string; color: string; collection: Artwork[] }[]): THREE.Group[] {
    const created: THREE.Group[] = [];
    for (const p of players) {
      const list = this.placed.get(p.id) ?? [];
      const keep = list.filter((x) => p.collection.some((a) => a.id === x.art.id));
      for (const x of list) if (!keep.includes(x)) this.group.remove(x.obj);
      for (const art of p.collection) {
        if (keep.some((x) => x.art.id === art.id)) continue;
        const obj = makeEasel(art, p.color);
        this.group.add(obj);
        keep.push({ art, obj });
        created.push(obj);
      }
      keep.sort((a, b) => p.collection.findIndex((c) => c.id === a.art.id) - p.collection.findIndex((c) => c.id === b.art.id));
      keep.forEach((x, i) => {
        const s = this.slot(p.id, i, keep.length);
        x.obj.position.copy(s.pos);
        x.obj.rotation.y = s.rot;
      });
      this.placed.set(p.id, keep);
    }
    return created;
  }

  objectFor(artId: string): THREE.Group | null {
    for (const list of this.placed.values()) for (const p of list) if (p.art.id === artId) return p.obj;
    return null;
  }

  async showLot(tw: Tweens, art: Artwork) {
    this.hideLotNow();
    const lot = new THREE.Group();
    const framed = makeFramed(art, 1.7, true);
    framed.position.y = 1.35;
    lot.add(framed);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 12), gold);
    stand.position.y = 0.2;
    lot.add(stand);
    lot.position.set(0, L.plinthTop, 0);
    lot.scale.setScalar(0.001);
    this.lotHolder.add(lot);
    this.lot = lot;
    await tw.add(
      900,
      (t) => {
        lot.scale.setScalar(Math.max(0.001, t));
        this.lotLight.intensity = t * 80;
      },
      ease.back,
    );
  }

  async hideLot(tw: Tweens, to: THREE.Vector3 | null) {
    const lot = this.lot;
    if (!lot) return;
    this.lot = null;
    const from = lot.position.clone();
    await tw.add(900, (t) => {
      if (to) lot.position.lerpVectors(from, to, t).setY(from.y + Math.sin(t * Math.PI) * 2 + (to.y - from.y) * t);
      lot.scale.setScalar(Math.max(0.001, 1 - t * 0.6));
      this.lotLight.intensity = (1 - t) * 80;
    });
    this.lotHolder.remove(lot);
  }

  hideLotNow() {
    if (this.lot) this.lotHolder.remove(this.lot);
    this.lot = null;
    this.lotLight.intensity = 0;
  }

  get hasLot() {
    return !!this.lot;
  }

  setColumnsVisible(v: boolean) {
    this.columnGroup.visible = v;
  }

  update(dt: number) {
    this.t += dt;
    this.columns.forEach((c, k) => {
      const top = L.plinthTop + 0.2 + RULES.trendMax * 0.4 + 0.34;
      c.gem.position.y = top + Math.sin(this.t * 1.6 + k) * 0.06;
      c.gem.rotation.y += dt * 0.8;
      c.badge.position.copy(c.gem.position).setY(top + 0.55);
      for (const d of c.drums) {
        const mat = d.material as THREE.MeshPhysicalMaterial;
        if (mat.emissiveIntensity > 1) mat.emissiveIntensity = Math.max(1, mat.emissiveIntensity - dt * 1.5);
      }
    });
    if (this.lot) this.lot.rotation.y += dt * 0.45;
  }
}
