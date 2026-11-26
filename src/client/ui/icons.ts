/** Line icons (24×24, currentColor). Used in the DOM and rasterised onto 3D textures. */
const P: Record<string, string> = {
  hall: '<path d="M3 9.5 12 4l9 5.5"/><path d="M4.5 9.5h15"/><path d="M6.5 11v6.5M10.2 11v6.5M13.8 11v6.5M17.5 11v6.5"/><path d="M4.5 18.5h15M3 21h18"/>',
  city: '<path d="M3.5 20.5V11l3.5-2v11.5"/><path d="M7 20.5V5.5h5v15"/><path d="M12 20.5v-11h4.5v11"/><path d="M16.5 20.5V13H20v7.5"/><path d="M2.5 20.5h19"/><path d="M8.8 8.5h1.4M8.8 11.5h1.4M8.8 14.5h1.4M13.6 12.5h1.4M13.6 15.5h1.4"/>',
  portrait: '<circle cx="12" cy="8.2" r="3.6"/><path d="M4.8 20.5c.6-4.2 3.5-6.8 7.2-6.8s6.6 2.6 7.2 6.8"/>',
  still: '<path d="M8.5 3.5h4v2.8l1.8 2.9v9.3a1.8 1.8 0 0 1-1.8 1.8h-4a1.8 1.8 0 0 1-1.8-1.8V9.2l1.8-2.9z"/><circle cx="17.6" cy="17.4" r="3"/><path d="M17.6 14.4c.2-1 .8-1.6 1.7-1.9"/>',
  landscape: '<path d="M2.5 19.5 8.5 11l4 5.2 3-3.7 6 6.9z"/><circle cx="16.8" cy="6.6" r="2.3"/>',
  shield: '<path d="M12 3.2 19 6v5.6c0 4.3-2.9 7.6-7 9.2-4.1-1.6-7-4.9-7-9.2V6z" fill="currentColor" stroke="none"/>',
  shieldline: '<path d="M12 3.2 19 6v5.6c0 4.3-2.9 7.6-7 9.2-4.1-1.6-7-4.9-7-9.2V6z"/>',
  eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor" stroke="none"/>',
  assistant: '<circle cx="12" cy="6.4" r="3"/><path d="M6 21c0-5 2.7-8.6 6-8.6s6 3.6 6 8.6"/><path d="M9.5 14.3l2.5 1.4 2.5-1.4v2.7l-2.5-1.3-2.5 1.3z" fill="currentColor"/>',
  cards: '<rect x="3.6" y="6" width="10.5" height="14.5" rx="2" transform="rotate(-9 8.8 13.2)"/><rect x="9.6" y="3.8" width="10.5" height="14.5" rx="2"/>',
  wall: '<rect x="3.5" y="3.5" width="17" height="17" rx="1"/><path d="M3.5 9.5h17M3.5 15h17M9 3.5v6M14.5 9.5V15M8 15v5.5"/>',
  swap: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  box: '<path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z"/><path d="M3.5 8 12 12l8.5-4M12 12v8"/>',
  decor: '<path d="M9 3.5h6M10 3.5c0 2-1.8 3-1.8 5.6 0 2.8 1.8 4.4 3.8 4.4s3.8-1.6 3.8-4.4C15.8 6.5 14 5.5 14 3.5"/><path d="M12 13.5v4M8 20.5h8M9.5 17.5h5"/>',
  table: '<ellipse cx="12" cy="8.5" rx="9" ry="3.5"/><path d="M12 12v8.5M8 20.5h8"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  frame: '<rect x="3.5" y="4.5" width="17" height="15" rx="1"/><rect x="6.5" y="7.5" width="11" height="9" stroke-opacity=".6"/><path d="M7.5 15l3-3.5 2.5 2.5 1.5-1.5 2.5 2.5"/>',
  laurel: '<path d="M12 20.5c-4.6 0-8.2-3.9-8.2-8.7 0-2 .6-3.9 1.7-5.4M12 20.5c4.6 0 8.2-3.9 8.2-8.7 0-2-.6-3.9-1.7-5.4"/><path d="M5.2 9.2c1.7.2 2.7 1.2 2.9 2.9-1.7-.2-2.7-1.2-2.9-2.9zM4.5 13.4c1.7-.1 2.9.7 3.3 2.3-1.7.1-2.9-.7-3.3-2.3zM18.8 9.2c-1.7.2-2.7 1.2-2.9 2.9 1.7-.2 2.7-1.2 2.9-2.9zM19.5 13.4c-1.7-.1-2.9.7-3.3 2.3 1.7.1 2.9-.7 3.3-2.3z" fill="currentColor"/>',
  crown: '<path d="M3.5 8.2l4.2 3.6L12 5l4.3 6.8 4.2-3.6-1.9 10.3H5.4z"/><path d="M5.5 21h13"/>',
  gavel: '<path d="M10.2 7.6 14.4 3.4l5.4 5.4-4.2 4.2z"/><path d="M12.6 10.6 4.4 18.8"/><path d="M3 21.2h9.5"/>',
  chat: '<path d="M4.5 5.5h15v10h-8l-4.5 3.8v-3.8H4.5z"/>',
  sound: '<path d="M4.5 9.5h3.5L12.5 6v12L8 14.5H4.5z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.5 7.5 0 0 1 0 10.4"/>',
  mute: '<path d="M4.5 9.5h3.5L12.5 6v12L8 14.5H4.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 4"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
  bot: '<rect x="5" y="8" width="14" height="10.5" rx="3"/><path d="M12 8V4.5"/><circle cx="12" cy="3.8" r="1"/><circle cx="9.3" cy="13" r="1.3" fill="currentColor"/><circle cx="14.7" cy="13" r="1.3" fill="currentColor"/><path d="M3 12.5v2.5M21 12.5v2.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  camera: '<rect x="3" y="7" width="18" height="12.5" rx="2"/><circle cx="12" cy="13.2" r="3.4"/><path d="M8.5 7l1.4-2.5h4.2L15.5 7"/>',
  offline: '<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.3M12 9.5a10 10 0 0 1 7 3.5M2 9.5a15 15 0 0 1 4.4-2.8M11 5.5a15 15 0 0 1 11 4"/><circle cx="12" cy="19.5" r=".8" fill="currentColor"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h11l-2 3.8 2 3.7h-11"/>',
  sketch: '<rect x="4.5" y="3.5" width="15" height="11" rx="1"/><path d="M8 19.5 10 14.5M16 19.5 14 14.5M12 14.5v6.5"/><path d="M7.5 12l3-3.2 2.6 2.6 1.6-1.6 2 2"/>',
  beret: '<path d="M3.6 13.6c0-4 3.8-7 8.4-7s8.4 3 8.4 6.4c0 .9-1 1.6-2.6 1.6H6.2c-1.6 0-2.6-.4-2.6-1z"/><path d="M12 6.6V4.5"/><path d="M6.5 14.6c.6 1.6 2.9 2.6 5.5 2.6s4.9-1 5.5-2.6"/>',
  tophat: '<path d="M7.8 3.5h8.4v11.8H7.8z"/><path d="M3.5 15.6h17"/><path d="M7.8 12h8.4"/>',
  bowler: '<path d="M6.2 15.2c0-5.2 2.6-8.7 5.8-8.7s5.8 3.5 5.8 8.7"/><path d="M3.2 15.6c2.7 1.7 14.9 1.7 17.6 0"/>',
  flower: '<circle cx="12" cy="9.5" r="2"/><circle cx="12" cy="5.4" r="2.1"/><circle cx="16" cy="8.4" r="2.1"/><circle cx="14.5" cy="13" r="2.1"/><circle cx="9.5" cy="13" r="2.1"/><circle cx="8" cy="8.4" r="2.1"/><path d="M12 15.5V21"/>',
};

export type IconName = keyof typeof P;

export function icon(name: string, cls = 'ic', extra = ''): string {
  const body = P[name] ?? P.frame;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;
}

const images = new Map<string, HTMLImageElement>();

/** Rasterises an icon for canvas textures. */
export function iconImage(name: string, color: string, size = 256, strokeWidth = 1.6): Promise<HTMLImageElement> {
  const key = `${name}|${color}|${size}|${strokeWidth}`;
  const hit = images.get(key);
  if (hit?.complete) return Promise.resolve(hit);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" color="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${(P[name] ?? P.frame).replace(/currentColor/g, color)}</svg>`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      images.set(key, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/** Icons already rasterised by preloadIcons, for synchronous texture drawing. */
export function loadedIcon(name: string, color: string, size = 128, strokeWidth = 1.6): HTMLImageElement | null {
  const img = images.get(`${name}|${color}|${size}|${strokeWidth}`);
  return img?.complete ? img : null;
}

export function preloadIcons(list: [string, string, number?, number?][]): Promise<unknown> {
  return Promise.all(list.map(([n, c, s, w]) => iconImage(n, c, s ?? 128, w ?? 1.6).catch(() => null)));
}
