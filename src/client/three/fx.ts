import * as THREE from 'three';
import { glowTexture } from './textures';

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  back: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

interface Tween {
  start: number;
  dur: number;
  fn: (t: number) => void;
  ease: Ease;
  done: () => void;
}

/** Frame-driven tweens. `speed` > 1 fast-forwards everything (used to catch up after lag). */
export class Tweens {
  private list: Tween[] = [];
  speed = 1;
  now = performance.now();

  add(ms: number, fn: (t: number) => void, e: Ease = ease.inOut): Promise<void> {
    return new Promise((resolve) => {
      const dur = Math.max(1, ms / this.speed);
      const start = Number.isFinite(this.now) ? this.now : performance.now();
      this.list.push({ start, dur, fn, ease: e, done: resolve });
    });
  }

  wait(ms: number): Promise<void> {
    return this.add(ms, () => {});
  }

  update(now: number) {
    this.now = now;
    const current = this.list;
    // Tweens added from inside callbacks land in the fresh list.
    this.list = [];
    for (const tw of current) {
      const t = Math.min(1, (now - tw.start) / tw.dur);
      tw.fn(tw.ease(t));
      if (t >= 1) tw.done();
      else this.list.push(tw);
    }
  }

  /** Finishes every running tween immediately. */
  flush() {
    this.update(Number.POSITIVE_INFINITY);
    this.now = performance.now();
  }
}

let glowTex: THREE.Texture | null = null;
function glowTexture3(): THREE.Texture {
  if (!glowTex) {
    glowTex = new THREE.CanvasTexture(glowTexture());
    glowTex.colorSpace = THREE.SRGBColorSpace;
  }
  return glowTex;
}

/** Short-lived particle bursts (sparkles when a painting is finished, coins, etc). */
export class Particles {
  private systems: { points: THREE.Points; vel: Float32Array; life: number; age: number }[] = [];
  constructor(private scene: THREE.Scene) {}

  burst(pos: THREE.Vector3, color: THREE.ColorRepresentation, count = 60, spread = 1.6, size = 0.22, life = 1.3) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = pos.x;
      p[i * 3 + 1] = pos.y;
      p[i * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.3;
      const s = (Math.random() * 0.6 + 0.4) * spread;
      vel[i * 3] = Math.cos(a) * s;
      vel[i * 3 + 1] = up * spread * 1.3;
      vel[i * 3 + 2] = Math.sin(a) * s;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({
      size,
      map: glowTexture3(),
      color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.systems.push({ points, vel, life, age: 0 });
  }

  update(dt: number) {
    for (const s of this.systems) {
      s.age += dt;
      const pos = s.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        s.vel[i + 1] -= 2.6 * dt;
        arr[i] += s.vel[i] * dt;
        arr[i + 1] += s.vel[i + 1] * dt;
        arr[i + 2] += s.vel[i + 2] * dt;
      }
      pos.needsUpdate = true;
      (s.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - s.age / s.life);
    }
    for (const s of this.systems.filter((x) => x.age >= x.life)) {
      this.scene.remove(s.points);
      s.points.geometry.dispose();
      (s.points.material as THREE.Material).dispose();
    }
    this.systems = this.systems.filter((x) => x.age < x.life);
  }
}

/** Falling confetti for the Grand Gala. */
export class Confetti {
  private mesh: THREE.InstancedMesh | null = null;
  private data: { p: THREE.Vector3; v: THREE.Vector3; r: THREE.Euler; w: THREE.Vector3 }[] = [];
  private age = 0;
  private readonly dummy = new THREE.Object3D();
  constructor(private scene: THREE.Scene) {}

  start(center: THREE.Vector3, colors: string[], count = 420) {
    this.stop();
    const geo = new THREE.PlaneGeometry(0.16, 0.26);
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3 });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      col.set(colors[i % colors.length]);
      this.mesh.setColorAt(i, col);
      this.data.push({
        p: new THREE.Vector3(center.x + (Math.random() - 0.5) * 3, center.y + 2 + Math.random() * 2, center.z + (Math.random() - 0.5) * 3),
        v: new THREE.Vector3((Math.random() - 0.5) * 9, 6 + Math.random() * 7, (Math.random() - 0.5) * 9),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        w: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
      });
    }
    this.age = 0;
    this.scene.add(this.mesh);
  }

  stop() {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh = null;
    this.data = [];
  }

  update(dt: number) {
    if (!this.mesh) return;
    this.age += dt;
    this.data.forEach((d, i) => {
      d.v.y -= 7 * dt;
      d.v.multiplyScalar(1 - 1.4 * dt);
      if (d.v.y < -1.6) d.v.y = -1.6;
      d.p.addScaledVector(d.v, dt);
      d.p.x += Math.sin(this.age * 2 + i) * dt * 0.6;
      if (d.p.y < 0.3) d.p.y = 0.3;
      d.r.x += d.w.x * dt;
      d.r.y += d.w.y * dt;
      d.r.z += d.w.z * dt;
      this.dummy.position.copy(d.p);
      this.dummy.rotation.copy(d.r);
      this.dummy.updateMatrix();
      this.mesh!.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.age > 14) this.stop();
  }
}
