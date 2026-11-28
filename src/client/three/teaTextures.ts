import { canvas, woodTexture } from './textures';

// Canvas textures for the Avatar theme's tea house: floor, rug, walls, the painted frieze, the paper lanterns,
// hanging scrolls, a Pai Sho table and the night over Ba Sing Se seen through the round windows.

const TAU = Math.PI * 2;
const GOLD = '#d4ad5c';

type Rnd = () => number;

/** The same sequence every time, so the room looks the same at every table. */
function seeded(seed: number): Rnd {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Fine grain: every pixel a little lighter or darker. Per pixel, so a tiling texture stays seamless. */
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (Math.random() - 0.5) * amount;
    d[i] += v;
    d[i + 1] += v;
    d[i + 2] += v;
  }
  ctx.putImageData(img, 0, 0);
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** Long honey-coloured floorboards with staggered joints. Tiles in both directions. */
export function plankTexture(): HTMLCanvasElement {
  const S = 1024;
  const T = 64;
  const [c, ctx] = canvas(S);
  const wood = woodTexture(512, '#4a2a14', '#93623a', 21, 12);
  const rnd = seeded(23);
  for (let r = 0; r < S / T; r++) {
    // Board lengths that add up to exactly one texture width, so the row wraps.
    const lens: number[] = [];
    let sum = 0;
    while (sum < S) {
      const len = 300 + rnd() * 260;
      lens.push(len);
      sum += len;
    }
    lens[lens.length - 1] -= sum - S;
    if (lens.length > 1 && lens[lens.length - 1] < 180) lens[lens.length - 2] += lens.pop()!;
    let x = -rnd() * 300;
    for (const len of lens) {
      const sx = rnd() * (512 - len / 2);
      const sy = rnd() * (512 - T / 2);
      const tint = rnd();
      for (const off of [0, S]) {
        ctx.drawImage(wood, sx, sy, len / 2, T / 2, x + off, r * T, len, T);
        // Each board a shade apart, some warmer and some darker.
        ctx.fillStyle = tint < 0.6 ? `rgba(50,20,4,${0.04 + tint * 0.3})` : `rgba(150,96,36,${(tint - 0.6) * 0.3})`;
        ctx.fillRect(x + off, r * T, len, T);
        ctx.strokeStyle = 'rgba(18,8,2,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + off + 1, r * T + 1, len - 2, T - 2);
        // Two pegs at the end of every board.
        ctx.fillStyle = 'rgba(30,14,4,0.7)';
        for (const py of [0.3, 0.7]) {
          ctx.beginPath();
          ctx.arc(x + off + 9, r * T + T * py, 2.4, 0, TAU);
          ctx.fill();
        }
      }
      x += len;
    }
  }
  return c;
}

/** Five pointed petals and a gold heart: jasmine, for the rug. */
function blossom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, petal = '#f3ead3') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = petal;
  for (let k = 0; k < 5; k++) {
    ctx.rotate(TAU / 5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.45, -r * 0.42, 0, -r);
    ctx.quadraticCurveTo(-r * 0.45, -r * 0.42, 0, 0);
    ctx.fill();
  }
  disc(ctx, 0, 0, r * 0.2, '#dcb258');
  ctx.restore();
}

/** The round rug under the table: a key fret border and a ring of jasmine on jade. Only the outer rings show past the table. */
export function teaRugTexture(): HTMLCanvasElement {
  const S = 1024;
  const [c, ctx] = canvas(S);
  const o = S / 2;
  disc(ctx, o, o, 512, '#143222');
  disc(ctx, o, o, 496, GOLD);
  disc(ctx, o, o, 489, '#1a3f2c');
  // A square spiral fret all the way round.
  const fret = [
    [0.1, 0.12],
    [0.9, 0.12],
    [0.9, 0.88],
    [0.1, 0.88],
    [0.1, 0.34],
    [0.68, 0.34],
    [0.68, 0.66],
    [0.32, 0.66],
    [0.32, 0.5],
    [0.5, 0.5],
  ];
  const units = 72;
  const r0 = 447;
  const r1 = 484;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4.5;
  ctx.lineJoin = 'miter';
  for (let i = 0; i < units; i++) {
    const a0 = (i / units) * TAU;
    ctx.beginPath();
    fret.forEach(([u, v], k) => {
      const a = a0 + (u * TAU) / units;
      const r = r0 + v * (r1 - r0);
      if (k) ctx.lineTo(o + Math.cos(a) * r, o + Math.sin(a) * r);
      else ctx.moveTo(o + Math.cos(a) * r, o + Math.sin(a) * r);
    });
    ctx.stroke();
  }
  disc(ctx, o, o, 441, GOLD);
  disc(ctx, o, o, 435, '#275a40');
  // Jasmine, with a pair of leaves between each two flowers.
  const ring = 403;
  const n = 32;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const b = a + TAU / n / 2;
    ctx.save();
    ctx.translate(o + Math.cos(b) * ring, o + Math.sin(b) * ring);
    ctx.rotate(b);
    ctx.fillStyle = '#4f8f62';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(0, s * 11, 4.5, 11, s * 0.45, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    blossom(ctx, o + Math.cos(a) * ring, o + Math.sin(a) * ring, 22, a);
  }
  disc(ctx, o, o, 368, GOLD);
  disc(ctx, o, o, 362, '#1a3f2c');
  // Under the table, glimpsed at most: gold dots on jade, and a white lotus in the middle.
  ctx.fillStyle = 'rgba(212,173,92,0.5)';
  for (let r = 60; r < 340; r += 40) {
    const k = Math.round((TAU * r) / 46);
    for (let i = 0; i < k; i++) disc(ctx, o + Math.cos((i / k) * TAU) * r, o + Math.sin((i / k) * TAU) * r, 3, 'rgba(212,173,92,0.5)');
  }
  disc(ctx, o, o, 150, GOLD);
  disc(ctx, o, o, 144, '#1a3f2c');
  for (const [count, len, rot, color] of [
    [8, 128, 0, '#e9e1cf'],
    [8, 96, TAU / 16, '#f7f2e8'],
  ] as [number, number, number, string][]) {
    for (let k = 0; k < count; k++) {
      ctx.save();
      ctx.translate(o, o);
      ctx.rotate(rot + (k / count) * TAU);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len * 0.36, -len * 0.5, 0, -len);
      ctx.quadraticCurveTo(-len * 0.36, -len * 0.5, 0, 0);
      ctx.fill();
      ctx.restore();
    }
  }
  disc(ctx, o, o, 24, GOLD);
  grain(ctx, S, S, 16);
  return c;
}

/** Jade silk for the walls, with a quiet pattern of interlocking circles and a gold dot where four of them meet. */
export function teaWallTexture(): HTMLCanvasElement {
  const S = 512;
  const [c, ctx] = canvas(S);
  ctx.fillStyle = '#1d4033';
  ctx.fillRect(0, 0, S, S);
  const cell = S / 4;
  ctx.strokeStyle = '#285646';
  ctx.lineWidth = 3;
  for (let y = 0; y <= 4; y++) {
    for (let x = 0; x <= 4; x++) {
      ctx.beginPath();
      ctx.arc(x * cell, y * cell, cell / Math.SQRT2, 0, TAU);
      ctx.stroke();
    }
  }
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) disc(ctx, (x + 0.5) * cell, (y + 0.5) * cell, 3.4, 'rgba(212,173,92,0.55)');
  grain(ctx, S, S, 10);
  return c;
}

/** The wainscot: dark wooden panels, each filled with a carved lattice. */
export function latticeTexture(): HTMLCanvasElement {
  const [c, ctx] = canvas(1024, 256);
  const wood = woodTexture(256, '#2a120a', '#5e301a', 33, 16);
  ctx.drawImage(wood, 0, 0, 1024, 256);
  ctx.drawImage(wood, 512, 0, 512, 256);
  const bar = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#5a2c17';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,214,160,0.2)';
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x + w - 2, y, 2, h);
  };
  const pw = 1024 / 4;
  for (let i = 0; i < 4; i++) {
    const x = i * pw + 26;
    const y = 34;
    const w = pw - 52;
    const h = 256 - 68;
    ctx.fillStyle = '#100703';
    ctx.fillRect(x, y, w, h);
    const t = 7;
    bar(x, y, w, t);
    bar(x, y + h - t, w, t);
    bar(x, y, t, h);
    bar(x + w - t, y, t, h);
    const cols = 5;
    const rows = 3;
    for (let k = 1; k < cols; k++) bar(x + (w * k) / cols - t / 2, y, t, h);
    for (let k = 1; k < rows; k++) bar(x, y + (h * k) / rows - t / 2, w, t);
    // A smaller square in every opening, joined to the bars at its corners: a window lattice.
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        const ox = x + (w * cx) / cols;
        const oy = y + (h * cy) / rows;
        const ow = w / cols;
        const oh = h / rows;
        const ix = ox + ow * 0.3;
        const iy = oy + oh * 0.3;
        const iw = ow * 0.4;
        const ih = oh * 0.4;
        bar(ix, iy, iw, 4);
        bar(ix, iy + ih - 4, iw, 4);
        bar(ix, iy, 4, ih);
        bar(ix + iw - 4, iy, 4, ih);
      }
    }
    ctx.strokeStyle = 'rgba(212,173,92,0.42)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 7, y - 7, w + 14, h + 14);
  }
  return c;
}

/** The coffered ceiling: dark beams in a grid, each sunken panel painted jade with a gold ring and a flower. */
export function ceilingTexture(): HTMLCanvasElement {
  const S = 512;
  const [c, ctx] = canvas(S);
  ctx.drawImage(woodTexture(256, '#1c0d07', '#422314', 51, 14), 0, 0, S, S);
  const cell = S / 2;
  const beam = 36;
  for (let gy = 0; gy < 2; gy++) {
    for (let gx = 0; gx < 2; gx++) {
      const x = gx * cell + beam / 2;
      const y = gy * cell + beam / 2;
      const w = cell - beam;
      ctx.fillStyle = '#0c0603';
      ctx.fillRect(x, y, w, w);
      ctx.fillStyle = '#21503c';
      ctx.fillRect(x + 10, y + 10, w - 20, w - 20);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 18, y + 18, w - 36, w - 36);
      const cx = x + w / 2;
      const cy = y + w / 2;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.3, 0, TAU);
      ctx.stroke();
      for (let k = 0; k < 8; k++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((k / 8) * TAU);
        ctx.fillStyle = '#e9dfc4';
        ctx.beginPath();
        ctx.ellipse(0, -w * 0.15, w * 0.045, w * 0.12, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      disc(ctx, cx, cy, w * 0.06, GOLD);
      // Gold corners in every panel.
      ctx.fillStyle = GOLD;
      for (const [sx, sy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        const px = x + 18 + sx * (w - 36);
        const py = y + 18 + sy * (w - 36);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + (sx ? -26 : 26), py);
        ctx.lineTo(px, py + (sy ? -26 : 26));
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  grain(ctx, S, S, 8);
  return c;
}

/** The painted frieze along the top of the walls: rosettes and a long blue cartouche on green, between gold and red bands. */
export function beamTexture(): HTMLCanvasElement {
  const W = 1024;
  const H = 128;
  const [c, ctx] = canvas(W, H);
  const y = H / 2;
  ctx.fillStyle = '#1f513c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#6a1f12';
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 10, W, 10);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 10, W, 4);
  ctx.fillRect(0, H - 14, W, 4);
  for (const x of [112, W - 112]) {
    for (const [r, col] of [
      [42, GOLD],
      [38, '#2f5f8a'],
      [29, '#e9e2cc'],
      [25, '#2a6b50'],
      [16, GOLD],
      [12, '#2f5f8a'],
      [5, GOLD],
    ] as [number, string][])
      disc(ctx, x, y, r, col);
    // Petals on the blue ring.
    ctx.fillStyle = '#e9e2cc';
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 33.5, y + Math.sin(a) * 33.5, 4, 2.2, a, 0, TAU);
      ctx.fill();
    }
  }
  // The cartouche: a long hexagon with pointed ends.
  const x0 = 206;
  const x1 = W - 206;
  const h = 40;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + h, y - h);
    ctx.lineTo(x1 - h, y - h);
    ctx.lineTo(x1, y);
    ctx.lineTo(x1 - h, y + h);
    ctx.lineTo(x0 + h, y + h);
    ctx.closePath();
  };
  shape();
  ctx.fillStyle = '#1c3d60';
  ctx.fill();
  ctx.save();
  shape();
  ctx.clip();
  // Rolling clouds inside it.
  ctx.strokeStyle = 'rgba(205,222,236,0.55)';
  ctx.lineWidth = 3;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 4) {
      const yy = y + k * 15 + Math.sin((x - x0) / 26 + k) * 5;
      if (x === x0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  shape();
  ctx.lineWidth = 5;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  grain(ctx, W, H, 8);
  return c;
}

/** Paper for the lanterns: warm in the middle, darker towards the caps, with the bamboo ribs showing. */
export function lanternTexture(): HTMLCanvasElement {
  const W = 256;
  const H = 128;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#c8742c');
  g.addColorStop(0.5, '#ffe2a4');
  g.addColorStop(1, '#c8742c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(96,44,12,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const x = ((i + 0.5) * W) / 12;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(150,40,18,0.55)';
  ctx.fillRect(0, 12, W, 5);
  ctx.fillRect(0, H - 17, W, 5);
  return c;
}

// ---------- hanging scrolls ----------

function inkMountains(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rnd: Rnd) {
  // Three ranges of tall peaks, paler with distance, each fading into mist at its foot.
  const layers = [
    { base: 0.42, tone: '70,72,70', a: 0.38, peaks: 3, lo: 0.16, hi: 0.28 },
    { base: 0.63, tone: '46,48,46', a: 0.62, peaks: 3, lo: 0.2, hi: 0.34 },
    { base: 0.86, tone: '22,24,22', a: 0.92, peaks: 2, lo: 0.24, hi: 0.4 },
  ];
  for (const L of layers) {
    const base = y + h * L.base;
    for (let k = 0; k < L.peaks; k++) {
      const cx = x + w * ((k + 0.2 + rnd() * 0.6) / L.peaks);
      const ph = h * (L.lo + rnd() * (L.hi - L.lo));
      const pw = w * (0.24 + rnd() * 0.16);
      const top = base - ph;
      const g = ctx.createLinearGradient(0, top, 0, base);
      g.addColorStop(0, `rgba(${L.tone},${L.a})`);
      g.addColorStop(0.65, `rgba(${L.tone},${L.a * 0.45})`);
      g.addColorStop(1, `rgba(${L.tone},0)`);
      ctx.fillStyle = g;
      const tip = cx + (rnd() - 0.5) * pw * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx - pw / 2, base);
      ctx.bezierCurveTo(cx - pw * 0.46, top + ph * 0.3, cx - pw * 0.3, top, tip, top);
      ctx.bezierCurveTo(cx + pw * 0.3, top, cx + pw * 0.44, top + ph * 0.38, cx + pw / 2, base);
      ctx.closePath();
      ctx.fill();
      // A few texture strokes down the face of the peak.
      ctx.strokeStyle = `rgba(${L.tone},${L.a * 0.7})`;
      ctx.lineWidth = 1.3;
      for (let s = 0; s < 4; s++) {
        const sx = cx + (rnd() - 0.5) * pw * 0.5;
        const sy = top + ph * (0.12 + rnd() * 0.35);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + (rnd() - 0.5) * 8, sy + 18, sx + (rnd() - 0.5) * 6, sy + 36 + rnd() * 30);
        ctx.stroke();
      }
    }
  }
  // The near bank, and a pine leaning out from it.
  ctx.fillStyle = 'rgba(28,28,26,0.75)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.25, y + h, w * 0.45, h * 0.06, 0, Math.PI, TAU);
  ctx.fill();
  const px = x + w * 0.3;
  const py = y + h * 0.95;
  const s = h * 0.22;
  ctx.strokeStyle = 'rgba(24,20,16,0.92)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.bezierCurveTo(px + s * 0.25, py - s * 0.35, px - s * 0.15, py - s * 0.6, px + s * 0.2, py - s);
  ctx.stroke();
  for (const [dx, dy, r] of [
    [-0.12, -0.5, 0.26],
    [0.32, -0.74, 0.24],
    [0.16, -1.0, 0.2],
  ]) {
    const cx = px + dx * s;
    const cy = py + dy * s;
    const rr = r * s;
    ctx.fillStyle = 'rgba(30,38,30,0.8)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr, rr * 0.34, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(18,24,18,0.9)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 16; k++) {
      const a = rnd() * TAU;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * rr * 1.05, cy + Math.sin(a) * rr * 0.4);
      ctx.stroke();
    }
  }
}

function bambooLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number, alpha: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = `rgba(26,38,28,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.15, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.08, 0, 0);
  ctx.fill();
  ctx.restore();
}

function inkBamboo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rnd: Rnd) {
  for (let k = 0; k < 3; k++) {
    const bx = x + w * (0.25 + k * 0.25) + (rnd() - 0.5) * 18;
    const lean = (rnd() - 0.5) * 26;
    const alpha = 0.95 - k * 0.2;
    const at = (yy: number) => bx + lean * ((y + h - yy) / h);
    ctx.strokeStyle = `rgba(28,40,30,${alpha})`;
    ctx.lineWidth = 10 - k * 2.2;
    ctx.lineCap = 'butt';
    let sy = y + h;
    while (sy > y + 30) {
      const seg = 48 + rnd() * 30;
      ctx.beginPath();
      ctx.moveTo(at(sy - 3), sy - 3);
      ctx.lineTo(at(sy - seg + 3), sy - seg + 3);
      ctx.stroke();
      sy -= seg;
    }
    for (let l = 0; l < 7; l++) {
      const ly = y + h * (0.08 + rnd() * 0.62);
      const side = rnd() < 0.5 ? -1 : 1;
      bambooLeaf(ctx, at(ly), ly, 36 + rnd() * 22, side < 0 ? Math.PI - 0.3 - rnd() * 0.9 : 0.3 + rnd() * 0.9, alpha);
    }
  }
}

function inkJasmine(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rnd: Rnd) {
  // A branch reaching in from the right, with leaves and white flowers along it.
  const pts: [number, number][] = [
    [x + w * 1.05, y + h * 0.22],
    [x + w * 0.62, y + h * 0.34],
    [x + w * 0.42, y + h * 0.55],
    [x + w * 0.3, y + h * 0.8],
  ];
  ctx.strokeStyle = 'rgba(42,32,24,0.9)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  ctx.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]);
  ctx.stroke();
  const along = (t: number): [number, number] => {
    const u = 1 - t;
    const p = (i: number) => u * u * u * pts[0][i] + 3 * u * u * t * pts[1][i] + 3 * u * t * t * pts[2][i] + t * t * t * pts[3][i];
    return [p(0), p(1)];
  };
  for (let k = 0; k < 11; k++) {
    const [bx, by] = along(0.08 + (k / 11) * 0.9);
    const a = (k % 2 ? -1 : 1) * (0.6 + rnd() * 0.8) - Math.PI / 2;
    const len = 18 + rnd() * 22;
    const ex = bx + Math.cos(a) * len;
    const ey = by + Math.sin(a) * len;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = 'rgba(64,92,64,0.85)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 9, 7, 5.5, 12, s * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    blossom(ctx, ex, ey, 12 + rnd() * 4, rnd() * TAU, '#fbf8ef');
    ctx.strokeStyle = 'rgba(42,32,24,0.9)';
  }
}

/** A hanging scroll: silk mount, an ink painting (0 peaks, 1 bamboo, 2 jasmine) and a red seal. */
export function scrollTexture(kind: number): HTMLCanvasElement {
  const W = 256;
  const H = 768;
  const [c, ctx] = canvas(W, H);
  const rnd = seeded(101 + kind * 7);
  ctx.fillStyle = '#2a5240';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(212,173,92,0.8)';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  const px = 24;
  const top = 116;
  const bottom = 82;
  const pw = W - px * 2;
  const ph = H - top - bottom;
  ctx.fillStyle = '#c9a65a';
  ctx.fillRect(px - 4, top - 4, pw + 8, ph + 8);
  ctx.fillStyle = '#e2d6b6';
  ctx.fillRect(px, top, pw, ph);
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, top, pw, ph);
  ctx.clip();
  if (kind === 0) inkMountains(ctx, px, top, pw, ph, rnd);
  else if (kind === 1) inkBamboo(ctx, px, top, pw, ph, rnd);
  else inkJasmine(ctx, px, top, pw, ph, rnd);
  ctx.restore();
  // A seal: plain shapes only, no writing.
  const sx = kind === 2 ? px + 14 : px + pw - 36;
  const sy = top + ph - 42;
  ctx.fillStyle = '#b3392a';
  ctx.fillRect(sx, sy, 22, 22);
  ctx.strokeStyle = '#f3e6cf';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(sx + 3.5, sy + 3.5, 15, 15);
  disc(ctx, sx + 11, sy + 11, 3, '#f3e6cf');
  grain(ctx, W, H, 10);
  return c;
}

// ---------- the Pai Sho table ----------

/** The top of the Pai Sho table: a wooden round with the board inlaid and a few tiles in play, one the White Lotus. */
export function paiShoTexture(): HTMLCanvasElement {
  const S = 512;
  const [c, ctx] = canvas(S);
  const o = S / 2;
  ctx.drawImage(woodTexture(256, '#3a1d0e', '#6e3f22', 41, 10), 0, 0, S, S);
  const R = 196;
  disc(ctx, o, o, R + 6, '#4a2a14');
  disc(ctx, o, o, R, '#d9bd84');
  ctx.save();
  ctx.beginPath();
  ctx.arc(o, o, R, 0, TAU);
  ctx.clip();
  // The gardens: a square on its point in the middle, in red and white quarters.
  const d = R * 0.6;
  const corners: [number, number][] = [
    [o, o - d],
    [o + d, o],
    [o, o + d],
    [o - d, o],
  ];
  corners.forEach((p, i) => {
    const q = corners[(i + 1) % 4];
    ctx.fillStyle = i % 2 ? '#f1e8d4' : '#b6422e';
    ctx.beginPath();
    ctx.moveTo(o, o);
    ctx.lineTo(...p);
    ctx.lineTo(...q);
    ctx.closePath();
    ctx.fill();
  });
  ctx.strokeStyle = 'rgba(60,30,10,0.7)';
  ctx.lineWidth = 1.3;
  const n = 18;
  const step = (2 * R) / n;
  for (let i = 1; i < n; i++) {
    const v = o - R + i * step;
    ctx.beginPath();
    ctx.moveTo(v, o - R);
    ctx.lineTo(v, o + R);
    ctx.moveTo(o - R, v);
    ctx.lineTo(o + R, v);
    ctx.stroke();
  }
  // The four gates at the edge.
  for (const [x, y] of [
    [o, o - R],
    [o + R, o],
    [o, o + R],
    [o - R, o],
  ])
    disc(ctx, x, y, step * 1.4, '#7a4a22');
  ctx.restore();
  ctx.strokeStyle = '#3a2010';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(o, o, R, 0, TAU);
  ctx.stroke();
  // Tiles in play, sitting on points of the grid.
  const tile = (i: number, j: number, face: 'lotus' | 'red' | 'white') => {
    const x = o - R + i * step;
    const y = o - R + j * step;
    disc(ctx, x, y + 1.5, 9.5, 'rgba(0,0,0,0.35)');
    disc(ctx, x, y, 9.5, '#efe6d0');
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 9.5, 0, TAU);
    ctx.stroke();
    if (face === 'lotus') {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.4, 1.8, a, 0, TAU);
        ctx.fill();
      }
      disc(ctx, x, y, 2, '#d9a93c');
    } else disc(ctx, x, y, 4.5, face === 'red' ? '#b6422e' : '#f9f6ee');
  };
  tile(9, 9, 'lotus');
  tile(6, 11, 'red');
  tile(12, 7, 'white');
  tile(11, 12, 'red');
  tile(5, 6, 'white');
  tile(13, 10, 'white');
  tile(8, 4, 'red');
  return c;
}

// ---------- the view from the round windows ----------

/** A roof with upturned eaves: eave line at y, ridge h above it, w wide at the eaves. */
function roof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.06, y - h * 0.28);
  ctx.quadraticCurveTo(x + w * 0.02, y, x + w * 0.12, y);
  ctx.lineTo(x + w * 0.88, y);
  ctx.quadraticCurveTo(x + w * 0.98, y, x + w * 1.06, y - h * 0.28);
  ctx.quadraticCurveTo(x + w * 0.86, y - h * 0.42, x + w * 0.78, y - h);
  ctx.lineTo(x + w * 0.22, y - h);
  ctx.quadraticCurveTo(x + w * 0.14, y - h * 0.42, x - w * 0.06, y - h * 0.28);
  ctx.closePath();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Ba Sing Se at night, as seen from the tea house: the moon, the mountains, the great wall, the palace and the roofs of the Upper Ring. */
export function baSingSeTexture(): HTMLCanvasElement {
  const S = 1024;
  const [c, ctx] = canvas(S);
  const rnd = seeded(5);
  const sky = ctx.createLinearGradient(0, 0, 0, S);
  sky.addColorStop(0, '#08122a');
  sky.addColorStop(0.5, '#1b2c51');
  sky.addColorStop(0.66, '#34416b');
  sky.addColorStop(1, '#232a44');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 150; i++) disc(ctx, rnd() * S, rnd() * S * 0.55, 0.6 + rnd() * 1.6, `rgba(255,250,235,${0.25 + rnd() * 0.6})`);
  // The moon.
  glow(ctx, 690, 250, 230, 'rgba(255,240,205,0.2)');
  disc(ctx, 690, 250, 66, '#f3ead0');
  for (const [dx, dy, r] of [
    [-18, -14, 14],
    [20, 8, 10],
    [-6, 24, 8],
    [26, -22, 6],
  ])
    disc(ctx, 690 + dx, 250 + dy, r, 'rgba(198,188,162,0.38)');
  // Far mountains.
  const ridge = (base: number, amp: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, S);
    let y = base;
    for (let x = 0; x <= S; x += 32) {
      y = Math.max(base - amp, Math.min(base + amp * 0.3, y + (rnd() - 0.5) * amp * 0.8));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(S, S);
    ctx.closePath();
    ctx.fill();
  };
  ridge(560, 90, '#1e2b4a');
  const mist = ctx.createLinearGradient(0, 540, 0, 660);
  mist.addColorStop(0, 'rgba(150,170,210,0)');
  mist.addColorStop(0.6, 'rgba(150,170,210,0.18)');
  mist.addColorStop(1, 'rgba(150,170,210,0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 540, S, 120);
  // The great wall round the city, with torches along the top.
  ctx.fillStyle = '#161d33';
  ctx.fillRect(0, 642, S, 60);
  for (let x = 0; x < S; x += 26) ctx.fillRect(x, 630, 15, 13);
  for (let x = 40; x < S; x += 96) {
    glow(ctx, x, 637, 16, 'rgba(255,176,90,0.55)');
    disc(ctx, x, 637, 2.2, '#ffd08a');
  }
  // The palace on its rise, the roof edges catching the light.
  glow(ctx, 320, 560, 210, 'rgba(255,196,120,0.16)');
  ctx.fillStyle = '#121a2b';
  ctx.beginPath();
  ctx.ellipse(320, 790, 360, 170, 0, Math.PI, TAU);
  ctx.fill();
  let base = 700;
  for (const [w, bh, rh] of [
    [250, 46, 34],
    [190, 40, 30],
    [130, 34, 26],
  ]) {
    ctx.fillStyle = '#141b2a';
    ctx.fillRect(320 - w * 0.4, base - bh, w * 0.8, bh);
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = `rgba(255,200,110,${0.5 + rnd() * 0.4})`;
      ctx.fillRect(320 - w * 0.34 + (k * w * 0.68) / 5 - 3, base - bh * 0.62, 6, bh * 0.34);
    }
    roof(ctx, 320 - w / 2, base - bh, w, rh);
    ctx.fillStyle = '#10201b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(226,186,104,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    base -= bh + rh * 0.8;
  }
  ctx.fillStyle = '#d8b465';
  ctx.fillRect(318, base - 30, 4, 30);
  disc(ctx, 320, base - 32, 4, '#e8c878');
  // Roofs of the Upper Ring, nearer and darker, with lit windows and lanterns in the streets.
  for (let row = 0; row < 3; row++) {
    const ground = 790 + row * 92;
    const k = 1 + row * 0.55;
    let x = -rnd() * 70;
    while (x < S) {
      const w = (70 + rnd() * 70) * k;
      const bh = (34 + rnd() * 36) * k;
      ctx.fillStyle = row === 2 ? '#0b0e17' : '#0f131f';
      ctx.fillRect(x + w * 0.1, ground - bh, w * 0.8, bh + 120);
      const lit = Math.floor(rnd() * 3);
      for (let j = 0; j < lit; j++) {
        ctx.fillStyle = `rgba(255,196,104,${0.55 + rnd() * 0.4})`;
        ctx.fillRect(x + w * (0.2 + rnd() * 0.55), ground - bh * (0.35 + rnd() * 0.3), 6 * k, 9 * k);
      }
      roof(ctx, x, ground - bh, w, bh * 0.5);
      ctx.fillStyle = row === 2 ? '#0b1714' : '#0e1b18';
      ctx.fill();
      if (rnd() < 0.35) {
        const lx = x + w * (0.2 + rnd() * 0.6);
        glow(ctx, lx, ground - bh * 0.1, 14 * k, 'rgba(255,150,80,0.5)');
        disc(ctx, lx, ground - bh * 0.1, 3 * k, '#ffb070');
      }
      x += w * (0.78 + rnd() * 0.3);
    }
  }
  return c;
}
