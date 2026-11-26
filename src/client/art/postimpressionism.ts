import { brush, finish, hsl, impasto, jit, mix, type HSL, type Painter } from './common';

interface Vortex {
  x: number;
  y: number;
  s: number;
  rad: number;
}

function flowAngle(p: Painter, vort: Vortex[], x: number, y: number, wind: number): number {
  let vx = 1;
  let vy = wind * Math.sin((y / p.h) * 9 + (x / p.w) * 3);
  for (const v of vort) {
    const dx = x - v.x;
    const dy = y - v.y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) + 1e-3;
    const f = v.s * Math.exp(-d2 / (v.rad * v.rad)) * 2.6;
    vx += (-dy / d) * f;
    vy += (dx / d) * f;
  }
  return Math.atan2(vy, vx);
}

export function postScene(p: Painter, scene: 'village' | 'wheat') {
  if (scene === 'village') starry(p);
  else wheat(p);
  finish(p, { weave: 5, grain: 12, vignette: 0.3, warm: 0.12 });
}

function rings(p: Painter, x: number, y: number, r0: number, r1: number, colors: HSL[], wid: number) {
  for (let r = r0; r <= r1; r += wid * 0.9) {
    const t = (r - r0) / Math.max(1, r1 - r0);
    const col = colors[Math.min(colors.length - 1, Math.floor(t * colors.length))];
    const n = Math.max(6, Math.floor((Math.PI * 2 * r) / (wid * 2.2)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + p.rr(-0.1, 0.1);
      impasto(p, x + Math.cos(a) * r, y + Math.sin(a) * r, a + Math.PI / 2, wid * 2.4, wid, jit(p, col, 6, 8, 6), 0.95);
    }
  }
}

function starry(p: Painter) {
  const { c, w, h } = p;
  const horizon = h * p.rr(0.6, 0.7);
  c.fillStyle = hsl(225, 60, 18);
  c.fillRect(0, 0, w, h);
  const vort: Vortex[] = [
    { x: p.rr(0.3, 0.6) * w, y: p.rr(0.25, 0.4) * h, s: p.rr(0.8, 1.3), rad: w * p.rr(0.17, 0.25) },
    { x: p.rr(0.55, 0.8) * w, y: p.rr(0.32, 0.45) * h, s: -p.rr(0.5, 0.9), rad: w * p.rr(0.1, 0.15) },
  ];
  const stars: { x: number; y: number; r: number }[] = [];
  const starCount = p.ri(6, 9);
  for (let tries = 0; stars.length < starCount && tries < 200; tries++) {
    const s = { x: p.rr(0.04, 0.96) * w, y: p.rr(0.05, 0.85) * horizon, r: p.rr(4.5, 9) };
    if (stars.every((o) => Math.hypot(o.x - s.x, o.y - s.y) > (o.r + s.r) * 3.4)) stars.push(s);
  }
  const moon = { x: p.rr(0.72, 0.88) * w, y: p.rr(0.08, 0.16) * h, r: w * 0.05 };
  const blues: HSL[] = [
    [224, 62, 28],
    [218, 58, 38],
    [210, 55, 50],
    [200, 48, 60],
    [190, 40, 68],
  ];
  const d = p.detail;
  for (let i = 0; i < 4600 * d; i++) {
    const x = p.rr(-10, w + 10);
    const y = p.rr(-10, horizon + 10);
    const a = flowAngle(p, vort, x, y, 0.25);
    let near = 0;
    for (const v of vort) near = Math.max(near, Math.exp(-((x - v.x) ** 2 + (y - v.y) ** 2) / (v.rad * v.rad * 0.6)));
    let col = blues[Math.min(blues.length - 1, Math.floor(p.r() * 3 + near * 2.4))];
    for (const s of stars) {
      const dd = Math.hypot(x - s.x, y - s.y);
      if (dd < s.r * 3.2) col = mix(col, [52, 70, 70], 0.6 * (1 - dd / (s.r * 3.2)));
    }
    impasto(p, x, y, a, p.rr(10, 18), p.rr(3, 5), jit(p, col, 6, 8, 6), 0.92);
  }
  for (const s of stars) {
    rings(p, s.x, s.y, s.r * 0.9, s.r * 2.6, [[55, 90, 80], [58, 75, 72], [75, 45, 62]], 2.6);
    c.fillStyle = hsl(55, 100, 88);
    c.beginPath();
    c.arc(s.x, s.y, s.r * 0.8, 0, Math.PI * 2);
    c.fill();
  }
  rings(p, moon.x, moon.y, moon.r * 0.3, moon.r * 1.9, [[42, 95, 62], [48, 92, 66], [55, 70, 70], [60, 45, 62]], 3);
  // Rolling hills.
  const ph = p.rr(0, 6);
  const hill = (x: number) => horizon + Math.sin((x / w) * 4 + ph) * 14 + Math.sin((x / w) * 9 + ph * 2) * 6;
  for (let i = 0; i < 1500 * d; i++) {
    const x = p.rr(-10, w + 10);
    const top = hill(x);
    const y = p.rr(top - 4, h + 10);
    const t = (y - top) / (h - top);
    const slope = Math.atan(((hill(x + 2) - hill(x - 2)) / 4) * (1 - t));
    const col = mix([205, 45, 30], [222, 40, 16], t);
    impasto(p, x, y, slope + p.rr(-0.25, 0.25), p.rr(9, 15), p.rr(3, 5), jit(p, col, 8, 8, 5), 0.9);
  }
  // The village.
  const n = p.ri(10, 16);
  for (let k = 0; k < n; k++) {
    const x = p.rr(0.15, 0.95) * w;
    const base = hill(x) + p.rr(18, 60);
    const bw = p.rr(12, 22);
    const bh = p.rr(9, 15);
    c.fillStyle = hsl(p.rr(205, 225), 30, p.rr(28, 42));
    c.fillRect(x - bw / 2, base - bh, bw, bh);
    c.fillStyle = hsl(p.rr(210, 230), 35, p.rr(14, 22));
    c.beginPath();
    c.moveTo(x - bw / 2 - 2, base - bh);
    c.lineTo(x, base - bh - bw * 0.45);
    c.lineTo(x + bw / 2 + 2, base - bh);
    c.fill();
    if (p.r() < 0.8) brush(p, x + p.rr(-bw * 0.25, bw * 0.25), base - bh * 0.5, 0, 2, 3, hsl(50, 95, 65), 1);
  }
  const chx = p.rr(0.45, 0.7) * w;
  const chb = hill(chx) + 40;
  c.fillStyle = hsl(220, 35, 22);
  c.fillRect(chx - 4, chb - 70, 8, 70);
  c.beginPath();
  c.moveTo(chx - 5, chb - 70);
  c.lineTo(chx, chb - 105);
  c.lineTo(chx + 5, chb - 70);
  c.fill();
  // The cypress, a dark flame in the foreground.
  if (p.r() < 0.8) {
    const cx = p.rr(0.08, 0.3) * w;
    const top = p.rr(0.06, 0.2) * h;
    for (let i = 0; i < 900 * d; i++) {
      const t = p.r();
      const y = top + t * (h - top);
      const half = w * 0.075 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.2 + 0.05)), 0.6) * (1 - t * 0.2);
      const x = cx + p.rr(-1, 1) * half + Math.sin(t * 20) * 4;
      const col: HSL = p.r() < 0.15 ? [95, 35, 30] : [150, 30, p.rr(8, 16)];
      impasto(p, x, y, -Math.PI / 2 + Math.sin(y * 0.05) * 0.6, p.rr(10, 18), p.rr(3, 5), jit(p, col, 8, 8, 4), 0.95);
    }
  }
}

function wheat(p: Painter) {
  const { c, w, h } = p;
  const horizon = h * p.rr(0.45, 0.55);
  c.fillStyle = hsl(205, 55, 45);
  c.fillRect(0, 0, w, h);
  const vort: Vortex[] = [{ x: p.rr(0.2, 0.8) * w, y: p.rr(0.15, 0.3) * h, s: p.rr(0.6, 1), rad: w * 0.2 }];
  const d = p.detail;
  for (let i = 0; i < 2600 * d; i++) {
    const x = p.rr(-10, w + 10);
    const y = p.rr(-10, horizon + 6);
    const cloud = Math.sin(x * 0.02 + y * 0.03) > 0.55;
    const col: HSL = cloud ? [195, 30, p.rr(82, 94)] : p.pick<HSL>([[200, 60, 45], [192, 55, 55], [210, 55, 38], [185, 45, 62]]);
    impasto(p, x, y, flowAngle(p, vort, x, y, 0.4), p.rr(10, 18), p.rr(3, 5), jit(p, col, 6, 8, 6), 0.92);
  }
  if (p.r() < 0.6) {
    const sx = p.rr(0.15, 0.85) * w;
    const sy = p.rr(0.1, 0.3) * h;
    rings(p, sx, sy, 4, w * 0.09, [[52, 100, 70], [48, 95, 62], [55, 80, 75]], 3);
  }
  // Wheat rows sway in waves.
  const ph = p.rr(0, 6);
  for (let i = 0; i < 3200 * d; i++) {
    const x = p.rr(-10, w + 10);
    const t = p.r();
    const y = horizon + t * (h - horizon) + 4;
    const a = -Math.PI / 2 + Math.sin(x * 0.03 + y * 0.05 + ph) * 0.7;
    const col = p.pick<HSL>([[45, 85, 55], [38, 80, 48], [50, 90, 62], [30, 70, 42], [70, 45, 40]]);
    impasto(p, x, y, a, p.rr(8, 16) * (0.6 + t), p.rr(2.5, 4.5) * (0.7 + t * 0.5), jit(p, col, 5, 8, 6), 0.92);
  }
  // A dirt road.
  if (p.r() < 0.6) {
    const x0 = p.rr(0.3, 0.7) * w;
    for (let i = 0; i < 500 * d; i++) {
      const t = p.r();
      const y = horizon + t * (h - horizon);
      const x = x0 + Math.sin(t * 3 + ph) * 40 * t + p.rr(-1, 1) * (4 + t * 40);
      impasto(p, x, y, p.rr(-0.3, 0.3), p.rr(8, 14), p.rr(3, 5), jit(p, [20, 55, 45], 8, 10, 8), 0.95);
    }
  }
  // Crows.
  for (let i = 0; i < p.ri(6, 16); i++) {
    const x = p.rr(0.05, 0.95) * w;
    const y = p.rr(horizon * 0.35, horizon * 1.05);
    const s = p.rr(4, 9);
    c.strokeStyle = hsl(230, 30, 8);
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(x - s, y - s * 0.4);
    c.quadraticCurveTo(x - s * 0.4, y - s * 0.6, x, y);
    c.quadraticCurveTo(x + s * 0.4, y - s * 0.6, x + s, y - s * 0.4);
    c.stroke();
  }
}
