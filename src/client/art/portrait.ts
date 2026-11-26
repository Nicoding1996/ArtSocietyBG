import { brush, fillGradient, finish, glow, hsl, impasto, jit, type HSL, type Painter } from './common';

export function portraitScene(p: Painter, scene: 'classic' | 'garden' | 'modern') {
  if (scene === 'classic') classic(p);
  else if (scene === 'garden') garden(p);
  else modern(p);
}

interface Sitter {
  /** Centre of the head and its height in pixels. */
  x: number;
  y: number;
  s: number;
  skin: HSL;
  hair: HSL;
  clothes: HSL;
  /** -1 lit from the left, 1 from the right. */
  light: -1 | 1;
  tilt: number;
  long: number;
}

/** Where to seat the sitter so wide, square and tall canvases all frame them well. */
function frameSitter(p: Painter, scale = 1): { x: number; y: number; s: number; side: number } {
  const { w, h } = p;
  const aspect = w / h;
  const side = aspect > 1.3 ? (p.r() < 0.5 ? -1 : 1) : 0;
  const x = side ? w * (0.5 + side * 0.2) : w * p.rr(0.45, 0.55);
  const s = Math.min(h * 0.27, w * (side ? 0.32 : 0.42)) * scale;
  const y = h * (aspect > 1.3 ? 0.36 : 0.32);
  return { x, y, s, side };
}

function shoulders(p: Painter, f: Sitter) {
  const { c, h } = p;
  const top = f.y + f.s * 0.62;
  const width = f.s * 1.75;
  c.fillStyle = hsl(f.clothes[0], f.clothes[1], f.clothes[2]);
  c.beginPath();
  c.moveTo(f.x - width * 0.22, top);
  c.quadraticCurveTo(f.x - width * 0.95, top + f.s * 0.12, f.x - width * 1.15, h + 4);
  c.lineTo(f.x + width * 1.15, h + 4);
  c.quadraticCurveTo(f.x + width * 0.95, top + f.s * 0.12, f.x + width * 0.22, top);
  c.closePath();
  c.fill();
  for (let i = 0; i < 520 * p.detail; i++) {
    const t = p.r();
    const y = top + t * (h - top + 10);
    const half = width * (0.3 + Math.min(1, t * 2.2) * 0.8);
    const x = f.x + p.rr(-1, 1) * half;
    const lit = (x - f.x) * -f.light > 0 ? 8 : -6;
    impasto(p, x, y, Math.PI / 2 + p.rr(-0.5, 0.5), p.rr(8, 16) * (f.s / 120), p.rr(3, 6) * (f.s / 120), jit(p, [f.clothes[0], f.clothes[1], f.clothes[2] + lit], 6, 8, 5), 0.8);
  }
}

function neck(p: Painter, f: Sitter) {
  const c = p.c;
  const nw = f.s * 0.17;
  const g = c.createLinearGradient(f.x - nw, 0, f.x + nw, 0);
  const lightSide = hsl(f.skin[0], f.skin[1], f.skin[2] + 4);
  const darkSide = hsl(f.skin[0], f.skin[1] + 5, f.skin[2] - 18);
  g.addColorStop(0, f.light < 0 ? lightSide : darkSide);
  g.addColorStop(1, f.light < 0 ? darkSide : lightSide);
  c.fillStyle = g;
  c.fillRect(f.x - nw, f.y + f.s * 0.3, nw * 2, f.s * (0.35 + f.long * 0.45));
}

/** Head with hair, eyes, nose and mouth, lit from one side. */
function head(p: Painter, f: Sitter, eyes: 'open' | 'almond') {
  const c = p.c;
  const rx = f.s * 0.32;
  const ry = f.s * 0.5 * (1 + f.long * 0.25);
  c.save();
  c.translate(f.x, f.y);
  c.rotate(f.tilt);
  // Hair behind the head.
  c.fillStyle = hsl(f.hair[0], f.hair[1], f.hair[2]);
  c.beginPath();
  c.ellipse(0, -ry * 0.12, rx * 1.18, ry * 1.08, 0, 0, Math.PI * 2);
  c.fill();
  const g = c.createRadialGradient(-f.light * rx * 0.45, -ry * 0.2, rx * 0.1, 0, 0, rx * 1.35);
  g.addColorStop(0, hsl(f.skin[0], f.skin[1] - 4, f.skin[2] + 12));
  g.addColorStop(0.55, hsl(f.skin[0], f.skin[1], f.skin[2]));
  g.addColorStop(1, hsl(f.skin[0] - 4, f.skin[1] + 6, f.skin[2] - 26));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  // Fringe and side locks.
  for (let i = 0; i < 90; i++) {
    const a = p.rr(Math.PI * 1.05, Math.PI * 1.95);
    const r = p.rr(0.85, 1.05);
    brush(p, Math.cos(a) * rx * r, Math.sin(a) * ry * r * 0.9, a + Math.PI / 2 + p.rr(-0.3, 0.3), f.s * 0.12, f.s * 0.035, jit(p, f.hair, 6, 8, 6), 0.9);
  }
  const ey = -ry * 0.08;
  const ex = rx * 0.42;
  for (const sgn of [-1, 1]) {
    const x = sgn * ex;
    c.fillStyle = eyes === 'almond' ? hsl(f.clothes[0] + 180, 25, 45) : hsl(30, 25, 92);
    c.beginPath();
    c.ellipse(x, ey, rx * 0.2, ry * 0.065, sgn * -0.05, 0, Math.PI * 2);
    c.fill();
    if (eyes === 'open') {
      c.fillStyle = hsl(25, 40, 22);
      c.beginPath();
      c.arc(x + f.light * rx * 0.02, ey, ry * 0.055, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.beginPath();
      c.arc(x - f.light * rx * 0.03, ey - ry * 0.02, ry * 0.016, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = hsl(f.hair[0], f.hair[1], Math.max(8, f.hair[2] - 5), 0.85);
    c.lineWidth = Math.max(1, f.s * 0.018);
    c.beginPath();
    c.moveTo(x - rx * 0.22, ey - ry * 0.16);
    c.quadraticCurveTo(x, ey - ry * 0.22, x + rx * 0.22, ey - ry * 0.15);
    c.stroke();
  }
  // Nose: a lit ridge and a shadow beneath.
  c.strokeStyle = hsl(f.skin[0], f.skin[1], f.skin[2] - 22, 0.7);
  c.lineWidth = Math.max(1, f.s * 0.02);
  c.beginPath();
  c.moveTo(f.light * -rx * 0.05, ey + ry * 0.05);
  c.quadraticCurveTo(f.light * rx * 0.1, ey + ry * 0.3, -f.light * rx * 0.02, ey + ry * 0.38);
  c.stroke();
  brush(p, 0, ey + ry * 0.42, 0, rx * 0.22, ry * 0.04, hsl(f.skin[0], f.skin[1], f.skin[2] - 25), 0.5);
  // Mouth and a touch of colour on the cheeks.
  c.fillStyle = hsl(355, 45, 42);
  c.beginPath();
  c.ellipse(0, ry * 0.58, rx * 0.2, ry * 0.045, 0, 0, Math.PI * 2);
  c.fill();
  for (const sgn of [-1, 1]) {
    c.fillStyle = hsl(5, 60, 62, 0.18);
    c.beginPath();
    c.ellipse(sgn * rx * 0.5, ry * 0.25, rx * 0.22, ry * 0.12, 0, 0, Math.PI * 2);
    c.fill();
  }
  // Shadow side of the face.
  const sh = c.createLinearGradient(-rx, 0, rx, 0);
  sh.addColorStop(f.light < 0 ? 0.55 : 0, 'rgba(40,20,20,0)');
  sh.addColorStop(f.light < 0 ? 1 : 0.45, 'rgba(40,20,20,0.28)');
  c.fillStyle = sh;
  c.beginPath();
  c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

const SKINS: HSL[] = [
  [24, 45, 70],
  [20, 40, 62],
  [28, 42, 52],
  [22, 38, 40],
  [30, 50, 75],
];

function classic(p: Painter) {
  const { c, w, h } = p;
  const bg: HSL = p.pick<HSL>([
    [30, 30, 18],
    [80, 15, 16],
    [12, 30, 16],
    [200, 12, 15],
  ]);
  fillGradient(p, [
    [0, hsl(bg[0], bg[1], bg[2] + 4)],
    [1, hsl(bg[0], bg[1], bg[2] - 8)],
  ]);
  for (let i = 0; i < 900 * p.detail; i++) brush(p, p.rr(0, w), p.rr(0, h), p.rr(0, Math.PI), p.rr(14, 30), p.rr(6, 12), jit(p, bg, 6, 6, 5), 0.25);
  const fr = frameSitter(p);
  glow(p, fr.x - fr.s * 0.4, fr.y, fr.s * 2.4, hsl(bg[0] + 10, 35, 45, 0.45));
  const f: Sitter = {
    x: fr.x,
    y: fr.y,
    s: fr.s,
    skin: p.pick(SKINS),
    hair: p.pick<HSL>([
      [25, 30, 14],
      [30, 25, 22],
      [35, 15, 60],
      [20, 45, 28],
    ]),
    clothes: p.pick<HSL>([
      [230, 15, 10],
      [350, 45, 22],
      [140, 25, 16],
      [30, 25, 14],
    ]),
    light: p.r() < 0.6 ? -1 : 1,
    tilt: p.rr(-0.06, 0.06),
    long: 0,
  };
  shoulders(p, f);
  // A white collar or a gold chain.
  if (p.r() < 0.5) {
    for (let i = 0; i < 80; i++) {
      const a = p.rr(0, Math.PI);
      brush(p, f.x + Math.cos(a) * f.s * 0.45, f.y + f.s * 0.72 + Math.sin(a) * f.s * 0.12, a, f.s * 0.08, f.s * 0.05, jit(p, [40, 20, 88], 4, 6, 6), 0.9);
    }
  } else {
    c.strokeStyle = hsl(44, 80, 55);
    c.lineWidth = Math.max(1.5, f.s * 0.03);
    c.beginPath();
    c.ellipse(f.x, f.y + f.s * 0.95, f.s * 0.42, f.s * 0.28, 0, 0.1, Math.PI - 0.1);
    c.stroke();
  }
  neck(p, f);
  head(p, f, 'open');
  if (p.r() < 0.4) {
    // A broad black hat.
    c.fillStyle = hsl(230, 10, 8);
    c.beginPath();
    c.ellipse(f.x, f.y - f.s * 0.42, f.s * 0.62, f.s * 0.14, f.tilt, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(f.x, f.y - f.s * 0.55, f.s * 0.34, f.s * 0.2, f.tilt, Math.PI, Math.PI * 2);
    c.fill();
  }
  if (fr.side) {
    // A table with a book and a candle on the open side.
    const tx = f.x - fr.side * w * 0.36;
    const ty = h * 0.72;
    c.fillStyle = hsl(25, 35, 14);
    c.fillRect(tx - w * 0.2, ty, w * 0.4, h);
    c.fillStyle = hsl(5, 40, 30);
    c.fillRect(tx - h * 0.12, ty - h * 0.05, h * 0.24, h * 0.05);
    c.fillStyle = hsl(40, 30, 85);
    c.fillRect(tx + h * 0.1, ty - h * 0.16, h * 0.025, h * 0.16);
    glow(p, tx + h * 0.112, ty - h * 0.18, h * 0.12, hsl(42, 95, 65, 0.6));
  }
  finish(p, { weave: 6, grain: 10, vignette: 0.45, warm: 0.45 });
}

function garden(p: Painter) {
  const { c, w, h } = p;
  fillGradient(p, [
    [0, hsl(200, 45, 78)],
    [0.35, hsl(110, 30, 50)],
    [1, hsl(95, 35, 34)],
  ]);
  for (let i = 0; i < 2600 * p.detail; i++) {
    const x = p.rr(-10, w + 10);
    const y = p.rr(-10, h + 10);
    const sky = y < h * 0.3 && p.r() < 0.35;
    const col: HSL = sky ? [200, 45, p.rr(75, 88)] : [p.rr(85, 140), p.rr(25, 50), p.rr(25, 55)];
    brush(p, x, y, p.rr(0, Math.PI), p.rr(5, 12), p.rr(3, 6), jit(p, col, 6, 8, 6), 0.7);
  }
  for (let i = 0; i < 380 * p.detail; i++) {
    const col = p.pick<HSL>([
      [340, 70, 78],
      [50, 85, 70],
      [0, 70, 60],
      [280, 30, 85],
      [40, 20, 95],
    ]);
    brush(p, p.rr(0, w), p.rr(h * 0.2, h), p.rr(0, Math.PI), p.rr(3, 6), p.rr(3, 5), jit(p, col, 6, 8, 6), 0.9);
  }
  const fr = frameSitter(p, 0.92);
  const f: Sitter = {
    x: fr.x,
    y: fr.y + fr.s * 0.15,
    s: fr.s,
    skin: p.pick(SKINS.slice(0, 3)),
    hair: p.pick<HSL>([
      [30, 40, 25],
      [20, 45, 35],
      [40, 45, 55],
    ]),
    clothes: p.pick<HSL>([
      [220, 25, 88],
      [200, 30, 82],
      [330, 30, 85],
    ]),
    light: p.r() < 0.5 ? -1 : 1,
    tilt: p.rr(-0.1, 0.1),
    long: 0,
  };
  if (p.r() < 0.55) {
    // A parasol behind her.
    const px = f.x + f.light * f.s * 0.6;
    const py = f.y - f.s * 0.55;
    c.fillStyle = hsl(p.pick([150, 40, 350]), 35, 72, 0.9);
    c.beginPath();
    c.ellipse(px, py, f.s * 1.05, f.s * 0.55, f.light * 0.3, Math.PI, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 160; i++) brush(p, px + p.rr(-1, 1) * f.s, py - p.rr(0, 0.45) * f.s, p.rr(0, Math.PI), f.s * 0.08, f.s * 0.04, 'rgba(255,255,240,0.5)', 0.4);
  }
  shoulders(p, f);
  // Dappled sunlight on the dress.
  for (let i = 0; i < 240 * p.detail; i++) {
    const x = f.x + p.rr(-1.6, 1.6) * f.s;
    const y = f.y + f.s * p.rr(0.8, 4);
    brush(p, x, y, p.rr(0, Math.PI), f.s * 0.06, f.s * 0.04, hsl(p.r() < 0.5 ? 50 : 230, 60, p.r() < 0.5 ? 95 : 70), 0.35);
  }
  neck(p, f);
  head(p, f, 'open');
  // Straw hat with a ribbon.
  const brim = p.pick<HSL>([
    [42, 55, 70],
    [38, 45, 62],
  ]);
  c.fillStyle = hsl(brim[0], brim[1], brim[2]);
  c.beginPath();
  c.ellipse(f.x, f.y - f.s * 0.38, f.s * 0.7, f.s * 0.17, f.tilt + f.light * 0.08, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(f.x, f.y - f.s * 0.48, f.s * 0.36, f.s * 0.2, f.tilt, Math.PI, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 60; i++) brush(p, f.x + p.rr(-0.65, 0.65) * f.s, f.y - f.s * p.rr(0.32, 0.6), p.rr(-0.4, 0.4), f.s * 0.1, f.s * 0.03, jit(p, brim, 6, 8, 8), 0.7);
  const rib = p.pick([350, 210, 140]);
  brush(p, f.x, f.y - f.s * 0.42, f.tilt, f.s * 0.7, f.s * 0.06, hsl(rib, 55, 45), 0.95);
  finish(p, { weave: 6, grain: 9, vignette: 0.2, warm: 0.3 });
}

function modern(p: Painter) {
  const { c, w, h } = p;
  const bg = p.pick<HSL>([
    [18, 55, 45],
    [36, 55, 55],
    [185, 25, 38],
    [210, 18, 50],
  ]);
  c.fillStyle = hsl(bg[0], bg[1], bg[2]);
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 900 * p.detail; i++) brush(p, p.rr(-10, w + 10), p.rr(-10, h + 10), p.rr(0, Math.PI), p.rr(16, 34), p.rr(6, 12), jit(p, bg, 5, 8, 6), 0.35);
  // A doorway behind the sitter.
  const dx = w * p.rr(0.05, 0.25);
  c.fillStyle = hsl(bg[0] + 10, bg[1] - 15, bg[2] - 20, 0.8);
  c.fillRect(dx, h * 0.08, w * 0.22, h);
  const fr = frameSitter(p, 0.9);
  const f: Sitter = {
    x: fr.x,
    y: fr.y - fr.s * 0.05,
    s: fr.s,
    skin: [p.rr(22, 30), 45, p.rr(62, 72)],
    hair: [p.rr(15, 30), 35, p.rr(12, 22)],
    clothes: p.pick<HSL>([
      [220, 40, 28],
      [350, 45, 32],
      [30, 20, 18],
      [160, 25, 30],
    ]),
    light: p.r() < 0.5 ? -1 : 1,
    tilt: p.rr(0.08, 0.2) * (p.r() < 0.5 ? -1 : 1),
    long: 1,
  };
  shoulders(p, f);
  neck(p, f);
  head(p, f, 'almond');
  // Dark contour lines, the painter's signature.
  c.strokeStyle = 'rgba(60,30,20,0.75)';
  c.lineWidth = Math.max(1.2, f.s * 0.02);
  c.save();
  c.translate(f.x, f.y);
  c.rotate(f.tilt);
  c.beginPath();
  c.ellipse(0, 0, f.s * 0.32, f.s * 0.5 * 1.25, 0, 0.15, Math.PI - 0.15);
  c.stroke();
  c.restore();
  finish(p, { weave: 7, grain: 12, vignette: 0.25, warm: 0.3 });
}
