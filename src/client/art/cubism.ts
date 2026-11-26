import { centroid, finish, hexToHsl, hsl, polyArea, polyPath, splitPolygon, type HSL, type Painter, type Pt } from './common';

const PALETTES = [
  ['#c8a46a', '#a67c45', '#7a5a3a', '#4a3b2c', '#d9c7a0', '#8a8f7a', '#5f6b6d', '#e6d8b5'],
  ['#d9b26f', '#b55a3a', '#3d5a73', '#e8dcc0', '#2e2b28', '#7b8f6a', '#c96f4a', '#9c8566'],
  ['#9aa5a0', '#6c7a78', '#c2b59b', '#4f4a45', '#e0d6c2', '#a88d64', '#38413f', '#b9a37b'],
];

export function cubistScene(p: Painter, subject: 'guitar' | 'portrait' | 'still') {
  const { c, w, h } = p;
  const pal = p.pick(PALETTES).map(hexToHsl);
  c.fillStyle = hsl(pal[0][0], pal[0][1], pal[0][2]);
  c.fillRect(0, 0, w, h);

  // Shatter the canvas into convex facets.
  let polys: Pt[][] = [
    [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ],
  ];
  const minArea = (w * h) / (70 * p.detail);
  for (let depth = 0; depth < 7; depth++) {
    const next: Pt[][] = [];
    for (const poly of polys) {
      if (polyArea(poly) < minArea || p.r() > 0.82) {
        next.push(poly);
        continue;
      }
      const [cx, cy] = centroid(poly);
      const ang = p.r() < 0.55 ? p.pick([0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) + p.rr(-0.25, 0.25) : p.rr(0, Math.PI);
      const parts = splitPolygon(poly, cx + p.rr(-20, 20), cy + p.rr(-20, 20), ang);
      if (parts) next.push(parts[0], parts[1]);
      else next.push(poly);
    }
    polys = next;
  }

  const shade = (col: HSL, poly: Pt[]) => {
    const xs = poly.map((q) => q[0]);
    const ys = poly.map((q) => q[1]);
    const a = p.rr(0, Math.PI * 2);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
    const g = c.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    g.addColorStop(0, hsl(col[0], col[1], Math.min(92, col[2] + 16)));
    g.addColorStop(1, hsl(col[0], col[1], Math.max(8, col[2] - 18)));
    return g;
  };

  for (const poly of polys) {
    c.fillStyle = shade(p.pick(pal), poly);
    polyPath(c, poly);
    c.fill();
    if (p.r() < 0.35) {
      c.save();
      polyPath(c, poly);
      c.clip();
      c.strokeStyle = 'rgba(30,24,20,0.16)';
      c.lineWidth = 1;
      const a = p.rr(0, Math.PI);
      for (let k = -w; k < w * 2; k += 5) {
        c.beginPath();
        c.moveTo(k, 0);
        c.lineTo(k + Math.cos(a) * h * 2, Math.sin(a) * h * 2);
        c.stroke();
      }
      c.restore();
    }
  }

  if (subject === 'guitar') guitar(p, polys, pal);
  else if (subject === 'portrait') portrait(p, polys, pal);
  else stillLife(p, polys, pal);

  // Facet edges.
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      if (p.r() < 0.4) continue;
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      c.strokeStyle = `rgba(28,22,18,${p.rr(0.35, 0.85)})`;
      c.lineWidth = p.rr(1, 2.6);
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
    }
  }

  if (p.r() < 0.5) {
    const words = ['JOU', 'LE JOURNAL', 'BAL', 'VIN', 'OR', 'MUSIQUE'];
    c.save();
    c.translate(p.rr(0.15, 0.7) * w, p.rr(0.15, 0.85) * h);
    c.rotate(p.rr(-0.3, 0.3));
    c.font = `700 ${Math.round(p.rr(20, 34))}px Georgia, 'Times New Roman', serif`;
    c.fillStyle = 'rgba(25,20,16,0.78)';
    c.fillText(p.pick(words), 0, 0);
    c.restore();
  }
  finish(p, { weave: 7, grain: 14, vignette: 0.3, warm: 0.25 });
}

/** Draws `draw` clipped to a random subset of facets, then again shifted elsewhere: the "seen twice" effect. */
function fractured(p: Painter, polys: Pt[][], draw: (dx: number, dy: number) => void) {
  const c = p.c;
  const keep = polys.filter(() => p.r() < 0.62);
  c.save();
  c.beginPath();
  for (const poly of keep) {
    c.moveTo(poly[0][0], poly[0][1]);
    for (const q of poly.slice(1)) c.lineTo(q[0], q[1]);
    c.closePath();
  }
  c.clip();
  draw(0, 0);
  c.restore();
  const other = polys.filter((q) => !keep.includes(q) && p.r() < 0.5);
  c.save();
  c.beginPath();
  for (const poly of other) {
    c.moveTo(poly[0][0], poly[0][1]);
    for (const q of poly.slice(1)) c.lineTo(q[0], q[1]);
    c.closePath();
  }
  c.clip();
  draw(p.rr(-22, 22), p.rr(-16, 16));
  c.restore();
}

function guitar(p: Painter, polys: Pt[][], pal: HSL[]) {
  const { c, w, h } = p;
  const cx = w * p.rr(0.4, 0.6);
  const cy = h * p.rr(0.5, 0.6);
  const m = Math.min(w, h * 0.8);
  const r1 = m * 0.15;
  const r2 = m * 0.2;
  const body = pal.reduce((a, b) => (Math.abs(b[0] - 25) < Math.abs(a[0] - 25) && b[2] > 30 ? b : a));
  fractured(p, polys, (dx, dy) => {
    const g = c.createRadialGradient(cx + dx - r2 * 0.3, cy + dy, 4, cx + dx, cy + dy, r2 * 1.6);
    g.addColorStop(0, hsl(body[0], body[1] + 10, body[2] + 12));
    g.addColorStop(1, hsl(body[0], body[1], body[2] - 18));
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx + dx, cy + dy - r1 * 0.95, r1, 0, Math.PI * 2);
    c.arc(cx + dx, cy + dy + r2 * 0.55, r2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(20,16,12,0.9)';
    c.beginPath();
    c.arc(cx + dx, cy + dy, r1 * 0.42, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = hsl(30, 25, 22);
    c.fillRect(cx + dx - 9, cy + dy - r1 * 3.6, 18, r1 * 2.2);
    c.strokeStyle = 'rgba(240,230,210,0.85)';
    c.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(cx + dx + i * 3, cy + dy - r1 * 3.6);
      c.lineTo(cx + dx + i * 3, cy + dy + r2 * 0.9);
      c.stroke();
    }
  });
}

function portrait(p: Painter, polys: Pt[][], pal: HSL[]) {
  const { c, w, h } = p;
  const cx = w * p.rr(0.42, 0.58);
  const cy = h * p.rr(0.35, 0.45);
  const m = Math.min(w, h * 0.8);
  const fw = m * 0.2;
  const fh = m * 0.25;
  const skin: HSL = [p.rr(20, 35), 35, p.rr(55, 70)];
  const dark = pal.reduce((a, b) => (b[2] < a[2] ? b : a));
  fractured(p, polys, (dx, dy) => {
    c.fillStyle = hsl(dark[0], dark[1], dark[2]);
    c.beginPath();
    c.moveTo(cx + dx - fw * 1.6, h);
    c.lineTo(cx + dx - fw * 0.4, cy + dy + fh * 1.1);
    c.lineTo(cx + dx + fw * 0.4, cy + dy + fh * 1.1);
    c.lineTo(cx + dx + fw * 1.6, h);
    c.fill();
    const g = c.createLinearGradient(cx + dx - fw, 0, cx + dx + fw, 0);
    g.addColorStop(0, hsl(skin[0], skin[1], skin[2] + 10));
    g.addColorStop(1, hsl(skin[0], skin[1], skin[2] - 22));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(cx + dx, cy + dy, fw, fh, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = hsl(dark[0], dark[1], Math.max(10, dark[2] - 10));
    c.beginPath();
    c.ellipse(cx + dx, cy + dy - fh * 0.85, fw * 1.05, fh * 0.45, 0, Math.PI, Math.PI * 2);
    c.fill();
  });
  c.strokeStyle = 'rgba(25,20,16,0.9)';
  c.fillStyle = 'rgba(25,20,16,0.9)';
  c.lineWidth = 2.2;
  // One frontal eye, one in profile, at different heights.
  c.beginPath();
  c.ellipse(cx - fw * 0.38, cy - fh * 0.1, fw * 0.2, fh * 0.08, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.arc(cx - fw * 0.38, cy - fh * 0.1, fh * 0.05, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(cx + fw * 0.15, cy - fh * 0.25);
  c.lineTo(cx + fw * 0.5, cy - fh * 0.2);
  c.lineTo(cx + fw * 0.2, cy - fh * 0.12);
  c.stroke();
  c.beginPath();
  c.moveTo(cx, cy - fh * 0.2);
  c.lineTo(cx + fw * 0.22, cy + fh * 0.3);
  c.lineTo(cx - fw * 0.02, cy + fh * 0.32);
  c.stroke();
  c.beginPath();
  c.moveTo(cx - fw * 0.25, cy + fh * 0.55);
  c.quadraticCurveTo(cx, cy + fh * 0.7, cx + fw * 0.2, cy + fh * 0.5);
  c.stroke();
}

function stillLife(p: Painter, polys: Pt[][], pal: HSL[]) {
  const { c, w, h } = p;
  const table = h * p.rr(0.62, 0.72);
  const light = pal.reduce((a, b) => (b[2] > a[2] ? b : a));
  const mid = pal[2];
  // Sized from the shorter side so wide and tall canvases keep the objects in frame.
  const s = Math.min(w, h * 0.85) / 480;
  fractured(p, polys, (dx, dy) => {
    c.fillStyle = hsl(light[0], light[1], light[2] - 5);
    c.beginPath();
    c.moveTo(0, table + dy + 30 * s);
    c.lineTo(w, table + dy - 30 * s);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
    const bx = w * 0.35 + dx;
    const g = c.createLinearGradient(bx - 30 * s, 0, bx + 30 * s, 0);
    g.addColorStop(0, hsl(140, 25, 40));
    g.addColorStop(1, hsl(150, 30, 14));
    c.fillStyle = g;
    c.fillRect(bx - 28 * s, table + dy - 150 * s, 56 * s, 150 * s);
    c.fillRect(bx - 10 * s, table + dy - 215 * s, 20 * s, 70 * s);
    c.fillStyle = hsl(mid[0], mid[1], mid[2] + 15);
    c.beginPath();
    c.ellipse(w * 0.62 + dx, table + dy - 60 * s, 34 * s, 12 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.fillRect(w * 0.62 + dx - 34 * s, table + dy - 60 * s, 68 * s, 50 * s);
    for (let i = 0; i < 3; i++) {
      c.fillStyle = hsl(p.pick([10, 30, 45, 80]), 55, 45);
      c.beginPath();
      c.arc(w * (0.5 + i * 0.12) + dx, table + dy + (10 + i * 6) * s, 16 * s, 0, Math.PI * 2);
      c.fill();
    }
  });
}
