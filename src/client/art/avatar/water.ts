import { makeNoise } from '../../util/noise';
import { hsl, type Painter } from '../common';

/**
 * Water Tribe paintings, made like the stonecut and stencil prints of the Arctic print shops: flat inks on
 * soft paper, colour blocks printed a little out of register with the black, ink that didn't quite take,
 * and the shop's seal in a corner.
 */
export type WaterScene = 'icecity' | 'oasis' | 'southpole' | 'katara' | 'sokka' | 'korra' | 'keepsakes';

type Ctx = CanvasRenderingContext2D;
type Ink = string | CanvasGradient;
type Trace = (c: Ctx) => void;

const TAU = Math.PI * 2;
const PAPER: [number, number, number] = [239, 233, 220];
const PAPER_INK = `rgb(${PAPER.join(',')})`;
const BLACK = hsl(222, 28, 11);
const NAVY = hsl(215, 58, 22);
const BLUE = hsl(208, 55, 40);
const ICE = hsl(196, 36, 86);
const SNOW = hsl(40, 28, 96);
const RED = hsl(6, 64, 45);

interface Tone {
  face: string;
  shade: string;
  window: string;
}

const CITY_FAR: Tone = { face: hsl(204, 32, 64), shade: hsl(210, 38, 48), window: hsl(216, 45, 30) };
const CITY_NEAR: Tone = { face: hsl(195, 34, 85), shade: hsl(204, 38, 67), window: hsl(214, 50, 28) };
const WALL: Tone = { face: hsl(194, 34, 91), shade: hsl(203, 36, 72), window: NAVY };

interface Press extends Painter {
  /** How far the colour blocks sit from the black block. */
  mx: number;
  my: number;
}

export function waterScene(painter: Painter, scene: WaterScene) {
  const p: Press = Object.assign(painter, { mx: painter.rr(-1.6, 1.6), my: painter.rr(-1.2, 1.2) });
  paper(p);
  switch (scene) {
    case 'oasis':
      oasis(p);
      break;
    case 'southpole':
      southPole(p);
      break;
    case 'katara':
    case 'sokka':
    case 'korra':
      portrait(p, scene);
      break;
    case 'keepsakes':
      keepsakes(p);
      break;
    default:
      iceCity(p);
  }
  seal(p);
  pull(p);
}

// ---------- printing ----------

/** One flat ink over the path `trace` draws. Colour blocks print slightly out of register; the black key doesn't. */
function fill(p: Press, ink: Ink, trace: Trace, key = false) {
  const c = p.c;
  c.save();
  if (!key) c.translate(p.mx, p.my);
  c.beginPath();
  trace(c);
  c.fillStyle = ink;
  c.fill();
  c.restore();
}

/** A line of ink along the path `trace` draws (in the paper colour it reads as a line cut into the block). */
function line(p: Press, ink: Ink, width: number, trace: Trace, key = false) {
  const c = p.c;
  c.save();
  if (!key) c.translate(p.mx, p.my);
  c.beginPath();
  trace(c);
  c.strokeStyle = ink;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
  c.restore();
}

/** Runs `paint` with everything clipped to the shape `mask` draws, in the same register as the mask. */
function within(p: Press, mask: Trace, paint: () => void, key = false) {
  const c = p.c;
  c.save();
  if (!key) c.translate(p.mx, p.my);
  // A mask may move the context to draw in local coordinates; the clip keeps its shape, the transform doesn't.
  const t = c.getTransform();
  c.beginPath();
  mask(c);
  c.setTransform(t);
  c.clip();
  if (!key) c.translate(-p.mx, -p.my);
  paint();
  c.restore();
}

/** Soft off-white paper with long fibres. */
function paper(p: Press) {
  const { c, w, h } = p;
  c.fillStyle = PAPER_INK;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 1100; i++) {
    const x = p.rr(0, w);
    const y = p.rr(0, h);
    const a = p.rr(0, Math.PI);
    const l = p.rr(4, 20);
    c.strokeStyle = p.r() < 0.5 ? 'rgba(125,100,70,0.07)' : 'rgba(255,255,250,0.16)';
    c.lineWidth = p.rr(0.4, 1.1);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    c.stroke();
  }
}

/** Pulls the print: ink that didn't fully take, paper grain and a soft vignette, per pixel. */
function pull(p: Press) {
  const c = p.c;
  const w = c.canvas.width;
  const h = c.canvas.height;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const n = makeNoise(Math.floor(p.r() * 2 ** 31));
  const [pr, pg, pb] = PAPER;
  const cx = w / 2;
  const cy = h / 2;
  const maxD = cx * cx + cy * cy;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      const inked = Math.max(0, 1 - lum / 232);
      const m = n(x * 0.05, y * 0.05) * 0.6 + n(x * 0.21, y * 0.21) * 0.4;
      let lift = Math.max(0, m - 0.18) * 0.24;
      if (p.r() < 0.02) lift += p.r() * 0.5;
      lift *= inked;
      const g = (p.r() - 0.5) * 8;
      const dx = x - cx;
      const dy = y - cy;
      const v = 1 - 0.1 * ((dx * dx + dy * dy) / maxD) ** 1.5;
      d[i] = (d[i] + (pr - d[i]) * lift + g + 2) * v;
      d[i + 1] = (d[i + 1] + (pg - d[i + 1]) * lift + g) * v;
      d[i + 2] = (d[i + 2] + (pb - d[i + 2]) * lift + g - 2) * v;
    }
  }
  c.putImageData(img, 0, 0);
}

/** The print shop's seal in a bottom corner: a crescent moon over a wave, cut out of red ink. */
function seal(p: Press) {
  const { w, h } = p;
  const s = Math.min(w, h) * 0.06;
  const x = p.r() < 0.5 ? w * 0.045 : w * 0.955 - s;
  const y = h * 0.955 - s;
  fill(p, RED, (k) => k.roundRect(x, y, s, s, s * 0.22), true);
  fill(p, PAPER_INK, (k) => k.arc(x + s * 0.5, y + s * 0.38, s * 0.21, 0, TAU), true);
  fill(p, RED, (k) => k.arc(x + s * 0.6, y + s * 0.32, s * 0.19, 0, TAU), true);
  line(
    p,
    PAPER_INK,
    Math.max(1, s * 0.08),
    (k) => {
      k.moveTo(x + s * 0.18, y + s * 0.76);
      k.quadraticCurveTo(x + s * 0.34, y + s * 0.6, x + s * 0.5, y + s * 0.76);
      k.quadraticCurveTo(x + s * 0.66, y + s * 0.92, x + s * 0.82, y + s * 0.76);
    },
    true,
  );
}

// ---------- shared shapes ----------

/** The full moon: white with a soft halo on a night sky, pale blue with a ring on bare paper. */
function moon(p: Press, x: number, y: number, r: number, onPaper = false) {
  if (onPaper) {
    fill(p, hsl(203, 42, 80), (k) => k.arc(x, y, r, 0, TAU));
    line(p, BLUE, Math.max(1.2, r * 0.05), (k) => k.arc(x, y, r * 1.16, 0, TAU));
  } else {
    const halo = p.c.createRadialGradient(x, y, r, x, y, r * 2.8);
    halo.addColorStop(0, 'rgba(215,232,245,0.32)');
    halo.addColorStop(1, 'rgba(215,232,245,0)');
    fill(p, halo, (k) => k.arc(x, y, r * 2.8, 0, TAU));
    fill(p, SNOW, (k) => k.arc(x, y, r, 0, TAU));
  }
  for (let i = 0; i < 3; i++) {
    const a = p.rr(0, TAU);
    const d = p.rr(0.2, 0.55) * r;
    const cr = p.rr(0.12, 0.22) * r;
    fill(p, 'rgba(160,185,205,0.35)', (k) => k.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cr, 0, TAU));
  }
}

/** An arched opening, centred on x, from y - ah/2 to y + ah/2. */
function arch(p: Press, x: number, y: number, aw: number, ah: number, ink: Ink, key = false) {
  fill(
    p,
    ink,
    (k) => {
      k.moveTo(x - aw / 2, y + ah / 2);
      k.lineTo(x - aw / 2, y - ah / 2 + aw / 2);
      k.arc(x, y - ah / 2 + aw / 2, aw / 2, Math.PI, 0);
      k.lineTo(x + aw / 2, y + ah / 2);
      k.closePath();
    },
    key,
  );
}

// ---------- the Northern Water Tribe ----------

function iceCity(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const wide = w / h > 1.3;
  const wallTop = h * (wide ? 0.6 : 0.66);
  const wallBottom = h * (wide ? 0.79 : 0.77);
  // A night sky, brushed lighter towards the horizon as through a stencil.
  const sky = c.createLinearGradient(0, 0, 0, wallBottom);
  sky.addColorStop(0, hsl(221, 52, 12));
  sky.addColorStop(0.55, hsl(214, 52, 24));
  sky.addColorStop(1, hsl(204, 46, 46));
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, wallBottom + 4));
  for (let i = 0; i < 45; i++) {
    const sx = p.rr(0, w);
    const sy = p.rr(0, wallTop * 0.7);
    const sr = p.rr(0.6, 1.7);
    fill(p, SNOW, (k) => k.arc(sx, sy, sr, 0, TAU));
  }
  const mr = u * p.rr(0.1, 0.14);
  const left = p.r() < 0.5;
  const mx = wide ? w * (left ? p.rr(0.14, 0.26) : p.rr(0.74, 0.86)) : w * p.rr(0.28, 0.72);
  const my = wide ? h * p.rr(0.2, 0.26) : h * p.rr(0.13, 0.18);
  moon(p, mx, my, mr);
  const lit = mx < w / 2 ? -1 : 1;

  // Two rows of ice towers climbing towards the palace.
  const cx = wide ? (left ? w * p.rr(0.5, 0.62) : w * p.rr(0.38, 0.5)) : w * p.rr(0.42, 0.58);
  const peak = h * (wide ? 0.2 : 0.3);
  const base = wallTop + u * 0.02;
  for (const near of [false, true]) {
    let x = -p.rr(0, u * 0.08);
    while (x < w) {
      const bw = u * p.rr(0.06, 0.12) * (near ? 1.15 : 0.85);
      const fall = Math.min(1, Math.abs(x + bw / 2 - cx) / (w * 0.5));
      const top = Math.min(base - u * 0.06, peak + (wallTop - peak) * (near ? 0.4 + fall * 0.45 : 0.05 + fall * 0.75) + p.rr(-1, 1) * u * 0.03);
      tower(p, x, top, bw, base, near ? CITY_NEAR : CITY_FAR, lit);
      x += bw * p.rr(0.7, 1);
    }
  }

  // The great wall, crowned with waves, with the water gate between two towers.
  fill(p, WALL.face, (k) => k.rect(-4, wallTop, w + 8, wallBottom - wallTop));
  const step = u * p.rr(0.065, 0.085);
  for (let x = -step * p.r(); x < w + step; x += step) crest(p, x, wallTop, step, WALL);
  const rows = p.ri(3, 4);
  const bh = (wallBottom - wallTop) / rows;
  for (let r = 0; r < rows; r++) {
    const y0 = wallTop + r * bh;
    if (r > 0)
      line(p, WALL.shade, 1.3, (k) => {
        k.moveTo(-4, y0);
        k.lineTo(w + 4, y0);
      });
    const bl = bh * p.rr(1.8, 2.4);
    for (let x = (r % 2) * bl * 0.5 - bl; x < w + bl; x += bl)
      line(p, WALL.shade, 1.1, (k) => {
        k.moveTo(x, y0);
        k.lineTo(x, y0 + bh);
      });
  }
  const gw = u * p.rr(0.13, 0.17);
  const gh = (wallBottom - wallTop) * 0.85;
  for (const sgn of [-1, 1]) tower(p, cx + sgn * gw * 0.95 - gw * 0.24, wallTop - u * p.rr(0.08, 0.12), gw * 0.48, wallBottom, WALL, lit);
  arch(p, cx, wallBottom - gh / 2, gw, gh, NAVY);

  // The canal: dark water, the moon on it in broken bars, and ripples cut into the block.
  fill(p, NAVY, (k) => k.rect(-4, wallBottom, w + 8, h - wallBottom + 4));
  for (let i = 0; i < 16; i++) {
    const yy = wallBottom + u * 0.02 + i * u * 0.028;
    if (yy > h) break;
    const len = mr * p.rr(0.5, 1.5) * (1 - i * 0.035);
    const off = p.rr(-0.15, 0.15) * mr;
    line(p, ICE, p.rr(1.2, 2.6), (k) => {
      k.moveTo(mx + off - len / 2, yy);
      k.lineTo(mx + off + len / 2, yy);
    });
  }
  for (let i = 0; i < 30 * p.detail; i++) {
    const rx = p.rr(-20, w + 20);
    const ry = p.rr(wallBottom + 4, h);
    const rl = u * p.rr(0.025, 0.07);
    line(p, BLUE, p.rr(1, 1.8), (k) => {
      k.moveTo(rx - rl, ry);
      k.quadraticCurveTo(rx, ry - rl * 0.3, rx + rl, ry);
    });
  }
  if (p.r() < 0.65) {
    const bx = w * (p.r() < 0.5 ? p.rr(0.12, 0.32) : p.rr(0.68, 0.88));
    canoe(p, bx, wallBottom + (h - wallBottom) * p.rr(0.5, 0.7), u * p.rr(0.2, 0.26), p.r() < 0.5 ? 1 : -1);
  }
}

// ---------- people of the Water Tribes ----------

type Who = 'katara' | 'sokka' | 'korra';

const SKY = hsl(201, 50, 66);
const HAIR = hsl(18, 34, 13);
const HAIR_LIGHT = hsl(22, 30, 30);
const SKIN = hsl(24, 42, 44);
const SKIN_SHADE = hsl(18, 42, 33);
const LIPS = hsl(4, 38, 30);
const BONE = hsl(38, 42, 78);
const BONE_DARK = hsl(30, 38, 52);

/**
 * A head-and-shoulders print of Katara, Sokka or Korra, told apart by what fans know them by: Katara's
 * hair loops and necklace, Sokka's wolf tail and boomerang, Korra's hair tubes and bare shoulders.
 */
function portrait(p: Press, who: Who) {
  const { w, h } = p;
  const aspect = w / h;
  const side = aspect > 1.25 ? (p.r() < 0.5 ? -1 : 1) : 0;
  const s = Math.min(h * (side ? 0.36 : 0.32), w * (side ? 0.3 : 0.44));
  const x = side ? w * (0.5 + side * 0.2) : w * 0.5;
  const y = side ? h * 0.42 : h * (aspect < 0.75 ? 0.42 : 0.4);
  const lit = p.r() < 0.5 ? -1 : 1;
  const rx = s * 0.32;
  const ry = s * 0.44;
  const disc = p.pick([SKY, ICE, hsl(208, 40, 76)]);
  const dr = s * p.rr(0.95, 1.12);
  fill(p, disc, (k) => k.arc(x, y - s * 0.05, dr, 0, TAU));
  line(p, BLUE, Math.max(1.2, s * 0.02), (k) => k.arc(x, y - s * 0.05, dr * 1.08, 0, TAU));
  if (side) {
    const ox = w * (0.5 - side * 0.26);
    if (who === 'katara') waterWhip(p, ox, h * 0.5, s, side);
    else if (who === 'sokka') flyingBoomerang(p, ox, h * 0.45, s * 0.7, side);
    else naga(p, ox, h * 0.55, s * 0.9, side);
  }
  // Behind the head and shoulders.
  if (who === 'katara') {
    const back: Trace = (k) => {
      k.moveTo(x - rx * 1.15, y + ry * 1.9);
      k.bezierCurveTo(x - rx * 1.5, y + ry * 0.6, x - rx * 1.4, y - ry * 1.25, x, y - ry * 1.14);
      k.bezierCurveTo(x + rx * 1.4, y - ry * 1.25, x + rx * 1.5, y + ry * 0.6, x + rx * 1.15, y + ry * 1.9);
      k.closePath();
    };
    fill(p, HAIR, back, true);
    // Strands cut into the hair.
    for (let i = 0; i < 8; i++) {
      const sgn = i % 2 ? 1 : -1;
      const off = p.rr(1.05, 1.35);
      line(
        p,
        HAIR_LIGHT,
        Math.max(1, rx * 0.025),
        (k) => {
          k.moveTo(x + sgn * rx * (off - 0.2), y - ry * 0.6);
          k.quadraticCurveTo(x + sgn * rx * (off + 0.1), y + ry * 0.5, x + sgn * rx * (off - 0.1), y + ry * 1.7);
        },
        true,
      );
    }
  } else if (who === 'sokka') {
    // The boomerang he carries on his back, one arm showing over his shoulder.
    const bs = -lit;
    boomerang(p, x + bs * s * 0.62, y + s * 0.74, s * 0.5, -Math.PI / 2 + bs * 1.1);
    const tilt = lit * 0.25;
    fill(
      p,
      HAIR,
      (k) => {
        k.moveTo(x - rx * 0.2, y - ry * 0.8);
        k.quadraticCurveTo(x - rx * 0.25 + tilt * rx, y - ry * 1.45, x + tilt * rx * 2, y - ry * 1.68);
        k.quadraticCurveTo(x + rx * 0.3 + tilt * rx, y - ry * 1.35, x + rx * 0.2, y - ry * 0.8);
        k.closePath();
      },
      true,
    );
  } else {
    const ts = -lit;
    fill(
      p,
      HAIR,
      (k) => {
        k.moveTo(x + ts * rx * 0.2, y - ry * 0.9);
        k.bezierCurveTo(x + ts * rx * 1.4, y - ry * 0.9, x + ts * rx * 1.5, y + ry * 0.4, x + ts * rx * 1.3, y + ry * 1.7);
        k.lineTo(x + ts * rx * 0.95, y + ry * 1.6);
        k.bezierCurveTo(x + ts * rx * 1.1, y + ry * 0.4, x + ts * rx * 0.9, y - ry * 0.4, x + ts * rx * 0.1, y - ry * 0.6);
        k.closePath();
      },
      true,
    );
  }
  if (who === 'korra') sleeveless(p, x, y, s, lit);
  else parka(p, x, y, s, lit);
  const neck: Trace = (k) => k.rect(x - rx * 0.42, y + ry * 0.5, rx * 0.84, ry * 1.05);
  fill(p, SKIN, neck);
  within(p, neck, () => fill(p, SKIN_SHADE, (k) => k.ellipse(x, y + ry * 0.78, rx * 0.7, ry * 0.3, 0, 0, TAU)));
  if (who !== 'korra') furCollar(p, x, y + s * 0.62, s);
  else
    fill(p, BLUE, (k) => {
      k.moveTo(x - rx * 0.9, y + s * 0.66);
      k.quadraticCurveTo(x, y + s * 0.9, x + rx * 0.9, y + s * 0.66);
      k.lineTo(x + rx * 0.9, y + s * 0.74);
      k.quadraticCurveTo(x, y + s * 0.98, x - rx * 0.9, y + s * 0.74);
      k.closePath();
    });
  head(p, x, y, rx, ry, lit);
  features(p, x, y, rx, ry, who);
  // In front of the face.
  if (who === 'katara') {
    for (const sgn of [-1, 1]) {
      fill(
        p,
        HAIR,
        (k) => {
          k.moveTo(x, y - ry * 1.02);
          k.quadraticCurveTo(x + sgn * rx * 0.12, y - ry * 0.62, x + sgn * rx * 0.6, y - ry * 0.48);
          k.quadraticCurveTo(x + sgn * rx * 0.92, y - ry * 0.36, x + sgn * rx * 1.04, y + ry * 0.02);
          k.bezierCurveTo(x + sgn * rx * 1.1, y - ry * 0.7, x + sgn * rx * 0.6, y - ry * 1.12, x, y - ry * 1.1);
          k.closePath();
        },
        true,
      );
      // Her hair loops: a strand on each side looped down beside the face and tied with a bead.
      const lx = x + sgn * rx * 0.98;
      const loop: Trace = (k) => k.ellipse(lx, y + ry * 0.2, rx * 0.12, ry * 0.36, sgn * -0.08, 0, TAU);
      line(p, BLACK, rx * 0.17, loop, true);
      line(p, HAIR_LIGHT, rx * 0.08, loop, true);
      fill(p, BLUE, (k) => k.arc(lx, y - ry * 0.17, rx * 0.085, 0, TAU));
    }
    // Her mother's necklace: a blue choker with a carved pendant.
    line(p, BLUE, ry * 0.08, (k) => {
      k.moveTo(x - rx * 0.43, y + ry * 1.08);
      k.quadraticCurveTo(x, y + ry * 1.2, x + rx * 0.43, y + ry * 1.08);
    });
    pendant(p, x, y + ry * 1.27, rx * 0.15);
  } else if (who === 'sokka') {
    fill(
      p,
      HAIR,
      (k) => {
        k.moveTo(x - rx * 0.55, y - ry * 0.55);
        k.quadraticCurveTo(x - rx * 0.62, y - ry * 1.02, x, y - ry * 1.0);
        k.quadraticCurveTo(x + rx * 0.62, y - ry * 1.02, x + rx * 0.55, y - ry * 0.55);
        k.quadraticCurveTo(x, y - ry * 0.7, x - rx * 0.55, y - ry * 0.55);
        k.closePath();
      },
      true,
    );
    fill(p, BLUE, (k) => k.ellipse(x + lit * 0.25 * rx * 0.6, y - ry * 1.02, rx * 0.12, ry * 0.05, 0, 0, TAU));
  } else {
    fill(
      p,
      HAIR,
      (k) => {
        k.moveTo(x - rx * 1.02, y - ry * 0.1);
        k.bezierCurveTo(x - rx * 1.1, y - ry * 0.85, x - rx * 0.6, y - ry * 1.14, x, y - ry * 1.12);
        k.bezierCurveTo(x + rx * 0.6, y - ry * 1.14, x + rx * 1.1, y - ry * 0.85, x + rx * 1.02, y - ry * 0.1);
        k.quadraticCurveTo(x + rx * 0.8, y - ry * 0.62, x, y - ry * 0.62);
        k.quadraticCurveTo(x - rx * 0.8, y - ry * 0.62, x - rx * 1.02, y - ry * 0.1);
        k.closePath();
      },
      true,
    );
    for (const sgn of [-1, 1]) {
      line(
        p,
        HAIR,
        rx * 0.17,
        (k) => {
          k.moveTo(x + sgn * rx * 0.86, y - ry * 0.45);
          k.quadraticCurveTo(x + sgn * rx * 1.08, y + ry * 0.1, x + sgn * rx * 1.0, y + ry * 0.78);
        },
        true,
      );
      const tx = x + sgn * rx * 1.04;
      const ty = y + ry * 0.12;
      fill(p, SKY, (k) => k.roundRect(tx - rx * 0.12, ty - ry * 0.13, rx * 0.24, ry * 0.26, rx * 0.06));
      line(p, BLUE, Math.max(1, rx * 0.03), (k) => {
        k.moveTo(tx - rx * 0.12, ty);
        k.lineTo(tx + rx * 0.12, ty);
      });
    }
  }
}

/** A blue parka with white fur down the front. */
function parka(p: Press, x: number, y: number, s: number, lit: number) {
  const { h } = p;
  const top = y + s * 0.58;
  const half = s * 0.95;
  const body: Trace = (k) => {
    k.moveTo(x - s * 0.3, top);
    k.bezierCurveTo(x - half * 0.9, top + s * 0.02, x - half * 1.15, top + s * 0.25, x - half * 1.3, h + 4);
    k.lineTo(x + half * 1.3, h + 4);
    k.bezierCurveTo(x + half * 1.15, top + s * 0.25, x + half * 0.9, top + s * 0.02, x + s * 0.3, top);
    k.closePath();
  };
  fill(p, BLUE, body);
  within(p, body, () => {
    fill(p, NAVY, (k) => k.rect(lit < 0 ? x + half * 0.45 : x - half * 2, top, half * 1.55, h));
    fill(p, SNOW, (k) => k.rect(x - s * 0.1, top, s * 0.2, h));
    for (let yy = top + s * 0.1; yy < h; yy += s * 0.09) {
      const y0 = yy;
      line(p, ICE, 1, (k) => {
        k.moveTo(x - s * 0.08, y0);
        k.lineTo(x - s * 0.03, y0 + s * 0.04);
        k.moveTo(x + s * 0.08, y0 + s * 0.02);
        k.lineTo(x + s * 0.03, y0 + s * 0.06);
      });
    }
  });
}

/** Bare shoulders and a sleeveless blue top. */
function sleeveless(p: Press, x: number, y: number, s: number, lit: number) {
  const { h } = p;
  const top = y + s * 0.6;
  const half = s * 0.95;
  const shoulders: Trace = (k) => {
    k.moveTo(x - s * 0.3, top);
    k.bezierCurveTo(x - half * 0.9, top + s * 0.02, x - half * 1.2, top + s * 0.2, x - half * 1.25, h + 4);
    k.lineTo(x + half * 1.25, h + 4);
    k.bezierCurveTo(x + half * 1.2, top + s * 0.2, x + half * 0.9, top + s * 0.02, x + s * 0.3, top);
    k.closePath();
  };
  fill(p, SKIN, shoulders);
  within(p, shoulders, () => fill(p, SKIN_SHADE, (k) => k.rect(lit < 0 ? x + half * 0.6 : x - half * 2, top, half * 1.4, h)));
  const shirt: Trace = (k) => {
    k.moveTo(x - half * 0.62, top + s * 0.08);
    k.quadraticCurveTo(x - half * 0.75, top + s * 0.5, x - half * 0.95, h + 4);
    k.lineTo(x + half * 0.95, h + 4);
    k.quadraticCurveTo(x + half * 0.75, top + s * 0.5, x + half * 0.62, top + s * 0.08);
    k.quadraticCurveTo(x, top + s * 0.3, x - half * 0.62, top + s * 0.08);
    k.closePath();
  };
  fill(p, NAVY, shirt);
  within(p, shirt, () => fill(p, BLUE, (k) => k.rect(lit < 0 ? x - half : x, top, half, h)));
}

/** A ruff of white fur round the neck, open at the throat. */
function furCollar(p: Press, x: number, y: number, s: number) {
  const n = 30;
  const tuftPath = (k: Ctx, rxo: number, ryo: number, a0: number, a1: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      const r = 1 + (i % 2 ? 0.07 : -0.03);
      const px = x + Math.cos(a) * rxo * r;
      const py = y + Math.sin(a) * ryo * r;
      if (i === 0) k.moveTo(px, py);
      else k.lineTo(px, py);
    }
  };
  fill(p, SNOW, (k) => {
    tuftPath(k, s * 0.62, s * 0.2, Math.PI * 0.05, Math.PI * 0.95);
    k.lineTo(x - s * 0.2, y - s * 0.02);
    k.quadraticCurveTo(x, y + s * 0.12, x + s * 0.2, y - s * 0.02);
    k.closePath();
  });
  for (let i = 0; i < 26; i++) {
    const a = p.rr(Math.PI * 0.1, Math.PI * 0.9);
    const d = p.rr(0.5, 0.92);
    const fx = x + Math.cos(a) * s * 0.6 * d;
    const fy = y + Math.sin(a) * s * 0.2 * d;
    line(p, ICE, 1.1, (k) => {
      k.moveTo(fx, fy);
      k.lineTo(fx + Math.cos(a) * s * 0.04, fy + Math.sin(a) * s * 0.04);
    });
  }
}

/** Ears, face and the shadow on its far side. */
function head(p: Press, x: number, y: number, rx: number, ry: number, lit: number) {
  for (const sgn of [-1, 1]) fill(p, sgn === -lit ? SKIN_SHADE : SKIN, (k) => k.ellipse(x + sgn * rx * 0.97, y + ry * 0.05, rx * 0.14, ry * 0.19, 0, 0, TAU));
  const face: Trace = (k) => {
    k.moveTo(x - rx, y - ry * 0.15);
    k.bezierCurveTo(x - rx * 1.02, y + ry * 0.5, x - rx * 0.48, y + ry * 0.98, x, y + ry);
    k.bezierCurveTo(x + rx * 0.48, y + ry * 0.98, x + rx * 1.02, y + ry * 0.5, x + rx, y - ry * 0.15);
    k.bezierCurveTo(x + rx * 1.02, y - ry * 1.18, x - rx * 1.02, y - ry * 1.18, x - rx, y - ry * 0.15);
    k.closePath();
  };
  fill(p, SKIN, face);
  within(p, face, () => fill(p, SKIN_SHADE, (k) => k.ellipse(x - lit * rx * 1.15, y + ry * 0.1, rx * 0.6, ry * 1.4, 0, 0, TAU)));
}

/** Blue eyes with a heavy upper lid, brows, nose and mouth, each a little different per person. */
function features(p: Press, x: number, y: number, rx: number, ry: number, who: Who) {
  const ey = y + ry * 0.08;
  const browLift = who === 'korra' ? -0.04 : who === 'sokka' ? 0.02 : 0.06;
  const browW = who === 'katara' ? 0.035 : 0.055;
  for (const sgn of [-1, 1]) {
    const ex = x + sgn * rx * 0.43;
    const ew = rx * 0.42;
    const eh = ry * 0.15;
    const eye: Trace = (k) => {
      k.translate(ex, ey);
      k.scale(sgn, 1);
      k.moveTo(-ew * 0.5, eh * 0.2);
      k.quadraticCurveTo(-ew * 0.05, -eh * 1.3, ew * 0.5, -eh * 0.25);
      k.quadraticCurveTo(ew * 0.1, eh * 1.1, -ew * 0.5, eh * 0.2);
      k.closePath();
    };
    fill(p, SNOW, eye, true);
    within(
      p,
      eye,
      () => {
        fill(p, hsl(205, 70, 46), (k) => k.arc(ex - sgn * ew * 0.04, ey, eh * 0.72, 0, TAU), true);
        fill(p, BLACK, (k) => k.arc(ex - sgn * ew * 0.04, ey, eh * 0.34, 0, TAU), true);
        fill(p, SNOW, (k) => k.arc(ex - sgn * ew * 0.1, ey - eh * 0.25, eh * 0.16, 0, TAU), true);
      },
      true,
    );
    line(
      p,
      BLACK,
      Math.max(1.4, ry * 0.04),
      (k) => {
        k.translate(ex, ey);
        k.scale(sgn, 1);
        k.moveTo(-ew * 0.52, eh * 0.15);
        k.quadraticCurveTo(-ew * 0.05, -eh * 1.35, ew * 0.58, -eh * 0.45);
        if (who !== 'sokka') k.lineTo(ew * 0.68, -eh * 0.7);
      },
      true,
    );
    line(
      p,
      HAIR,
      Math.max(1.4, ry * browW),
      (k) => {
        k.translate(ex, ey);
        k.scale(sgn, 1);
        k.moveTo(-ew * 0.45, -eh * 2.2 + ry * browLift);
        k.quadraticCurveTo(ew * 0.05, -eh * (who === 'katara' ? 3.0 : 2.7), ew * 0.6, -eh * 2.3 - ry * browLift);
      },
      true,
    );
  }
  line(
    p,
    SKIN_SHADE,
    Math.max(1, ry * 0.03),
    (k) => {
      k.moveTo(x + rx * 0.02, y + ry * 0.32);
      k.lineTo(x + rx * 0.1, y + ry * 0.42);
      k.lineTo(x - rx * 0.02, y + ry * 0.44);
    },
    true,
  );
  const smirk = who === 'sokka' ? 0.06 : 0;
  line(
    p,
    LIPS,
    Math.max(1.2, ry * 0.035),
    (k) => {
      k.moveTo(x - rx * 0.18, y + ry * 0.62 - ry * smirk);
      k.quadraticCurveTo(x, y + ry * 0.69, x + rx * 0.2, y + ry * 0.6 - ry * smirk * 2);
    },
    true,
  );
}

/** A round pendant with a crescent moon over a wave, cut into pale stone. */
function pendant(p: Press, x: number, y: number, r: number) {
  fill(p, SKY, (k) => k.arc(x, y, r, 0, TAU));
  line(p, NAVY, Math.max(1, r * 0.12), (k) => k.arc(x, y, r, 0, TAU));
  line(p, NAVY, Math.max(1, r * 0.12), (k) => {
    k.arc(x + r * 0.1, y - r * 0.25, r * 0.32, Math.PI * 0.6, Math.PI * 1.6);
    k.moveTo(x - r * 0.6, y + r * 0.35);
    k.quadraticCurveTo(x - r * 0.3, y + r * 0.1, x, y + r * 0.35);
    k.quadraticCurveTo(x + r * 0.3, y + r * 0.6, x + r * 0.6, y + r * 0.35);
  });
}

/**
 * Sokka's boomerang: elbow at (x, y), arms of length `s` either side of direction `ang`. Pale wood with a
 * black edge and a bound grip.
 */
function boomerang(p: Press, x: number, y: number, s: number, ang: number) {
  const half = 0.95;
  const ax = x + Math.cos(ang - half) * s;
  const ay = y + Math.sin(ang - half) * s;
  const bx = x + Math.cos(ang + half) * s;
  const by = y + Math.sin(ang + half) * s;
  // Control point that puts the curve's apex on the elbow.
  const qx = 2 * x - (ax + bx) / 2;
  const qy = 2 * y - (ay + by) / 2;
  const path: Trace = (k) => {
    k.moveTo(ax, ay);
    k.quadraticCurveTo(qx, qy, bx, by);
  };
  line(p, BLACK, s * 0.28, path, true);
  line(p, BONE, s * 0.21, path);
  line(p, BONE_DARK, Math.max(1, s * 0.03), path);
  const tx = (bx - ax) / Math.hypot(bx - ax, by - ay);
  const ty = (by - ay) / Math.hypot(bx - ax, by - ay);
  const nx = Math.cos(ang);
  const ny = Math.sin(ang);
  for (let i = -2; i <= 2; i++) {
    const cx = x - nx * s * 0.0 + tx * i * s * 0.07;
    const cy = y - ny * s * 0.0 + ty * i * s * 0.07;
    line(
      p,
      HIDE_DARK,
      Math.max(1.2, s * 0.035),
      (k) => {
        k.moveTo(cx - nx * s * 0.1, cy - ny * s * 0.1);
        k.lineTo(cx + nx * s * 0.1, cy + ny * s * 0.1);
      },
      true,
    );
  }
}

/** A boomerang in flight with its spinning trail. */
function flyingBoomerang(p: Press, x: number, y: number, s: number, side: number) {
  for (let i = 0; i < 3; i++) {
    const r = s * (0.9 + i * 0.3);
    line(p, SKY, Math.max(1.2, s * 0.03), (k) => k.arc(x + side * s * 0.6, y + s * 0.4, r, Math.PI * 1.05, Math.PI * 1.55));
  }
  boomerang(p, x, y, s * 0.6, p.rr(0, TAU));
}

/** A ribbon of water whipping up from below and curling over at the top. */
function waterWhip(p: Press, x: number, y: number, s: number, side: number) {
  const N = 40;
  const pts: { x: number; y: number; wd: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * Math.PI * 2.2;
    const r = s * (1.1 - t * 0.7);
    pts.push({ x: x + Math.sin(a) * r * 0.55 * -side, y: y + s * 1.3 - t * s * 2.4 + Math.cos(a) * r * 0.15, wd: s * (0.16 - t * 0.12) });
  }
  const band: Trace = (k) => {
    k.moveTo(pts[0].x - pts[0].wd, pts[0].y);
    for (const q of pts) k.lineTo(q.x - q.wd, q.y);
    for (let i = N; i >= 0; i--) k.lineTo(pts[i].x + pts[i].wd, pts[i].y);
    k.closePath();
  };
  fill(p, BLUE, band);
  line(p, SKY, Math.max(1.2, s * 0.03), (k) => {
    k.moveTo(pts[2].x, pts[2].y);
    for (let i = 3; i < N; i++) k.lineTo(pts[i].x + pts[i].wd * 0.3, pts[i].y);
  });
  for (let i = 0; i < 12; i++) {
    const q = pts[p.ri(4, N)];
    const dx = q.x + p.rr(-1, 1) * s * 0.35;
    const dy = q.y + p.rr(-1, 1) * s * 0.2;
    const dr = s * p.rr(0.02, 0.05);
    fill(p, BLUE, (k) => k.arc(dx, dy, dr, 0, TAU));
  }
}

/** Korra's polar bear dog, Naga: a big white head looking in from the side. */
function naga(p: Press, x: number, y: number, s: number, side: number) {
  const f = side;
  const neck: Trace = (k) => {
    k.moveTo(x - f * s * 0.9, p.h + 4);
    k.quadraticCurveTo(x - f * s * 0.8, y + s * 0.2, x - f * s * 0.1, y - s * 0.2);
    k.lineTo(x + f * s * 0.3, y + s * 0.4);
    k.quadraticCurveTo(x + f * s * 0.3, y + s * 0.9, x + f * s * 0.2, p.h + 4);
    k.closePath();
  };
  fill(p, SNOW, neck);
  line(p, BLACK, 1.6, neck, true);
  for (const ex of [-0.35, 0.05]) {
    const earX = x + f * s * ex;
    const ear: Trace = (k) => k.ellipse(earX, y - s * 0.42, s * 0.12, s * 0.15, f * 0.3, 0, TAU);
    fill(p, SNOW, ear);
    line(p, BLACK, 1.5, ear, true);
  }
  const headShape: Trace = (k) => k.ellipse(x, y - s * 0.1, s * 0.5, s * 0.4, 0, 0, TAU);
  const snout: Trace = (k) => k.ellipse(x + f * s * 0.45, y + s * 0.05, s * 0.36, s * 0.22, f * 0.1, 0, TAU);
  for (const part of [headShape, snout]) fill(p, SNOW, part);
  for (const part of [headShape, snout]) line(p, BLACK, 1.6, part, true);
  fill(p, SNOW, (k) => k.ellipse(x + f * s * 0.2, y - s * 0.02, s * 0.35, s * 0.25, 0, 0, TAU));
  fill(p, BLACK, (k) => k.ellipse(x + f * s * 0.8, y - s * 0.02, s * 0.08, s * 0.06, 0, 0, TAU), true);
  fill(p, BLACK, (k) => k.ellipse(x + f * s * 0.18, y - s * 0.18, s * 0.06, s * 0.045, f * 0.3, 0, TAU), true);
  line(
    p,
    BLACK,
    1.5,
    (k) => {
      k.moveTo(x + f * s * 0.78, y + s * 0.1);
      k.quadraticCurveTo(x + f * s * 0.6, y + s * 0.22, x + f * s * 0.35, y + s * 0.16);
    },
    true,
  );
  for (let i = 0; i < 14; i++) {
    const fx = x + p.rr(-0.6, 0.4) * s * f;
    const fy = y + p.rr(0.2, 1.2) * s;
    line(p, ICE, 1.1, (k) => {
      k.moveTo(fx, fy);
      k.lineTo(fx - f * s * 0.05, fy + s * 0.06);
    });
  }
}

// ---------- keepsakes ----------

/** Sokka's boomerang, Katara's necklace and sometimes her water skin, laid on a fur pelt over blue cloth. */
function keepsakes(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const aspect = w / h;
  fill(p, NAVY, (k) => k.rect(-4, -4, w + 8, h + 8));
  for (let y = u * 0.02; y < h; y += u * 0.035) {
    const yy = y;
    line(p, hsl(214, 50, 28), 1.2, (k) => {
      k.moveTo(-4, yy);
      k.lineTo(w + 4, yy + p.rr(-2, 2));
    });
  }
  pelt(p, w / 2, h / 2, w * (aspect > 1.4 ? 0.44 : 0.42), h * (aspect < 0.8 ? 0.43 : 0.4));
  if (aspect > 1.4) {
    boomerang(p, w * 0.27, h * 0.42, u * 0.36, Math.PI * p.rr(0.3, 0.7));
    necklace(p, w * 0.55, h * 0.52, u * 0.3, p.rr(-0.3, 0.3));
    pouch(p, w * 0.77, h * 0.5, u * 0.32, p.rr(-0.3, 0.3));
  } else if (aspect < 0.8) {
    boomerang(p, w * 0.5, h * 0.25, w * 0.3, -Math.PI / 2 + p.rr(-0.3, 0.3));
    necklace(p, w * 0.5, h * 0.52, w * 0.28, p.rr(-0.4, 0.4));
    if (aspect > 0.6) pouch(p, w * 0.52, h * 0.77, w * 0.26, p.rr(-0.4, 0.4));
  } else {
    boomerang(p, w * 0.38, h * 0.38, u * 0.34, Math.PI * p.rr(0.15, 0.35));
    necklace(p, w * 0.62, h * 0.62, u * 0.28, p.rr(-0.4, 0.4));
  }
}

/** A white fur pelt with a ragged edge and combed fur cut into it. */
function pelt(p: Press, cx: number, cy: number, rx: number, ry: number) {
  const n = 64;
  const shape: Trace = (k) => {
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const r = 1 + Math.sin(a * 3 + 1) * 0.04 + (i % 2 ? 0.035 : -0.02);
      const px = cx + Math.cos(a) * rx * r * (1 + 0.08 * Math.cos(a) ** 8);
      const py = cy + Math.sin(a) * ry * r;
      if (i === 0) k.moveTo(px, py);
      else k.lineTo(px, py);
    }
    k.closePath();
  };
  fill(p, SNOW, shape);
  within(p, shape, () => {
    for (let i = 0; i < 160 * p.detail; i++) {
      const fx = cx + p.rr(-1, 1) * rx;
      const fy = cy + p.rr(-1, 1) * ry;
      const a = Math.atan2(fy - cy, fx - cx) + p.rr(-0.3, 0.3);
      const l = Math.min(rx, ry) * p.rr(0.04, 0.09);
      line(p, hsl(205, 22, 82), 1.1, (k) => {
        k.moveTo(fx, fy);
        k.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l);
      });
    }
  });
}

/** Katara's necklace: a loop of blue ribbon with a carved pendant and the ends tied in a bow. */
function necklace(p: Press, x: number, y: number, s: number, ang: number) {
  const loop: Trace = (k) => k.ellipse(x, y, s * 0.55, s * 0.42, ang, 0, TAU);
  line(p, BLACK, s * 0.1, loop, true);
  line(p, BLUE, s * 0.075, loop);
  line(p, SKY, Math.max(1, s * 0.014), loop);
  const top = { x: x + Math.sin(ang) * s * 0.42, y: y - Math.cos(ang) * s * 0.42 };
  for (const sgn of [-1, 1])
    line(p, BLUE, s * 0.06, (k) => {
      k.moveTo(top.x, top.y);
      k.quadraticCurveTo(top.x + sgn * s * 0.12, top.y - s * 0.2, top.x + sgn * s * 0.2, top.y - s * 0.12);
    });
  pendant(p, x - Math.sin(ang) * s * 0.42, y + Math.cos(ang) * s * 0.42, s * 0.14);
}

/** Katara's water skin: a leather flask with a stopper and a strap. */
function pouch(p: Press, x: number, y: number, s: number, ang: number) {
  const leather = hsl(28, 40, 36);
  const dark = hsl(24, 40, 24);
  const at = (k: Ctx) => {
    k.translate(x, y);
    k.rotate(ang);
  };
  const body: Trace = (k) => {
    at(k);
    k.moveTo(-s * 0.12, -s * 0.38);
    k.bezierCurveTo(-s * 0.5, -s * 0.3, -s * 0.48, s * 0.45, 0, s * 0.45);
    k.bezierCurveTo(s * 0.48, s * 0.45, s * 0.5, -s * 0.3, s * 0.12, -s * 0.38);
    k.closePath();
  };
  line(
    p,
    BLACK,
    Math.max(1.4, s * 0.03),
    (k) => {
      at(k);
      k.moveTo(-s * 0.1, -s * 0.42);
      k.bezierCurveTo(-s * 0.8, -s * 0.9, s * 0.9, -s * 0.95, s * 0.12, -s * 0.42);
    },
    true,
  );
  fill(p, leather, body);
  within(p, body, () => fill(p, dark, (k) => {
    at(k);
    k.rect(s * 0.12, -s * 0.5, s * 0.5, s * 1.1);
  }));
  line(p, BLACK, Math.max(1.4, s * 0.025), body, true);
  line(p, BONE_DARK, Math.max(1, s * 0.012), (k) => {
    at(k);
    k.setLineDash([s * 0.03, s * 0.03]);
    k.ellipse(0, s * 0.08, s * 0.28, s * 0.3, 0, 0, TAU);
  });
  fill(p, BONE, (k) => {
    at(k);
    k.roundRect(-s * 0.1, -s * 0.52, s * 0.2, s * 0.16, s * 0.04);
  });
}

// ---------- the Southern Water Tribe ----------

const SNOW_SHADE = hsl(204, 34, 80);
const SNOW_LINE = hsl(204, 30, 72);
const HIDE = hsl(32, 32, 58);
const HIDE_DARK = hsl(26, 34, 40);
const BEAK = hsl(30, 70, 52);

/** The village at the South Pole: igloos and hide tents behind a snow wall, and the watchtower. */
function southPole(p: Press) {
  const { c, w, h } = p;
  const u = Math.min(w, h);
  const aspect = w / h;
  const night = p.r() < 0.45;
  const lit = p.r() < 0.5 ? -1 : 1;
  const horizon = h * (aspect < 0.8 ? 0.44 : 0.46);
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  if (night) {
    sky.addColorStop(0, hsl(222, 50, 12));
    sky.addColorStop(1, hsl(210, 45, 32));
  } else {
    sky.addColorStop(0, hsl(204, 46, 60));
    sky.addColorStop(1, hsl(198, 38, 86));
  }
  fill(p, sky, (k) => k.rect(-4, -4, w + 8, horizon + 6));
  if (night) {
    aurora(p, horizon);
    for (let i = 0; i < 40; i++) {
      const sx = p.rr(0, w);
      const sy = p.rr(0, horizon * 0.8);
      const sr = p.rr(0.6, 1.6);
      fill(p, SNOW, (k) => k.arc(sx, sy, sr, 0, TAU));
    }
  } else {
    const sx = w * p.rr(0.2, 0.8);
    fill(p, hsl(44, 70, 86), (k) => k.arc(sx, horizon - u * 0.12, u * 0.07, 0, TAU));
  }
  ridge(p, horizon, u, night ? hsl(208, 30, 50) : hsl(203, 30, 74));
  // The sea with floes, then the snowfield with long blue drifts.
  const seaB = horizon + u * 0.07;
  fill(p, NAVY, (k) => k.rect(-4, horizon, w + 8, seaB - horizon));
  for (let i = 0; i < 9; i++) {
    const fx = p.rr(0, w);
    const fy = p.rr(horizon + u * 0.015, seaB - u * 0.012);
    const fw = u * p.rr(0.04, 0.12);
    fill(p, ICE, (k) => {
      k.moveTo(fx - fw / 2, fy);
      k.lineTo(fx - fw * 0.3, fy - u * 0.008);
      k.lineTo(fx + fw * 0.4, fy - u * 0.01);
      k.lineTo(fx + fw / 2, fy);
      k.lineTo(fx + fw * 0.2, fy + u * 0.008);
      k.closePath();
    });
  }
  fill(p, SNOW, (k) => k.rect(-4, seaB, w + 8, h - seaB + 4));
  for (let i = 0; i < 5; i++) {
    const dy = seaB + (h - seaB) * p.rr(0.05, 0.95);
    const dx = p.rr(0, w);
    fill(p, SNOW_SHADE, (k) => k.ellipse(dx, dy, w * p.rr(0.2, 0.45), u * p.rr(0.008, 0.02), 0, 0, TAU));
  }
  // The village along the ground line, the tower at one end.
  const ground = seaB + (h - seaB) * (aspect < 0.8 ? 0.48 : 0.5);
  const towerLeft = p.r() < 0.5;
  const tx = w * (towerLeft ? p.rr(0.14, 0.24) : p.rr(0.76, 0.86));
  watchtower(p, tx, ground, Math.min(ground * 0.8, u * p.rr(0.6, 0.75)), u * p.rr(0.12, 0.14), lit);
  const room0 = towerLeft ? tx + u * 0.16 : u * 0.04;
  const room1 = towerLeft ? w - u * 0.04 : tx - u * 0.16;
  for (let x = room0 + u * 0.08; x < room1 - u * 0.04; x += u * p.rr(0.24, 0.32)) {
    const s = u * p.rr(0.12, 0.16);
    if (p.r() < 0.55) igloo(p, x, ground, s, lit);
    else hut(p, x, ground, s * 1.25, lit);
  }
  // The snow wall in front, hiding the foot of the houses, with a gap to walk through.
  const wallY = ground + u * 0.07;
  const gap = w * p.rr(0.35, 0.65);
  snowWall(p, -u * 0.05, gap - u * 0.06, wallY, u * 0.045);
  snowWall(p, gap + u * 0.06, w + u * 0.05, wallY, u * 0.045);
  // Otter penguins waddling past, or a canoe on the sea.
  if (p.r() < 0.6) {
    const n = p.ri(2, 5);
    const dir = p.r() < 0.5 ? 1 : -1;
    const py = wallY + (h - wallY) * p.rr(0.45, 0.7);
    let px = w * p.rr(0.2, 0.6);
    for (let i = 0; i < n; i++) {
      penguin(p, px, py + p.rr(-1, 1) * u * 0.01, u * p.rr(0.07, 0.09), dir);
      px += dir * u * p.rr(0.09, 0.13);
    }
  } else {
    canoe(p, w * p.rr(0.3, 0.7), horizon + u * 0.05, u * 0.16, p.r() < 0.5 ? 1 : -1);
  }
}

/** Curtains of the southern lights, brushed in through a stencil. */
function aurora(p: Press, horizon: number) {
  const { c, w } = p;
  const bands = p.ri(2, 3);
  for (let b = 0; b < bands; b++) {
    const hue = p.pick([160, 172, 190, 280]);
    const top = horizon * p.rr(0.1, 0.4);
    const depth = horizon * p.rr(0.2, 0.35);
    const amp = horizon * p.rr(0.04, 0.12);
    const freq = p.rr(1.5, 3.5);
    const ph = p.rr(0, TAU);
    const g = c.createLinearGradient(0, top - amp, 0, top + depth + amp);
    g.addColorStop(0, hsl(hue, 60, 62, 0.5));
    g.addColorStop(1, hsl(hue, 60, 62, 0));
    fill(p, g, (k) => {
      const yAt = (x: number) => top + Math.sin((x / w) * freq * Math.PI + ph) * amp;
      k.moveTo(-4, yAt(-4));
      for (let x = 0; x <= w + 4; x += 8) k.lineTo(x, yAt(x));
      for (let x = w + 4; x >= -4; x -= 8) k.lineTo(x, yAt(x) + depth);
      k.closePath();
    });
  }
}

/** Jagged ice ridges along the horizon. */
function ridge(p: Press, y: number, u: number, ink: string) {
  const { w } = p;
  fill(p, ink, (k) => {
    k.moveTo(-4, y + 1);
    let x = -4;
    while (x < w + 4) {
      const hh = u * p.rr(0.02, 0.08);
      k.lineTo(x + u * p.rr(0.02, 0.05), y - hh);
      x += u * p.rr(0.05, 0.12);
      k.lineTo(x, y - hh * p.rr(0.1, 0.5));
    }
    k.lineTo(w + 4, y + 1);
    k.closePath();
  });
}

/** The lookout tower of packed snow, with a blue pennant. */
function watchtower(p: Press, x: number, base: number, th: number, tw: number, lit: number) {
  const top = base - th;
  const body: Trace = (k) => {
    k.moveTo(x - tw / 2, base);
    k.lineTo(x - tw * 0.4, top);
    k.lineTo(x + tw * 0.4, top);
    k.lineTo(x + tw / 2, base);
    k.closePath();
  };
  fill(p, SNOW, body);
  within(p, body, () => {
    fill(p, SNOW_SHADE, (k) => k.rect(lit < 0 ? x + tw * 0.14 : x - tw, top - 2, tw * 0.86, th + 4));
    for (let y = base - tw * 0.34, row = 0; y > top + 2; y -= tw * 0.34, row++) {
      const yy = y;
      line(p, SNOW_LINE, 1.2, (k) => {
        k.moveTo(x - tw, yy);
        k.lineTo(x + tw, yy);
      });
      for (let j = -2; j <= 2; j++) {
        const jx = x + (j + (row % 2) * 0.5) * tw * 0.42;
        line(p, SNOW_LINE, 1, (k) => {
          k.moveTo(jx, yy);
          k.lineTo(jx, yy + tw * 0.34);
        });
      }
    }
  });
  const pw = tw * 1.2;
  const ph = tw * 0.32;
  fill(p, SNOW, (k) => k.rect(x - pw / 2, top - ph, pw, ph));
  fill(p, SNOW_SHADE, (k) => k.rect(lit < 0 ? x + pw * 0.15 : x - pw / 2, top - ph, pw * 0.35, ph));
  for (let i = 0; i < 4; i++) fill(p, SNOW, (k) => k.rect(x - pw / 2 + i * pw * 0.29, top - ph - tw * 0.18, pw * 0.13, tw * 0.19));
  arch(p, x, top + tw * 0.5, tw * 0.22, tw * 0.4, NAVY);
  const poleTop = top - ph - tw * 1.1;
  line(
    p,
    BLACK,
    Math.max(1.4, tw * 0.035),
    (k) => {
      k.moveTo(x, top - ph);
      k.lineTo(x, poleTop);
    },
    true,
  );
  const fd = p.r() < 0.5 ? 1 : -1;
  fill(p, BLUE, (k) => {
    k.moveTo(x, poleTop);
    k.quadraticCurveTo(x + fd * tw * 0.4, poleTop + tw * 0.05, x + fd * tw * 0.75, poleTop + tw * 0.2);
    k.quadraticCurveTo(x + fd * tw * 0.4, poleTop + tw * 0.25, x, poleTop + tw * 0.42);
    k.closePath();
  });
}

/** A snow-block igloo with its entrance tunnel. */
function igloo(p: Press, x: number, base: number, r: number, lit: number) {
  const dome: Trace = (k) => k.ellipse(x, base, r, r * 0.8, 0, Math.PI, TAU);
  fill(p, SNOW, dome);
  within(p, dome, () => {
    fill(p, hsl(205, 36, 74), (k) => k.ellipse(x - lit * r * 0.95, base, r * 0.6, r * 1.1, 0, 0, TAU));
    for (let i = 1; i < 4; i++) {
      const yy = base - r * 0.8 * (i / 4);
      line(p, SNOW_LINE, 1.1, (k) => {
        k.moveTo(x - r, yy);
        k.lineTo(x + r, yy);
      });
      for (let j = -3; j <= 3; j++) {
        const jx = x + (j + (i % 2) * 0.5) * r * 0.36;
        line(p, SNOW_LINE, 1, (k) => {
          k.moveTo(jx, yy);
          k.lineTo(jx, yy + r * 0.2);
        });
      }
    }
  });
  line(p, hsl(206, 34, 62), Math.max(1.2, r * 0.03), dome);
  const ex = x + lit * r * 0.15;
  fill(p, SNOW, (k) => k.ellipse(ex, base, r * 0.34, r * 0.36, 0, Math.PI, TAU));
  line(p, hsl(206, 34, 62), Math.max(1, r * 0.025), (k) => k.ellipse(ex, base, r * 0.34, r * 0.36, 0, Math.PI, TAU));
  arch(p, ex, base - r * 0.13, r * 0.26, r * 0.26, NAVY);
}

/** A rounded hut of stitched hides with a blue band, a smoke hole and a door flap. */
function hut(p: Press, x: number, base: number, s: number, lit: number) {
  const body: Trace = (k) => {
    k.moveTo(x - s * 0.55, base);
    k.bezierCurveTo(x - s * 0.56, base - s * 0.55, x - s * 0.3, base - s * 0.86, x - s * 0.08, base - s * 0.9);
    k.lineTo(x + s * 0.08, base - s * 0.9);
    k.bezierCurveTo(x + s * 0.3, base - s * 0.86, x + s * 0.56, base - s * 0.55, x + s * 0.55, base);
    k.closePath();
  };
  fill(p, HIDE, body);
  within(p, body, () => {
    fill(p, HIDE_DARK, (k) => k.ellipse(x - lit * s * 0.62, base - s * 0.3, s * 0.36, s * 0.9, 0, 0, TAU));
    fill(p, BLUE, (k) => k.rect(x - s, base - s * 0.3, s * 2, s * 0.09));
    // Seams between the hides.
    for (let i = -2; i <= 2; i++) {
      const sx = x + i * s * 0.22;
      line(p, HIDE_DARK, 1, (k) => {
        k.moveTo(x + i * s * 0.03, base - s * 0.9);
        k.quadraticCurveTo(sx * 1 + i * s * 0.06, base - s * 0.5, sx + i * s * 0.03, base);
      });
    }
  });
  fill(p, BLACK, (k) => k.ellipse(x, base - s * 0.9, s * 0.09, s * 0.025, 0, 0, TAU), true);
  fill(p, NAVY, (k) => {
    k.moveTo(x - s * 0.13, base);
    k.quadraticCurveTo(x - s * 0.12, base - s * 0.36, x, base - s * 0.4);
    k.quadraticCurveTo(x + s * 0.12, base - s * 0.36, x + s * 0.13, base);
    k.closePath();
  });
}

/** Two courses of snow blocks from x0 to x1, standing on y. */
function snowWall(p: Press, x0: number, x1: number, y: number, bh: number) {
  const bw = bh * 1.9;
  for (let row = 0; row < 2; row++) {
    const yy = y - (row + 1) * bh;
    for (let x = x0 + (row % 2) * bw * 0.5; x < x1 - bw * 0.3; x += bw) {
      const bx = x;
      fill(p, SNOW, (k) => k.roundRect(bx + 1, yy + 1, bw - 2, bh - 2, bh * 0.18));
      line(p, SNOW_LINE, 1.1, (k) => k.roundRect(bx + 1, yy + 1, bw - 2, bh - 2, bh * 0.18));
    }
  }
}

/** An otter penguin facing `dir`. */
function penguin(p: Press, x: number, y: number, s: number, dir: number) {
  fill(p, BLACK, (k) => k.ellipse(x, y - s * 0.48, s * 0.3, s * 0.48, dir * 0.12, 0, TAU), true);
  fill(p, SNOW, (k) => k.ellipse(x + dir * s * 0.08, y - s * 0.42, s * 0.18, s * 0.34, dir * 0.12, 0, TAU));
  fill(p, BLACK, (k) => k.arc(x + dir * s * 0.08, y - s * 0.98, s * 0.19, 0, TAU), true);
  fill(p, SNOW, (k) => k.arc(x + dir * s * 0.15, y - s * 1.02, s * 0.045, 0, TAU), true);
  fill(p, BEAK, (k) => {
    k.moveTo(x + dir * s * 0.24, y - s * 1.0);
    k.lineTo(x + dir * s * 0.4, y - s * 0.95);
    k.lineTo(x + dir * s * 0.24, y - s * 0.91);
    k.closePath();
  });
  for (const fx of [-0.12, 0.12]) fill(p, BEAK, (k) => k.ellipse(x + fx * s + dir * s * 0.05, y, s * 0.1, s * 0.035, 0, 0, TAU));
}

// ---------- the Spirit Oasis ----------

const GRASS = hsl(172, 34, 30);
const GRASS_LIGHT = hsl(166, 30, 44);

/** Tui and La, the Moon and Ocean spirits, circling in their pond, seen from above. */
function oasis(p: Press) {
  const { w, h } = p;
  const u = Math.min(w, h);
  const aspect = w / h;
  const tall = aspect < 0.8;
  const wide = aspect > 1.35;
  const cx = w / 2;
  const cy = tall ? h * 0.6 : h * 0.5;
  const R = u * 0.4;
  const moonLeft = p.r() < 0.5;
  if (tall) moon(p, w * p.rr(0.4, 0.6), h * 0.17, u * 0.13, true);
  if (wide) {
    // The moon on one side, tall reeds on the other.
    const span = (w - 2.4 * R) / 2;
    moon(p, moonLeft ? span * 0.55 : w - span * 0.55, h * 0.4, Math.min(span * 0.34, u * 0.18), true);
    const rx = moonLeft ? w - span * 0.55 : span * 0.55;
    for (let i = 0; i < 7; i++) reed(p, rx + p.rr(-0.35, 0.35) * span, h * p.rr(0.82, 0.95), h * p.rr(0.45, 0.75), p.r() < 0.5 ? GRASS : GRASS_LIGHT);
  }
  // Grass all round the pond, its blades pointing away from the water.
  const n = Math.round(34 * p.detail);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + p.rr(-0.06, 0.06);
    const d = R * p.rr(0.98, 1.04);
    tuft(p, cx + Math.cos(a) * d, cy + Math.sin(a) * d, a, u * p.rr(0.06, 0.1), p.r() < 0.5 ? GRASS : GRASS_LIGHT);
  }
  fill(p, BLUE, (k) => k.arc(cx, cy, R, 0, TAU));
  for (let i = 0; i < 6; i++) {
    const rr = R * (0.16 + i * 0.13);
    let a = p.rr(0, TAU);
    for (let k = 0; k < 3; k++) {
      const len = p.rr(0.6, 1.6);
      const a0 = a;
      line(p, hsl(205, 46, 52), Math.max(1, u * 0.006), (q) => q.arc(cx, cy, rr, a0, a0 + len));
      a += len + p.rr(0.3, 0.9);
    }
  }
  line(p, NAVY, u * 0.022, (k) => k.arc(cx, cy, R, 0, TAU));
  const a0 = p.rr(0, TAU);
  koi(p, cx, cy, R * 0.5, a0, SNOW, BLACK);
  koi(p, cx, cy, R * 0.5, a0 + Math.PI, BLACK, SNOW);
}

/** A tuft of grass blades fanning out in direction `ang`. */
function tuft(p: Press, x: number, y: number, ang: number, s: number, ink: string) {
  const blades = p.ri(3, 5);
  for (let i = 0; i < blades; i++) {
    const a = ang + p.rr(-0.6, 0.6);
    const l = s * p.rr(0.6, 1);
    const tx = x + Math.cos(a) * l;
    const ty = y + Math.sin(a) * l;
    const nx = -Math.sin(a) * s * 0.07;
    const ny = Math.cos(a) * s * 0.07;
    const bend = p.rr(-0.3, 0.3) * l;
    fill(p, ink, (k) => {
      k.moveTo(x - nx, y - ny);
      k.quadraticCurveTo((x + tx) / 2 - Math.sin(a) * bend, (y + ty) / 2 + Math.cos(a) * bend, tx, ty);
      k.quadraticCurveTo((x + tx) / 2 - Math.sin(a) * bend + nx, (y + ty) / 2 + Math.cos(a) * bend + ny, x + nx, y + ny);
      k.closePath();
    });
  }
}

/** A tall reed with a seed head, rising from (x, y). */
function reed(p: Press, x: number, y: number, len: number, ink: string) {
  const lean = p.rr(-0.25, 0.25);
  const tx = x + lean * len;
  const ty = y - len;
  const wd = Math.max(1.5, len * 0.018);
  fill(p, ink, (k) => {
    k.moveTo(x - wd, y);
    k.quadraticCurveTo(x + lean * len * 0.3, y - len * 0.6, tx, ty);
    k.quadraticCurveTo(x + lean * len * 0.3 + wd, y - len * 0.6, x + wd, y);
    k.closePath();
  });
  if (p.r() < 0.6) fill(p, NAVY, (k) => k.ellipse(x + lean * len * 0.8, y - len * 0.8, wd * 1.8, len * 0.08, lean, 0, TAU));
}

/**
 * One of the two spirit koi, swimming round the pond centre on a widening arc, with a spot of the other
 * fish's colour on its head.
 */
function koi(p: Press, cx: number, cy: number, rf: number, a0: number, body: string, spot: string) {
  const span = 2.75;
  const N = 30;
  const width = (t: number) => (t < 0.7 ? 0.05 + 0.3 * Math.sin((t / 0.7) * (Math.PI / 2)) : 0.35 - 0.12 * ((t - 0.7) / 0.3) ** 2) * rf;
  const at = (t: number) => {
    const a = a0 + span * t;
    const r = rf * (0.7 + 0.42 * t);
    return { a, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a), wd: width(t) };
  };
  const pts = Array.from({ length: N + 1 }, (_, i) => at(i / N));
  const head = pts[N];
  const fx = -Math.sin(head.a);
  const fy = Math.cos(head.a);
  const outline: Trace = (k) => {
    k.moveTo(pts[0].x + pts[0].nx * pts[0].wd, pts[0].y + pts[0].ny * pts[0].wd);
    for (const q of pts) k.lineTo(q.x + q.nx * q.wd, q.y + q.ny * q.wd);
    const lx = head.x + head.nx * head.wd;
    const ly = head.y + head.ny * head.wd;
    const rx = head.x - head.nx * head.wd;
    const ry = head.y - head.ny * head.wd;
    k.bezierCurveTo(lx + fx * head.wd * 1.2, ly + fy * head.wd * 1.2, rx + fx * head.wd * 1.2, ry + fy * head.wd * 1.2, rx, ry);
    for (let i = N; i >= 0; i--) k.lineTo(pts[i].x - pts[i].nx * pts[i].wd, pts[i].y - pts[i].ny * pts[i].wd);
    k.closePath();
  };
  // A long, flowing tail fin and two side fins.
  const t0 = pts[0];
  const bx = Math.sin(t0.a);
  const by = -Math.cos(t0.a);
  const L = rf * 0.55;
  const tail: Trace = (k) => {
    k.moveTo(t0.x + t0.nx * rf * 0.05, t0.y + t0.ny * rf * 0.05);
    k.quadraticCurveTo(t0.x + bx * L * 0.4 + t0.nx * L * 0.65, t0.y + by * L * 0.4 + t0.ny * L * 0.65, t0.x + bx * L + t0.nx * L * 0.45, t0.y + by * L + t0.ny * L * 0.45);
    k.quadraticCurveTo(t0.x + bx * L * 0.5, t0.y + by * L * 0.5, t0.x + bx * L - t0.nx * L * 0.45, t0.y + by * L - t0.ny * L * 0.45);
    k.quadraticCurveTo(t0.x + bx * L * 0.4 - t0.nx * L * 0.65, t0.y + by * L * 0.4 - t0.ny * L * 0.65, t0.x - t0.nx * rf * 0.05, t0.y - t0.ny * rf * 0.05);
    k.closePath();
  };
  const f = pts[Math.round(N * 0.76)];
  const fbx = Math.sin(f.a);
  const fby = -Math.cos(f.a);
  const fins: Trace = (k) => {
    for (const sgn of [-1, 1]) {
      const ox = f.x + f.nx * f.wd * sgn * 0.85;
      const oy = f.y + f.ny * f.wd * sgn * 0.85;
      const tx = ox + f.nx * sgn * rf * 0.3 + fbx * rf * 0.26;
      const ty = oy + f.ny * sgn * rf * 0.3 + fby * rf * 0.26;
      k.moveTo(ox - fbx * rf * 0.06, oy - fby * rf * 0.06);
      k.quadraticCurveTo(ox + f.nx * sgn * rf * 0.3, oy + f.ny * sgn * rf * 0.3, tx, ty);
      k.quadraticCurveTo(ox + f.nx * sgn * rf * 0.06 + fbx * rf * 0.14, oy + f.ny * sgn * rf * 0.06 + fby * rf * 0.14, ox + fbx * rf * 0.1, oy + fby * rf * 0.1);
      k.closePath();
    }
  };
  const white = body === SNOW;
  for (const part of [tail, fins, outline]) fill(p, body, part, true);
  if (white) for (const part of [tail, fins, outline]) line(p, BLACK, 1.5, part, true);
  // Fin rays and scales cut into the body.
  const cut = white ? hsl(205, 22, 78) : hsl(215, 30, 32);
  for (let i = 0; i < 5; i++) {
    const s = (i - 2) / 2;
    line(p, cut, Math.max(1, rf * 0.012), (k) => {
      k.moveTo(t0.x, t0.y);
      k.lineTo(t0.x + bx * L * 0.85 + t0.nx * L * 0.4 * s, t0.y + by * L * 0.85 + t0.ny * L * 0.4 * s);
    }, true);
  }
  for (let i = 5; i < N - 5; i += 2) {
    const q = pts[i];
    const dir = q.a + Math.PI / 2;
    for (const sgn of [-1, 1]) {
      const sx = q.x + q.nx * q.wd * 0.45 * sgn;
      const sy = q.y + q.ny * q.wd * 0.45 * sgn;
      line(p, cut, Math.max(1, rf * 0.012), (k) => k.arc(sx, sy, q.wd * 0.32, dir - 1.1, dir + 1.1), true);
    }
  }
  const sp = pts[Math.round(N * 0.82)];
  fill(p, spot, (k) => k.arc(sp.x, sp.y, sp.wd * 0.42, 0, TAU), true);
  const e = pts[N - 1];
  for (const sgn of [-1, 1]) fill(p, white ? BLACK : SNOW, (k) => k.arc(e.x + e.nx * e.wd * 0.62 * sgn, e.y + e.ny * e.wd * 0.62 * sgn, rf * 0.035, 0, TAU), true);
}

/** An ice tower with a dome, a spire or battlements on top, lit from one side. */
function tower(p: Press, x: number, top: number, bw: number, base: number, tone: Tone, lit: number) {
  const shadeX = lit < 0 ? x + bw * 0.62 : x;
  const shadeW = bw * 0.38;
  fill(p, tone.face, (k) => k.rect(x, top, bw, base - top));
  fill(p, tone.shade, (k) => k.rect(shadeX, top, shadeW, base - top));
  const roof = p.r();
  if (roof < 0.45) {
    const dome: Trace = (k) => k.ellipse(x + bw / 2, top + 0.5, bw / 2, bw * 0.48, 0, Math.PI, TAU);
    fill(p, tone.face, dome);
    within(p, dome, () => fill(p, tone.shade, (k) => k.rect(shadeX, top - bw, shadeW, bw + 1)));
  } else if (roof < 0.8) {
    const tip = top - bw * p.rr(1, 1.9);
    fill(p, tone.face, (k) => {
      k.moveTo(x + bw * 0.12, top + 0.5);
      k.lineTo(x + bw / 2, tip);
      k.lineTo(x + bw * 0.88, top + 0.5);
      k.closePath();
    });
    fill(p, tone.shade, (k) => {
      k.moveTo(x + bw / 2, tip);
      k.lineTo(x + bw / 2 - lit * bw * 0.38, top + 0.5);
      k.lineTo(x + bw / 2, top + 0.5);
      k.closePath();
    });
  } else {
    for (let i = 0; i < 3; i++) fill(p, tone.face, (k) => k.rect(x + i * bw * 0.4, top - bw * 0.2, bw * 0.2, bw * 0.21));
  }
  const cols = bw > Math.min(p.w, p.h) * 0.09 ? 2 : 1;
  for (let wy = top + bw * 0.4; wy < base - bw * 0.3; wy += bw * p.rr(0.5, 0.7)) {
    if (p.r() < 0.3) continue;
    for (let i = 0; i < cols; i++) {
      const wx = x + bw * (cols === 1 ? 0.5 : 0.3 + i * 0.4);
      arch(p, wx, wy, bw * 0.15, bw * 0.24, p.r() < 0.14 ? hsl(44, 70, 74) : tone.window);
    }
  }
}

/** One wave of the crest along a wall top, curling over to the right. */
function crest(p: Press, x: number, y: number, s: number, tone: Tone) {
  fill(p, tone.face, (k) => {
    k.moveTo(x, y + 1);
    k.bezierCurveTo(x, y - s * 0.55, x + s * 0.35, y - s * 0.78, x + s * 0.62, y - s * 0.62);
    k.bezierCurveTo(x + s * 0.86, y - s * 0.48, x + s * 0.8, y - s * 0.2, x + s * 0.64, y - s * 0.22);
    k.bezierCurveTo(x + s * 0.74, y - s * 0.05, x + s * 0.9, y, x + s, y + 1);
    k.closePath();
  });
  line(p, tone.shade, Math.max(1, s * 0.07), (k) => k.arc(x + s * 0.52, y - s * 0.38, s * 0.13, Math.PI * 0.7, Math.PI * 2.2));
}

/** A canoe with a paddler, cut in black with a pale wake. */
function canoe(p: Press, x: number, y: number, len: number, dir: number) {
  for (let i = 1; i <= 3; i++)
    line(p, ICE, 1.2, (k) => {
      k.moveTo(x - dir * len * (0.5 + i * 0.12), y + i * len * 0.025);
      k.lineTo(x - dir * len * (0.15 + i * 0.05), y + i * len * 0.025);
    });
  fill(
    p,
    BLACK,
    (k) => {
      k.moveTo(x - len / 2, y - len * 0.08);
      k.quadraticCurveTo(x, y + len * 0.12, x + len / 2, y - len * 0.1);
      k.quadraticCurveTo(x, y + len * 0.02, x - len / 2, y - len * 0.08);
      k.closePath();
    },
    true,
  );
  line(p, ICE, 1.1, (k) => {
    k.moveTo(x - len * 0.45, y - len * 0.06);
    k.quadraticCurveTo(x, y + len * 0.03, x + len * 0.45, y - len * 0.08);
  });
  const px = x - dir * len * 0.05;
  fill(
    p,
    BLACK,
    (k) => {
      k.moveTo(px - len * 0.05, y);
      k.quadraticCurveTo(px - len * 0.06, y - len * 0.16, px, y - len * 0.18);
      k.quadraticCurveTo(px + len * 0.06, y - len * 0.16, px + len * 0.05, y);
      k.closePath();
      k.moveTo(px + len * 0.04, y - len * 0.23);
      k.arc(px, y - len * 0.23, len * 0.04, 0, TAU);
    },
    true,
  );
  line(
    p,
    BLACK,
    Math.max(1.2, len * 0.015),
    (k) => {
      k.moveTo(px - dir * len * 0.12, y - len * 0.22);
      k.lineTo(px + dir * len * 0.2, y + len * 0.1);
    },
    true,
  );
}
