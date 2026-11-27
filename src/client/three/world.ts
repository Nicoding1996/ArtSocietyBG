import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RULES } from '../../shared/content';
import { GENRES, type HatId, type Tile } from '../../shared/types';
import { preloadIcons } from '../ui/icons';
import { Confetti, Particles, Tweens, ease } from './fx';
import { GRID_BOTTOM, GRID_TOP, MARGIN_Y, PANEL_W, ROOM, ROOM_H, TABLE_R, TABLE_TOP, outward, sidesFor, type Side } from './layout';
import { gold, marble, silver } from './materials';
import { Pawn } from './pieces';
import { Room } from './room';
import { Table } from './table';
import { flickerFlames, tileMesh } from './tiles';
import { GalleryWall, type GhostState } from './wall';

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, strength: { value: 0.38 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float strength; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = (vUv - 0.5) * vec2(1.0, 0.85);
    float v = smoothstep(0.8, 0.2, length(d)); c.rgb *= mix(1.0 - strength, 1.0, v); gl_FragColor = c; }`,
};

export interface SeatInfo {
  id: string;
  name: string;
  color: string;
  hat: HatId;
}

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type View = { kind: 'table' } | { kind: 'wall'; pid: string; tight: boolean } | { kind: 'free' };

export interface Placement {
  pid: string;
  tile: Tile;
  /** Legal top-left cells. */
  spots: { x: number; y: number }[];
  /** 'preview' only shows where a painting could go; 'place' pins on the first click and commits on the second. */
  mode: 'place' | 'preview';
  onHover?: (spot: { x: number; y: number; valid: boolean } | null) => void;
  onPin?: (spot: { x: number; y: number } | null) => void;
  onCommit?: (spot: { x: number; y: number }) => void;
}

interface Label {
  el: HTMLElement;
  pos: THREE.Vector3;
  born: number;
  life: number;
  rise: number;
}

/** A figurine stands this far out from its wall (see World.pawnHome) and is about this tall. */
const FIGURINE = { out: ROOM - 0.06 - (TABLE_R + 0.75), top: 1.6 };
/** The chandelier's lowest crystals (see Room.buildChandelier): their height, and how far out from a wall the nearest hang. */
const CRYSTALS = { low: 4.97, out: ROOM - 0.06 - 1.1 };

/**
 * Camera height for looking square at a wall from `d` away while the band from `bottom` to `top`
 * is framed. Level with the middle of the band, unless from far back that would show the chandelier
 * across the top of the picture or a figurine in front of the bottom: then as close to the middle as
 * avoids them (the figurine wins if both can't be avoided).
 */
export function wallCameraHeight(bottom: number, top: number, d: number): number {
  const mid = (bottom + top) / 2;
  const low = d > FIGURINE.out ? bottom + ((FIGURINE.top + 0.1 - bottom) * d) / FIGURINE.out : -Infinity;
  const high = d > CRYSTALS.out ? top - ((top - (CRYSTALS.low - 0.25)) * d) / CRYSTALS.out : Infinity;
  return Math.max(low, Math.min(mid, high));
}

function rankTexture(n: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e2c27a';
  ctx.font = '700 104px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  readonly controls: OrbitControls;
  readonly tw = new Tweens();
  readonly room = new Room();
  readonly table = new Table();
  readonly walls = new Map<string, GalleryWall>();
  readonly sides = new Map<string, Side>();
  private pawns = new Map<string, Pawn>();
  private seatSig = '';
  private particles: Particles;
  private confetti: Confetti;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private labels: Label[] = [];
  private last = performance.now();
  private lastUser = -1e9;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private hoverAt = 0;
  private downAt: { x: number; y: number } | null = null;
  private placement: Placement | null = null;
  private pinned: { x: number; y: number } | null = null;
  private lastSpot: { x: number; y: number; valid: boolean } | null = null;
  private podiumGroup: THREE.Group | null = null;
  private crowns: THREE.Group[] = [];
  private demoSpin = false;
  private time = 0;
  view: View = { kind: 'table' };
  /** Screen space covered by the HUD, so framing keeps the subject in the open area. */
  insets: Insets = { top: 64, bottom: 210, left: 270, right: 300 };
  me: string | null = null;
  ready: Promise<void>;
  onTileHover: ((tile: Tile | null, owner: string | null, x: number, y: number) => void) | null = null;
  onTileClick: ((tile: Tile, owner: string | null) => void) | null = null;
  onWallClick: ((pid: string) => void) | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private labelLayer: HTMLElement,
  ) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    this.renderer = r;

    this.camera.position.set(0, 5.2, 7.9);
    this.controls = new OrbitControls(this.camera, canvas);
    const c = this.controls;
    c.target.set(0, 1.3, -0.3);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 1.2;
    c.maxDistance = 13;
    c.maxPolarAngle = Math.PI / 2 - 0.04;
    c.screenSpacePanning = true;
    c.panSpeed = 0.7;
    c.rotateSpeed = 0.6;
    c.autoRotateSpeed = 0.3;
    // A click on the canvas also starts the controls; only real camera movement counts as the person steering.
    let grab: { p: THREE.Vector3; t: THREE.Vector3 } | null = null;
    c.addEventListener('start', () => {
      grab = { p: this.camera.position.clone(), t: c.target.clone() };
    });
    c.addEventListener('change', () => {
      if (!grab) return;
      if (grab.p.distanceToSquared(this.camera.position) > 1e-4 || grab.t.distanceToSquared(c.target) > 1e-4) {
        this.camToken++;
        this.lastUser = performance.now();
      }
    });
    c.addEventListener('end', () => {
      if (grab && (grab.p.distanceToSquared(this.camera.position) > 1e-4 || grab.t.distanceToSquared(c.target) > 1e-4)) this.lastUser = performance.now();
      grab = null;
    });

    const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Only true highlights (candle flames, crystal, glints) bloom; lit frames must not halo over the art.
    this.bloom = new UnrealBloomPass(size, 0.22, 0.45, 1.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new ShaderPass(VignetteShader));
    this.composer.addPass(new OutputPass());

    this.particles = new Particles(this.scene);
    this.confetti = new Confetti(this.scene);
    this.setupScene();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerdown', (e) => (this.downAt = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointerleave', () => {
      this.onTileHover?.(null, null, 0, 0);
      if (this.placement && !this.pinned) this.walls.get(this.placement.pid)?.clearGhost();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.pinned || e.defaultPrevented) return;
      this.unpin();
      // Used up: the game's menu does not open on the same key press.
      e.preventDefault();
    });
    this.ready = this.build();
    requestAnimationFrame(this.frame);
  }

  private setupScene() {
    const s = this.scene;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    // The studio room's side softboxes differ a lot in strength, so the gilded and silver frames on the
    // wall facing the brightest one glowed while the others did not. Even them out (the overhead light
    // stays) so all four walls reflect the same soft room.
    const env = new RoomEnvironment();
    env.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
      if (m && 'emissiveIntensity' in m && m.emissiveIntensity > 1 && o.position.y < 19.5) m.emissiveIntensity = 12;
    });
    s.environment = pmrem.fromScene(env, 0.04).texture;
    env.dispose();
    pmrem.dispose();
    s.environmentIntensity = 0.42;
    s.background = new THREE.Color('#07060a');
    s.fog = new THREE.Fog('#07060a', 26, 60);

    s.add(new THREE.HemisphereLight('#ffe9cf', '#2a1810', 0.55));
    const key = new THREE.DirectionalLight('#ffe2b8', 1.6);
    key.position.set(4, 14, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = sc.bottom = -10;
    sc.right = sc.top = 10;
    sc.near = 2;
    sc.far = 30;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 3;
    s.add(key);
    const pool = new THREE.SpotLight('#fff0d8', 40, 16, 0.55, 0.7, 1.4);
    pool.position.set(0, 7.2, 0.5);
    pool.target.position.set(0, TABLE_TOP, 0);
    s.add(pool, pool.target);
    s.add(this.room.group, this.table.group);
  }

  private async build() {
    try {
      await Promise.race([
        Promise.all([document.fonts.load('700 64px "Cormorant Garamond"'), document.fonts.load('600 34px Inter')]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch {
      /* fall back to system fonts */
    }
    await preloadIcons([
      ...GENRES.map((g) => [g, '#16120e', 128, 2.2] as [string, string, number, number]),
      ...GENRES.map((g) => [g, '#ffffff', 128, 2.2] as [string, string, number, number]),
      ['laurel', '#fff2cf', 128, 2],
    ]);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.applyLens();
  }

  // ---------- seats ----------

  /** Gives every player a wall, a figurine and a bidding stack. The local player always sits at the front. */
  setSeats(seats: SeatInfo[], me: string | null) {
    this.me = me;
    const sig = JSON.stringify([seats, me]);
    if (sig === this.seatSig) return;
    this.seatSig = sig;
    const n = seats.length;
    const sides = sidesFor(n);
    const mine = Math.max(0, seats.findIndex((s) => s.id === me));
    for (const [pid, w] of this.walls) {
      if (!seats.some((s) => s.id === pid)) {
        w.dispose();
        this.walls.delete(pid);
        this.sides.delete(pid);
      }
    }
    for (const [pid, p] of this.pawns) {
      if (!seats.some((s) => s.id === pid)) {
        this.scene.remove(p.group);
        this.pawns.delete(pid);
      }
    }
    seats.forEach((s, i) => {
      const side = sides[(i - mine + n) % n];
      this.sides.set(s.id, side);
      let wall = this.walls.get(s.id);
      if (!wall || wall.group.userData.sig !== `${i}|${s.name}|${s.color}`) {
        wall?.dispose();
        wall = new GalleryWall(s.id, s.name, s.color, i);
        wall.group.userData.sig = `${i}|${s.name}|${s.color}`;
        this.walls.set(s.id, wall);
        this.scene.add(wall.group);
      }
      wall.setSide(side);
      let pawn = this.pawns.get(s.id);
      if (!pawn || pawn.group.userData.sig !== `${s.color}|${s.hat}`) {
        if (pawn) this.scene.remove(pawn.group);
        pawn = new Pawn(s.color, s.hat);
        pawn.group.userData.sig = `${s.color}|${s.hat}`;
        this.pawns.set(s.id, pawn);
        this.scene.add(pawn.group);
      }
      this.placePawn(s.id);
    });
    this.room.setPlayerSides(sides.slice(0, Math.max(1, n)));
    this.table.setSeats(seats.map((s) => ({ pid: s.id, side: this.sides.get(s.id)!, color: s.color })));
  }

  private pawnHome(side: Side): THREE.Vector3 {
    const n = outward(side);
    const right = new THREE.Vector3(n.z, 0, -n.x);
    return n.multiplyScalar(TABLE_R + 0.75).add(right.multiplyScalar(1.85));
  }

  private placePawn(pid: string) {
    const pawn = this.pawns.get(pid);
    const side = this.sides.get(pid);
    if (!pawn || side === undefined) return;
    pawn.group.position.copy(this.pawnHome(side));
    const n = outward(side);
    pawn.group.rotation.y = Math.atan2(-n.x, -n.z);
  }

  setActive(pids: string[]) {
    for (const [id, p] of this.pawns) p.active = pids.includes(id);
  }

  sideOf(pid: string): Side {
    return this.sides.get(pid) ?? 0;
  }

  // ---------- camera ----------

  private camToken = 0;

  /**
   * Glides the camera; a newer move (or the person grabbing the camera) cancels an older one. `lens`
   * is the lens shift to end with (see setLens); views that don't give one return to none.
   */
  private moveCamera(target: THREE.Vector3, position: THREE.Vector3, ms: number, lens = new THREE.Vector2()): Promise<void> {
    const c = this.controls;
    const fromT = c.target.clone();
    const fromP = this.camera.position.clone();
    const fromL = this.lens.clone();
    const token = ++this.camToken;
    if (ms <= 0) {
      c.target.copy(target);
      this.camera.position.copy(position);
      this.setLens(lens);
      return Promise.resolve();
    }
    const l = new THREE.Vector2();
    return this.tw.add(ms, (t) => {
      if (token !== this.camToken) return;
      c.target.lerpVectors(fromT, target, t);
      this.camera.position.lerpVectors(fromP, position, t);
      this.setLens(l.lerpVectors(fromL, lens, t));
    });
  }

  /** Where the middle of the picture sits, in screen pixels from the centre of the window. */
  private lens = new THREE.Vector2();

  /**
   * Shifts the picture by `v` screen pixels without turning or moving the camera, like a shift lens.
   * It puts a wall in the part of the screen the HUD leaves open while the camera stays square to it.
   */
  private setLens(v: THREE.Vector2) {
    this.lens.copy(v);
    this.applyLens();
  }

  private applyLens() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (Math.abs(this.lens.x) < 0.5 && Math.abs(this.lens.y) < 0.5) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, -this.lens.x, -this.lens.y, w, h);
  }

  /** Whether the person has moved the camera themselves in the last few seconds. */
  userBusy(): boolean {
    return performance.now() - this.lastUser < 4000;
  }

  /**
   * Frames the band of the wall between heights `bottom` and `top` (and `needW` wide) inside the screen
   * area the HUD leaves open. The camera looks square at the wall and a lens shift moves the picture
   * into the open space, so a tall panel at the bottom no longer drags the camera down under the table.
   */
  private frameRect(wall: GalleryWall, bottom: number, top: number, needW: number, ms: number) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ins = this.insets;
    const freeW = Math.max(200, w - ins.left - ins.right);
    const freeH = Math.max(200, h - ins.top - ins.bottom);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const d = Math.min((Math.max((top - bottom) / freeH, needW / freeW) * h) / (2 * tan), ROOM * 2 - 0.8);
    const y = wallCameraHeight(bottom, top, d);
    // The orbit controls never let the camera look quite level, so aim a touch below its own height.
    const aim = y - d * Math.tan(Math.PI / 2 - this.controls.maxPolarAngle + 0.004);
    const ppu = h / (2 * d * tan);
    // Where the middle of the band should land on screen, measured from the camera's own centre line.
    const lens = new THREE.Vector2(ins.left + freeW / 2 - w / 2, ins.top + freeH / 2 - h / 2 + ((bottom + top) / 2 - aim) * ppu);
    const target = wall.toWorld(new THREE.Vector3(0, aim, 0));
    const position = wall.toWorld(new THREE.Vector3(0, y, d));
    return this.moveCamera(target, position, ms, lens);
  }

  viewWall(pid: string, tight = false, ms = 1100): Promise<void> {
    const wall = this.walls.get(pid);
    if (!wall) return Promise.resolve();
    this.view = { kind: 'wall', pid, tight };
    this.demoSpin = false;
    if (tight) return this.frameRect(wall, GRID_BOTTOM - MARGIN_Y - 0.05, GRID_TOP + MARGIN_Y + 0.05, PANEL_W + 0.1, ms);
    // Room for the name plate above and the assistant's easel and excess paintings at the sides.
    return this.frameRect(wall, GRID_BOTTOM - MARGIN_Y - 0.3, GRID_TOP + 0.95, PANEL_W + 2.6, ms);
  }

  /**
   * Looks down at the table from the local player's side, sized and shifted so the table fills the
   * screen area the HUD leaves open. The camera never leaves the salon.
   */
  viewTable(ms = 1100): Promise<void> {
    this.view = { kind: 'table' };
    this.demoSpin = false;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ins = this.insets;
    const freeW = Math.max(200, w - ins.left - ins.right);
    const freeH = Math.max(160, h - ins.top - ins.bottom);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const elev = THREE.MathUtils.degToRad(38);
    const dir = new THREE.Vector3(0, Math.sin(elev), Math.cos(elev));
    const up = new THREE.Vector3(0, Math.cos(elev), -Math.sin(elev));
    const center = new THREE.Vector3(0, TABLE_TOP, 0.45);
    const needW = TABLE_R * 2 + 0.2;
    const needH = TABLE_R * 2 * Math.sin(elev) + 0.6;
    let d = (Math.max(needW / freeW, needH / freeH) * h) / (2 * tan);
    d = Math.min(d, (ROOM - 0.6 - center.z) / dir.z, (ROOM_H + 1.4 - center.y) / dir.y);
    const ppu = h / (2 * d * tan);
    const ox = ins.left + freeW / 2 - w / 2;
    const oy = ins.top + freeH / 2 - h / 2;
    const target = center
      .clone()
      .add(new THREE.Vector3(-ox / ppu, 0, 0))
      .addScaledVector(up, oy / ppu);
    return this.moveCamera(target, target.clone().addScaledVector(dir, d), ms);
  }

  refreshView(ms = 500) {
    const v = this.view;
    if (v.kind === 'table') void this.viewTable(ms);
    else if (v.kind === 'wall') void this.viewWall(v.pid, v.tight, ms);
  }

  // ---------- frame loop ----------

  private frame = (now: number) => {
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.tw.update(now);
    const c = this.controls;
    c.autoRotate = this.demoSpin;
    c.update();
    // Stay inside the salon.
    const p = this.camera.position;
    const lim = ROOM - 0.35;
    p.x = THREE.MathUtils.clamp(p.x, -lim, lim);
    p.z = THREE.MathUtils.clamp(p.z, -lim, lim);
    p.y = THREE.MathUtils.clamp(p.y, 0.4, ROOM_H + 1.5);
    c.target.x = THREE.MathUtils.clamp(c.target.x, -lim, lim);
    c.target.z = THREE.MathUtils.clamp(c.target.z, -lim, lim);
    this.room.update(dt);
    this.table.update(dt);
    for (const w of this.walls.values()) w.update(dt);
    for (const pw of this.pawns.values()) pw.update(dt);
    flickerFlames(this.scene, this.time);
    this.particles.update(dt);
    this.confetti.update(dt);
    for (const cr of this.crowns) {
      cr.rotation.y += dt * 1.2;
      cr.position.y += Math.sin(now / 400) * 0.002;
    }
    this.updateLabels(now);
    this.composer.render();
  };

  // ---------- pointer ----------

  private setPointer(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private gridHit(pid: string): { x: number; y: number } | null {
    const wall = this.walls.get(pid);
    if (!wall) return null;
    const hit = this.raycaster.intersectObject(wall.gridPlane, false)[0];
    return hit ? wall.cellAt(hit.point) : null;
  }

  /** Snaps the pointer's cell to a legal spot whose rectangle contains it, nearest to centring the tile. */
  private snap(cell: { x: number; y: number }, pl: Placement): { x: number; y: number; valid: boolean } {
    const { w, h } = pl.tile;
    const want = {
      x: THREE.MathUtils.clamp(cell.x - Math.floor((w - 1) / 2), 0, RULES.wallW - w),
      y: THREE.MathUtils.clamp(cell.y - Math.floor((h - 1) / 2), 0, RULES.wallH - h),
    };
    if (pl.spots.some((s) => s.x === want.x && s.y === want.y)) return { ...want, valid: true };
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const s of pl.spots) {
      if (cell.x < s.x || cell.x >= s.x + w || cell.y < s.y || cell.y >= s.y + h) continue;
      const d = Math.abs(s.x - want.x) + Math.abs(s.y - want.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best ? { ...best, valid: true } : { ...want, valid: false };
  }

  private tileUnder(): { tile: Tile; owner: string | null } | null {
    const roots: THREE.Object3D[] = [...this.walls.values()].map((w) => w.group);
    roots.push(this.table.group);
    const hits = this.raycaster.intersectObjects(roots, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.tile) o = o.parent;
      if (o) {
        let owner: string | null = null;
        for (const [pid, w] of this.walls) {
          let q: THREE.Object3D | null = o;
          while (q && q !== w.group) q = q.parent;
          if (q) owner = pid;
        }
        return { tile: o.userData.tile as Tile, owner };
      }
      // Stop at the first solid surface (a wall, the table) so tiles behind it are not picked.
      if (!(h.object as THREE.Mesh).material || ((h.object as THREE.Mesh).material as THREE.Material).visible !== false) return null;
    }
    return null;
  }

  private onPointerMove(e: PointerEvent) {
    const now = performance.now();
    if (now - this.hoverAt < 30 || e.buttons) return;
    this.hoverAt = now;
    this.setPointer(e);
    const pl = this.placement;
    if (pl) {
      const cell = this.gridHit(pl.pid);
      const wall = this.walls.get(pl.pid)!;
      if (!cell) {
        if (!this.pinned) {
          wall.clearGhost();
          if (this.lastSpot) pl.onHover?.(null);
          this.lastSpot = null;
        }
        this.canvas.style.cursor = '';
        return;
      }
      const spot = this.snap(cell, pl);
      this.canvas.style.cursor = spot.valid ? 'pointer' : 'not-allowed';
      if (this.pinned) return;
      const state: GhostState = !spot.valid ? 'bad' : pl.mode === 'preview' ? 'preview' : 'ok';
      wall.setGhost(pl.tile, spot.x, spot.y, state);
      if (!this.lastSpot || this.lastSpot.x !== spot.x || this.lastSpot.y !== spot.y || this.lastSpot.valid !== spot.valid) {
        this.lastSpot = spot;
        pl.onHover?.(spot);
      }
      return;
    }
    if (!this.onTileHover) return;
    const hit = this.tileUnder();
    this.canvas.style.cursor = hit ? 'zoom-in' : '';
    this.onTileHover(hit?.tile ?? null, hit?.owner ?? null, e.clientX, e.clientY);
  }

  private onPointerUp(e: PointerEvent) {
    const d = this.downAt;
    this.downAt = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    this.setPointer(e);
    const pl = this.placement;
    if (pl) {
      const cell = this.gridHit(pl.pid);
      if (!cell) return;
      const spot = this.snap(cell, pl);
      const wall = this.walls.get(pl.pid)!;
      if (!spot.valid) {
        wall.setGhost(pl.tile, spot.x, spot.y, 'bad');
        return;
      }
      if (pl.mode === 'place' && this.pinned && this.pinned.x === spot.x && this.pinned.y === spot.y) {
        pl.onCommit?.(spot);
        return;
      }
      this.pinned = { x: spot.x, y: spot.y };
      wall.setGhost(pl.tile, spot.x, spot.y, pl.mode === 'preview' ? 'preview' : 'pinned');
      pl.onHover?.(spot);
      pl.onPin?.(this.pinned);
      return;
    }
    const hit = this.tileUnder();
    if (hit) {
      this.onTileClick?.(hit.tile, hit.owner);
      return;
    }
    // Clicking a wall's empty space looks at that wall.
    for (const [pid, w] of this.walls) {
      if (this.raycaster.intersectObject(w.gridPlane, false).length) {
        this.onWallClick?.(pid);
        return;
      }
    }
  }

  // ---------- placing tiles ----------

  startPlacement(pl: Placement) {
    const same = this.placement && this.placement.pid === pl.pid && this.placement.tile.id === pl.tile.id && this.placement.mode === pl.mode;
    const keepPin = same && this.pinned && pl.spots.some((s) => s.x === this.pinned!.x && s.y === this.pinned!.y) ? this.pinned : null;
    if (this.placement && !same) this.walls.get(this.placement.pid)?.clearGhost();
    this.placement = pl;
    this.pinned = keepPin;
    if (!keepPin) this.lastSpot = null;
    const wall = this.walls.get(pl.pid);
    wall?.showSpots(pl.spots, pl.tile.w, pl.tile.h);
    if (wall && keepPin) wall.setGhost(pl.tile, keepPin.x, keepPin.y, pl.mode === 'preview' ? 'preview' : 'pinned');
  }

  stopPlacement() {
    if (!this.placement) return;
    const wall = this.walls.get(this.placement.pid);
    wall?.clearGhost();
    wall?.showSpots(null);
    this.placement = null;
    this.pinned = null;
    this.lastSpot = null;
    this.canvas.style.cursor = '';
  }

  placingTile(): string | null {
    return this.placement?.tile.id ?? null;
  }

  pinnedSpot(): { x: number; y: number } | null {
    return this.pinned;
  }

  unpin() {
    const pl = this.placement;
    this.pinned = null;
    if (pl) {
      this.walls.get(pl.pid)?.clearGhost();
      pl.onPin?.(null);
      pl.onHover?.(null);
    }
  }

  /** Shows the tile's matching frames and faux pas neighbours while a spot is considered. */
  markNeighbours(pid: string, matches: string[], faux: string[]) {
    this.walls.get(pid)?.setMarks(matches, faux);
  }

  // ---------- flying tiles ----------

  /** A copy of the tile flies along an arc between two world points, turning from one facing to another. */
  async fly(tile: Tile, from: THREE.Vector3, to: THREE.Vector3, o: { fromScale: number; toScale: number; fromQ?: THREE.Quaternion; toQ?: THREE.Quaternion; ms?: number; arc?: number }) {
    const obj = tileMesh(tile, { scale: 1, urgent: true });
    const q0 = o.fromQ ?? new THREE.Quaternion();
    const q1 = o.toQ ?? q0;
    obj.position.copy(from);
    obj.quaternion.copy(q0);
    obj.scale.setScalar(o.fromScale);
    this.scene.add(obj);
    const arc = o.arc ?? Math.min(2.2, 0.6 + from.distanceTo(to) * 0.18);
    await this.tw.add(o.ms ?? 900, (t) => {
      obj.position.lerpVectors(from, to, t);
      obj.position.y += Math.sin(t * Math.PI) * arc;
      obj.quaternion.slerpQuaternions(q0, q1, t);
      obj.scale.setScalar(o.fromScale + (o.toScale - o.fromScale) * t);
    });
    this.scene.remove(obj);
  }

  wallQuat(pid: string): THREE.Quaternion {
    const w = this.walls.get(pid);
    return w ? w.group.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
  }

  /** Orientation of something standing on the table facing the local player. */
  readonly tableQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.25, 0, 0));
  readonly flatQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

  burst(pos: THREE.Vector3, color: string, count = 50, spread = 1.2, size = 0.16, life = 1.2) {
    this.particles.burst(pos, color, count, spread, size, life);
  }

  // ---------- floating labels ----------

  floatAt(pos: THREE.Vector3, html: string, cls = '', life = 1800) {
    const el = document.createElement('div');
    el.className = `float-label ${cls}`;
    el.innerHTML = html;
    this.labelLayer.appendChild(el);
    const stacked = this.labels.filter((l) => performance.now() - l.born < 250 && l.pos.distanceTo(pos) < 0.5).length;
    this.labels.push({ el, pos: pos.clone(), born: performance.now() + stacked * 180, life, rise: 46 });
  }

  floatOverPawn(pid: string, html: string, cls = '') {
    const p = this.pawns.get(pid);
    if (p) this.floatAt(p.group.position.clone().setY(2.1), html, cls);
  }

  screenOf(pos: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const v = pos.clone().project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, visible: v.z < 1 };
  }

  private updateLabels(now: number) {
    for (const l of this.labels) {
      const t = (now - l.born) / l.life;
      const s = this.screenOf(l.pos);
      if (t < 0) {
        l.el.style.opacity = '0';
        continue;
      }
      l.el.style.transform = `translate(-50%, -100%) translate(${s.x}px, ${s.y - t * l.rise}px) scale(${0.8 + Math.min(1, t * 6) * 0.2})`;
      l.el.style.opacity = s.visible ? String(Math.min(1, t * 8) * (1 - Math.pow(Math.max(0, t), 3))) : '0';
    }
    for (const l of this.labels.filter((x) => now - x.born > x.life)) l.el.remove();
    this.labels = this.labels.filter((x) => now - x.born <= x.life);
  }

  // ---------- the Gala ----------

  async podium(ranked: string[]) {
    this.clearPodium();
    this.table.clearLots();
    this.table.hideGavel();
    const g = new THREE.Group();
    const steps: [number, number, number][] = [
      [0, 0.75, 0],
      [-1.05, 0.5, 0.15],
      [1.05, 0.32, 0.15],
    ];
    const mats = [gold, silver, new THREE.MeshStandardMaterial({ color: '#b87333', metalness: 1, roughness: 0.35 })];
    steps.forEach(([x, h, z], i) => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.95, h, 0.95), marble());
      block.position.set(x, h / 2, z);
      block.castShadow = true;
      block.receiveShadow = true;
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 1.0), mats[i]);
      top.position.set(x, h + 0.03, z);
      const t = rankTexture(i + 1);
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.44, 0.44),
        new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#e2c27a', emissiveIntensity: 0.55, transparent: true, metalness: 0.5, roughness: 0.4 }),
      );
      plate.position.set(x, Math.min(h * 0.55, h - 0.25), z + 0.48);
      g.add(block, top, plate);
    });
    g.position.set(0, TABLE_TOP + 0.07, 1.25);
    g.scale.setScalar(0.001);
    this.scene.add(g);
    this.podiumGroup = g;
    await this.tw.add(900, (t) => g.scale.setScalar(Math.max(0.001, t)), ease.back);
    void this.moveCamera(new THREE.Vector3(0, TABLE_TOP + 1.2, 1.1), new THREE.Vector3(0, 3.3, 6.6), 1600);
    for (let i = Math.min(2, ranked.length - 1); i >= 0; i--) {
      const pawn = this.pawns.get(ranked[i]);
      if (!pawn) continue;
      const [x, h, z] = steps[i];
      const to = new THREE.Vector3(x, TABLE_TOP + 0.07 + h + 0.06, 1.25 + z);
      const from = pawn.group.position.clone();
      pawn.group.rotation.y = 0;
      await this.tw.add(1100, (t) => {
        pawn.group.position.lerpVectors(from, to, t);
        pawn.group.position.y = from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * 3;
      });
      this.particles.burst(to.clone().setY(to.y + 0.6), i === 0 ? '#ffd76a' : '#ffffff', 40, 1.2);
    }
  }

  celebrate(pid: string, colors: string[]) {
    const pawn = this.pawns.get(pid);
    const p = pawn ? pawn.group.position.clone() : new THREE.Vector3(0, 2, 1);
    this.confetti.start(p.clone().setY(p.y + 1), colors);
    this.particles.burst(p.clone().setY(p.y + 0.8), '#ffd76a', 120, 2.2, 0.26, 2);
    const crown = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.14, 32, 1, true), gold);
    crown.add(band);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), gold);
      spike.position.set(Math.cos(a) * 0.23, 0.15, Math.sin(a) * 0.23);
      const jewel = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 10, 8),
        new THREE.MeshStandardMaterial({ color: i % 2 ? '#d1243c' : '#2b6bd8', emissive: i % 2 ? '#d1243c' : '#2b6bd8', emissiveIntensity: 0.6 }),
      );
      jewel.position.set(Math.cos(a) * 0.23, 0.25, Math.sin(a) * 0.23);
      crown.add(spike, jewel);
    }
    crown.position.copy(p).setY(p.y + 1.85);
    this.scene.add(crown);
    this.crowns.push(crown);
  }

  clearPodium() {
    for (const c of this.crowns) this.scene.remove(c);
    this.crowns = [];
    if (this.podiumGroup) this.scene.remove(this.podiumGroup);
    this.podiumGroup = null;
    this.confetti.stop();
    for (const pid of this.pawns.keys()) this.placePawn(pid);
  }

  /** Home and lobby backdrop: a slow turn around the salon. */
  setDemo(on: boolean) {
    this.demoSpin = on;
    if (on) {
      this.stopPlacement();
      this.clearPodium();
      this.view = { kind: 'free' };
      void this.moveCamera(new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(0, 3.9, 6.4), 1200);
    }
  }
}
