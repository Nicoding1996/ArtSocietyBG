import { brush, fillGradient, finish, glow, hsl, hslA, jit, mix, type HSL, type Painter } from './common';

export function impressionScene(p: Painter, scene: 'lilies' | 'poppies' | 'harbour') {
  if (scene === 'lilies') lilies(p);
  else if (scene === 'poppies') poppies(p);
  else harbour(p);
  finish(p, { weave: 6, grain: 9, vignette: 0.22, warm: 0.3 });
}

function lilies(p: Painter) {
  const { w, h } = p;
  const pal = p.pick<{ top: HSL; mid: HSL; deep: HSL; leaf: HSL; flower: HSL }>([
    { top: [45, 70, 82], mid: [190, 35, 55], deep: [205, 45, 28], leaf: [105, 38, 38], flower: [340, 70, 80] },
    { top: [285, 35, 80], mid: [215, 40, 52], deep: [232, 42, 26], leaf: [125, 30, 36], flower: [350, 75, 82] },
    { top: [58, 60, 84], mid: [165, 35, 47], deep: [192, 48, 22], leaf: [88, 42, 36], flower: [330, 60, 86] },
  ]);
  fillGradient(p, [
    [0, hslA(pal.top)],
    [0.45, hslA(pal.mid)],
    [1, hslA(pal.deep)],
  ]);
  const d = p.detail;
  // Reflections of willows hanging into the water.
  for (let i = 0; i < 180 * d; i++) {
    const x = p.rr(0, w);
    const y = p.rr(-20, h * 0.75);
    const col = mix(pal.leaf, pal.deep, p.rr(0, 0.6));
    brush(p, x, y, Math.PI / 2 + p.rr(-0.12, 0.12), p.rr(25, 70), p.rr(3, 8), jit(p, col, 8, 8, 8), 0.32);
  }
  // Water surface: thousands of short horizontal dabs.
  for (let i = 0; i < 2800 * d; i++) {
    const x = p.rr(-10, w + 10);
    const y = p.rr(-10, h + 10);
    const t = Math.max(0, Math.min(1, y / h));
    const base = t < 0.45 ? mix(pal.top, pal.mid, t / 0.45) : mix(pal.mid, pal.deep, (t - 0.45) / 0.55);
    brush(p, x, y, p.rr(-0.12, 0.12), p.rr(6, 15) * (0.6 + t), p.rr(2, 4.4) * (0.7 + t * 0.6), jit(p, base, 12, 10, 9), 0.55);
  }
  for (let i = 0; i < 320 * d; i++) {
    const t = p.r();
    brush(p, p.rr(0, w), t * h * 0.8, p.rr(-0.1, 0.1), p.rr(4, 10), p.rr(1.5, 3), hsl(pal.top[0], 75, 92), 0.5 * (1 - t));
  }
  // Lily pads with blossoms.
  const pads = p.ri(8, 13);
  for (let k = 0; k < pads; k++) {
    const cy = p.rr(h * 0.28, h * 1.02);
    const cx = p.rr(-20, w + 20);
    const size = p.rr(14, 30) * (0.45 + cy / h);
    for (let j = 0; j < size * 3.2; j++) {
      const a = p.rr(0, Math.PI * 2);
      const r = Math.sqrt(p.r());
      brush(p, cx + Math.cos(a) * r * size, cy + Math.sin(a) * r * size * 0.36, p.rr(-0.4, 0.4), p.rr(4, 10), p.rr(2, 4), jit(p, pal.leaf, 12, 12, 12), 0.85);
    }
    for (let j = 0; j < size * 0.8; j++) {
      const a = p.rr(Math.PI * 1.05, Math.PI * 1.95);
      brush(p, cx + Math.cos(a) * size * 0.9, cy + Math.sin(a) * size * 0.32, a + Math.PI / 2, p.rr(3, 6), 1.6, hsl(pal.leaf[0] - 20, 45, 62), 0.6);
    }
    if (p.r() < 0.55) {
      const fx = cx + p.rr(-0.3, 0.3) * size;
      const fy = cy - size * 0.12;
      const fs = size * 0.32;
      for (let j = 0; j < 12; j++) {
        const a = -Math.PI / 2 + p.rr(-1.3, 1.3);
        brush(p, fx + Math.cos(a) * fs * 0.5, fy + Math.sin(a) * fs * 0.6, a, fs * 0.9, p.rr(2, 3.6), jit(p, pal.flower, 8, 10, 8), 0.9);
      }
      brush(p, fx, fy, 0, 3, 3, hsl(48, 90, 62), 0.95);
    }
  }
}

function poppies(p: Painter) {
  const { w, h } = p;
  const horizon = h * p.rr(0.38, 0.48);
  const sky = p.pick<HSL>([
    [205, 60, 72],
    [200, 45, 78],
    [214, 52, 68],
  ]);
  fillGradient(p, [
    [0, hsl(sky[0], sky[1], sky[2] - 12)],
    [horizon / h, hsl(sky[0] - 15, sky[1] - 25, sky[2] + 12)],
    [horizon / h + 0.01, hsl(95, 40, 45)],
    [1, hsl(80, 45, 40)],
  ]);
  const d = p.detail;
  for (let i = 0; i < 900 * d; i++) {
    const y = p.rr(0, horizon);
    const t = y / horizon;
    brush(p, p.rr(0, w), y, p.rr(-0.5, 0.5), p.rr(8, 16), p.rr(3, 5), jit(p, mix([sky[0], sky[1], sky[2] - 10], [sky[0] - 15, 30, 88], t), 8, 10, 8), 0.6);
  }
  // Clouds.
  for (let k = 0; k < p.ri(4, 7); k++) {
    const cx = p.rr(0, w);
    const cy = p.rr(h * 0.05, horizon * 0.75);
    const s = p.rr(30, 70);
    for (let j = 0; j < 140 * d; j++) {
      const x = cx + p.gauss() * s;
      const y = cy + p.gauss() * s * 0.32;
      const shade = y > cy ? p.rr(78, 86) : p.rr(90, 98);
      brush(p, x, y, p.rr(-0.6, 0.6), p.rr(6, 14), p.rr(3, 6), hsl(p.rr(30, 50), 40, shade), 0.55);
    }
  }
  // Distant tree line.
  const phase = p.rr(0, 10);
  for (let x = -10; x < w + 10; x += 2.2) {
    const top = horizon - 12 - Math.abs(Math.sin(x * 0.02 + phase) * 22 + Math.sin(x * 0.057 + phase * 2) * 10);
    for (let j = 0; j < 4; j++) {
      const y = p.rr(top, horizon + 6);
      brush(p, x + p.rr(-3, 3), y, p.rr(-1.5, 1.5), p.rr(5, 10), p.rr(3, 5), jit(p, [175, 30, 30 + (y - top) * 0.2], 10, 10, 6), 0.8);
    }
  }
  // Field.
  for (let i = 0; i < 3400 * d; i++) {
    const t = Math.pow(p.r(), 0.8);
    const y = horizon + t * (h - horizon) + 6;
    const col = mix([100, 42, 40], [65, 55, 58], p.r());
    brush(p, p.rr(-10, w + 10), y, p.rr(-0.9, 0.9) - Math.PI / 2 * p.r() * 0.3, p.rr(4, 12) * (0.5 + t * 1.2), p.rr(2, 4) * (0.5 + t), jit(p, col, 10, 10, 8), 0.7);
  }
  // A strolling figure with a parasol.
  if (p.r() < 0.6) {
    const fx = p.rr(w * 0.2, w * 0.8);
    const fy = horizon + (h - horizon) * p.rr(0.15, 0.35);
    const s = p.rr(26, 40);
    for (let j = 0; j < 40; j++) brush(p, fx + p.rr(-0.25, 0.25) * s, fy + p.rr(0, 1) * s, Math.PI / 2 + p.rr(-0.4, 0.4), p.rr(6, 12), p.rr(2, 4), jit(p, [220, 35, 25], 8, 8, 8), 0.9);
    brush(p, fx, fy - s * 0.12, 0, 5, 6, hsl(25, 40, 70), 0.95);
    for (let j = 0; j < 24; j++) {
      const a = Math.PI + (j / 23) * Math.PI;
      brush(p, fx + Math.cos(a) * s * 0.45, fy - s * 0.3 + Math.sin(a) * s * 0.25, a + Math.PI / 2, 7, 3.5, jit(p, [140, 30, 45], 10, 10, 8), 0.9);
    }
  }
  // Poppies.
  for (let i = 0; i < 620 * d; i++) {
    const t = Math.pow(p.r(), 0.6);
    const y = horizon + 10 + t * (h - horizon);
    const s = 1.5 + t * 6;
    brush(p, p.rr(0, w), y, p.rr(-1, 1), s, s * 0.9, jit(p, [356, 82, 48], 6, 8, 10), 0.92);
  }
}

function harbour(p: Painter) {
  const { w, h } = p;
  const horizon = h * p.rr(0.45, 0.55);
  const warm: HSL = [p.rr(15, 30), 80, 60];
  fillGradient(p, [
    [0, hsl(205, 25, 52)],
    [horizon / h, hsl(warm[0] + 10, 35, 62)],
    [1, hsl(210, 28, 40)],
  ]);
  const d = p.detail;
  for (let i = 0; i < 1600 * d; i++) {
    const y = p.rr(-10, h + 10);
    const dist = Math.abs(y - horizon) / h;
    const col = mix(warm, [208, 25, 50], Math.min(1, dist * 3 + p.rr(0, 0.4)));
    brush(p, p.rr(-10, w + 10), y, p.rr(-0.06, 0.06), p.rr(14, 40), p.rr(3, 6), jit(p, col, 8, 8, 8), 0.45);
  }
  // Faint masts and cranes.
  for (let i = 0; i < p.ri(6, 12); i++) {
    const x = p.rr(0, w);
    const top = horizon - p.rr(30, 120);
    for (let y = top; y < horizon; y += 8) brush(p, x + p.rr(-1, 1), y, Math.PI / 2, 10, 2, hsl(215, 20, 38), 0.35);
  }
  const sx = p.rr(0.45, 0.75) * w;
  const sy = p.rr(0.6, 0.85) * horizon;
  glow(p, sx, sy, w * 0.25, hsl(warm[0], 90, 65, 0.6));
  p.c.fillStyle = hsl(warm[0] - 5, 95, 58);
  p.c.beginPath();
  p.c.arc(sx, sy, w * 0.04, 0, Math.PI * 2);
  p.c.fill();
  // Reflection of the sun broken by ripples.
  for (let y = horizon + 4; y < h * 0.95; y += p.rr(5, 10)) {
    const spread = 6 + (y - horizon) * 0.08;
    brush(p, sx + p.rr(-spread, spread), y, p.rr(-0.05, 0.05), p.rr(10, 24), p.rr(2.5, 5), jit(p, [warm[0], 95, 58], 5, 5, 8), 0.85);
  }
  // Boats.
  for (let k = 0; k < p.ri(2, 3); k++) {
    const bx = p.rr(0.1, 0.9) * w;
    const by = horizon + (h - horizon) * p.rr(0.25, 0.8);
    const s = 18 + ((by - horizon) / (h - horizon)) * 30;
    for (let j = 0; j < 30; j++) brush(p, bx + p.rr(-1, 1) * s, by + p.rr(-0.1, 0.12) * s, p.rr(-0.1, 0.1), p.rr(8, 16), p.rr(3, 5), jit(p, [220, 40, 16], 8, 8, 6), 0.9);
    for (let j = 0; j < 6; j++) brush(p, bx + p.rr(-0.2, 0.2) * s, by - s * 0.25, Math.PI / 2, s * 0.4, 3, hsl(220, 40, 14), 0.9);
    for (let j = 0; j < 10; j++) brush(p, bx + p.rr(-1, 1) * s, by + s * 0.25 + p.rr(0, s * 0.3), 0, p.rr(8, 14), 2.5, hsl(220, 35, 22), 0.5);
  }
}
