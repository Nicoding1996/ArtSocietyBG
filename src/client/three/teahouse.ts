import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROOM, ROOM_H, inwardRotation, outward, type Side } from './layout';
import { gold, mahogany, walnut } from './materials';
import type { Surroundings } from './room';
import {
  baSingSeTexture,
  beamTexture,
  ceilingTexture,
  lanternTexture,
  latticeTexture,
  paiShoTexture,
  plankTexture,
  scrollTexture,
  teaRugTexture,
  teaWallTexture,
} from './teaTextures';
import { toTexture } from './textures';

const WAINSCOT_H = 1.0;
const FRIEZE_H = 0.5;
const SIDES: Side[] = [0, 1, 2, 3];
/** The big lantern over the table hangs from this height (the frame of the fixture). */
const FRAME_Y = 6.6;
/** Brightness of the lantern paper; the light inside flickers a little around it. */
const GLOW = 1.25;

type Part = [THREE.BufferGeometry, THREE.Material, THREE.Matrix4];

const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

/** Static parts that share a material are merged into one mesh per material, so the room costs few draw calls. */
class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(geo: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4) {
    const list = this.parts.get(mat) ?? [];
    list.push(geo.clone().applyMatrix4(m));
    this.parts.set(mat, list);
  }

  addAll(parts: Part[], base: THREE.Matrix4) {
    for (const [geo, mat, m] of parts) this.add(geo, mat, base.clone().multiply(m));
  }

  meshes(shadows: boolean): THREE.Mesh[] {
    return [...this.parts].map(([mat, list]) => {
      const merged = mergeGeometries(list);
      if (!merged) throw new Error('tea house: parts that share a material must have the same attributes');
      const mesh = new THREE.Mesh(merged, mat);
      for (const g of list) g.dispose();
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      return mesh;
    });
  }
}

function meshOf([geo, mat, m]: Part): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  m.decompose(mesh.position, mesh.quaternion, mesh.scale);
  return mesh;
}

/** A tilted cylinder from a to b, for trunks and strings. */
function between(a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.Matrix4 {
  const dir = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(r, dir.length(), r));
}

/**
 * The Avatar theme's room: a tea house in Ba Sing Se's Upper Ring, after the Jasmine Dragon. Jade silk walls over
 * lattice panels, red lacquer columns, a painted frieze, paper lanterns, ink scrolls, and round windows onto the city.
 */
export class TeaHouse implements Surroundings {
  readonly group = new THREE.Group();
  private windows = new Map<Side, THREE.Group>();
  private fixture = new THREE.Group();
  private swinging: THREE.Group[] = [];
  private light: THREE.PointLight;
  private t = 0;

  // Unit shapes, scaled into place.
  private cyl = new THREE.CylinderGeometry(1, 1, 1, 24);
  private cap = new THREE.CylinderGeometry(0.82, 1, 1, 20);
  private ball = new THREE.SphereGeometry(1, 28, 18);
  /** For knobs and beads too small to need a round silhouette. */
  private bead = new THREE.SphereGeometry(1, 10, 8);
  private box = new THREE.BoxGeometry(1, 1, 1);
  private tasselGeo = new THREE.CylinderGeometry(0.35, 1, 1, 10);
  private pad = new THREE.IcosahedronGeometry(1, 1);

  private lacquer = new THREE.MeshPhysicalMaterial({ color: '#7c2717', roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.22 });
  private jade = new THREE.MeshPhysicalMaterial({ color: '#215c43', roughness: 0.4, clearcoat: 0.5 });
  private stone = new THREE.MeshStandardMaterial({ color: '#8b877c', roughness: 0.88 });
  private cord = new THREE.MeshStandardMaterial({ color: '#2a1610', roughness: 0.8 });
  private tassel = new THREE.MeshStandardMaterial({ color: '#a32c1c', roughness: 0.85 });
  private fabric = new THREE.MeshStandardMaterial({ color: '#2f6a4a', roughness: 0.95 });
  private celadon = new THREE.MeshPhysicalMaterial({ color: '#8fb5a0', roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  private bark = new THREE.MeshStandardMaterial({ color: '#4a3020', roughness: 0.92 });
  private needles = new THREE.MeshStandardMaterial({ color: '#2d5734', roughness: 0.85, flatShading: true });
  private soil = new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 1 });
  /** Unlit: the lanterns are the light, so the lamp inside the big one must not wash them out. */
  private paper: THREE.MeshBasicMaterial;
  private night: THREE.MeshBasicMaterial | null = null;
  private board: THREE.MeshStandardMaterial | null = null;

  constructor() {
    this.paper = new THREE.MeshBasicMaterial({ map: toTexture(lanternTexture()), color: new THREE.Color(GLOW, GLOW, GLOW) });
    this.buildFloor();
    this.buildWalls();
    const solid = new Batch();
    const fine = new Batch();
    this.buildColumns(solid);
    this.buildWallDecor(fine);
    for (const m of solid.meshes(true)) this.group.add(m);
    for (const m of fine.meshes(false)) this.group.add(m);
    this.buildFixture();
    // As bright as the salon's chandelier, so the table reads the same; warmer, through paper.
    this.light = new THREE.PointLight('#ffcb8c', 34, 22, 1.25);
    this.light.position.set(0, FRAME_Y - 0.66, 0);
    this.group.add(this.light);
  }

  private buildFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM * 2 + 0.4, ROOM * 2 + 0.4),
      new THREE.MeshStandardMaterial({ map: toTexture(plankTexture(), true, 4), roughness: 0.5, metalness: 0.04 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.6, 96), new THREE.MeshStandardMaterial({ map: toTexture(teaRugTexture()), roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.004;
    rug.receiveShadow = true;
    // A coffered ceiling, facing down only: seen from inside the room, gone when the camera rises above it.
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM * 2, ROOM * 2),
      new THREE.MeshStandardMaterial({ map: toTexture(ceilingTexture(), true, 8), roughness: 0.75 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_H;
    this.group.add(floor, rug, ceiling);
  }

  private buildWalls() {
    const silk = new THREE.MeshStandardMaterial({ map: toTexture(teaWallTexture(), true, [8, 3]), roughness: 0.78 });
    const lattice = new THREE.MeshStandardMaterial({ map: toTexture(latticeTexture(), true, [5, 1]), roughness: 0.55 });
    const frieze = new THREE.MeshStandardMaterial({ map: toTexture(beamTexture(), true, [4, 1]), roughness: 0.6 });
    const w = walnut();
    for (const side of SIDES) {
      const wall = new THREE.Group();
      wall.position.copy(outward(side).multiplyScalar(ROOM));
      wall.rotation.y = inwardRotation(side);
      const upper = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM_H - WAINSCOT_H), silk);
      upper.position.set(0, WAINSCOT_H + (ROOM_H - WAINSCOT_H) / 2, 0);
      upper.receiveShadow = true;
      const lower = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, WAINSCOT_H, 0.08), [w, w, w, w, lattice, w]);
      lower.position.set(0, WAINSCOT_H / 2, 0.04);
      lower.receiveShadow = true;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 0.08, 0.14), this.lacquer);
      rail.position.set(0, WAINSCOT_H + 0.02, 0.07);
      const skirting = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 0.16, 0.12), w);
      skirting.position.set(0, 0.08, 0.06);
      const band = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, FRIEZE_H, 0.22), [w, w, w, w, frieze, w]);
      band.position.set(0, ROOM_H - FRIEZE_H / 2, 0.11);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 0.04, 0.24), gold);
      trim.position.set(0, ROOM_H - FRIEZE_H - 0.02, 0.12);
      wall.add(upper, lower, rail, skirting, band, trim);
      this.group.add(wall);
    }
  }

  /** Red lacquer columns in the corners, on stone bases, with gold bands and a jade bracket under the frieze. */
  private buildColumns(b: Batch) {
    const top = ROOM_H - FRIEZE_H;
    for (const [sx, sz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const x = sx * (ROOM - 0.36);
      const z = sz * (ROOM - 0.36);
      b.add(this.cyl, this.lacquer, at(x, ROOM_H / 2, z, 0, 0, 0, 0.32, ROOM_H, 0.32));
      b.add(this.cyl, this.stone, at(x, 0.13, z, 0, 0, 0, 0.5, 0.26, 0.5));
      b.add(this.cap, this.stone, at(x, 0.31, z, 0, 0, 0, 0.42, 0.1, 0.42));
      for (const y of [1.3, top - 0.62]) b.add(this.cyl, gold, at(x, y, z, 0, 0, 0, 0.335, 0.05, 0.335));
      b.add(this.box, this.jade, at(x, top - 0.13, z, 0, 0, 0, 0.9, 0.26, 0.9));
      b.add(this.box, gold, at(x, top - 0.01, z, 0, 0, 0, 0.98, 0.03, 0.98));
    }
  }

  /** A round paper lantern hanging `drop` below its hook (the origin): cord, cap, globe, cap, tassel. */
  private lanternParts(r: number, drop: number): Part[] {
    const capH = r * 0.16;
    const half = r * 0.86;
    const globe = -drop - capH - half;
    const bottom = globe - half - capH / 2;
    return [
      [this.cyl, this.cord, at(0, -drop / 2, 0, 0, 0, 0, 0.008, drop, 0.008)],
      [this.cap, this.lacquer, at(0, -drop - capH / 2, 0, 0, 0, 0, r * 0.5, capH, r * 0.5)],
      [this.cyl, gold, at(0, -drop - capH, 0, 0, 0, 0, r * 0.52, r * 0.03, r * 0.52)],
      [this.ball, this.paper, at(0, globe, 0, 0, 0, 0, r, half, r)],
      [this.cap, this.lacquer, at(0, bottom, 0, Math.PI, 0, 0, r * 0.5, capH, r * 0.5)],
      [this.bead, gold, at(0, bottom - capH / 2 - r * 0.05, 0, 0, 0, 0, r * 0.08)],
      [this.tasselGeo, this.tassel, at(0, bottom - capH / 2 - r * 0.5, 0, 0, 0, 0, r * 0.11, r * 0.8, r * 0.11)],
    ];
  }

  /** Lanterns on brackets near the corners, and a hanging scroll either side of every wall. */
  private buildWallDecor(b: Batch) {
    const scrolls = [0, 1, 2].map((k) => new THREE.MeshStandardMaterial({ map: toTexture(scrollTexture(k)), roughness: 0.8 }));
    const sheet = new THREE.PlaneGeometry(0.7, 2.1);
    const w = walnut();
    for (const side of SIDES) {
      const base = new THREE.Matrix4().compose(outward(side).multiplyScalar(ROOM), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, inwardRotation(side), 0)), new THREE.Vector3(1, 1, 1));
      const put = (geo: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4) => b.add(geo, mat, base.clone().multiply(m));
      for (const x of [-7.2, 7.2]) {
        put(this.box, w, at(x, 5.25, 0.02, 0, 0, 0, 0.12, 0.42, 0.04));
        put(this.box, this.lacquer, at(x, 5.42, 0.27, 0, 0, 0, 0.05, 0.05, 0.52));
        put(this.bead, gold, at(x, 5.42, 0.54, 0, 0, 0, 0.035));
        b.addAll(this.lanternParts(0.2, 0.12), base.clone().multiply(at(x, 5.4, 0.48)));
      }
      [-5.6, 5.6].forEach((x, i) => {
        put(sheet, scrolls[(side * 2 + i) % 3], at(x, 3.9, 0.03));
        put(this.cyl, w, at(x, 4.97, 0.035, 0, 0, Math.PI / 2, 0.022, 0.8, 0.022));
        put(this.cyl, w, at(x, 2.83, 0.045, 0, 0, Math.PI / 2, 0.03, 0.82, 0.03));
        for (const s of [-1, 1]) {
          put(this.cyl, gold, at(x + s * 0.425, 2.83, 0.045, 0, 0, Math.PI / 2, 0.036, 0.03, 0.036));
          put(this.cyl, this.cord, between(new THREE.Vector3(x + s * 0.36, 4.98, 0.035), new THREE.Vector3(x, 5.32, 0.02), 0.005));
        }
        put(this.bead, gold, at(x, 5.32, 0.02, 0, 0, 0, 0.02));
      });
    }
  }

  /** The fixture over the table: a hexagonal frame with a big lantern in the middle and six small ones round it. */
  private buildFixture() {
    const f = this.fixture;
    f.position.set(0, FRAME_Y, 0);
    f.add(meshOf([this.cyl, this.cord, at(0, (ROOM_H - FRAME_Y) / 2, 0, 0, 0, 0, 0.012, ROOM_H - FRAME_Y, 0.012)]));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.035, 6, 6), this.lacquer);
    ring.rotation.x = Math.PI / 2;
    f.add(ring);
    for (let k = 0; k < 3; k++) f.add(meshOf([this.box, this.lacquer, at(0, 0, 0, 0, (k * Math.PI) / 3, 0, 2.5, 0.04, 0.04)]));
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      f.add(meshOf([this.bead, gold, at(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25, 0, 0, 0, 0.045)]));
      const hang = new THREE.Group();
      hang.position.set(Math.cos(a) * 1.25, -0.03, Math.sin(a) * 1.25);
      for (const p of this.lanternParts(0.19, k % 2 ? 0.42 : 0.26)) hang.add(meshOf(p));
      f.add(hang);
      this.swinging.push(hang);
    }
    for (const p of this.lanternParts(0.5, 0.1)) f.add(meshOf(p));
    f.add(meshOf([this.bead, gold, at(0, 0, 0, 0, 0, 0, 0.07)]));
    this.group.add(f);
  }

  /** Sides without a player get a round window onto the city, with a Pai Sho table and two pines in front of it. */
  setPlayerSides(sides: Side[]) {
    for (const side of SIDES) {
      const want = !sides.includes(side);
      const have = this.windows.get(side);
      if (want && !have) {
        const w = this.makeWindow();
        w.position.copy(outward(side).multiplyScalar(ROOM - 0.02));
        w.rotation.y = inwardRotation(side);
        this.group.add(w);
        this.windows.set(side, w);
      } else if (!want && have) {
        this.group.remove(have);
        this.windows.delete(side);
      }
    }
  }

  private makeWindow(): THREE.Group {
    const g = new THREE.Group();
    const b = new Batch();
    const Y = 3.75;
    const R = 2.12;
    this.night ??= new THREE.MeshBasicMaterial({ map: toTexture(baSingSeTexture()) });
    const view = new THREE.Mesh(new THREE.CircleGeometry(R, 72), this.night);
    view.position.set(0, Y, 0.005);
    g.add(view);
    b.add(new THREE.TorusGeometry(2.22, 0.12, 12, 96), this.lacquer, at(0, Y, 0.05));
    b.add(new THREE.TorusGeometry(2.38, 0.03, 8, 96), gold, at(0, Y, 0.03));
    // A lattice band round the edge, open in the middle so the city shows: an inner ring, spokes out to the frame.
    const w = walnut();
    const inner = 1.72;
    b.add(new THREE.TorusGeometry(inner, 0.03, 8, 96), w, at(0, Y, 0.06));
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const r = (inner + R) / 2;
      b.add(this.box, w, at(Math.cos(a) * r, Y + Math.sin(a) * r, 0.06, 0, 0, a, R - inner + 0.06, 0.03, 0.03));
    }
    // The Pai Sho table, with a teapot and two cups on its rim.
    this.board ??= new THREE.MeshStandardMaterial({ map: toTexture(paiShoTexture()), roughness: 0.5 });
    const m = mahogany();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 48), [m, this.board, m]);
    top.position.set(0, 0.5, 1.2);
    top.castShadow = top.receiveShadow = true;
    g.add(top);
    b.add(new THREE.CylinderGeometry(0.1, 0.3, 0.47, 24), m, at(0, 0.235, 1.2));
    const pot = new THREE.Vector3(Math.cos(0.8) * 0.55, 0.53, 1.2 + Math.sin(0.8) * 0.55);
    b.add(this.ball, this.celadon, at(pot.x, pot.y + 0.06, pot.z, 0, 0, 0, 0.075, 0.062, 0.075));
    b.add(this.cyl, this.celadon, at(pot.x, pot.y + 0.125, pot.z, 0, 0, 0, 0.035, 0.016, 0.035));
    b.add(this.bead, this.celadon, at(pot.x, pot.y + 0.14, pot.z, 0, 0, 0, 0.014));
    b.add(this.cap, this.celadon, at(pot.x - 0.09, pot.y + 0.085, pot.z, 0, 0, 0.8, 0.012, 0.09, 0.012));
    b.add(new THREE.TorusGeometry(0.035, 0.008, 6, 16, Math.PI), this.celadon, at(pot.x + 0.07, pot.y + 0.06, pot.z, 0, 0, -Math.PI / 2));
    for (const a of [0.45, 1.15]) b.add(this.cap, this.celadon, at(Math.cos(a) * 0.55, 0.545, 1.2 + Math.sin(a) * 0.55, Math.PI, 0, 0, 0.028, 0.03, 0.028));
    for (const s of [-1, 1]) b.add(this.ball, this.fabric, at(s * 1.08, 0.09, 1.2, 0, 0, 0, 0.36, 0.09, 0.36));
    for (const s of [-1, 1]) this.pine(b, s * 3.35, 0.75, s);
    for (const mesh of b.meshes(true)) g.add(mesh);
    return g;
  }

  /** A pine trained in a celadon pot, leaning away from the window's middle by `s`. */
  private pine(b: Batch, x: number, z: number, s: number) {
    const profile = [
      [0.001, 0],
      [0.24, 0],
      [0.27, 0.03],
      [0.3, 0.3],
      [0.34, 0.35],
      [0.34, 0.38],
      [0.31, 0.38],
      [0.31, 0.36],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    b.add(new THREE.LatheGeometry(profile, 28), this.celadon, at(x, 0, z));
    b.add(new THREE.CircleGeometry(0.31, 24), this.soil, at(x, 0.355, z, -Math.PI / 2));
    const trunk = [
      [0, 0.34, 0],
      [0.1, 0.7, 0.02],
      [-0.08, 1.02, -0.02],
      [0.08, 1.3, 0],
    ].map(([dx, y, dz]) => new THREE.Vector3(x + dx * s, y, z + dz));
    for (let i = 0; i < trunk.length - 1; i++) b.add(this.cyl, this.bark, between(trunk[i], trunk[i + 1], 0.07 - i * 0.015));
    // Flat pads of needles, each on a short branch from the nearest bend of the trunk.
    for (const [from, dx, y, dz, sx, sy, sz] of [
      [1, -0.26, 0.76, 0.05, 0.36, 0.12, 0.28],
      [2, 0.32, 1.02, -0.04, 0.33, 0.11, 0.26],
      [3, 0.04, 1.36, 0, 0.3, 0.12, 0.25],
    ]) {
      const pad = new THREE.Vector3(x + dx * s, y, z + dz);
      b.add(this.cyl, this.bark, between(trunk[from], pad, 0.025));
      b.add(this.pad, this.needles, at(pad.x, pad.y, pad.z, 0, s * 0.4, 0, sx, sy, sz));
    }
  }

  update(dt: number) {
    this.t += dt;
    const t = this.t;
    this.fixture.rotation.y = Math.sin(t * 0.21) * 0.05;
    this.fixture.rotation.z = Math.sin(t * 0.37) * 0.006;
    this.swinging.forEach((h, i) => {
      h.rotation.x = Math.sin(t * 1.1 + i * 1.3) * 0.03;
      h.rotation.z = Math.sin(t * 0.9 + i * 2.1) * 0.03;
    });
    const flicker = 1 + Math.sin(t * 2.3) * 0.015 + Math.sin(t * 3.9) * 0.01;
    this.light.intensity = 34 * flicker;
    this.paper.color.setScalar(GLOW * flicker);
  }
}
