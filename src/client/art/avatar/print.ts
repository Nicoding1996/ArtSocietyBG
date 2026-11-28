import { makeNoise } from '../../util/noise';
import { hsl, type Painter } from '../common';

/**
 * Printmaking for the Avatar theme: flat inks on soft paper, colour blocks a little out of register with the
 * black key block, ink that didn't quite take, and the print shop's seal.
 */

export type Ctx = CanvasRenderingContext2D;

export type Ink = string | CanvasGradient;

export type Trace = (c: Ctx) => void;

export const TAU = Math.PI * 2;

export const PAPER: [number, number, number] = [239, 233, 220];

export const PAPER_INK = `rgb(${PAPER.join(',')})`;

export const BLACK = hsl(222, 28, 11);

export const NAVY = hsl(215, 58, 22);

export const BLUE = hsl(208, 55, 40);

export const ICE = hsl(196, 36, 86);

export const SNOW = hsl(40, 28, 96);

export const RED = hsl(6, 64, 45);

export const SKY = hsl(201, 50, 66);

export interface Press extends Painter {
  /** How far the colour blocks sit from the black block. */
  mx: number;
  my: number;
}

/** A placeholder for a subject on a nation's list that isn't painted yet. */
export const unpainted = (scene: string) => (p: Press) => {
  line(p, BLUE, 3, (k) => {
    k.setLineDash([12, 10]);
    k.rect(p.w * 0.1, p.h * 0.1, p.w * 0.8, p.h * 0.8);
  });
  p.c.fillStyle = BLUE;
  p.c.font = `${Math.round(Math.min(p.w, p.h) * 0.09)}px serif`;
  p.c.textAlign = 'center';
  p.c.fillText(scene, p.w / 2, p.h / 2);
};

/** One flat ink over the path `trace` draws. Colour blocks print slightly out of register; the black key doesn't. */
export function fill(p: Press, ink: Ink, trace: Trace, key = false) {
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
export function line(p: Press, ink: Ink, width: number, trace: Trace, key = false) {
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
export function within(p: Press, mask: Trace, paint: () => void, key = false) {
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
export function paper(p: Press) {
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
export function pull(p: Press) {
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
export function seal(p: Press) {
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

/** The Fire Nation's mark: a tall tongue of flame between two smaller ones that lean out, centred on (x, y), s from middle to tip. */
export function fireMark(p: Press, x: number, y: number, s: number, ink: Ink = RED) {
  fill(p, ink, (k) => {
    k.moveTo(x, y - s);
    k.quadraticCurveTo(x + s * 0.46, y - s * 0.1, x + s * 0.26, y + s * 0.5);
    k.quadraticCurveTo(x, y + s * 0.9, x - s * 0.26, y + s * 0.5);
    k.quadraticCurveTo(x - s * 0.46, y - s * 0.1, x, y - s);
    k.closePath();
    for (const m of [-1, 1]) {
      k.moveTo(x + m * s * 0.82, y - s * 0.5);
      k.quadraticCurveTo(x + m * s * 0.8, y + s * 0.1, x + m * s * 0.42, y + s * 0.55);
      k.quadraticCurveTo(x + m * s * 0.3, y + s * 0.2, x + m * s * 0.46, y - s * 0.05);
      k.quadraticCurveTo(x + m * s * 0.62, y - s * 0.2, x + m * s * 0.82, y - s * 0.5);
      k.closePath();
    }
  });
}
