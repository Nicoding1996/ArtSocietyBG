import { DECOR_INFO, FRAME_INFO, GENRE_INFO, RULES } from '../../shared/content';
import { ranking } from '../../shared/scoring';
import type { GameView, Genre, PlayerView, Tile, TieBreak } from '../../shared/types';
import { el, esc, sleep } from './dom';
import { icon } from './icons';
import { disc, dot, frameTag, genreTag, shieldsHtml, sizeText, tileThumb } from './parts';

let root: HTMLElement;
let escBound = false;

export function initOverlays(ui: HTMLElement) {
  root = ui;
  for (const cls of ['toasts', 'banner-layer', 'card-layer', 'tooltip', 'modal-layer']) {
    if (!root.querySelector(`.${cls}`)) root.appendChild(el('div', cls));
  }
  if (!escBound) {
    escBound = true;
    // Esc closes an open window (the rules, a painting up close) before the 3D view sees the key.
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape' || !layer('modal-layer')?.firstChild) return;
        closeModal();
        e.stopPropagation();
      },
      true,
    );
  }
}

const layer = (cls: string) => root.querySelector(`.${cls}`) as HTMLElement;

export function toast(text: string, kind: 'info' | 'error' | 'chat' = 'info', ms = 3200) {
  const html = esc(text);
  // The same message twice in a row only needs one toast.
  if ([...layer('toasts').children].some((c) => c.innerHTML === html)) return;
  const t = el('div', `toast ${kind}`, html);
  layer('toasts').appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, ms);
}

export async function banner(title: string, sub = '', ms = 1700, cls = '') {
  const b = el('div', `banner ${cls}`, `<div class="banner-title">${esc(title)}</div>${sub ? `<div class="banner-sub">${esc(sub)}</div>` : ''}`);
  const l = layer('banner-layer');
  l.innerHTML = '';
  l.appendChild(b);
  requestAnimationFrame(() => b.classList.add('show'));
  await sleep(ms);
  b.classList.remove('show');
  setTimeout(() => b.remove(), 500);
}

/** A card that slides in at the centre for a moment. */
async function showCard(node: HTMLElement, ms: number) {
  const l = layer('card-layer');
  l.innerHTML = '';
  l.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  await sleep(ms);
  node.classList.remove('show');
  await sleep(350);
  node.remove();
}

export function hideCards() {
  const l = layer('card-layer');
  if (l) l.innerHTML = '';
}

const nameOf = (players: PlayerView[], id: string) => players.find((p) => p.id === id);

/** The bids turned over: everyone's card from highest to lowest, with how ties were settled. */
export function revealCard(bids: Record<string, number>, order: string[], ties: TieBreak[], players: PlayerView[], me: string | null, ms: number) {
  const card = el('div', 'event-card reveal');
  card.appendChild(el('div', 'ev-kicker', `${icon('cards')} The bids are revealed`));
  const row = el('div', 'rv-row');
  order.forEach((pid, i) => {
    const p = nameOf(players, pid);
    if (!p) return;
    const item = el(
      'div',
      `rv-item ${pid === me ? 'me' : ''}`,
      `<div class="rv-rank">${i + 1}</div>${disc(bids[pid], p.color, 'big')}<div class="rv-name">${dot(p.color)}${esc(p.name)}</div>`,
    );
    item.style.animationDelay = `${0.15 + i * 0.18}s`;
    row.appendChild(item);
  });
  card.appendChild(row);
  for (const tb of ties) {
    for (const s of tb.steps) {
      const w = nameOf(players, s.winner);
      const l = nameOf(players, s.loser);
      if (!w || !l) continue;
      const what = s.depth === 1 ? 'the card underneath' : `${s.depth} cards down`;
      card.appendChild(
        el('div', 'rv-tie', `${icon('swap')} Tie on <b>${tb.bid}</b>: ${esc(w.name)} wins on ${what} (${disc(s.winnerCard, w.color, 'tiny')} beats ${disc(s.loserCard, l.color, 'tiny')})`),
      );
    }
  }
  const first = nameOf(players, order[0]);
  card.appendChild(el('div', 'ev-title', first ? `${esc(first.name)} chooses first` : ''));
  return showCard(card, ms);
}

export function tooltip(html: string | null, x = 0, y = 0) {
  const t = layer('tooltip');
  if (!html) {
    t.classList.remove('show');
    return;
  }
  if (t.dataset.html !== html) {
    t.innerHTML = html;
    t.dataset.html = html;
  }
  t.style.transform = `translate(${Math.min(window.innerWidth - 300, x + 16)}px, ${Math.min(window.innerHeight - 140, y + 16)}px)`;
  t.classList.add('show');
}

export function tileTooltip(t: Tile, owner: PlayerView | undefined, v: GameView | null): string {
  if (t.kind === 'decor') {
    return `<div class="tt-title">${esc(DECOR_INFO[t.shape].name)}</div><div class="tt-text">${shieldsHtml(t.points)} Decor, worth ${t.points} at the end${owner ? ` \u00b7 ${esc(owner.name)}` : ''}</div>`;
  }
  const mult = v ? ranking(v.prestige).multipliers[t.genre] : null;
  return `<div class="tt-title">${esc(t.title)}</div>
    <div class="tt-text">${genreTag(t.genre)} ${frameTag(t.frame)} \u00b7 ${sizeText(t.w, t.h)}</div>
    <div class="tt-text muted">${mult ? `${GENRE_INFO[t.genre].name} is \u00d7${mult} right now` : ''}${owner ? ` \u00b7 ${esc(owner.name)}'s wall` : ''} \u00b7 click to look closer</div>`;
}

export function closeModal() {
  layer('modal-layer').innerHTML = '';
}

function modal(content: HTMLElement, cls = '') {
  const l = layer('modal-layer');
  l.innerHTML = '';
  const back = el('div', `modal-back ${cls}`);
  const box = el('div', 'modal');
  const close = el('button', 'icon-btn modal-close', icon('close'));
  close.title = 'Close';
  close.onclick = closeModal;
  box.append(close, content);
  back.appendChild(box);
  back.addEventListener('click', (e) => {
    if (e.target === back) closeModal();
  });
  l.appendChild(back);
}

export function lightbox(t: Tile, owner: PlayerView | undefined, v: GameView | null) {
  const wrap = el('div', 'lightbox');
  const boxW = Math.min(560, window.innerWidth * 0.46);
  const boxH = Math.min(520, window.innerHeight * 0.62);
  if (t.kind === 'decor') {
    wrap.appendChild(tileThumb(t, 'huge', boxW * 0.7, boxH * 0.7));
    wrap.appendChild(
      el(
        'div',
        'lb-info',
        `<div class="lb-title">${esc(DECOR_INFO[t.shape].name)}</div>
         <div class="lb-sub">Decor \u00b7 ${sizeText(t.w, t.h)}${owner ? ` \u00b7 ${esc(owner.name)}'s wall` : ''}</div>
         <div class="lb-meta">${shieldsHtml(t.points)} worth ${t.points} point${t.points === 1 ? '' : 's'} at the end</div>
         <p class="lb-blurb">Players earn decor by hanging a painting against others in the same style of frame.</p>`,
      ),
    );
    modal(wrap, 'lb-back');
    return;
  }
  const frame = tileThumb(t, 'lb-frame', boxW, boxH);
  const mult = v ? ranking(v.prestige).multipliers[t.genre] : null;
  wrap.append(
    frame,
    el(
      'div',
      'lb-info',
      `<div class="lb-title">${esc(t.title)}</div>
       <div class="lb-sub">${owner ? `In ${esc(owner.name)}'s collection` : 'On offer'} \u00b7 ${sizeText(t.w, t.h)}${t.starter ? ' \u00b7 starting painting' : ''}</div>
       <div class="lb-meta">${genreTag(t.genre)} ${frameTag(t.frame)} <span class="val">${icon('hall')} museum value ${t.value}</span></div>
       <p class="lb-blurb">${esc(GENRE_INFO[t.genre].blurb)} ${esc(FRAME_INFO[t.frame].blurb)}${mult ? ` At today's prestige every ${esc(GENRE_INFO[t.genre].name)} painting is worth \u00d7${mult}.` : ''}</p>`,
    ),
  );
  modal(wrap, 'lb-back');
}

export function showHelp() {
  const c = el('div', 'help');
  const g = (x: Genre) => genreTag(x);
  c.innerHTML = `
    <h2>How to play</h2>
    <p class="lead">You are collectors furnishing your drawing-room walls. Win paintings at auction, hang them tastefully, and watch which kinds of painting the museum makes fashionable. The best wall at the end of the evening wins.</p>
    <div class="help-cols">
      <div>
        <h3>Each round</h3>
        <ol>
          <li><b>The auctioneer</b> (holder of the ${icon('gavel')} gavel) picks <b>one painting more than there are players</b>, choosing only by size from the face-down supply. Then they are turned over.</li>
          <li><b>Everyone bids at once</b> with a card from 1 to 20. Each card can be used once per game. On a tie, compare the card under it in your stack (your gold starting card counts), then the next one down.</li>
          <li><b>Highest bid chooses first</b>: take one painting and hang it.</li>
          <li>The painting nobody took goes to <b>the museum</b>: its type gains prestige equal to the number on its back. Two markers never share a space: a marker that lands on another steps back to the nearest free space.</li>
          <li>The gavel passes to the player on the auctioneer's left.</li>
        </ol>
        <h3>Hanging</h3>
        <ul>
          <li>Inside the grid, touching another tile along an edge (corners don't count), never turned sideways.</li>
          <li><b>Same frame</b> as a painting it touches? Take decor worth up to the number of matching neighbours (4 or more: several decor tiles adding up to that).</li>
          <li><b>Same type</b> touching? A faux pas: every painting involved scores nothing for prestige.</li>
          <li>Your <b>assistant</b> holds one tile for later. Its tile scores nothing at the end.</li>
          <li><b>Doesn't fit?</b> Give it to your assistant, swap it for a same-type museum painting that fits, or else store it as <b>excess</b> (−${RULES.excessPenalty}, and you take a 1-point decor).</li>
        </ul>
      </div>
      <div>
        <h3>The end</h3>
        <p>When a wall is full, someone stores a second excess painting, or the bid cards run out, the round is finished and the evening ends.</p>
        <h3>Scoring</h3>
        <ul>
          <li>Types are ranked by prestige: <b>×5, ×4, ×3, ×2</b>. Types the museum never received share ×2. ${g('city')} ${g('portrait')} ${g('still')} ${g('landscape')}</li>
          <li>Each painting scores its type's multiplier, unless it is in a faux pas.</li>
          <li>Decor scores its shields ${icon('shield', 'ic sh')}.</li>
          <li>+${RULES.eyelinePoints} for each painting of the top type touching the <b>eyeline</b> band (even in a faux pas).</li>
          <li>+${RULES.fullPoints} for a full wall, −${RULES.cornerPenalty} per uncovered corner, −${RULES.excessPenalty} per excess painting.</li>
          <li>Ties go to the most bid-card value left in hand.</li>
        </ul>
        <h3>Controls</h3>
        <p class="small">Point at your wall to preview a spot, click to pin it, click again (or press <b>Hang here</b>) to confirm. Esc unpins. Drag to look around, scroll to zoom, click any painting to look closer.</p>
      </div>
    </div>
    <p class="small">This is a fan-made digital version for playing with friends, based on the board game <i>Art Society</i> by Mitch Wallace (Mighty Boards, 2023). All art here is generated by the program.</p>`;
  modal(c, 'help-back');
}
