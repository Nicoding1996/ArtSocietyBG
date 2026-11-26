import { PLAYER_COLORS, RULES } from '../../shared/content';
import { HATS, type ClientMessage, type RoomView } from '../../shared/types';
import { copyText, el, esc, renderIf } from './dom';
import { icon } from './icons';
import { toast } from './overlays';
import type { ChatPanel } from './chat';

const HAT_NAMES: Record<string, string> = { beret: 'Beret', tophat: 'Top hat', bowler: 'Bowler', flower: 'Flower crown' };

/** The link friends open. On localhost it uses the PC's network address instead, which other PCs can reach. */
function inviteLink(code: string, lan: string[]): string {
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const host = loopback && lan.length ? `${lan[0]}${location.port ? `:${location.port}` : ''}` : location.host;
  return `${location.protocol}//${host}${location.pathname}?room=${code}`;
}

export class LobbyView {
  readonly root = el('div', 'lobby');
  private card = el('div', 'lobby-card glass');
  private list = el('div', 'lobby-players');
  private controls = el('div', 'lobby-controls');
  private look = el('div', 'lobby-look');

  constructor(
    private send: (m: ClientMessage) => void,
    private onLeave: () => void,
    private onHelp: () => void,
    chat: ChatPanel,
  ) {
    this.card.innerHTML = `<div class="lobby-head"></div>`;
    this.card.append(this.list, this.look, this.controls);
    const side = el('div', 'lobby-side');
    side.appendChild(chat.root);
    this.root.append(this.card, side);
  }

  render(room: RoomView, me: string, lan: string[]) {
    const head = this.card.querySelector('.lobby-head') as HTMLElement;
    const link = inviteLink(room.code, lan);
    renderIf(head, link, () => {
      head.innerHTML = `
        <div class="kicker">Private salon</div>
        <h2>Room <span class="code">${esc(room.code)}</span></h2>
        <div class="invite"><input readonly value="${esc(link)}" aria-label="Invite link" /><button class="btn copy">${icon('copy')} Copy invite</button></div>
        <p class="fine">Friends on the same network can open this link. To play over the internet, see the README.</p>`;
      head.querySelector('.copy')!.addEventListener('click', async () => {
        toast((await copyText(link)) ? 'Invite link copied — send it to your friends!' : 'Select the link and copy it manually.');
      });
      head.querySelector('input')!.addEventListener('focus', (e) => (e.target as HTMLInputElement).select());
    });

    const isHost = room.hostId === me;
    const meP = room.players.find((p) => p.id === me);
    renderIf(this.list, JSON.stringify([room.players, room.hostId, me]), () => {
      this.list.innerHTML = `<div class="section-title">Collectors at the table <span class="count">${room.players.length}/${RULES.maxPlayers}</span></div>`;
      for (const p of room.players) {
        const row = el('div', `lp ${p.id === me ? 'me' : ''} ${p.connected ? '' : 'away'}`);
        row.style.setProperty('--pc', p.color);
        row.innerHTML = `
          <span class="lp-pawn">${icon(p.hat)}</span>
          <span class="lp-name">${esc(p.name)}</span>
          ${p.id === room.hostId ? `<span class="tag host">${icon('crown')} Host</span>` : ''}
          ${p.id === me ? '<span class="tag">You</span>' : ''}
          ${p.isBot ? `<span class="tag bot">${icon('bot')} Bot</span>` : ''}
          ${!p.connected ? `<span class="tag away">${icon('offline')} Reconnecting</span>` : ''}
          ${isHost && p.isBot ? `<button class="icon-btn remove" data-id="${p.id}" title="Remove bot">${icon('close')}</button>` : ''}`;
        this.list.appendChild(row);
      }
      for (let i = room.players.length; i < RULES.maxPlayers; i++) this.list.appendChild(el('div', 'lp empty', '<span class="lp-name">An empty chair\u2026</span>'));
      this.list.querySelectorAll<HTMLButtonElement>('.remove').forEach((b) => b.addEventListener('click', () => this.send({ t: 'removeBot', id: b.dataset.id! })));
    });

    renderIf(this.look, JSON.stringify([meP, room.players.map((p) => p.color)]), () => {
      if (!meP) return;
      const taken = new Set(room.players.filter((p) => p.id !== me).map((p) => p.color));
      this.look.innerHTML = `
        <div class="section-title">Your look</div>
        <div class="look-row">
          <label class="field inline"><span>Name</span><input class="lname" maxlength="18" value="${esc(meP.name)}" /></label>
        </div>
        <div class="look-row swatches">${PLAYER_COLORS.map(
          (c) => `<button class="swatch ${c === meP.color ? 'on' : ''}" style="--pc:${c}" data-c="${c}" ${taken.has(c) ? 'disabled title="Taken"' : `title="Pick colour"`}></button>`,
        ).join('')}</div>
        <div class="look-row hats">${HATS.map(
          (h) => `<button class="hat ${h === meP.hat ? 'on' : ''}" data-h="${h}" title="${HAT_NAMES[h]}" style="--pc:${meP.color}">${icon(h)}<span>${HAT_NAMES[h]}</span></button>`,
        ).join('')}</div>`;
      const name = this.look.querySelector<HTMLInputElement>('.lname')!;
      const commit = () => {
        const v = name.value.trim();
        if (v && v !== meP.name) this.send({ t: 'profile', name: v });
      };
      name.addEventListener('blur', commit);
      name.addEventListener('keydown', (e) => e.key === 'Enter' && name.blur());
      this.look.querySelectorAll<HTMLButtonElement>('.swatch').forEach((b) => b.addEventListener('click', () => this.send({ t: 'profile', color: b.dataset.c })));
      this.look.querySelectorAll<HTMLButtonElement>('.hat').forEach((b) => b.addEventListener('click', () => this.send({ t: 'profile', hat: b.dataset.h as (typeof HATS)[number] })));
    });

    renderIf(this.controls, JSON.stringify([isHost, room.players.length]), () => {
      const canStart = room.players.length >= RULES.minPlayers;
      this.controls.innerHTML = `
        <p class="fine">The evening lasts until a wall is full, someone stores a second excess painting, or the bid cards run out (30\u201360 minutes).</p>
        <div class="lobby-actions">
          <button class="btn ghost help">${icon('help')} Rules</button>
          <button class="btn ghost leave">Leave</button>
          ${isHost ? `<button class="btn add-bot" ${room.players.length >= RULES.maxPlayers ? 'disabled' : ''}>${icon('bot')} Add a bot</button>` : ''}
          ${isHost ? `<button class="btn primary start" ${canStart ? '' : 'disabled'}>Open the salon</button>` : `<div class="waiting">Waiting for the host to start\u2026</div>`}
        </div>
        ${isHost && !canStart ? `<p class="fine">Invite a friend or add a bot: you need at least ${RULES.minPlayers} collectors.</p>` : ''}`;
      this.controls.querySelector('.add-bot')?.addEventListener('click', () => this.send({ t: 'addBot' }));
      this.controls.querySelector('.start')?.addEventListener('click', () => this.send({ t: 'start' }));
      this.controls.querySelector('.leave')!.addEventListener('click', this.onLeave);
      this.controls.querySelector('.help')!.addEventListener('click', this.onHelp);
    });
  }
}
