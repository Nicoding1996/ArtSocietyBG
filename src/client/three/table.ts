import * as THREE from 'three';
import { RULES } from '../../shared/content';
import { GENRES, type Genre, type Painting } from '../../shared/types';
import { ease, type Tweens } from './fx';
import { CELL_H, CELL_W, TABLE_R, TABLE_TOP, outward, type Side } from './layout';
import { baize, brass, darkGold, gold, mahogany } from './materials';
import { MUSEUM, brassPlateTexture, discTexture, labelTexture, museumTexture, toTexture, trackPos } from './textures';
import { backMesh, paintingMesh } from './tiles';
import { typeIcon, typeInfo } from '../theme';
import { loadedIcon } from '../ui/icons';

export const PILE_SCALE = 0.3;
const LOT_Z = 1.78;
const BOARD_Z = -0.38;
const DISC_R = 0.12;
const DISC_H = 0.014;
// Matte like card stock: the discs sit right under the chandelier, and a glossy ivory face flared into a glow.
const DISC_ROUGH = 0.7;

const PILE_AT: Record<Genre, [number, number]> = {
  city: [-2.22, BOARD_Z - 0.42],
  portrait: [-2.22, BOARD_Z + 0.5],
  still: [2.22, BOARD_Z - 0.42],
  landscape: [2.22, BOARD_Z + 0.5],
};

function markerTop(genre: Genre): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = typeInfo(genre).color;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.stroke();
  const img = loadedIcon(genre, '#ffffff', 128, 2.2);
  if (img) ctx.drawImage(img, 22, 22, 84, 84);
  return toTexture(c);
}

/** One player's bidding stack: played discs with the last one face up, plus a sealed bid on top. */
class BidStack {
  readonly group = new THREE.Group();
  private discs: THREE.Mesh[] = [];
  private sealed: THREE.Mesh | null = null;
  private count = -1;
  private top = -1;
  private side: THREE.MeshStandardMaterial;

  constructor(private color: string) {
    this.side = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1 });
  }

  private disc(n: number | null): THREE.Mesh {
    const face = new THREE.MeshStandardMaterial({ map: discTexture(n, this.color), roughness: DISC_ROUGH });
    const back = new THREE.MeshStandardMaterial({ map: discTexture(null, this.color), roughness: DISC_ROUGH });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(DISC_R, DISC_R, DISC_H, 40), [this.side, face, back]);
    m.castShadow = true;
    return m;
  }

  /** Shows `count` played discs with `top` face up; `sealed` adds a face-down bid on top. */
  set(count: number, top: number, sealed: boolean) {
    const shown = Math.min(count, 7);
    if (count !== this.count || top !== this.top) {
      for (const d of this.discs) this.group.remove(d);
      this.discs = [];
      for (let i = 0; i < shown; i++) {
        const last = i === shown - 1;
        const d = this.disc(last ? top : null);
        d.position.y = DISC_H / 2 + i * DISC_H;
        // A quarter turn makes the printed number read upright from the local player's seat.
        d.rotation.y = Math.PI / 2 + (last ? 0 : ((i * 0.9) % 0.4) - 0.2);
        this.group.add(d);
        this.discs.push(d);
      }
      this.count = count;
      this.top = top;
    }
    if (sealed && !this.sealed) {
      const d = this.disc(null);
      d.rotation.set(Math.PI, Math.PI / 2, 0);
      d.position.y = DISC_H / 2 + shown * DISC_H;
      this.group.add(d);
      this.sealed = d;
    } else if (!sealed && this.sealed) {
      this.group.remove(this.sealed);
      this.sealed = null;
    }
  }

  /** A face-down disc drops onto the stack. */
  async drop(tw: Tweens) {
    const shown = Math.min(this.count, 7);
    this.set(this.count, this.top, true);
    const d = this.sealed!;
    const y = DISC_H / 2 + shown * DISC_H;
    await tw.add(420, (t) => (d.position.y = y + (1 - ease.bounce(t)) * 0.6), (t) => t);
  }

  /** The sealed disc turns over to show its number. */
  async flip(tw: Tweens, n: number, count: number) {
    if (!this.sealed) this.set(this.count, this.top, true);
    const d = this.sealed!;
    // The top cap faces down while sealed and comes up as the disc turns over.
    const face = new THREE.MeshStandardMaterial({ map: discTexture(n, this.color), roughness: DISC_ROUGH });
    (d.material as THREE.Material[])[1] = face;
    const y0 = d.position.y;
    await tw.add(560, (t) => {
      d.rotation.x = Math.PI * (1 - t);
      d.position.y = y0 + Math.sin(t * Math.PI) * 0.25;
    });
    this.group.remove(d);
    this.sealed = null;
    this.count = -1;
    this.set(count, n, false);
  }
}

/** The auction table in the middle of the salon. */
export class Table {
  readonly group = new THREE.Group();
  private board = new THREE.Group();
  private markers = new Map<Genre, THREE.Mesh>();
  private prestige: Record<Genre, number> = { city: 0, portrait: 0, still: 0, landscape: 0 };
  private piles = new Map<Genre, { group: THREE.Group; ids: string[]; label: THREE.Sprite }>();
  private lots: { tile: Painting; obj: THREE.Group; stand: THREE.Group }[] = [];
  private stacks = new Map<string, { stack: BidStack; side: Side }>();
  private gavel = new THREE.Group();
  private gavelSide: Side | null = null;
  private supplyLabel: THREE.Sprite;
  private t = 0;

  constructor() {
    const g = this.group;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.1, 120), [mahogany(), baize(), mahogany()]);
    top.position.y = TABLE_TOP - 0.05;
    top.receiveShadow = true;
    top.castShadow = true;
    g.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(TABLE_R, 0.045, 12, 160), gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = TABLE_TOP - 0.005;
    g.add(rim);
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R - 0.08, TABLE_R - 0.25, 0.22, 96, 1, true), mahogany());
    apron.position.y = TABLE_TOP - 0.21;
    g.add(apron);
    const pts = [
      [0.0, 0],
      [1.1, 0],
      [1.1, 0.06],
      [0.55, 0.14],
      [0.32, 0.3],
      [0.26, 0.55],
      [0.32, 0.7],
      [0.42, TABLE_TOP - 0.32],
      [0, TABLE_TOP - 0.3],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const pedestal = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mahogany());
    pedestal.castShadow = true;
    g.add(pedestal);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 48), darkGold);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.62;
    g.add(band);

    // The museum board.
    const base = new THREE.Mesh(new THREE.BoxGeometry(MUSEUM.w, 0.06, MUSEUM.d), mahogany());
    base.position.y = 0.03;
    base.castShadow = true;
    base.receiveShadow = true;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(MUSEUM.w - 0.02, MUSEUM.d - 0.02),
      new THREE.MeshStandardMaterial({ map: toTexture(museumTexture()), roughness: 0.55, metalness: 0.05 }),
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.061;
    face.receiveShadow = true;
    const edge = new THREE.Mesh(new THREE.BoxGeometry(MUSEUM.w + 0.04, 0.025, MUSEUM.d + 0.04), gold);
    edge.position.y = 0.0125;
    this.board.add(edge, base, face);
    this.board.position.set(0, TABLE_TOP, BOARD_Z);
    g.add(this.board);

    GENRES.forEach((genre, i) => {
      const color = typeInfo(genre).color;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.055, 32), [
        new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 1 }),
        new THREE.MeshStandardMaterial({ map: markerTop(genre), roughness: 0.35 }),
        new THREE.MeshPhysicalMaterial({ color, roughness: 0.3 }),
      ]);
      m.castShadow = true;
      m.position.copy(this.markerSpot(genre, 0, i));
      this.board.add(m);
      this.markers.set(genre, m);
      const pile = new THREE.Group();
      const [px, pz] = PILE_AT[genre];
      pile.position.set(px, TABLE_TOP + 0.002, pz);
      const label = this.makePlate();
      this.setPlate(label, `${typeInfo(genre).short} \u00b7 0`, genre);
      label.position.set(0, 0.42, 0);
      pile.add(label);
      g.add(pile);
      this.piles.set(genre, { group: pile, ids: [], label });
    });

    // A crate of face-down paintings: the supply.
    const crate = new THREE.Group();
    const sizes: [number, number][] = [
      [5, 4],
      [3, 3],
      [4, 3],
      [2, 2],
      [3, 2],
    ];
    sizes.forEach(([w, h], i) => {
      const b = backMesh(w, h, 0.32);
      b.rotation.x = -Math.PI / 2;
      b.rotation.z = (i - 2) * 0.06;
      b.position.set((i % 2) * 0.05 - 0.02, 0.015 + i * 0.016, (i % 3) * 0.03);
      crate.add(b);
    });
    crate.position.set(0, TABLE_TOP, -2.05);
    g.add(crate);
    this.supplyLabel = this.makePlate();
    this.setPlate(this.supplyLabel, 'Supply');
    this.supplyLabel.position.set(0, TABLE_TOP + 0.5, -2.05);
    g.add(this.supplyLabel);

    this.buildGavel();
  }

  /** A brass plate floating over a pile, always turned to the camera so it reads from every seat. */
  private makePlate(): THREE.Sprite {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, transparent: true }));
    s.scale.set(0.62, 0.177, 1);
    return s;
  }

  /** Engraves the plate again when its text changes, or once the font or the type's icon it needs has loaded. */
  private setPlate(s: THREE.Sprite, text: string, genre?: Genre) {
    const ready = `${document.fonts.check('700 66px "Cormorant Garamond"')}|${!genre || !!loadedIcon(typeIcon(genre), '#16120e', 128, 2.2)}`;
    const key = `${text}|${genre ? typeIcon(genre) : ''}|${ready}`;
    if (s.userData.plate === key) return;
    s.userData.plate = key;
    const mat = s.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = toTexture(brassPlateTexture(text, genre ? { color: typeInfo(genre).color, icon: typeIcon(genre) } : undefined));
    mat.needsUpdate = true;
  }

  private buildGavel() {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 24), mahogany());
    head.rotation.z = Math.PI / 2;
    head.position.set(0, 0.06, 0);
    const bands = [-0.06, 0.06].map((x) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.02, 24), gold);
      b.rotation.z = Math.PI / 2;
      b.position.set(x, 0.06, 0);
      return b;
    });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.36, 12), mahogany());
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 0.03, 0.18);
    const block = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.035, 28), mahogany());
    block.position.set(0.22, 0.0175, -0.05);
    this.gavel.add(head, ...bands, handle, block);
    this.gavel.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    this.gavel.visible = false;
    this.group.add(this.gavel);
  }

  /** Board-local spot for a marker: on the track, or in the start box while at zero. */
  private markerSpot(genre: Genre, value: number, slot = GENRES.indexOf(genre)): THREE.Vector3 {
    const y = 0.061 + 0.0275;
    if (value <= 0) return new THREE.Vector3(MUSEUM.startX, y, MUSEUM.trackZ0 + slot * MUSEUM.trackDZ);
    const p = trackPos(value);
    return new THREE.Vector3(p.x, y + (value > 50 ? 0.06 : 0), p.z);
  }

  setPrestige(p: Record<Genre, number>) {
    for (const g of GENRES) {
      this.prestige[g] = p[g];
      this.markers.get(g)!.position.copy(this.markerSpot(g, p[g]));
    }
  }

  /** The marker hops along the track to where it landed, then steps back if that space was taken. */
  async movePrestige(tw: Tweens, genre: Genre, from: number, to: number, landed: number, onHop: () => void) {
    const m = this.markers.get(genre)!;
    let cur = from;
    while (cur < landed) {
      const a = this.markerSpot(genre, cur);
      cur++;
      const b = this.markerSpot(genre, cur);
      await tw.add(150, (t) => {
        m.position.lerpVectors(a, b, t);
        m.position.y += Math.sin(t * Math.PI) * 0.12;
      });
      onHop();
    }
    if (to !== landed) {
      await tw.wait(250);
      while (cur > to) {
        const a = this.markerSpot(genre, cur);
        cur--;
        const b = this.markerSpot(genre, cur);
        await tw.add(190, (t) => m.position.lerpVectors(a, b, t));
      }
    }
    this.prestige[genre] = to;
    m.position.copy(this.markerSpot(genre, to));
  }

  /** At the end, markers climb to the ranking slots (x2 on the left to x5 on the right). */
  async rankMarkers(tw: Tweens, multipliers: Record<Genre, number>) {
    const used = new Map<number, number>();
    for (const g of [...GENRES].sort((a, b) => multipliers[a] - multipliers[b])) {
      const mult = multipliers[g];
      const slot = 3 - RULES.multipliers.indexOf(mult as 5 | 4 | 3 | 2);
      const k = used.get(slot) ?? 0;
      used.set(slot, k + 1);
      const m = this.markers.get(g)!;
      const a = m.position.clone();
      const b = new THREE.Vector3(MUSEUM.rankX[slot] - 0.2 + k * 0.07, 0.061 + 0.0275 + k * 0.056, MUSEUM.rankZ + k * 0.02);
      await tw.add(650, (t) => {
        m.position.lerpVectors(a, b, t);
        m.position.y += Math.sin(t * Math.PI) * 0.5;
      });
    }
  }

  markerWorld(genre: Genre): THREE.Vector3 {
    return this.board.localToWorld(this.markers.get(genre)!.position.clone());
  }

  // ---------- museum piles ----------

  /** Shows the top of each museum pile and how many paintings it holds. */
  setMuseum(museum: Record<Genre, Painting[]>) {
    for (const g of GENRES) {
      const pile = this.piles.get(g)!;
      const list = museum[g];
      const show = list.slice(-5);
      const ids = show.map((p) => p.id);
      if (ids.join() !== pile.ids.join()) {
        for (const c of [...pile.group.children]) if (c !== pile.label) pile.group.remove(c);
        show.forEach((p, i) => {
          const obj = paintingMesh(p, { scale: PILE_SCALE });
          obj.rotation.x = -Math.PI / 2;
          obj.rotation.z = ((p.seed % 7) - 3) * 0.05;
          obj.position.set(((p.seed % 5) - 2) * 0.015, 0.004 + i * 0.012, ((p.seed % 3) - 1) * 0.015);
          pile.group.add(obj);
        });
        pile.ids = ids;
      }
      this.setPlate(pile.label, `${typeInfo(g).short} \u00b7 ${list.length}`, g);
      pile.label.visible = true;
    }
  }

  pileWorld(genre: Genre): THREE.Vector3 {
    const pile = this.piles.get(genre)!;
    return pile.group.localToWorld(new THREE.Vector3(0, 0.05 + pile.ids.length * 0.012, 0));
  }

  setSupply(count: number) {
    // setPlate skips the work when nothing changed, and catches the font arriving after the first count.
    this.setPlate(this.supplyLabel, `Supply \u00b7 ${count}`);
  }

  supplyWorld(): THREE.Vector3 {
    return new THREE.Vector3(0, TABLE_TOP + 0.15, -2.05);
  }

  // ---------- the lots ----------

  private lotLayout(lots: Painting[]): { scale: number; xs: number[] } {
    const gap = 0.16;
    const widths = lots.map((l) => l.w * CELL_W);
    const raw = widths.reduce((a, b) => a + b, 0);
    const scale = Math.min(0.46, (4.3 - gap * (lots.length - 1)) / Math.max(0.01, raw));
    const total = raw * scale + gap * (lots.length - 1);
    let x = -total / 2;
    const xs = widths.map((w) => {
      const cx = x + (w * scale) / 2;
      x += w * scale + gap;
      return cx;
    });
    return { scale, xs };
  }

  /** Lays out the paintings on offer, standing on little brass stands. Face down until revealed. */
  showLots(lots: Painting[], faceDown = false) {
    this.clearLots();
    const { scale, xs } = this.lotLayout(lots);
    lots.forEach((tile, i) => {
      const stand = new THREE.Group();
      const foot = new THREE.Mesh(new THREE.BoxGeometry(tile.w * CELL_W * scale + 0.06, 0.03, 0.18), brass);
      foot.position.y = 0.015;
      const prop = new THREE.Mesh(new THREE.BoxGeometry(0.03, tile.h * CELL_H * scale * 0.7, 0.03), brass);
      prop.position.set(0, (tile.h * CELL_H * scale * 0.7) / 2, -0.09);
      prop.rotation.x = 0.28;
      const token = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 0.11),
        new THREE.MeshStandardMaterial({ map: toTexture(labelTexture(String(tile.value), { w: 192, h: 104, size: 70 })), roughness: 0.5 }),
      );
      token.rotation.x = -0.9;
      token.position.set(0, 0.06, 0.16);
      stand.add(foot, prop, token);
      stand.position.set(xs[i], TABLE_TOP, LOT_Z + Math.abs(xs[i]) * -0.12);
      stand.rotation.y = -xs[i] * 0.12;
      const obj = paintingMesh(tile, { scale, withBack: true, urgent: true });
      obj.position.set(0, (tile.h * CELL_H * scale) / 2 + 0.035, 0);
      obj.rotation.x = -0.25;
      if (faceDown) obj.rotation.y = Math.PI;
      stand.add(obj);
      this.group.add(stand);
      this.lots.push({ tile, obj, stand });
    });
  }

  /** Flips the face-down lots one after another. */
  async revealLots(tw: Tweens, onFlip: () => void) {
    for (const l of this.lots) {
      const o = l.obj;
      onFlip();
      void tw.add(520, (t) => {
        o.rotation.y = Math.PI * (1 - t);
        o.position.y = (l.tile.h * CELL_H * o.scale.y) / 2 + 0.035;
      });
      await tw.wait(160);
    }
    await tw.wait(420);
  }

  /** Lots fly in from the supply crate face down, then turn over. */
  async dealLots(tw: Tweens, lots: Painting[], onLand: () => void, onFlip: () => void) {
    this.showLots(lots, true);
    const from = this.group.worldToLocal(this.supplyWorld());
    const targets = this.lots.map((l) => l.stand.position.clone());
    for (const l of this.lots) {
      l.stand.position.copy(from);
      l.stand.visible = false;
    }
    for (const [i, l] of this.lots.entries()) {
      const s = l.stand;
      const to = targets[i];
      s.visible = true;
      void tw
        .add(560, (t) => {
          s.position.lerpVectors(from, to, t);
          s.position.y += Math.sin(t * Math.PI) * 0.9;
        })
        .then(onLand);
      await tw.wait(130);
    }
    await tw.wait(560);
    await this.revealLots(tw, onFlip);
  }

  lotWorld(id: string): THREE.Vector3 | null {
    const l = this.lots.find((x) => x.tile.id === id);
    return l ? l.obj.getWorldPosition(new THREE.Vector3()) : null;
  }

  removeLot(id: string): THREE.Vector3 | null {
    const i = this.lots.findIndex((x) => x.tile.id === id);
    if (i < 0) return null;
    const at = this.lots[i].obj.getWorldPosition(new THREE.Vector3());
    this.group.remove(this.lots[i].stand);
    this.lots.splice(i, 1);
    return at;
  }

  lotIds(): string[] {
    return this.lots.map((l) => l.tile.id);
  }

  clearLots() {
    for (const l of this.lots) this.group.remove(l.stand);
    this.lots = [];
  }

  // ---------- bidding stacks and the gavel ----------

  setSeats(seats: { pid: string; side: Side; color: string }[]) {
    for (const [pid, s] of this.stacks) {
      if (!seats.some((x) => x.pid === pid)) {
        this.group.remove(s.stack.group);
        this.stacks.delete(pid);
      }
    }
    for (const seat of seats) {
      let entry = this.stacks.get(seat.pid);
      if (!entry) {
        entry = { stack: new BidStack(seat.color), side: seat.side };
        this.stacks.set(seat.pid, entry);
        this.group.add(entry.stack.group);
      }
      entry.side = seat.side;
      const n = outward(seat.side);
      entry.stack.group.position.copy(n.multiplyScalar(TABLE_R - 0.4)).setY(TABLE_TOP);
      entry.stack.group.rotation.y = 0;
    }
  }

  setStack(pid: string, count: number, top: number, sealed: boolean) {
    this.stacks.get(pid)?.stack.set(count, top, sealed);
  }

  dropBid(tw: Tweens, pid: string) {
    return this.stacks.get(pid)?.stack.drop(tw) ?? Promise.resolve();
  }

  flipBid(tw: Tweens, pid: string, n: number, count: number) {
    return this.stacks.get(pid)?.stack.flip(tw, n, count) ?? Promise.resolve();
  }

  stackWorld(pid: string): THREE.Vector3 | null {
    const s = this.stacks.get(pid);
    return s ? s.stack.group.getWorldPosition(new THREE.Vector3()) : null;
  }

  private gavelPose(side: Side): { pos: THREE.Vector3; rot: number } {
    const n = outward(side);
    const right = new THREE.Vector3(-n.z, 0, n.x).multiplyScalar(-1);
    const pos = n.clone().multiplyScalar(TABLE_R - 0.5).add(right.multiplyScalar(0.45)).setY(TABLE_TOP);
    return { pos, rot: Math.atan2(n.x, n.z) + 0.6 };
  }

  /** Slides the gavel to the auctioneer's place. */
  async moveGavel(tw: Tweens | null, side: Side) {
    const { pos, rot } = this.gavelPose(side);
    const g = this.gavel;
    if (!tw || !g.visible || this.gavelSide === null) {
      g.position.copy(pos);
      g.rotation.y = rot;
      g.visible = true;
      this.gavelSide = side;
      return;
    }
    if (this.gavelSide === side) return;
    this.gavelSide = side;
    const a = g.position.clone();
    const r0 = g.rotation.y;
    let dr = rot - r0;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    await tw.add(900, (t) => {
      g.position.lerpVectors(a, pos, t);
      g.position.y = TABLE_TOP + Math.sin(t * Math.PI) * 0.6;
      g.rotation.y = r0 + dr * t;
    });
  }

  hideGavel() {
    this.gavel.visible = false;
    this.gavelSide = null;
  }

  update(dt: number) {
    this.t += dt;
    for (const l of this.lots) l.obj.position.x = Math.sin(this.t * 1.3 + l.stand.position.x) * 0.003;
  }
}
