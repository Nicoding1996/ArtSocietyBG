import { finish, hsl, type Painter, type Pt } from './common';

const INK = 'rgba(28,30,48,0.9)';

export function ukiyoeScene(p: Painter, scene: 'wave' | 'fuji' | 'blossom') {
  paper(p);
  if (scene === 'wave') wave(p);
  else if (scene === 'fuji') fuji(p);
  else blossom(p);
  cartouche(p);
  finish(p, { weave: 0, grain: 9, vignette: 0.2, warm: 0.45 });
}

function paper(p: Painter) {
  const { c, w, h } = p;
  c.fillStyle = hsl(40, 45, 87);
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 1600; i++) {
    const x = p.rr(0, w);
    const y = p.rr(0, h);
    const a = p.rr(0, Math.PI);
    const l = p.rr(3, 18);
    c.strokeStyle = p.r() < 0.5 ? 'rgba(120,95,60,0.08)' : 'rgba(255,255,245,0.12)';
    c.lineWidth = p.rr(0.5, 1.2);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    c.stroke();
  }
}

/** Woodblock-style gradient band ("bokashi"). */
function bokashi(p: Painter, y0: number, y1: number, color: string) {
  const g = p.c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  p.c.fillStyle = g;
  p.c.fillRect(0, y0, p.w, y1 - y0);
}

const bez = (a: Pt, b: Pt, c2: Pt, d: Pt, t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c2[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c2[1] + t * t * t * d[1],
  ];
};

function waveShape(p: Painter, cx: number, cy: number, s: number, dir: 1 | -1) {
  const { w, h } = p;
  const X = (dx: number) => cx + dir * dx * w * s;
  const Y = (dy: number) => cy + dy * h * s;
  const start: Pt = [cx - dir * w * 0.6 * s, h + 10];
  const segs: [Pt, Pt, Pt][] = [
    [[X(-0.5), Y(0.3)], [X(-0.3), Y(0.02)], [X(-0.05), Y(-0.06)]],
    [[X(0.08), Y(-0.12)], [X(0.3), Y(-0.05)], [X(0.32), Y(0.06)]],
    [[X(0.33), Y(0.12)], [X(0.22), Y(0.14)], [X(0.16), Y(0.08)]],
    [[X(0.1), Y(0.04)], [X(0.02), Y(0.1)], [X(0.06), Y(0.22)]],
    [[X(0.1), Y(0.35)], [X(0.3), Y(0.6)], [X(0.45), h + 10]],
  ];
  return { start, segs };
}

function tracePath(p: Painter, start: Pt, segs: [Pt, Pt, Pt][]) {
  const c = p.c;
  c.beginPath();
  c.moveTo(start[0], start[1]);
  for (const [a, b, d] of segs) c.bezierCurveTo(a[0], a[1], b[0], b[1], d[0], d[1]);
  c.closePath();
}

function drawWave(p: Painter, cx: number, cy: number, s: number, dir: 1 | -1) {
  const { c, h } = p;
  const { start, segs } = waveShape(p, cx, cy, s, dir);
  const g = c.createLinearGradient(0, cy - h * 0.1 * s, 0, h);
  g.addColorStop(0, hsl(212, 50, 42));
  g.addColorStop(0.5, hsl(218, 58, 26));
  g.addColorStop(1, hsl(222, 60, 18));
  tracePath(p, start, segs);
  c.fillStyle = g;
  c.fill();
  // Striations that follow the swell.
  c.save();
  tracePath(p, start, segs);
  c.clip();
  for (let k = 1; k <= 9; k++) {
    const off = k * 9 * s * 2;
    c.strokeStyle = k % 2 ? 'rgba(140,175,220,0.45)' : 'rgba(250,248,240,0.35)';
    c.lineWidth = k % 2 ? 3 : 1.2;
    c.beginPath();
    c.moveTo(start[0] + dir * off, start[1]);
    const [a, b, d] = segs[0];
    c.bezierCurveTo(a[0] + dir * off, a[1] + off * 0.6, b[0] + dir * off * 0.6, b[1] + off, d[0] + dir * off * 0.2, d[1] + off);
    c.stroke();
  }
  c.restore();
  tracePath(p, start, segs);
  c.strokeStyle = INK;
  c.lineWidth = 2;
  c.stroke();
  // Foam claws along the lip of the curl.
  let prev: Pt | null = null;
  let from: Pt = segs[0][2];
  for (const seg of [segs[1], segs[2]]) {
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const q = bez(from, seg[0], seg[1], seg[2], t);
      if (prev) {
        const ang = Math.atan2(q[1] - prev[1], q[0] - prev[0]) - (Math.PI / 2) * dir;
        const r = p.rr(5, 9) * s * 1.6;
        c.fillStyle = hsl(45, 40, 96);
        c.strokeStyle = INK;
        c.lineWidth = 1.2;
        for (let f = 0; f < 3; f++) {
          const fa = ang + (f - 1) * 0.5;
          const fx = q[0] + Math.cos(fa) * r * 1.3;
          const fy = q[1] + Math.sin(fa) * r * 1.3;
          c.beginPath();
          c.arc(fx, fy, r * 0.45, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        }
        c.beginPath();
        c.arc(q[0], q[1], r * 0.7, 0, Math.PI * 2);
        c.fill();
      }
      prev = q;
    }
    from = seg[2];
  }
  // Spray.
  for (let i = 0; i < 40; i++) {
    const t = p.r();
    const q = bez(segs[0][2], segs[1][0], segs[1][1], segs[1][2], t);
    c.fillStyle = hsl(45, 40, 96, 0.95);
    c.beginPath();
    c.arc(q[0] + p.rr(-20, 40) * dir * s, q[1] + p.rr(-30, 30) * s, p.rr(1.5, 4) * s * 1.4, 0, Math.PI * 2);
    c.fill();
  }
}

function boat(p: Painter, x: number, y: number, len: number, ang: number) {
  const c = p.c;
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.fillStyle = hsl(38, 55, 68);
  c.strokeStyle = INK;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-len / 2, 0);
  c.quadraticCurveTo(0, 14, len / 2, -4);
  c.lineTo(len / 2 - 6, -8);
  c.quadraticCurveTo(0, 4, -len / 2 + 4, -6);
  c.closePath();
  c.fill();
  c.stroke();
  for (let i = 0; i < 7; i++) {
    const rx = -len / 2 + 16 + i * ((len - 32) / 6);
    c.fillStyle = hsl(225, 45, 24);
    c.beginPath();
    c.arc(rx, -9, 3.2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function wave(p: Painter) {
  const { c, w, h } = p;
  bokashi(p, 0, h * 0.28, 'rgba(110,120,140,0.55)');
  // Distant Fuji between the waves.
  const fx = w * p.rr(0.58, 0.7);
  const fy = h * 0.74;
  c.fillStyle = hsl(214, 40, 48);
  c.strokeStyle = INK;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(fx - w * 0.15, fy);
  c.quadraticCurveTo(fx - w * 0.05, fy - h * 0.05, fx - w * 0.02, fy - h * 0.09);
  c.lineTo(fx + w * 0.02, fy - h * 0.09);
  c.quadraticCurveTo(fx + w * 0.05, fy - h * 0.05, fx + w * 0.15, fy);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = hsl(40, 30, 96);
  c.beginPath();
  c.moveTo(fx - w * 0.035, fy - h * 0.075);
  c.lineTo(fx - w * 0.02, fy - h * 0.09);
  c.lineTo(fx + w * 0.02, fy - h * 0.09);
  c.lineTo(fx + w * 0.035, fy - h * 0.075);
  for (let i = 0; i <= 6; i++) c.lineTo(fx + w * 0.035 - (i / 6) * w * 0.07, fy - h * (i % 2 ? 0.068 : 0.074));
  c.fill();
  // Sea.
  const sea = c.createLinearGradient(0, h * 0.72, 0, h);
  sea.addColorStop(0, hsl(210, 40, 55));
  sea.addColorStop(1, hsl(220, 55, 25));
  c.fillStyle = sea;
  c.fillRect(0, h * 0.74, w, h * 0.26);
  boat(p, w * p.rr(0.55, 0.75), h * 0.8, w * 0.42, p.rr(-0.15, 0.05));
  drawWave(p, w * p.rr(0.32, 0.42), h * p.rr(0.28, 0.34), 1, 1);
  drawWave(p, w * 0.86, h * 0.72, 0.42, -1);
  boat(p, w * p.rr(0.15, 0.3), h * 0.9, w * 0.4, p.rr(0.05, 0.25));
}

function fuji(p: Painter) {
  const { c, w, h } = p;
  const sky = c.createLinearGradient(0, 0, 0, h * 0.75);
  sky.addColorStop(0, hsl(214, 58, 30));
  sky.addColorStop(0.45, hsl(205, 45, 60));
  sky.addColorStop(1, hsl(42, 50, 88, 0));
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h * 0.75);
  // Rows of fish-scale clouds.
  for (let row = 0; row < p.ri(4, 6); row++) {
    const y = h * p.rr(0.1, 0.42);
    let x = p.rr(-40, w * 0.4);
    const tilt = p.rr(-0.08, 0.08);
    const n = p.ri(6, 14);
    for (let i = 0; i < n; i++) {
      const rx = p.rr(9, 18);
      c.fillStyle = hsl(40, 30, 97, 0.95);
      c.strokeStyle = 'rgba(90,120,160,0.6)';
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(x, y + (x - w / 2) * tilt, rx, rx * 0.4, tilt, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      x += rx * 1.9 + p.rr(0, 10);
    }
  }
  const px = w * p.rr(0.45, 0.58);
  const py = h * p.rr(0.27, 0.35);
  const mountain = () => {
    c.beginPath();
    c.moveTo(-w * 0.15, h * 0.92);
    c.quadraticCurveTo(px - w * 0.2, py + h * 0.14, px - w * 0.05, py + 2);
    c.lineTo(px + w * 0.05, py - 2);
    c.quadraticCurveTo(px + w * 0.22, py + h * 0.16, w * 1.15, h * 0.9);
    c.lineTo(w * 1.15, h);
    c.lineTo(-w * 0.15, h);
    c.closePath();
  };
  const g = c.createLinearGradient(0, py, 0, h);
  g.addColorStop(0, hsl(8, 66, 36));
  g.addColorStop(0.45, hsl(14, 72, 44));
  g.addColorStop(1, hsl(18, 55, 30));
  mountain();
  c.fillStyle = g;
  c.fill();
  c.save();
  mountain();
  c.clip();
  for (let i = 0; i < 900 * p.detail; i++) {
    const x = p.rr(0, w);
    const y = p.rr(py, h);
    c.strokeStyle = `rgba(80,20,10,${p.rr(0.05, 0.18)})`;
    c.lineWidth = p.rr(0.8, 2);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + p.rr(-3, 3), y + p.rr(6, 18));
    c.stroke();
  }
  // Snow with a ragged edge and streaks running down the ridges.
  c.fillStyle = hsl(40, 35, 96);
  c.beginPath();
  c.moveTo(px - w * 0.2, py - 10);
  c.lineTo(px + w * 0.2, py - 10);
  let x = px + w * 0.16;
  while (x > px - w * 0.16) {
    c.lineTo(x, py + p.rr(h * 0.03, h * 0.09) * (1 - Math.abs(x - px) / (w * 0.2)));
    x -= p.rr(4, 9);
  }
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(250,248,240,0.75)';
  for (let i = 0; i < 26; i++) {
    const sx = px + p.rr(-w * 0.14, w * 0.14);
    c.lineWidth = p.rr(1, 2.4);
    c.beginPath();
    c.moveTo(sx, py + h * 0.03);
    c.lineTo(sx + (sx - px) * 0.25, py + p.rr(h * 0.08, h * 0.16));
    c.stroke();
  }
  // Forest at the foot.
  for (let i = 0; i < 260; i++) {
    const fx = p.rr(-10, w + 10);
    const fy = h * p.rr(0.84, 0.98);
    c.fillStyle = hsl(p.rr(120, 150), 35, p.rr(16, 26));
    c.beginPath();
    c.arc(fx, fy, p.rr(3, 7), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  mountain();
  c.strokeStyle = INK;
  c.lineWidth = 2;
  c.stroke();
}

function blossom(p: Painter) {
  const { c, w, h } = p;
  const night = p.r() < 0.5;
  if (night) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, hsl(225, 45, 18));
    g.addColorStop(1, hsl(215, 40, 34));
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  } else {
    bokashi(p, 0, h * 0.35, 'rgba(200,120,110,0.35)');
  }
  const mx = w * p.rr(0.55, 0.75);
  const my = h * p.rr(0.22, 0.38);
  const mr = w * p.rr(0.16, 0.22);
  c.fillStyle = night ? hsl(48, 60, 88) : hsl(4, 75, 52);
  c.beginPath();
  c.arc(mx, my, mr, 0, Math.PI * 2);
  c.fill();

  const fromLeft = p.r() < 0.5;
  const branches: { pts: Pt[]; width: number }[] = [];
  const grow = (x: number, y: number, ang: number, len: number, width: number, depth: number) => {
    const pts: Pt[] = [];
    let cx = x;
    let cy = y;
    let a = ang;
    const steps = Math.ceil(len / 8);
    for (let i = 0; i <= steps; i++) {
      pts.push([cx, cy]);
      a += p.rr(-0.12, 0.12) + (ang - a) * 0.08;
      cx += Math.cos(a) * 8;
      cy += Math.sin(a) * 8;
      if (depth < 2 && i > 3 && p.r() < 0.07) grow(cx, cy, a + p.pick([-1, 1]) * p.rr(0.5, 1), len * 0.45, width * 0.55, depth + 1);
    }
    branches.push({ pts, width });
  };
  grow(fromLeft ? -10 : w + 10, h * p.rr(0.45, 0.75), fromLeft ? p.rr(-0.6, -0.2) : Math.PI + p.rr(0.2, 0.6), w * 1.1, 13, 0);
  for (const b of branches) {
    for (let i = 1; i < b.pts.length; i++) {
      const t = i / b.pts.length;
      c.strokeStyle = night ? hsl(220, 25, 8) : hsl(20, 25, 14);
      c.lineWidth = Math.max(1.5, b.width * (1 - t * 0.8));
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(b.pts[i - 1][0], b.pts[i - 1][1]);
      c.lineTo(b.pts[i][0], b.pts[i][1]);
      c.stroke();
    }
  }
  const pink = p.r() < 0.6;
  for (const b of branches) {
    for (let i = 2; i < b.pts.length; i += p.ri(2, 4)) {
      const [x, y] = b.pts[i];
      const fx = x + p.rr(-8, 8);
      const fy = y + p.rr(-8, 8);
      if (p.r() < 0.25) {
        c.fillStyle = hsl(350, 70, 45);
        c.beginPath();
        c.arc(fx, fy, 3, 0, Math.PI * 2);
        c.fill();
        continue;
      }
      const r = p.rr(4.5, 7);
      const rot = p.rr(0, Math.PI);
      for (let k = 0; k < 5; k++) {
        const a = rot + (k / 5) * Math.PI * 2;
        c.fillStyle = pink ? hsl(345, 70, p.rr(82, 90)) : hsl(40, 30, 97);
        c.strokeStyle = pink ? 'rgba(190,80,110,0.6)' : 'rgba(150,140,130,0.6)';
        c.lineWidth = 0.8;
        c.beginPath();
        c.arc(fx + Math.cos(a) * r * 0.75, fy + Math.sin(a) * r * 0.75, r * 0.6, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      c.fillStyle = hsl(p.r() < 0.5 ? 345 : 48, 80, 55);
      c.beginPath();
      c.arc(fx, fy, r * 0.28, 0, Math.PI * 2);
      c.fill();
    }
  }
  for (let i = 0; i < 14; i++) {
    c.fillStyle = pink ? hsl(345, 70, 86, 0.9) : hsl(40, 30, 97, 0.9);
    c.beginPath();
    c.ellipse(p.rr(0, w), p.rr(h * 0.4, h), 3, 1.6, p.rr(0, Math.PI), 0, Math.PI * 2);
    c.fill();
  }
}

/** Title cartouche with pseudo-calligraphy and the printer's red seal. */
function cartouche(p: Painter) {
  const { c, w, h } = p;
  const left = p.r() < 0.5;
  const cw = w * 0.085;
  const ch = h * p.rr(0.22, 0.3);
  const x = left ? w * 0.06 : w * 0.94 - cw;
  const y = h * 0.05;
  c.fillStyle = p.pick([hsl(45, 55, 80), hsl(40, 35, 92), hsl(10, 45, 75)]);
  c.strokeStyle = INK;
  c.lineWidth = 1.5;
  c.fillRect(x, y, cw, ch);
  c.strokeRect(x, y, cw, ch);
  c.strokeStyle = 'rgba(20,20,30,0.85)';
  c.lineCap = 'round';
  const glyphs = Math.floor(ch / (cw * 0.95));
  for (let g = 0; g < glyphs; g++) {
    const gx = x + cw * 0.2;
    const gy = y + cw * 0.15 + g * cw * 0.95;
    const s = cw * 0.6;
    for (let k = 0; k < p.ri(3, 6); k++) {
      c.lineWidth = p.rr(1, 2.2);
      c.beginPath();
      const x0 = gx + p.rr(0, s);
      const y0 = gy + p.rr(0, s);
      c.moveTo(x0, y0);
      c.lineTo(x0 + p.rr(-s * 0.5, s * 0.5), y0 + p.rr(-s * 0.2, s * 0.6));
      c.stroke();
    }
  }
  const sx = left ? x : x + cw - cw * 0.7;
  const sy = y + ch + 8;
  c.fillStyle = hsl(5, 70, 42);
  c.fillRect(sx, sy, cw * 0.7, cw * 0.9);
  c.strokeStyle = hsl(40, 40, 92);
  c.lineWidth = 1.2;
  for (let k = 0; k < 5; k++) {
    c.beginPath();
    const x0 = sx + p.rr(3, cw * 0.6);
    const y0 = sy + p.rr(3, cw * 0.8);
    c.moveTo(x0, y0);
    c.lineTo(x0 + p.rr(-5, 5), y0 + p.rr(-5, 5));
    c.stroke();
  }
}
