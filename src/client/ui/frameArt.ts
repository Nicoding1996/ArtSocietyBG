// The ornament of the Pearl and Gilded frames on the panels, drawn as SVG to match the 3D frames.
//
// Each frame overlay is drawn in units where the band is 20 wide: 4 units of room outside the frame
// for ornament that breaks the outline, the band from 4 to 24, and the opening from 24. The image is
// 80 square and is used as a border image sliced 34 from each edge (see .frame-ivory in game.css), so
// the corners keep their shape at any size and only the plain middle of each edge stretches.

export type Pt = [number, number];

/**
 * The path of a C-scroll: a run from `start` that meets a circle of radius R round `eye` along its
 * tangent, then curls in round the eye (dir 1 anticlockwise in y-up coordinates, -1 clockwise) for
 * `turns` turns. Shared by the 3D frames.
 */
export function scrollPath(start: Pt, eye: Pt, R: number, turns: number, dir: 1 | -1, seg = 26): Pt[] {
  const dx = start[0] - eye[0];
  const dy = start[1] - eye[1];
  const base = Math.atan2(dy, dx);
  const off = Math.acos(Math.min(1, R / Math.max(R, Math.hypot(dx, dy))));
  const at = (a: number, r: number): Pt => [eye[0] + r * Math.cos(a), eye[1] + r * Math.sin(a)];
  // Of the two tangent points, the one where the run arrives already turning the right way.
  let a0 = base + off;
  const [px, py] = at(a0, R);
  if ((px - start[0]) * -Math.sin(a0) * dir + (py - start[1]) * Math.cos(a0) * dir < 0) a0 = base - off;
  const p0 = at(a0, R);
  const out: Pt[] = [];
  for (let i = 0; i < 5; i++) out.push([start[0] + ((p0[0] - start[0]) * i) / 5, start[1] + ((p0[1] - start[1]) * i) / 5]);
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    out.push(at(a0 + dir * turns * Math.PI * 2 * u, R * (1 - 0.7 * u)));
  }
  return out;
}

/**
 * Where the rim of a scallop shell runs: `ribs` lobes fanning from a hinge at `h` towards angle `ang`,
 * `len` long and `spread` radians wide, pulled back where needed to stay inside a box
 * (minX, minY, maxX, maxY). `t` runs from 0 to 1 across the fan. Shared by the 3D frames.
 */
export function shellRim(h: Pt, ang: number, len: number, spread: number, ribs: number, box: [number, number, number, number] | undefined, t: number, dip = 0.1): Pt {
  const a = ang - spread / 2 + spread * t;
  const r = len * (1 - dip * Math.abs(Math.cos(t * ribs * Math.PI)));
  const dx = Math.cos(a) * r;
  const dy = Math.sin(a) * r;
  let k = 1;
  if (box) {
    if (dx > 0 && h[0] + dx > box[2]) k = Math.min(k, (box[2] - h[0]) / dx);
    if (dx < 0 && h[0] + dx < box[0]) k = Math.min(k, (box[0] - h[0]) / dx);
    if (dy > 0 && h[1] + dy > box[3]) k = Math.min(k, (box[3] - h[1]) / dy);
    if (dy < 0 && h[1] + dy < box[1]) k = Math.min(k, (box[1] - h[1]) / dy);
  }
  return [h[0] + dx * k, h[1] + dy * k];
}

const fmt = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
const dataUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

function svgShell(h: Pt, ang: number, len: number, spread: number, box: [number, number, number, number], fill: string, line: string): string {
  const ribs = 7;
  const outline: Pt[] = [h];
  for (let i = 0; i <= ribs * 4; i++) outline.push(shellRim(h, ang, len, spread, ribs, box, i / (ribs * 4), 0.12));
  const lines = Array.from({ length: ribs - 1 }, (_, k) => {
    const [x, y] = shellRim(h, ang, len, spread, ribs, box, (k + 1) / ribs, 0.12);
    return `<line x1="${h[0]}" y1="${h[1]}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"/>`;
  }).join('');
  return `<polygon points="${fmt(outline)}" fill="${fill}" stroke="${line}" stroke-width=".7" stroke-linejoin="round"/><g stroke="${line}" stroke-width=".55" opacity=".8">${lines}</g>`;
}

function svgScroll(start: Pt, eye: Pt, R: number, dir: 1 | -1, color: string, w: number): string {
  const p = scrollPath(start, eye, R, 0.9, dir, 18);
  const [ex, ey] = p[p.length - 1];
  return `<polyline points="${fmt(p)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${ex.toFixed(2)}" cy="${ey.toFixed(2)}" r="${(w * 0.75).toFixed(2)}" fill="${color}"/>`;
}

const CORNERS = '<use href="#c"/><use href="#c" transform="translate(80 0) scale(-1 1)"/><use href="#c" transform="translate(0 80) scale(1 -1)"/><use href="#c" transform="translate(80 80) scale(-1 -1)"/>';
const PEARL = '<radialGradient id="pl" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#f1ece6"/><stop offset="1" stop-color="#b9ada0"/></radialGradient>';
const GOLD = '<linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1c2"/><stop offset=".45" stop-color="#e2b45a"/><stop offset="1" stop-color="#a77a2c"/></linearGradient>';
const SVG = 'xmlns="http://www.w3.org/2000/svg"';

/** Pearl: a gold edge round the stepped outline, a pearl in each step, gold scrolls and a gold lip. */
function pearlFrame(): string {
  const gold = '#c79b3f';
  const corner = `<rect x="4" y="4" width="11" height="11" fill="#1c1714"/><circle cx="9.5" cy="9.5" r="4.3" fill="url(#pl)"/>${svgScroll([16.5, 14], [23.5, 14.4], 2.7, 1, gold, 1.15)}${svgScroll([14, 16.5], [14.4, 23.5], 2.7, -1, gold, 1.15)}`;
  return `<svg ${SVG} viewBox="0 0 80 80"><defs>${PEARL}<g id="c">${corner}</g></defs>${CORNERS}<path d="M15 4.6H65V15H75.4V65H65V75.4H15V65H4.6V15H15Z" fill="none" stroke="${gold}" stroke-width="1.2"/><rect x="23.4" y="23.4" width="33.2" height="33.2" fill="none" stroke="${gold}" stroke-width="1.2"/></svg>`;
}

/** Gilded: a bright rim, a dark cove at the opening, a shell on each corner and scrolls along the edges. */
function giltFrame(): string {
  const dark = '#6e4a14';
  const corner = `${svgShell([14, 14], (-3 * Math.PI) / 4, 14, 1.8, [0.6, 0.6, 79.4, 79.4], 'url(#gg)', dark)}<circle cx="14" cy="14" r="2.6" fill="url(#gg)" stroke="${dark}" stroke-width=".6"/>${svgScroll([21, 12], [27.5, 12.4], 2.8, 1, dark, 1.25)}${svgScroll([12, 21], [12.4, 27.5], 2.8, -1, dark, 1.25)}`;
  return `<svg ${SVG} viewBox="0 0 80 80"><defs>${GOLD}<g id="c">${corner}</g></defs><rect x="5.2" y="5.2" width="69.6" height="69.6" fill="none" stroke="#fbe9b4" stroke-width="1.4"/><rect x="7.8" y="7.8" width="64.4" height="64.4" fill="none" stroke="#8a5e1c" stroke-width=".8"/><rect x="22.3" y="22.3" width="35.4" height="35.4" fill="none" stroke="${dark}" stroke-width="3.4"/>${CORNERS}</svg>`;
}

/** The crest at the top of a frame: a shell breaking the outline, a scroll each side, a pearl or a boss. */
function crest(kind: 'pearl' | 'gilt'): string {
  const line = kind === 'pearl' ? '#8a6420' : '#6e4a14';
  const scroll = kind === 'pearl' ? '#c79b3f' : '#6e4a14';
  const heart = kind === 'pearl' ? '<circle cx="30" cy="16" r="3.6" fill="url(#pl)"/>' : `<circle cx="30" cy="16" r="3" fill="url(#gg)" stroke="${line}" stroke-width=".6"/>`;
  return `<svg ${SVG} viewBox="0 0 60 26"><defs>${PEARL}${GOLD}</defs>${svgShell([30, 16], -Math.PI / 2, 13, 2.2, [0, 0.5, 60, 26], 'url(#gg)', line)}${svgScroll([34, 16.5], [45, 16], 3.4, 1, scroll, 1.3)}${svgScroll([26, 16.5], [15, 16], 3.4, -1, scroll, 1.3)}${heart}</svg>`;
}

/** Makes the ornament available to the stylesheet as --pearl-frame, --gilt-frame and their crests. */
export function installFrameArt(root: HTMLElement = document.documentElement) {
  root.style.setProperty('--pearl-frame', dataUrl(pearlFrame()));
  root.style.setProperty('--gilt-frame', dataUrl(giltFrame()));
  root.style.setProperty('--pearl-crest', dataUrl(crest('pearl')));
  root.style.setProperty('--gilt-crest', dataUrl(crest('gilt')));
}
