import * as THREE from 'three';
import { BOARD, RULES, spaceInfo } from '../../shared/content';
import { L, TAU, spaceAngle } from './layout';
import { boardTopTextures, marbleTexture, tileTexture, toTexture, woodTexture } from './textures';

export const gold = new THREE.MeshStandardMaterial({ color: '#d9b25f', metalness: 1, roughness: 0.28 });
export const darkGold = new THREE.MeshStandardMaterial({ color: '#a77d32', metalness: 1, roughness: 0.38 });

let marbleMat: THREE.MeshPhysicalMaterial | null = null;
export function marble(): THREE.MeshPhysicalMaterial {
  if (!marbleMat) {
    marbleMat = new THREE.MeshPhysicalMaterial({
      map: toTexture(marbleTexture(512, 11)),
      color: '#b8ae9f',
      roughness: 0.3,
      clearcoat: 0.6,
      clearcoatRoughness: 0.18,
    });
  }
  return marbleMat;
}

let walnutMat: THREE.MeshStandardMaterial | null = null;
export function walnut(): THREE.MeshStandardMaterial {
  if (!walnutMat) {
    walnutMat = new THREE.MeshStandardMaterial({ map: toTexture(woodTexture(512, '#2a160c', '#6b3f22', 3, 26)), roughness: 0.45 });
  }
  return walnutMat;
}

function sectorGeometry(r0: number, r1: number, a0: number, a1: number, y: number, segs = 16): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const radial = 4;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    // u runs left-to-right for someone standing outside the board looking in.
    const a = a1 - (a1 - a0) * u;
    for (let j = 0; j <= radial; j++) {
      const v = j / radial;
      const r = r1 - (r1 - r0) * v;
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      uv.push(u, v);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Normals must point up; flip winding if needed.
  const n = g.getAttribute('normal');
  if (n.getY(0) < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

function tileBody(a0: number, a1: number, color: THREE.ColorRepresentation): THREE.Mesh {
  const shape = new THREE.Shape();
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const x = Math.cos(a) * L.trackOut;
    const y = Math.sin(a) * L.trackOut;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / steps;
    shape.lineTo(Math.cos(a) * L.trackIn, Math.sin(a) * L.trackIn);
  }
  const depth = 0.15;
  const bevel = 0.055;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, depth + bevel, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class Board {
  readonly group = new THREE.Group();
  readonly tiles: THREE.Mesh[] = [];
  private decals: THREE.MeshStandardMaterial[] = [];
  private pulses: { i: number; t: number; color: THREE.Color }[] = [];

  async build() {
    const g = this.group;

    const table = new THREE.Mesh(
      new THREE.CircleGeometry(70, 96),
      new THREE.MeshStandardMaterial({ map: toTexture(woodTexture(1024, '#150b06', '#3b2112', 5, 70), true, 5), roughness: 0.6 }),
    );
    table.rotation.x = -Math.PI / 2;
    table.position.y = -L.boardH - 0.001;
    table.receiveShadow = true;
    g.add(table);

    const side = new THREE.Mesh(new THREE.CylinderGeometry(L.boardR, L.boardR + 0.06, L.boardH, 160, 1, true), walnut());
    side.position.y = -L.boardH / 2;
    side.castShadow = true;
    side.receiveShadow = true;
    g.add(side);

    const tex = boardTopTextures(L.boardR, { track: [L.trackIn, L.trackOut], dais: L.daisR });
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(L.boardR, 160),
      new THREE.MeshStandardMaterial({
        map: toTexture(tex.color),
        roughnessMap: toTexture(tex.mr, false),
        metalnessMap: toTexture(tex.mr, false),
        roughness: 1,
        metalness: 1,
      }),
    );
    top.rotation.x = -Math.PI / 2;
    top.receiveShadow = true;
    g.add(top);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(L.boardR, 0.17, 20, 200), gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.02;
    rim.castShadow = true;
    g.add(rim);
    const lowRim = new THREE.Mesh(new THREE.TorusGeometry(L.boardR + 0.05, 0.08, 12, 200), darkGold);
    lowRim.rotation.x = Math.PI / 2;
    lowRim.position.y = -L.boardH + 0.06;
    g.add(lowRim);

    // The boulevard of spaces.
    const step = TAU / RULES.boardSize;
    const gap = 0.035;
    const decalTextures = await Promise.all(BOARD.map((_, i) => tileTexture(i)));
    BOARD.forEach((space, i) => {
      const a = spaceAngle(i);
      const a0 = a - step / 2 + gap;
      const a1 = a + step / 2 - gap;
      const info = spaceInfo(space);
      const body = tileBody(a0, a1, new THREE.Color(info.color).multiplyScalar(space.type === 'hall' ? 0.75 : 0.55));
      body.userData.space = i;
      g.add(body);
      this.tiles.push(body);
      const map = toTexture(decalTextures[i]);
      const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: new THREE.Color(0, 0, 0), roughness: 0.42, metalness: 0.05 });
      this.decals.push(mat);
      const decal = new THREE.Mesh(sectorGeometry(L.trackIn + 0.02, L.trackOut - 0.02, a0 + 0.004, a1 - 0.004, L.tileTop + 0.003), mat);
      decal.receiveShadow = true;
      decal.userData.space = i;
      g.add(decal);
      this.tiles.push(decal);
    });

    // The central salon: marble tiers with gold bands.
    const tier = (r: number, y0: number, y1: number) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.08, y1 - y0, 120), marble());
      m.position.y = (y0 + y1) / 2;
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      const band = new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.045, 10, 160), gold);
      band.rotation.x = Math.PI / 2;
      band.position.y = y1 - 0.02;
      g.add(band);
    };
    tier(L.daisR, 0, L.daisTop);
    tier(L.tier2R, L.daisTop, L.tier2Top);
    tier(L.plinthR, L.tier2Top, L.plinthTop);
  }

  /** Makes a space glow briefly (landing feedback). */
  pulse(i: number, color: THREE.ColorRepresentation = '#ffffff') {
    this.pulses = this.pulses.filter((p) => p.i !== i);
    this.pulses.push({ i, t: 0, color: new THREE.Color(color) });
  }

  private highlighted: number | null = null;
  private time = 0;

  /** Steady glow on one space (destination preview), or none. */
  highlight(i: number | null) {
    if (this.highlighted !== null && this.highlighted !== i) this.decals[this.highlighted]?.emissive.set(0, 0, 0);
    this.highlighted = i;
  }

  update(dt: number) {
    this.time += dt;
    if (this.highlighted !== null && !this.pulses.some((p) => p.i === this.highlighted)) {
      this.decals[this.highlighted]?.emissive.setScalar(0.22 + Math.sin(this.time * 5) * 0.12);
    }
    for (const p of this.pulses) {
      p.t += dt;
      const k = Math.max(0, Math.sin(Math.min(1, p.t / 1.4) * Math.PI)) * 0.65;
      this.decals[p.i]?.emissive.copy(p.color).multiplyScalar(k);
    }
    this.pulses = this.pulses.filter((p) => {
      if (p.t < 1.4) return true;
      this.decals[p.i]?.emissive.set(0, 0, 0);
      return false;
    });
  }
}
