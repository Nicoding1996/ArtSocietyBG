import * as THREE from 'three';
import type { HatId } from '../../shared/types';
import { ease, type Tweens } from './fx';
import { gold } from './materials';

const PAWN_PROFILE = [
  [0.0, 0.0], [0.38, 0.0], [0.4, 0.03], [0.4, 0.075], [0.36, 0.105], [0.3, 0.125], [0.27, 0.16],
  [0.22, 0.24], [0.17, 0.36], [0.14, 0.5], [0.13, 0.6], [0.2, 0.63], [0.215, 0.66], [0.17, 0.69], [0.12, 0.71], [0.0, 0.71],
].map(([x, y]) => new THREE.Vector2(x, y));

const pawnGeo = new THREE.LatheGeometry(PAWN_PROFILE, 48);
const headGeo = new THREE.SphereGeometry(0.19, 32, 24);
const ringGeo = new THREE.TorusGeometry(0.39, 0.024, 8, 48);
const felt = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

function hat(id: HatId, color: THREE.Color): THREE.Object3D {
  const g = new THREE.Group();
  const dark = felt('#26222a');
  switch (id) {
    case 'beret': {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 16), felt('#2b2530'));
      b.scale.set(1.18, 0.36, 1.18);
      b.rotation.z = 0.28;
      b.position.set(0.03, 0.0, 0);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.07, 8), dark);
      stem.position.set(0.02, 0.08, 0);
      g.add(b, stem);
      break;
    }
    case 'tophat': {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.32, 32), dark);
      crown.position.y = 0.14;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 32), dark);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.05, 32), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
      band.position.y = 0.04;
      g.add(crown, brim, band);
      break;
    }
    case 'bowler': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.175, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), felt('#3a2a20'));
      dome.scale.y = 1.1;
      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 32), felt('#3a2a20'));
      brim.rotation.x = Math.PI / 2;
      brim.scale.set(1.15, 1.15, 0.6);
      g.add(dome, brim);
      break;
    }
    case 'flower': {
      const petal = new THREE.SphereGeometry(0.055, 12, 8);
      const leafMat = new THREE.MeshStandardMaterial({ color: '#3f8f4f', roughness: 0.6 });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const m = new THREE.Mesh(petal, new THREE.MeshStandardMaterial({ color: i % 2 ? '#ffd1dc' : '#ffffff', roughness: 0.5 }));
        m.position.set(Math.cos(a) * 0.15, 0.0, Math.sin(a) * 0.15);
        g.add(m);
        if (i % 2 === 0) {
          const leaf = new THREE.Mesh(petal, leafMat);
          leaf.scale.set(1.4, 0.5, 0.8);
          leaf.position.set(Math.cos(a + 0.4) * 0.2, -0.02, Math.sin(a + 0.4) * 0.2);
          g.add(leaf);
        }
      }
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.4 }));
      center.position.set(0.13, 0.03, 0);
      g.add(center);
      break;
    }
  }
  return g;
}

/** A collector figurine in the player's colour and hat. */
export class Pawn {
  readonly group = new THREE.Group();
  readonly body = new THREE.Group();
  private ring: THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;
  active = false;
  private t = Math.random() * 10;

  constructor(color: string, hatId: HatId) {
    const c = new THREE.Color(color);
    const mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12 });
    const base = new THREE.Mesh(pawnGeo, mat);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 0.86;
    const trim = new THREE.Mesh(ringGeo, gold);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.05;
    const h = hat(hatId, c);
    h.position.y = 1.02;
    for (const m of [base, head, trim]) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    h.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    this.body.add(base, head, trim, h);
    this.body.scale.setScalar(1.12);
    this.ringMat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 64), this.ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.03;
    this.group.add(this.body, this.ring);
  }

  update(dt: number) {
    this.t += dt;
    const target = this.active ? 0.95 : 0;
    this.ringMat.opacity += (target - this.ringMat.opacity) * Math.min(1, dt * 6);
    this.ring.scale.setScalar(1 + Math.sin(this.t * 3) * 0.06);
    this.ring.visible = this.ringMat.opacity > 0.01;
  }

  /** One hop to `to`, with squash on landing. */
  hop(tw: Tweens, to: THREE.Vector3, ms = 260, height = 0.9): Promise<void> {
    const from = this.group.position.clone();
    return tw.add(
      ms,
      (t) => {
        this.group.position.lerpVectors(from, to, t);
        this.group.position.y = from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * height;
        const squash = t > 0.85 ? 1 - Math.sin(((t - 0.85) / 0.15) * Math.PI) * 0.12 : 1;
        this.body.scale.set(1.12 / Math.sqrt(squash), 1.12 * squash, 1.12 / Math.sqrt(squash));
      },
      ease.linear,
    );
  }
}
