import { brush, fillGradient, finish, glow, hsl, impasto, jit, mix, type HSL, type Painter } from './common';

export function cityScene(p: Painter, scene: 'boulevard' | 'cafe' | 'bridge') {
  if (scene === 'boulevard') boulevard(p);
  else if (scene === 'cafe') cafe(p);
  else bridge(p);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A building facade running from the near edge of the picture towards the vanishing point. */
interface Facade {
  side: -1 | 1;
  near: number;
  far: number;
  topNear: number;
  topFar: number;
  baseNear: number;
  baseFar: number;
}

function facadePath(p: Painter, f: Facade) {
  const c = p.c;
  c.beginPath();
  c.moveTo(f.near, f.topNear);
  c.lineTo(f.far, f.topFar);
  c.lineTo(f.far, f.baseFar);
  c.lineTo(f.near, f.baseNear);
  c.closePath();
}

/** Point on a facade: u runs from the near edge (0) to the far edge (1), v from the roof (0) to the street (1). */
function onFacade(f: Facade, u: number, v: number): [number, number] {
  // Foreshortening: equal steps along the street get closer together towards the distance.
  const k = 1 - Math.pow(1 - u, 1.8);
  const x = lerp(f.near, f.far, k);
  const top = lerp(f.topNear, f.topFar, k);
  const base = lerp(f.baseNear, f.baseFar, k);
  return [x, lerp(top, base, v)];
}

function paintFacade(p: Painter, f: Facade, stone: HSL, roof: HSL, lit: number, warmWindows: boolean) {
  const { c } = p;
  c.save();
  facadePath(p, f);
  c.clip();
  const minX = Math.min(f.near, f.far);
  const maxX = Math.max(f.near, f.far);
  const top = Math.min(f.topNear, f.topFar);
  const base = Math.max(f.baseNear, f.baseFar);
  for (let i = 0; i < 1500 * p.detail; i++) {
    const x = p.rr(minX - 6, maxX + 6);
    const y = p.rr(top - 6, base + 6);
    brush(p, x, y, p.rr(-0.25, 0.25) + (p.r() < 0.5 ? 0 : Math.PI / 2), p.rr(6, 14), p.rr(3, 6), jit(p, stone, 6, 8, 7), 0.55);
  }
  // Mansard roof band.
  for (let i = 0; i < 260; i++) {
    const u = p.r();
    const [x, y] = onFacade(f, u, p.rr(0, 0.1));
    brush(p, x, y, p.rr(-0.3, 0.3), p.rr(6, 12), p.rr(3, 5), jit(p, roof, 6, 8, 6), 0.85);
  }
  // Rows of tall windows with iron balconies.
  const cols = p.ri(7, 11);
  for (let row = 0; row < 4; row++) {
    const v0 = 0.16 + row * 0.17;
    for (let i = 0; i < cols; i++) {
      const u = (i + 0.5) / cols;
      const [x0, y0] = onFacade(f, u - 0.18 / cols, v0);
      const [x1, y1] = onFacade(f, u + 0.18 / cols, v0 + 0.1);
      const glowing = p.r() < lit;
      c.fillStyle = glowing ? hsl(p.rr(38, 48), 85, p.rr(55, 68)) : hsl(215, 22, p.rr(16, 26));
      c.fillRect(Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0);
      if (glowing && warmWindows) glow(p, (x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) * 2.2, hsl(42, 90, 60, 0.25));
      c.strokeStyle = 'rgba(25,22,28,0.7)';
      c.lineWidth = Math.max(0.6, Math.abs(x1 - x0) * 0.12);
      c.beginPath();
      c.moveTo(x0, y1 + (y1 - y0) * 0.12);
      c.lineTo(x1, y1 + (y1 - y0) * 0.12);
      c.stroke();
    }
  }
  // Shop fronts at street level.
  for (let i = 0; i < cols; i++) {
    const u = (i + 0.5) / cols;
    const [x0, y0] = onFacade(f, u - 0.35 / cols, 0.8);
    const [x1, y1] = onFacade(f, u + 0.35 / cols, 0.98);
    c.fillStyle = p.r() < 0.5 ? hsl(p.rr(30, 45), 70, p.rr(45, 60), 0.9) : hsl(220, 20, 18, 0.9);
    c.fillRect(Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0);
  }
  c.restore();
}

/** A walker under an umbrella; s is their height in pixels. */
function walker(p: Painter, x: number, y: number, s: number, coat: HSL, wet: boolean) {
  const c = p.c;
  const sw = Math.max(1.2, s * 0.06);
  for (let j = 0; j < 22; j++) brush(p, x + p.rr(-0.13, 0.13) * s, y - p.rr(0.15, 0.72) * s, Math.PI / 2 + p.rr(-0.2, 0.2), s * 0.22, sw * 2.2, jit(p, coat, 6, 8, 6), 0.95);
  brush(p, x - s * 0.05, y - s * 0.08, Math.PI / 2 + 0.15, s * 0.18, sw * 1.4, hsl(220, 20, 12), 0.95);
  brush(p, x + s * 0.05, y - s * 0.08, Math.PI / 2 - 0.15, s * 0.18, sw * 1.4, hsl(220, 20, 12), 0.95);
  c.fillStyle = hsl(25, 30, 62);
  c.beginPath();
  c.arc(x, y - s * 0.8, s * 0.065, 0, Math.PI * 2);
  c.fill();
  // Umbrella dome.
  c.fillStyle = hsl(220, 18, 10);
  c.beginPath();
  c.ellipse(x, y - s * 0.9, s * 0.32, s * 0.15, 0, Math.PI, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(200,210,225,0.35)';
  c.lineWidth = Math.max(0.6, s * 0.012);
  c.beginPath();
  c.ellipse(x, y - s * 0.9, s * 0.3, s * 0.13, 0, Math.PI * 1.1, Math.PI * 1.6);
  c.stroke();
  c.strokeStyle = hsl(220, 15, 15);
  c.beginPath();
  c.moveTo(x, y - s * 1.04);
  c.lineTo(x, y - s * 0.62);
  c.stroke();
  if (wet) for (let j = 0; j < 8; j++) brush(p, x + p.rr(-0.15, 0.15) * s, y + p.rr(0.02, 0.4) * s, Math.PI / 2, s * 0.12, sw * 1.6, hsl(coat[0], coat[1], coat[2] + 6), 0.22);
}

function lamp(p: Painter, x: number, base: number, s: number, warm: HSL) {
  const c = p.c;
  c.strokeStyle = hsl(220, 20, 12);
  c.lineWidth = Math.max(1, s * 0.025);
  c.beginPath();
  c.moveTo(x, base);
  c.lineTo(x, base - s);
  c.stroke();
  glow(p, x, base - s * 1.02, s * 0.45, hsl(warm[0], 90, 70, 0.55));
  c.fillStyle = hsl(warm[0], 95, 82);
  c.beginPath();
  c.arc(x, base - s * 1.02, Math.max(1.5, s * 0.05), 0, Math.PI * 2);
  c.fill();
}

function boulevard(p: Painter) {
  const { c, w, h } = p;
  const vx = w * p.rr(0.42, 0.58);
  const vy = h * p.rr(0.38, 0.46);
  const ground = h * 0.83;
  const sky: HSL = [p.rr(205, 220), p.rr(10, 22), p.rr(66, 76)];
  fillGradient(p, [
    [0, hsl(sky[0], sky[1], sky[2] - 12)],
    [vy / h, hsl(sky[0] - 10, sky[1], sky[2] + 8)],
    [1, hsl(sky[0], sky[1] - 4, sky[2] - 30)],
  ]);
  for (let i = 0; i < 700 * p.detail; i++) {
    const y = p.rr(-10, vy + 10);
    brush(p, p.rr(-10, w + 10), y, p.rr(-0.3, 0.3), p.rr(10, 22), p.rr(4, 7), jit(p, mix(sky, [sky[0], 8, 88], y / vy), 5, 6, 6), 0.45);
  }
  const gap = Math.min(w, h) * 0.05;
  const stone: HSL = [p.rr(32, 42), p.rr(18, 30), p.rr(64, 74)];
  const roof: HSL = [215, 14, 32];
  const left: Facade = { side: -1, near: -w * 0.02, far: vx - gap, topNear: h * p.rr(0.0, 0.08), topFar: vy - h * 0.12, baseNear: ground, baseFar: vy + h * 0.05 };
  const right: Facade = { side: 1, near: w * 1.02, far: vx + gap, topNear: h * p.rr(0.04, 0.14), topFar: vy - h * 0.1, baseNear: ground, baseFar: vy + h * 0.05 };
  // Distant buildings closing the street.
  c.fillStyle = hsl(sky[0], 10, sky[2] - 18);
  c.fillRect(vx - gap * 1.2, vy - h * 0.1, gap * 2.4, h * 0.16);
  paintFacade(p, left, stone, roof, 0.12, false);
  paintFacade(p, right, [stone[0] + 4, stone[1], stone[2] - 6], roof, 0.12, false);
  // Wet street: the sky and lights reflect in long vertical streaks.
  c.save();
  c.beginPath();
  c.moveTo(-w * 0.05, h * 1.02);
  c.lineTo(-w * 0.05, ground);
  c.lineTo(vx - gap, vy + h * 0.05);
  c.lineTo(vx + gap, vy + h * 0.05);
  c.lineTo(w * 1.05, ground);
  c.lineTo(w * 1.05, h * 1.02);
  c.closePath();
  c.clip();
  const street: HSL = [sky[0], 10, 38];
  for (let i = 0; i < 2600 * p.detail; i++) {
    const t = Math.pow(p.r(), 0.7);
    const y = lerp(vy + h * 0.05, h, t);
    const x = p.rr(-10, w + 10);
    const shine = Math.abs(x - vx) < w * 0.12 * (0.3 + t) && p.r() < 0.5;
    const base = shine ? mix(street, [sky[0], 10, 80], 0.6) : mix(street, [30, 20, 25], p.r() * 0.5);
    brush(p, x, y, p.rr(-0.05, 0.05), p.rr(5, 12) * (0.4 + t), p.rr(1.5, 3.5) * (0.5 + t), jit(p, base, 4, 6, 6), 0.6);
  }
  for (let i = 0; i < 160 * p.detail; i++) {
    const t = p.r();
    const y = lerp(vy + h * 0.08, h, t);
    brush(p, vx + p.rr(-1, 1) * w * 0.35 * t, y, Math.PI / 2, p.rr(10, 30) * t + 6, p.rr(1.5, 3), hsl(p.rr(36, 48), 70, p.rr(60, 72)), 0.18);
  }
  c.restore();
  // Lamps along the kerbs, then the walkers from far to near.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const t = 0.15 + k * 0.22;
      const y = lerp(ground, vy + h * 0.05, t);
      const x = lerp(side < 0 ? w * 0.08 : w * 0.92, vx + side * gap * 1.1, t);
      lamp(p, x, y, (ground - vy) * 0.8 * (1 - t * 0.85), [42, 90, 60]);
    }
  }
  const walkers = p.ri(5, 10);
  const people = Array.from({ length: walkers }, () => p.r()).sort((a, b) => b - a);
  for (const depth of people) {
    const t = depth * 0.9;
    const y = lerp(h * 0.98, vy + h * 0.06, t);
    const spread = lerp(w * 0.45, gap * 1.2, t);
    const x = vx + p.rr(-1, 1) * spread;
    walker(p, x, y, lerp(h * 0.36, h * 0.03, t), [p.rr(200, 230), p.rr(10, 25), p.rr(14, 26)], true);
  }
  // Rain.
  c.strokeStyle = 'rgba(225,232,240,0.16)';
  c.lineWidth = 0.8;
  for (let i = 0; i < 380; i++) {
    const x = p.rr(0, w);
    const y = p.rr(0, h);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 3, y + 14);
    c.stroke();
  }
  finish(p, { weave: 5, grain: 9, vignette: 0.28, warm: 0.05 });
}

function cafe(p: Painter) {
  const { c, w, h } = p;
  const vx = w * p.rr(0.55, 0.72);
  const vy = h * p.rr(0.4, 0.48);
  const ground = h * 0.78;
  fillGradient(p, [
    [0, hsl(228, 58, 16)],
    [vy / h, hsl(220, 55, 30)],
    [1, hsl(225, 40, 18)],
  ]);
  for (let i = 0; i < 1200 * p.detail; i++) {
    const y = p.rr(-10, vy);
    impasto(p, p.rr(-10, w + 10), y, p.rr(-0.6, 0.6), p.rr(8, 14), p.rr(3, 5), jit(p, [224, 55, 26 + (y / vy) * 10], 6, 8, 6), 0.7);
  }
  const stars = p.ri(8, 16);
  for (let i = 0; i < stars; i++) {
    const x = p.rr(vx - w * 0.25, w);
    const y = p.rr(h * 0.03, vy * 0.8);
    const r = p.rr(2, 4.5);
    glow(p, x, y, r * 5, hsl(50, 90, 75, 0.45));
    c.fillStyle = hsl(52, 100, 90);
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  const gap = Math.min(w, h) * 0.04;
  // The dark street on the right with a few lit windows.
  const right: Facade = { side: 1, near: w * 1.05, far: vx + gap, topNear: h * 0.16, topFar: vy - h * 0.1, baseNear: ground, baseFar: vy + h * 0.04 };
  paintFacade(p, right, [222, 30, 28], [225, 30, 16], 0.25, true);
  // The café: warm wall under a great yellow awning.
  const left: Facade = { side: -1, near: -w * 0.05, far: vx - gap, topNear: -h * 0.05, topFar: vy - h * 0.14, baseNear: ground, baseFar: vy + h * 0.04 };
  c.save();
  facadePath(p, left);
  c.clip();
  for (let i = 0; i < 1800 * p.detail; i++) {
    const x = p.rr(-10, vx);
    const y = p.rr(-10, ground);
    impasto(p, x, y, p.rr(-0.4, 0.4) + Math.PI / 2, p.rr(8, 14), p.rr(3, 5), jit(p, [p.rr(28, 40), 80, p.rr(48, 62)], 6, 8, 6), 0.85);
  }
  c.restore();
  const awn = (u: number, v: number) => onFacade(left, u, v);
  c.fillStyle = hsl(48, 95, 58);
  c.beginPath();
  const a0 = awn(0, 0.3);
  const a1 = awn(0.92, 0.28);
  const a2 = awn(0.92, 0.42);
  const a3 = awn(0, 0.5);
  c.moveTo(a0[0], a0[1]);
  c.lineTo(a1[0], a1[1]);
  c.lineTo(a2[0], a2[1]);
  c.lineTo(a3[0], a3[1] + h * 0.06);
  c.closePath();
  c.fill();
  for (let i = 0; i < 500; i++) {
    const u = p.r() * 0.92;
    const [x, y] = awn(u, p.rr(0.3, 0.46));
    impasto(p, x, y, -0.2, p.rr(8, 14), p.rr(3, 5), jit(p, [50, 95, 62], 4, 6, 8), 0.8);
  }
  glow(p, awn(0.3, 0.7)[0], awn(0.3, 0.7)[1], w * 0.45, hsl(40, 95, 62, 0.35));
  // Cobbles: blue in the shadow, orange in the café light.
  c.save();
  c.beginPath();
  c.moveTo(-w * 0.05, h * 1.05);
  c.lineTo(-w * 0.05, ground);
  c.lineTo(vx - gap, vy + h * 0.04);
  c.lineTo(vx + gap, vy + h * 0.04);
  c.lineTo(w * 1.05, ground);
  c.lineTo(w * 1.05, h * 1.05);
  c.closePath();
  c.clip();
  for (let i = 0; i < 2400 * p.detail; i++) {
    const t = Math.pow(p.r(), 0.75);
    const y = lerp(vy + h * 0.04, h, t);
    const x = p.rr(-10, w + 10);
    const lit = Math.max(0, 1 - Math.abs(x - w * 0.2) / (w * 0.55)) * (0.5 + t * 0.5);
    const col = mix([228, 40, 34], [32, 75, 60], Math.min(1, lit * 1.3 + p.rr(-0.15, 0.15)));
    impasto(p, x, y, p.rr(-0.4, 0.4), p.rr(5, 10) * (0.5 + t), p.rr(3, 6) * (0.5 + t), jit(p, col, 6, 8, 8), 0.9);
  }
  c.restore();
  // Tables and drinkers on the terrace.
  for (let k = 0; k < p.ri(4, 7); k++) {
    const t = p.rr(0.05, 0.75);
    const y = lerp(h * 0.96, vy + h * 0.08, t);
    const x = lerp(w * 0.08, vx - gap * 2, t) + p.rr(-0.06, 0.06) * w;
    const s = lerp(h * 0.16, h * 0.03, t);
    c.fillStyle = hsl(40, 30, 85);
    c.beginPath();
    c.ellipse(x, y - s * 0.5, s * 0.45, s * 0.12, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = hsl(25, 30, 18);
    c.lineWidth = Math.max(1, s * 0.05);
    c.beginPath();
    c.moveTo(x, y - s * 0.45);
    c.lineTo(x, y);
    c.stroke();
    if (p.r() < 0.7) {
      const sx = x + p.pick([-1, 1]) * s * 0.55;
      for (let j = 0; j < 10; j++) brush(p, sx + p.rr(-0.12, 0.12) * s, y - p.rr(0.2, 0.85) * s, Math.PI / 2, s * 0.3, s * 0.12, jit(p, [p.rr(200, 240), 30, 20], 6, 6, 6), 0.95);
      c.fillStyle = hsl(28, 35, 55);
      c.beginPath();
      c.arc(sx, y - s * 0.95, s * 0.1, 0, Math.PI * 2);
      c.fill();
    }
  }
  finish(p, { weave: 5, grain: 11, vignette: 0.3, warm: 0.15 });
}

function bridge(p: Painter) {
  const { c, w, h } = p;
  const horizon = h * p.rr(0.5, 0.58);
  const warm: HSL = [p.rr(18, 34), 85, 62];
  fillGradient(p, [
    [0, hsl(250, 35, 26)],
    [horizon / h * 0.55, hsl(300, 30, 46)],
    [horizon / h, hsl(warm[0], 80, 66)],
    [1, hsl(240, 30, 22)],
  ]);
  const sx = w * p.rr(0.3, 0.7);
  const sy = horizon - h * p.rr(0.04, 0.1);
  glow(p, sx, sy, Math.min(w, h) * 0.5, hsl(warm[0], 95, 65, 0.55));
  for (let i = 0; i < 900 * p.detail; i++) {
    const y = p.rr(0, horizon);
    const t = y / horizon;
    const lit = Math.max(0, 1 - Math.abs(p.rr(-1, 1)) * 0.5) * t;
    brush(p, p.rr(-10, w + 10), y, p.rr(-0.08, 0.08), p.rr(14, 34), p.rr(3, 6), jit(p, mix([260, 30, 40], [warm[0] + 10, 85, 72], lit), 6, 8, 6), 0.5);
  }
  c.fillStyle = hsl(warm[0] + 10, 100, 80);
  c.beginPath();
  c.arc(sx, sy, Math.min(w, h) * 0.045, 0, Math.PI * 2);
  c.fill();
  // The skyline: roofs, domes, spires and chimneys.
  const sky = hsl(260, 30, 22);
  c.fillStyle = sky;
  let x = -10;
  while (x < w + 10) {
    const bw = p.rr(12, 40);
    const bh = p.rr(h * 0.03, h * 0.12);
    c.fillRect(x, horizon - bh, bw + 1, bh + 2);
    const roll = p.r();
    if (roll < 0.08) {
      c.beginPath();
      c.arc(x + bw / 2, horizon - bh, bw * 0.45, Math.PI, Math.PI * 2);
      c.fill();
      c.fillRect(x + bw / 2 - 1.5, horizon - bh - bw * 0.75, 3, bw * 0.35);
    } else if (roll < 0.16) {
      c.beginPath();
      c.moveTo(x + bw * 0.3, horizon - bh);
      c.lineTo(x + bw * 0.5, horizon - bh - h * p.rr(0.06, 0.14));
      c.lineTo(x + bw * 0.7, horizon - bh);
      c.fill();
    } else if (roll < 0.45) {
      c.fillRect(x + bw * 0.2, horizon - bh - 6, 4, 6);
    }
    if (p.r() < 0.5) {
      c.fillStyle = hsl(42, 90, 65, 0.85);
      for (let k = 0; k < p.ri(1, 4); k++) c.fillRect(x + p.rr(2, bw - 4), horizon - p.rr(4, bh - 2), 2, 2);
      c.fillStyle = sky;
    }
    x += bw + p.rr(-4, 3);
  }
  // River reflections.
  for (let i = 0; i < 2000 * p.detail; i++) {
    const y = p.rr(horizon, h + 10);
    const t = (y - horizon) / (h - horizon);
    const near = Math.max(0, 1 - Math.abs(p.rr(-1, 1)) * 0.7) * (1 - t * 0.6);
    brush(p, p.rr(-10, w + 10), y, p.rr(-0.04, 0.04), p.rr(10, 30), p.rr(2, 4) * (0.6 + t), jit(p, mix([250, 30, 26], [warm[0] + 5, 80, 60], near * 0.8), 6, 8, 6), 0.55);
  }
  for (let y = horizon + 3; y < h; y += p.rr(4, 9)) {
    const spread = 6 + (y - horizon) * 0.12;
    brush(p, sx + p.rr(-spread, spread), y, 0, p.rr(10, 26), p.rr(2, 4), hsl(warm[0] + 10, 95, p.rr(65, 80)), 0.85);
  }
  // The stone bridge with its arches and lamps.
  const by = horizon + (h - horizon) * p.rr(0.18, 0.32);
  const thick = (h - horizon) * 0.1;
  const arches = p.ri(4, 7);
  const span = (w * 1.1) / arches;
  c.fillStyle = hsl(255, 25, 16);
  c.beginPath();
  c.moveTo(-w * 0.05, by - thick);
  c.lineTo(w * 1.05, by - thick);
  c.lineTo(w * 1.05, by + thick * 2.6);
  for (let k = arches; k >= 0; k--) {
    const ax = -w * 0.05 + k * span;
    c.lineTo(ax + span * 0.08, by + thick * 2.6);
    c.arc(ax - span / 2 + span * 0.5, by + thick * 2.6, span * 0.4, 0, Math.PI, true);
  }
  c.closePath();
  c.fill();
  for (let k = 0; k <= arches; k++) {
    const ax = -w * 0.05 + k * span + span * 0.5;
    for (let j = 0; j < 14; j++) brush(p, ax + p.rr(-span * 0.3, span * 0.3), by + thick * 3 + p.rr(0, thick * 3), 0, p.rr(8, 16), 2.5, hsl(255, 25, 14), 0.3);
    lamp(p, ax - span * 0.5, by - thick, thick * 2.4, warm);
  }
  finish(p, { weave: 6, grain: 9, vignette: 0.26, warm: 0.25 });
}
