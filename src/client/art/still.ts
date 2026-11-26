import { brush, fillGradient, finish, glow, hsl, impasto, jit, type HSL, type Painter } from './common';

export function stillScene(p: Painter, scene: 'fruit' | 'flowers' | 'bottles') {
  if (scene === 'fruit') fruit(p);
  else if (scene === 'flowers') flowers(p);
  else bottles(p);
}

/** Bottle or vase outline standing on `base`: belly width bw and height bh, then a neck. */
function vesselPath(p: Painter, x: number, base: number, bw: number, bh: number, nw: number, nh: number, belly = 0.5) {
  const c = p.c;
  const shoulder = base - bh;
  c.beginPath();
  c.moveTo(x - bw * 0.42, base);
  c.bezierCurveTo(x - bw * 0.62, base - bh * belly * 0.4, x - bw * 0.58, shoulder + bh * 0.12, x - nw / 2, shoulder - bh * 0.02);
  c.lineTo(x - nw / 2, shoulder - nh);
  c.lineTo(x - nw * 0.62, shoulder - nh - nw * 0.15);
  c.lineTo(x + nw * 0.62, shoulder - nh - nw * 0.15);
  c.lineTo(x + nw / 2, shoulder - nh);
  c.lineTo(x + nw / 2, shoulder - bh * 0.02);
  c.bezierCurveTo(x + bw * 0.58, shoulder + bh * 0.12, x + bw * 0.62, base - bh * belly * 0.4, x + bw * 0.42, base);
  c.closePath();
}

function shadedFill(p: Painter, x: number, half: number, col: HSL, light: number) {
  const c = p.c;
  const g = c.createLinearGradient(x - half, 0, x + half, 0);
  const hi = hsl(col[0], col[1], Math.min(92, col[2] + 22));
  const lo = hsl(col[0], col[1] + 5, Math.max(6, col[2] - 20));
  g.addColorStop(0, light < 0 ? hi : lo);
  g.addColorStop(0.5, hsl(col[0], col[1], col[2]));
  g.addColorStop(1, light < 0 ? lo : hi);
  c.fillStyle = g;
}

/** A round fruit with form-following strokes and a highlight. */
function fruitBall(p: Painter, x: number, y: number, r: number, col: HSL, light: number) {
  const c = p.c;
  c.fillStyle = 'rgba(30,20,20,0.25)';
  c.beginPath();
  c.ellipse(x - light * r * 0.4, y + r * 0.85, r * 1.1, r * 0.3, 0, 0, Math.PI * 2);
  c.fill();
  const g = c.createRadialGradient(x + light * r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.05);
  g.addColorStop(0, hsl(col[0] + 8, col[1], Math.min(90, col[2] + 25)));
  g.addColorStop(0.6, hsl(col[0], col[1], col[2]));
  g.addColorStop(1, hsl(col[0] - 6, col[1], Math.max(8, col[2] - 22)));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 26; i++) {
    const a = p.rr(0, Math.PI * 2);
    const d = Math.sqrt(p.r()) * r * 0.8;
    impasto(p, x + Math.cos(a) * d, y + Math.sin(a) * d, a + Math.PI / 2, r * 0.32, r * 0.12, jit(p, col, 8, 8, 8), 0.45);
  }
  c.fillStyle = 'rgba(255,250,235,0.65)';
  c.beginPath();
  c.ellipse(x + light * r * 0.35, y - r * 0.4, r * 0.18, r * 0.11, -0.6, 0, Math.PI * 2);
  c.fill();
}

function wall(p: Painter, col: HSL, strokes = 900) {
  const { w, h } = p;
  fillGradient(p, [
    [0, hsl(col[0], col[1], col[2] + 6)],
    [1, hsl(col[0], col[1], col[2] - 10)],
  ]);
  for (let i = 0; i < strokes * p.detail; i++) brush(p, p.rr(-10, w + 10), p.rr(-10, h), p.rr(-0.9, -0.5), p.rr(12, 26), p.rr(5, 9), jit(p, col, 6, 8, 6), 0.3);
}

function table(p: Painter, top: number, wood: HSL) {
  const { c, w, h } = p;
  c.fillStyle = hsl(wood[0], wood[1], wood[2]);
  c.fillRect(0, top, w, h - top);
  for (let i = 0; i < 700 * p.detail; i++) brush(p, p.rr(-10, w + 10), p.rr(top, h + 6), p.rr(-0.05, 0.05), p.rr(18, 40), p.rr(3, 5), jit(p, wood, 4, 8, 6), 0.45);
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(0, top, w, Math.max(2, (h - top) * 0.05));
}

function fruit(p: Painter) {
  const { c, w, h } = p;
  wall(p, p.pick<HSL>([
    [205, 18, 52],
    [80, 14, 48],
    [35, 25, 58],
  ]));
  const top = h * p.rr(0.55, 0.62);
  table(p, top, [24, 40, 30]);
  const light = p.r() < 0.5 ? -1 : 1;
  // A white cloth thrown over the table, with blue-grey folds.
  c.fillStyle = hsl(210, 15, 86);
  c.beginPath();
  c.moveTo(w * p.rr(0.05, 0.2), top - h * 0.02);
  c.lineTo(w * p.rr(0.75, 0.95), top - h * 0.03);
  c.lineTo(w * p.rr(0.8, 1.02), h);
  c.lineTo(w * p.rr(-0.02, 0.15), h);
  c.closePath();
  c.fill();
  for (let i = 0; i < 900 * p.detail; i++) {
    const x = p.rr(w * 0.05, w * 0.95);
    const y = p.rr(top, h);
    const fold = Math.sin(x * 0.04 + y * 0.01) > 0.6;
    brush(p, x, y, Math.PI / 2 + p.rr(-0.4, 0.4), p.rr(10, 22), p.rr(3, 6), jit(p, fold ? [215, 20, 66] : [40, 20, 92], 5, 6, 5), 0.45);
  }
  const m = Math.min(w, h);
  // A jug on one side.
  const jx = w * (light < 0 ? 0.78 : 0.22);
  const jug: HSL = p.pick<HSL>([
    [30, 40, 58],
    [205, 30, 50],
    [10, 35, 45],
  ]);
  vesselPath(p, jx, top + h * 0.04, m * 0.26, m * 0.32, m * 0.12, m * 0.08, 0.7);
  shadedFill(p, jx, m * 0.16, jug, light);
  c.fill();
  // Fruit, placed back to front.
  const n = Math.max(4, Math.round((w / h) * 4 + p.ri(0, 3)));
  const spots: { x: number; y: number; r: number; col: HSL }[] = [];
  for (let i = 0; i < n; i++) {
    const r = m * p.rr(0.06, 0.09);
    spots.push({
      x: p.rr(w * 0.12, w * 0.88),
      y: top + p.rr(0.02, 0.28) * (h - top),
      r,
      col: p.pick<HSL>([
        [5, 70, 45],
        [25, 85, 52],
        [55, 70, 52],
        [90, 45, 45],
        [35, 80, 55],
      ]),
    });
  }
  spots.sort((a, b) => a.y - b.y);
  for (const s of spots) fruitBall(p, s.x, s.y, s.r, s.col, light);
  finish(p, { weave: 6, grain: 10, vignette: 0.28, warm: 0.3 });
}

function flowers(p: Painter) {
  const { c, w, h } = p;
  wall(p, p.pick<HSL>([
    [42, 45, 60],
    [175, 22, 45],
    [345, 20, 62],
    [215, 25, 40],
  ]));
  const top = h * p.rr(0.72, 0.8);
  table(p, top, [p.rr(20, 32), 35, p.rr(26, 36)]);
  const m = Math.min(w, h);
  const vx = w * p.rr(0.42, 0.58);
  const vase: HSL = p.pick<HSL>([
    [210, 45, 45],
    [150, 25, 40],
    [40, 20, 85],
    [15, 45, 45],
  ]);
  const light = p.r() < 0.5 ? -1 : 1;
  const vh = m * 0.3;
  // The bouquet above the vase mouth.
  const cx = vx;
  const cy = top - vh - m * 0.18;
  const R = Math.min(m * 0.38, w * 0.42);
  for (let i = 0; i < 260 * p.detail; i++) {
    const a = p.rr(Math.PI * 0.9, Math.PI * 2.1);
    const d = Math.sqrt(p.r()) * R * 1.1;
    brush(p, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, a + p.rr(-0.6, 0.6), m * 0.06, m * 0.022, jit(p, [p.rr(95, 135), 40, p.rr(22, 40)], 6, 8, 6), 0.85);
  }
  const kind = p.ri(0, 2);
  const blooms = Math.round(9 + (w / h) * 4);
  for (let i = 0; i < blooms; i++) {
    const a = p.rr(Math.PI * 0.95, Math.PI * 2.05);
    const d = Math.sqrt(p.r()) * R;
    const fx = cx + Math.cos(a) * d;
    const fy = cy + Math.sin(a) * d * 0.8;
    const r = m * p.rr(0.045, 0.075);
    if (kind === 0) {
      // Sunflowers.
      for (let k = 0; k < 14; k++) {
        const pa = (k / 14) * Math.PI * 2 + p.rr(-0.1, 0.1);
        impasto(p, fx + Math.cos(pa) * r * 0.9, fy + Math.sin(pa) * r * 0.9, pa, r * 0.9, r * 0.35, jit(p, [46, 90, 58], 4, 8, 8), 0.95);
      }
      c.fillStyle = hsl(28, 55, 22);
      c.beginPath();
      c.arc(fx, fy, r * 0.5, 0, Math.PI * 2);
      c.fill();
      for (let k = 0; k < 10; k++) brush(p, fx + p.rr(-0.35, 0.35) * r, fy + p.rr(-0.35, 0.35) * r, p.rr(0, 3), r * 0.15, r * 0.12, hsl(35, 60, 35), 0.8);
    } else {
      // Peonies and roses: layered dabs spiralling in.
      const col = kind === 1 ? p.pick<HSL>([[345, 65, 72], [355, 70, 55], [330, 40, 88]]) : p.pick<HSL>([[0, 70, 48], [40, 20, 94], [280, 35, 70], [48, 85, 70]]);
      for (let k = 0; k < 22; k++) {
        const t = k / 22;
        const pa = t * Math.PI * 6;
        const pr = r * (1 - t * 0.8);
        impasto(p, fx + Math.cos(pa) * pr, fy + Math.sin(pa) * pr * 0.85, pa + Math.PI / 2, r * 0.55, r * 0.3, jit(p, [col[0], col[1], col[2] - t * 14], 4, 6, 6), 0.9);
      }
    }
  }
  vesselPath(p, vx, top + h * 0.02, m * 0.24, vh, m * 0.1, m * 0.05, 0.55);
  shadedFill(p, vx, m * 0.15, vase, light);
  c.fill();
  for (let i = 0; i < 40; i++) brush(p, vx + p.rr(-0.1, 0.1) * m, top - p.rr(0.05, 0.9) * vh, Math.PI / 2, m * 0.04, m * 0.012, jit(p, vase, 4, 6, 10), 0.35);
  c.fillStyle = 'rgba(255,255,250,0.5)';
  c.fillRect(vx + light * m * 0.06, top - vh * 0.8, m * 0.012, vh * 0.45);
  // Fallen petals.
  for (let i = 0; i < 6; i++) {
    c.fillStyle = kind === 0 ? hsl(46, 85, 58) : hsl(345, 60, 70);
    c.beginPath();
    c.ellipse(p.rr(w * 0.1, w * 0.9), top + p.rr(0.15, 0.7) * (h - top), m * 0.018, m * 0.008, p.rr(0, 3), 0, Math.PI * 2);
    c.fill();
  }
  finish(p, { weave: 6, grain: 10, vignette: 0.25, warm: 0.3 });
}

function bottles(p: Painter) {
  const { c, w, h } = p;
  const bg: HSL = p.pick<HSL>([
    [30, 25, 20],
    [40, 15, 30],
    [200, 10, 26],
  ]);
  wall(p, bg, 600);
  const top = h * p.rr(0.64, 0.72);
  table(p, top, [bg[0] - 5, bg[1] + 10, bg[2] - 4]);
  const m = Math.min(w, h);
  const light = p.r() < 0.5 ? -1 : 1;
  glow(p, w * (light < 0 ? 0.2 : 0.8), h * 0.25, m * 0.9, hsl(40, 40, 55, 0.25));
  const n = Math.max(2, Math.round((w / h) * 2.2 + p.ri(0, 1)));
  for (let i = 0; i < n; i++) {
    const x = w * ((i + 0.5) / n) + p.rr(-0.05, 0.05) * w;
    const glass = p.pick<HSL>([
      [140, 40, 22],
      [30, 70, 28],
      [200, 20, 35],
      [160, 25, 40],
    ]);
    const bh = m * p.rr(0.28, 0.42);
    vesselPath(p, x, top + h * 0.03, m * p.rr(0.12, 0.17), bh, m * 0.045, m * p.rr(0.1, 0.16), 0.2);
    shadedFill(p, x, m * 0.09, glass, light);
    c.fill();
    c.fillStyle = 'rgba(240,250,240,0.55)';
    c.fillRect(x + light * m * 0.03, top - bh * 0.85, m * 0.01, bh * 0.6);
    c.fillStyle = 'rgba(240,250,240,0.3)';
    c.fillRect(x - light * m * 0.035, top - bh * 0.6, m * 0.006, bh * 0.35);
  }
  // Lemons, one of them cut open.
  const lemons = p.ri(2, 4);
  for (let i = 0; i < lemons; i++) {
    const x = p.rr(w * 0.15, w * 0.85);
    const y = top + p.rr(0.08, 0.3) * (h - top);
    const r = m * p.rr(0.05, 0.07);
    c.fillStyle = 'rgba(20,10,5,0.3)';
    c.beginPath();
    c.ellipse(x, y + r * 0.7, r * 1.4, r * 0.3, 0, 0, Math.PI * 2);
    c.fill();
    if (i === 0) {
      c.fillStyle = hsl(52, 80, 72);
      c.beginPath();
      c.ellipse(x, y, r * 0.95, r * 0.55, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = hsl(50, 60, 88);
      c.lineWidth = Math.max(1, r * 0.06);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.48);
        c.stroke();
      }
      continue;
    }
    const g = c.createRadialGradient(x + light * r * 0.4, y - r * 0.3, r * 0.1, x, y, r * 1.3);
    g.addColorStop(0, hsl(55, 95, 78));
    g.addColorStop(0.6, hsl(50, 90, 55));
    g.addColorStop(1, hsl(42, 80, 32));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(x + r * 1.3, y, r * 0.2, r * 0.12, 0, 0, Math.PI * 2);
    c.fill();
  }
  // A knife over the table edge.
  if (p.r() < 0.6) {
    const kx = w * p.rr(0.2, 0.7);
    const ky = top + (h - top) * 0.35;
    c.strokeStyle = hsl(210, 10, 78);
    c.lineWidth = Math.max(1.5, m * 0.012);
    c.beginPath();
    c.moveTo(kx, ky);
    c.lineTo(kx + m * 0.22, ky + m * 0.06);
    c.stroke();
    c.strokeStyle = hsl(25, 40, 22);
    c.lineWidth = Math.max(2, m * 0.02);
    c.beginPath();
    c.moveTo(kx + m * 0.22, ky + m * 0.06);
    c.lineTo(kx + m * 0.34, ky + m * 0.1);
    c.stroke();
  }
  finish(p, { weave: 6, grain: 11, vignette: 0.4, warm: 0.4 });
}
