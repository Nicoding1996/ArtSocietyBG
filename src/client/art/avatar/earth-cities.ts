import { hsl } from '../common';
import { type Trace, TAU, type Press, fill, line, within } from './print';
import { AZURITE, INK, JADE, MALACHITE, STONE, TILE, hall, mist, pine, range, roofShape, silkInk, smooth, stoneWall, tone, tree } from './ink';

/** Ba Sing Se and Omashu. */

/** Pale far mountains along the top, under a wash of sky. */
function farHills(p: Press, base: number, top: number) {
  range(p, base, top, -10, p.w + 10, AZURITE, 0.4);
  mist(p, base, (base - top) * 0.5);
}

/** The outer wall of Ba Sing Se running across the plain and over the hills, with farm fields in front. */
export function outerWall(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  farHills(p, h * 0.34, h * 0.08);
  range(p, h * 0.52, h * 0.24, -10, w + 10, MALACHITE, 0.6);
  mist(p, h * 0.5, h * 0.06);
  // The wall: tall at one side, shrinking as it runs off to the far side, with towers at intervals.
  const leftNear = p.r() < 0.5;
  const yTop = (t: number) => h * (0.4 + 0.08 * Math.sin(t * 3 + 1)) - (leftNear ? 1 - t : t) * h * 0.08;
  const height = (t: number) => h * (0.06 + 0.12 * (leftNear ? 1 - t : t));
  const N = 40;
  const face: Trace = (k) => {
    k.moveTo(-4, yTop(0));
    for (let i = 1; i <= N; i++) k.lineTo((w + 8) * (i / N) - 4, yTop(i / N));
    for (let i = N; i >= 0; i--) k.lineTo((w + 8) * (i / N) - 4, yTop(i / N) + height(i / N));
    k.closePath();
  };
  fill(p, tone(STONE), face);
  within(p, face, () => {
    for (let i = 0; i < N; i++) {
      const x = (w * i) / N;
      const t = i / N;
      const bh = height(t) / 4;
      for (let r = 1; r < 4; r++)
        line(p, INK(0.25), 1, (k) => {
          k.moveTo(x, yTop(t) + r * bh);
          k.lineTo(x + w / N, yTop(t + 1 / N) + r * bh);
        });
    }
    const g = p.c.createLinearGradient(0, h * 0.3, 0, h * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(40,50,40,0.25)');
    fill(p, g, (k) => k.rect(0, 0, w, h));
  });
  for (let i = 0; i <= N; i += 2) {
    const t = i / N;
    const x = (w * i) / N;
    const mw = Math.max(2, height(t) * 0.12);
    fill(p, tone(STONE, 1, -8), (k) => k.rect(x, yTop(t) - mw, mw, mw));
  }
  const towers = Math.max(3, Math.round((w / u) * 2.2));
  for (let i = 0; i < towers; i++) {
    const t = (i + 0.5) / towers;
    const x = w * t;
    const s = height(t) * 1.6;
    fill(p, tone(STONE, 1, -4), (k) => k.rect(x - s * 0.3, yTop(t) - s * 0.5, s * 0.6, s * 0.5 + height(t) * 0.8));
    roofShape(p, x, yTop(t) - s * 0.5, s * 0.9, s * 0.35);
  }
  // Farmland in front: field strips and trees.
  const fy = h * 0.62;
  for (let i = 0; i < 9; i++) {
    const y0 = fy + (h - fy) * (i / 9);
    const dy = (h - fy) / 9;
    fill(p, tone(i % 2 ? MALACHITE : JADE, 0.35 + (i / 9) * 0.3, 10), (k) => k.rect(-4, y0, w + 8, dy * 0.92));
  }
  for (let i = 0; i < 10; i++) tree(p, p.rr(0, w), p.rr(fy + u * 0.05, h), u * p.rr(0.06, 0.1));
  mist(p, fy, h * 0.04, 0.7);
}

/** The Earth King's palace in the Upper Ring: halls on terraces behind the inner wall, mist below. */
export function upperRing(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  farHills(p, h * 0.3, h * 0.06);
  const cx = w * p.rr(0.42, 0.58);
  const base = h * 0.6;
  // Terraces, white stairs up the middle, then the great hall and its wings.
  for (let i = 0; i < 3; i++) {
    const tw = w * (0.9 - i * 0.2);
    const ty = base - i * h * 0.06;
    fill(p, tone(STONE, 1, 24 - i * 3), (k) => k.rect(cx - tw / 2, ty, tw, h * 0.06));
    line(p, INK(0.4), 1, (k) => {
      k.moveTo(cx - tw / 2, ty);
      k.lineTo(cx + tw / 2, ty);
    });
  }
  fill(p, silkInk(0.9), (k) => {
    k.moveTo(cx - u * 0.05, base - h * 0.12);
    k.lineTo(cx + u * 0.05, base - h * 0.12);
    k.lineTo(cx + u * 0.12, base + h * 0.06);
    k.lineTo(cx - u * 0.12, base + h * 0.06);
    k.closePath();
  });
  for (const sgn of [-1, 1]) hall(p, cx + sgn * w * 0.28, base - h * 0.06, u * 0.3, u * 0.24, 1);
  hall(p, cx, base - h * 0.12, u * 0.55, u * 0.42, 2, hsl(48, 50, 48));
  // The inner wall in front, and the rooftops of the ring below in mist.
  stoneWall(p, -4, w + 4, base + h * 0.08, h * 0.08);
  for (let i = 0; i < 14; i++) {
    const rx = p.rr(0, w);
    const ry = base + h * p.rr(0.24, 0.4);
    roofShape(p, rx, ry, u * p.rr(0.14, 0.22), u * p.rr(0.04, 0.06), TILE);
  }
  mist(p, base + h * 0.3, h * 0.08);
  for (let i = 0; i < 6; i++) tree(p, p.rr(0, w), base + h * p.rr(0.05, 0.12), u * p.rr(0.06, 0.09), MALACHITE);
}

/** The stone train running on its viaduct over the lower ring towards the inner wall. */
export function monorail(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  farHills(p, h * 0.22, h * 0.04);
  // The inner wall far off with a gate.
  stoneWall(p, -4, w + 4, h * 0.3, h * 0.08);
  fill(p, INK(0.7), (k) => {
    k.moveTo(w * 0.62, h * 0.38);
    k.lineTo(w * 0.62, h * 0.34);
    k.arc(w * 0.66, h * 0.34, w * 0.04, Math.PI, 0);
    k.lineTo(w * 0.7, h * 0.38);
    k.closePath();
  });
  mist(p, h * 0.42, h * 0.05);
  // Rooftops of the lower ring in rows, smaller and paler as they go back.
  for (let row = 0; row < 7; row++) {
    const y = h * (0.46 + row * 0.08);
    const s = u * (0.1 + row * 0.035);
    for (let x = -s * p.r(); x < w + s; x += s * p.rr(0.9, 1.2)) {
      fill(p, tone(STONE, 0.9, 18 - row * 2), (k) => k.rect(x - s * 0.4, y - s * 0.1, s * 0.8, s * 0.5));
      roofShape(p, x, y - s * 0.1, s, s * 0.3, row % 2 ? TILE : hsl(150, 24, 40));
    }
    if (row === 2) mist(p, y + s * 0.2, h * 0.03, 0.6);
  }
  // The viaduct: pillars and a rail crossing on a slant, the train on it.
  const y0 = h * 0.4;
  const y1 = h * 0.62;
  const railY = (x: number) => y0 + ((y1 - y0) * x) / w;
  for (let x = w * 0.05; x < w; x += w * 0.22) {
    const px = x;
    fill(p, tone(STONE, 1, 6), (k) => k.rect(px - u * 0.02, railY(px), u * 0.04, h - railY(px)));
  }
  line(p, INK(0.85), Math.max(2, u * 0.015), (k) => {
    k.moveTo(-4, railY(-4));
    k.lineTo(w + 4, railY(w + 4));
  });
  const tx = w * p.rr(0.3, 0.6);
  const ang = Math.atan2(y1 - y0, w);
  const c = p.c;
  c.save();
  c.translate(tx, railY(tx));
  c.rotate(ang);
  const car: Trace = (k) => k.roundRect(-u * 0.16, -u * 0.12, u * 0.32, u * 0.11, u * 0.02);
  fill(p, tone(STONE, 1, -8), car);
  line(p, INK(0.8), 1.4, car);
  for (let i = 0; i < 4; i++) fill(p, INK(0.75), (k) => k.rect(-u * 0.13 + i * u * 0.07, -u * 0.1, u * 0.04, u * 0.04));
  // An earthbender at the back, pushing the car along.
  fill(p, hsl(140, 30, 30), (k) => {
    k.moveTo(-u * 0.22, -u * 0.01);
    k.lineTo(-u * 0.2, -u * 0.11);
    k.lineTo(-u * 0.17, -u * 0.01);
    k.closePath();
    k.moveTo(-u * 0.18, -u * 0.13);
    k.arc(-u * 0.195, -u * 0.13, u * 0.015, 0, TAU);
  });
  c.restore();
}

/** Omashu: a city stacked up a mountain, the long bridge across the gorge to its gate. */
export function omashu(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  farHills(p, h * 0.3, h * 0.05);
  const cx = w * p.rr(0.45, 0.55);
  const mw = w * 0.42;
  const top = h * 0.12;
  const foot = h * 0.66;
  const mount: Trace = smooth([
    [cx - mw * 1.3, foot],
    [cx - mw * 0.9, foot - (foot - top) * 0.3],
    [cx - mw * 0.55, top + (foot - top) * 0.25],
    [cx - mw * 0.25, top],
    [cx + mw * 0.25, top],
    [cx + mw * 0.55, top + (foot - top) * 0.25],
    [cx + mw * 0.9, foot - (foot - top) * 0.3],
    [cx + mw * 1.3, foot],
  ]);
  const g = p.c.createLinearGradient(0, top, 0, foot);
  g.addColorStop(0, tone(STONE, 1, 4));
  g.addColorStop(1, tone(JADE, 0.9, 6));
  fill(p, g, mount);
  // The city: rows of buildings climbing the mountain, the palace on top.
  within(p, mount, () => {
    for (let row = 0; row < 9; row++) {
      const y = top + (foot - top) * (0.12 + row * 0.1);
      const half = mw * (0.3 + row * 0.11);
      const s = u * (0.06 + row * 0.006);
      for (let x = cx - half; x < cx + half; x += s * p.rr(1.1, 1.5)) {
        const bx = x;
        fill(p, tone(STONE, 1, 16 + (row % 3) * 3), (k) => k.rect(bx - s * 0.4, y - s * 0.55, s * 0.8, s * 0.7));
        fill(p, INK(0.6), (k) => k.rect(bx - s * 0.1, y - s * 0.3, s * 0.2, s * 0.3));
        roofShape(p, bx, y - s * 0.55, s, s * 0.32, row % 2 ? TILE : hsl(150, 26, 42));
      }
    }
  });
  hall(p, cx, top + (foot - top) * 0.1, mw * 0.5, mw * 0.38, 2);
  // The mail chutes winding down the slopes.
  for (const sgn of [-1, 1])
    line(p, tone(STONE, 0.9, -12), Math.max(1.4, u * 0.008), (k) => {
      k.moveTo(cx + sgn * mw * 0.15, top + (foot - top) * 0.15);
      k.bezierCurveTo(cx + sgn * mw * 0.7, top + (foot - top) * 0.3, cx - sgn * mw * 0.2, top + (foot - top) * 0.6, cx + sgn * mw * 0.8, foot - (foot - top) * 0.05);
    });
  // The gorge and the bridge.
  mist(p, foot + h * 0.03, h * 0.05);
  const by = foot + h * 0.06;
  fill(p, tone(STONE, 1, 10), (k) => {
    k.moveTo(cx - u * 0.06, by);
    k.lineTo(cx + u * 0.06, by);
    k.lineTo(cx + u * 0.18, h + 4);
    k.lineTo(cx - u * 0.18, h + 4);
    k.closePath();
  });
  for (const sgn of [-1, 1])
    range(p, h + 10, by + h * 0.04, sgn < 0 ? -10 : cx + u * 0.22, sgn < 0 ? cx - u * 0.22 : w + 10, JADE, 0.7);
  for (let i = 0; i < 3; i++) pine(p, p.r() < 0.5 ? p.rr(0, cx - u * 0.25) : p.rr(cx + u * 0.25, w), h * p.rr(0.9, 1), u * p.rr(0.12, 0.18));
}

/** The mail chutes of Omashu: stone channels twisting down between the houses, a cart racing down. */
export function mailChutes(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  fill(p, tone(STONE, 0.25, 20), (k) => k.rect(-4, -4, w + 8, h + 8));
  // Houses stacked on both sides, up the slope.
  for (let row = 0; row < 8; row++) {
    const y = h * (0.12 + row * 0.12);
    const s = u * (0.16 + row * 0.02);
    for (const sgn of [-1, 1]) {
      const bx = w / 2 + sgn * (w * 0.32 + p.rr(-0.05, 0.08) * w);
      fill(p, tone(STONE, 1, 18 - (row % 2) * 4), (k) => k.rect(bx - s * 0.45, y - s * 0.5, s * 0.9, s * 0.75));
      fill(p, INK(0.6), (k) => k.rect(bx - s * 0.12, y - s * 0.25, s * 0.24, s * 0.3));
      roofShape(p, bx, y - s * 0.5, s * 1.1, s * 0.3, row % 2 ? TILE : hsl(150, 26, 42));
    }
  }
  // The chute: a channel zig-zagging from top to bottom, drawn as a thick band with a lit inner edge.
  const pts: [number, number][] = [];
  for (let i = 0; i <= 5; i++) pts.push([w * (i % 2 ? 0.66 : 0.34) + p.rr(-0.04, 0.04) * w, h * (0.02 + i * 0.2)]);
  const chute: Trace = (k) => {
    k.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      k.bezierCurveTo(x0, y0 + (y1 - y0) * 0.6, x1, y1 - (y1 - y0) * 0.6, x1, y1);
    }
  };
  line(p, INK(0.85), u * 0.075, chute);
  line(p, tone(STONE, 1, 14), u * 0.055, chute);
  line(p, tone(STONE, 1, -6), u * 0.015, chute);
  // The cart, about a third of the way down, with three passengers and speed lines.
  const t = p.rr(0.3, 0.6);
  const seg = Math.min(4, Math.floor(t * 5));
  const f = t * 5 - seg;
  const [ax, ay] = pts[seg];
  const [bx2, by2] = pts[seg + 1];
  const cxp = ax + (bx2 - ax) * (3 * f * f - 2 * f * f * f);
  const cyp = ay + (by2 - ay) * f;
  fill(p, hsl(26, 40, 32), (k) => k.roundRect(cxp - u * 0.07, cyp - u * 0.03, u * 0.14, u * 0.05, u * 0.01));
  for (let i = 0; i < 3; i++) {
    const hx = cxp - u * 0.045 + i * u * 0.045;
    fill(p, [hsl(200, 40, 40), hsl(208, 40, 30), hsl(36, 70, 52)][i], (k) => k.rect(hx - u * 0.014, cyp - u * 0.07, u * 0.028, u * 0.045));
    fill(p, hsl(28, 40, 56), (k) => k.arc(hx, cyp - u * 0.085, u * 0.016, 0, TAU));
  }
  for (let i = 0; i < 4; i++)
    line(p, INK(0.5), 1.2, (k) => {
      k.moveTo(cxp - u * 0.02 + i * u * 0.015, cyp - u * 0.12 - i * u * 0.02);
      k.lineTo(cxp - u * 0.04 + i * u * 0.015, cyp - u * 0.2 - i * u * 0.02);
    });
  mist(p, h * 0.98, h * 0.06, 0.7);
}

/** The Cave of Two Lovers: crystals glowing green in the dark round the lovers' tomb. */
export function lovers(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  fill(p, hsl(160, 20, 10), (k) => k.rect(-4, -4, w + 8, h + 8));
  const cx = w * p.rr(0.42, 0.58);
  const cy = h * 0.62;
  const glow = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
  glow.addColorStop(0, 'rgba(120,230,160,0.55)');
  glow.addColorStop(0.5, 'rgba(60,140,100,0.25)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  fill(p, glow, (k) => k.rect(-4, -4, w + 8, h + 8));
  // Crystals hanging from the roof and growing from the walls.
  for (let i = 0; i < 40 * p.detail; i++) {
    const fromTop = p.r() < 0.55;
    const x = p.rr(0, w);
    const y = fromTop ? p.rr(-0.02, 0.12) * h : p.rr(0.75, 1.02) * h;
    const len = u * p.rr(0.06, 0.2);
    const wd = len * p.rr(0.15, 0.3);
    const a = (fromTop ? Math.PI / 2 : -Math.PI / 2) + p.rr(-0.4, 0.4);
    const tx = x + Math.cos(a) * len;
    const ty = y + Math.sin(a) * len;
    const nx = -Math.sin(a) * wd;
    const ny = Math.cos(a) * wd;
    fill(p, hsl(p.rr(130, 165), 60, p.rr(50, 72), 0.9), (k) => {
      k.moveTo(x - nx, y - ny);
      k.lineTo(tx, ty);
      k.lineTo(x + nx, y + ny);
      k.closePath();
    });
    line(p, 'rgba(220,255,230,0.7)', 1, (k) => {
      k.moveTo(x, y);
      k.lineTo(tx, ty);
    });
  }
  // The tomb: a stone block with the two lovers standing on it, their faces together.
  const tw = Math.min(w * 0.4, u * 0.5);
  fill(p, tone(STONE, 1, -14), (k) => k.rect(cx - tw / 2, cy, tw, h * 0.12));
  line(p, INK(0.7), 1.2, (k) => k.rect(cx - tw / 2, cy, tw, h * 0.12));
  for (const sgn of [-1, 1]) {
    const fx = cx + sgn * tw * 0.12;
    const fs = tw * 0.5;
    fill(p, tone(STONE, 1, 6), (k) => {
      k.moveTo(fx - sgn * fs * 0.18, cy);
      k.quadraticCurveTo(fx - sgn * fs * 0.22, cy - fs * 0.6, fx - sgn * fs * 0.02, cy - fs * 0.7);
      k.lineTo(fx + sgn * fs * 0.06, cy - fs * 0.7);
      k.quadraticCurveTo(fx + sgn * fs * 0.12, cy - fs * 0.4, fx + sgn * fs * 0.1, cy);
      k.closePath();
      k.moveTo(fx + sgn * fs * 0.02 + fs * 0.09, cy - fs * 0.82);
      k.arc(fx + sgn * fs * 0.02, cy - fs * 0.82, fs * 0.09, 0, TAU);
    });
  }
  fill(p, 'rgba(160,255,190,0.4)', (k) => k.arc(cx, cy - tw * 0.42, tw * 0.08, 0, TAU));
  line(p, INK(0.5), 1, (k) => {
    k.moveTo(cx - tw * 0.4, cy + h * 0.06);
    k.lineTo(cx + tw * 0.4, cy + h * 0.06);
  });
  // Green light pooling on the cave floor.
  fill(p, tone(JADE, 0.3), (k) => k.ellipse(cx, h * 0.95, w * 0.5, h * 0.06, 0, 0, TAU));
}
