import * as THREE from 'three';
import { ROOM, ROOM_H, inwardRotation, outward, type Side } from './layout';
import { brass, darkGold, flame, gold, mahogany, marble, walnut } from './materials';
import { damaskTexture, panelTexture, parquetTexture, toTexture, windowTexture } from './textures';

const WAINSCOT_H = 1.0;

/** The room around the table, in whichever theme. Each has exactly one point light, so switching rooms recompiles no shaders. */
export interface Surroundings {
  readonly group: THREE.Group;
  /** Sides without a player get something to look at instead of a gallery wall. */
  setPlayerSides(sides: Side[]): void;
  update(dt: number): void;
}

/** The salon around the table: floor, walls, windows, chandelier and the general lighting. */
export class Room implements Surroundings {
  readonly group = new THREE.Group();
  private windows = new Map<Side, THREE.Group>();
  private flames: THREE.Mesh[] = [];
  private crystals: THREE.InstancedMesh | null = null;
  private t = 0;
  readonly chandelierLight: THREE.PointLight;

  constructor() {
    const g = this.group;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM * 2 + 0.4, ROOM * 2 + 0.4),
      new THREE.MeshStandardMaterial({ map: toTexture(parquetTexture(), true, 5), roughness: 0.42, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);

    // A round carpet under the table.
    const rugTex = this.rugTexture();
    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.6, 96), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.004;
    rug.receiveShadow = true;
    g.add(rug);

    const paper = new THREE.MeshStandardMaterial({ map: toTexture(damaskTexture('#3b2a22', '#4a352b'), true, [6, 3]), roughness: 0.85 });
    const panels = new THREE.MeshStandardMaterial({ map: toTexture(panelTexture(), true, [5, 1]), roughness: 0.5 });
    for (const side of [0, 1, 2, 3] as Side[]) {
      const wall = new THREE.Group();
      wall.position.copy(outward(side).multiplyScalar(ROOM));
      wall.rotation.y = inwardRotation(side);
      const upper = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM_H - WAINSCOT_H), paper);
      upper.position.set(0, WAINSCOT_H + (ROOM_H - WAINSCOT_H) / 2, 0);
      upper.receiveShadow = true;
      const lower = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, WAINSCOT_H, 0.08), [walnut(), walnut(), walnut(), walnut(), panels, walnut()]);
      lower.position.set(0, WAINSCOT_H / 2, 0.04);
      lower.receiveShadow = true;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 0.07, 0.14), mahogany());
      rail.position.set(0, WAINSCOT_H + 0.02, 0.07);
      const skirting = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 0.16, 0.12), mahogany());
      skirting.position.set(0, 0.08, 0.06);
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 0.22, 0.24), marble());
      cornice.position.set(0, ROOM_H - 0.11, 0.12);
      const gilt = new THREE.Mesh(new THREE.BoxGeometry(ROOM * 2, 0.04, 0.26), gold);
      gilt.position.set(0, ROOM_H - 0.24, 0.13);
      wall.add(upper, lower, rail, skirting, cornice, gilt);
      g.add(wall);
    }
    // Marble pilasters in the corners.
    for (const [x, z] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, ROOM_H, 0.7), marble());
      p.position.set(x * (ROOM - 0.2), ROOM_H / 2, z * (ROOM - 0.2));
      p.castShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.18, 0.86), gold);
      cap.position.set(x * (ROOM - 0.2), ROOM_H - 0.5, z * (ROOM - 0.2));
      g.add(p, cap);
    }

    this.buildChandelier();
    this.chandelierLight = new THREE.PointLight('#ffd9a0', 34, 22, 1.25);
    this.chandelierLight.position.set(0, 5.4, 0);
    g.add(this.chandelierLight);
  }

  private rugTexture(): THREE.CanvasTexture {
    const S = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d')!;
    const cx = S / 2;
    const ringFill = (r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cx, r, 0, Math.PI * 2);
      ctx.fill();
    };
    ringFill(512, '#5a1720');
    ringFill(470, '#c9a25a');
    ringFill(455, '#3a0f16');
    ringFill(330, '#c9a25a');
    ringFill(318, '#6a1d28');
    ctx.fillStyle = '#c9a25a';
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * 392, cx + Math.sin(a) * 392);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.quadraticCurveTo(0, -30, 26, 0);
      ctx.quadraticCurveTo(0, 30, -26, 0);
      ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cx);
      ctx.rotate(a);
      ctx.fillStyle = i % 2 ? '#8a2a36' : '#a8783a';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(60, 120, 0, 290);
      ctx.quadraticCurveTo(-60, 120, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ringFill(70, '#c9a25a');
    ringFill(52, '#3a0f16');
    const img = ctx.getImageData(0, 0, S, S);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() - 0.5) * 18;
      img.data[i] += v;
      img.data[i + 1] += v;
      img.data[i + 2] += v;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  private buildChandelier() {
    const g = new THREE.Group();
    g.position.set(0, 5.6, 0);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8), darkGold);
    chain.position.y = 1.2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.9, 16), gold);
    stem.position.y = 0.1;
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold);
    bowl.position.y = -0.32;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.035, 12, 96), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.3;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 10, 64), gold);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 0.12;
    g.add(chain, stem, bowl, ring, ring2);
    const arms = 10;
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2;
      const x = Math.cos(a) * 1.05;
      const z = Math.sin(a) * 1.05;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.06, 14), brass);
      cup.position.set(x, -0.25, z);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.2, 10), new THREE.MeshStandardMaterial({ color: '#f4ecd8', emissive: '#5a4020', emissiveIntensity: 0.4 }));
      candle.position.set(x, -0.12, z);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), flame);
      f.scale.set(1, 1.9, 1);
      f.position.set(x, 0.02, z);
      f.userData.k = i * 1.7;
      this.flames.push(f);
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.05, 8), gold);
      spoke.rotation.z = Math.PI / 2;
      spoke.rotation.y = -a;
      spoke.position.set(x / 2, -0.3, z / 2);
      g.add(cup, candle, f, spoke);
    }
    // Hanging crystal drops.
    const drops = 80;
    const geo = new THREE.OctahedronGeometry(0.035);
    geo.scale(1, 1.8, 1);
    const crystal = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0, clearcoat: 1, emissive: '#fff3dd', emissiveIntensity: 0.35, transparent: true, opacity: 0.85 });
    const inst = new THREE.InstancedMesh(geo, crystal, drops);
    const m = new THREE.Matrix4();
    for (let i = 0; i < drops; i++) {
      const a = (i / drops) * Math.PI * 2 * 2;
      const r = i % 2 ? 1.05 : 0.62;
      const y = i % 2 ? -0.42 - (i % 4) * 0.05 : -0.02 - (i % 3) * 0.05;
      m.makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r);
      inst.setMatrixAt(i, m);
    }
    this.crystals = inst;
    g.add(inst);
    this.group.add(g);
  }

  /** Sides without a player get a tall window onto the night city instead of a gallery wall. */
  setPlayerSides(sides: Side[]) {
    for (const side of [0, 1, 2, 3] as Side[]) {
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
    const night = new THREE.MeshBasicMaterial({ map: toTexture(windowTexture()), toneMapped: true });
    for (const x of [-2.2, 2.2]) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 4.6), night);
      pane.position.set(x, 3.6, 0.02);
      g.add(pane);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 4.8, 0.08), walnut());
      frame.position.set(x, 3.6, 0);
      g.add(frame);
      for (const y of [2.4, 3.6, 4.8]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 0.06), walnut());
        bar.position.set(x, y, 0.05);
        g.add(bar);
      }
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, 4.6, 0.06), walnut());
      mullion.position.set(x, 3.6, 0.05);
      g.add(mullion);
      // Velvet curtains, gathered.
      for (const s of [-1, 1]) {
        const curtain = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.3, 5.4, 18, 1, true, 0, Math.PI),
          new THREE.MeshStandardMaterial({ color: '#6a1d28', roughness: 0.85, side: THREE.DoubleSide }),
        );
        curtain.position.set(x + s * 1.05, 3.4, 0.25);
        curtain.rotation.y = Math.PI;
        curtain.scale.set(1, 1, 0.5);
        curtain.castShadow = true;
        g.add(curtain);
      }
      const pelmet = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.32, 0.18), gold);
      pelmet.position.set(x, 6.15, 0.2);
      g.add(pelmet);
    }
    // A bust on a plinth between the windows.
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), marble());
    plinth.position.set(0, 0.6, 0.6);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), marble());
    head.scale.set(0.85, 1.05, 0.95);
    head.position.set(0, 1.72, 0.6);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), marble());
    chest.scale.set(1.15, 0.9, 0.7);
    chest.position.set(0, 1.25, 0.6);
    for (const o of [plinth, head, chest]) o.castShadow = true;
    g.add(plinth, head, chest);
    return g;
  }

  update(dt: number) {
    this.t += dt;
    for (const f of this.flames) {
      const k = f.userData.k as number;
      f.scale.set(1, 1.9 + Math.sin(this.t * 11 + k) * 0.25 + Math.sin(this.t * 6.1 + k * 2) * 0.12, 1);
    }
    this.chandelierLight.intensity = 34 + Math.sin(this.t * 9) * 0.8 + Math.sin(this.t * 13.7) * 0.5;
    if (this.crystals) this.crystals.rotation.y = Math.sin(this.t * 0.2) * 0.05;
  }
}
