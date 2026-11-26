import { GENRE_INFO, RULES } from '../../shared/content';
import type { GameResults, GameView, PlayerResult, PlayerView } from '../../shared/types';
import type { Audio } from '../audio';
import type { World } from '../three/world';
import { el, esc } from './dom';
import { endText } from './hud';
import { icon } from './icons';
import { dot, genreTag } from './parts';

/** The end of the evening: the museum's verdict, then every scoring category, then the winner. */
export class Ceremony {
  readonly root = el('div', 'gala');
  private skipping = false;
  private wake: (() => void) | null = null;
  private scores = new Map<string, number>();
  private played = false;
  private reopen = el('button', 'btn gala-reopen', `${icon('crown')} Results`);

  constructor(
    private world: World,
    private audio: Audio,
    private onLobby: () => void,
    private isHost: () => boolean,
  ) {
    this.reopen.addEventListener('click', () => {
      this.root.classList.add('show');
      this.reopen.classList.remove('show');
      this.hudHidden(true);
    });
  }

  private hudHidden(on: boolean) {
    this.root.parentElement?.classList.toggle('gala-on', on);
  }

  get started() {
    return this.played;
  }

  mount(parent: HTMLElement) {
    parent.append(this.root, this.reopen);
  }

  close() {
    this.hudHidden(false);
    this.root.classList.remove('show', 'prelude');
    this.reopen.classList.remove('show');
    this.root.innerHTML = '';
    this.played = false;
    this.world.clearPodium();
    for (const w of this.world.walls.values()) w.clearMarks();
  }

  private wait(ms: number) {
    if (this.skipping) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        this.wake = null;
        resolve();
      }, ms);
      this.wake = () => {
        clearTimeout(t);
        this.wake = null;
        resolve();
      };
    });
  }

  private skip() {
    this.skipping = true;
    this.wake?.();
  }

  private col(pid: string) {
    return this.root.querySelector<HTMLElement>(`.gcol[data-pid="${pid}"]`);
  }

  private count(pid: string, add: number) {
    if (!add) return;
    const from = this.scores.get(pid) ?? 0;
    const to = from + add;
    this.scores.set(pid, to);
    const node = this.col(pid)?.querySelector<HTMLElement>('.gcol-score b');
    if (!node) return;
    if (this.skipping) {
      node.textContent = String(to);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      node.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    const pop = el('div', `gcol-pop ${add < 0 ? 'neg' : ''}`, `${add > 0 ? '+' : ''}${add}`);
    this.col(pid)?.appendChild(pop);
    setTimeout(() => pop.remove(), 1200);
  }

  private item(pid: string, html: string, cls = '') {
    const items = this.col(pid)?.querySelector('.gcol-items');
    if (!items) return;
    const it = el('div', `gi ${cls}`, html);
    items.appendChild(it);
    items.scrollTop = items.scrollHeight;
  }

  private setAct(title: string, sub = '') {
    const a = this.root.querySelector('.gala-act');
    if (a) a.innerHTML = `${esc(title)}${sub ? `<small>${sub}</small>` : ''}`;
  }

  async play(v: GameView, me: string | null) {
    const res = v.results;
    if (!res || this.played) return;
    this.played = true;
    this.skipping = false;
    this.scores.clear();
    const byId = new Map(v.players.map((p) => [p.id, p]));
    const result = (pid: string) => res.players.find((r) => r.pid === pid)!;

    this.root.innerHTML = `
      <div class="gala-head"><div class="gala-kicker">${icon('laurel')} The Grand Gala ${icon('laurel')}</div><div class="gala-act"></div></div>
      <div class="gala-cols"></div>
      <div class="gala-foot"><button class="btn ghost skip">Skip to the winner</button></div>`;
    this.root.querySelector('.skip')!.addEventListener('click', () => this.skip());
    const cols = this.root.querySelector('.gala-cols')!;
    for (const p of v.players) {
      const c = el('div', 'gcol');
      c.dataset.pid = p.id;
      c.style.setProperty('--pc', p.color);
      c.innerHTML = `<div class="gcol-name">${dot(p.color)}${esc(p.name)}${p.id === me ? ' <small>(you)</small>' : ''}</div>
        <div class="gcol-score"><b>0</b><span>points</span></div>
        <div class="gcol-items"></div>`;
      cols.appendChild(c);
      this.scores.set(p.id, 0);
    }
    this.root.classList.add('show', 'prelude');
    this.root.classList.remove('finale');
    this.reopen.classList.remove('show');
    this.hudHidden(true);
    this.world.stopPlacement();
    this.audio.fanfare();
    this.setAct('The evening is over', esc(endText(v).replace(/^./, (c) => c.toUpperCase())));
    void this.world.viewTable(1400);
    await this.wait(2600);

    // The museum's verdict.
    this.setAct("The museum's verdict", 'The four types are ranked by prestige');
    this.audio.drumroll(1.2);
    await this.wait(1300);
    if (!this.skipping) await this.world.table.rankMarkers(this.world.tw, res.multipliers);
    const verdict = [...res.ranking]
      .reverse()
      .map((g) => `${genreTag(g)} <b>\u00d7${res.multipliers[g]}</b>`)
      .join('<span class="sep">\u00b7</span>');
    this.setAct("The museum's verdict", verdict);
    this.audio.sparkle();
    await this.wait(2600);
    this.root.classList.remove('prelude');

    // Paintings, type by type from the most prestigious.
    for (const g of res.ranking) {
      const info = GENRE_INFO[g];
      const m = res.multipliers[g];
      this.setAct(`${info.name} \u00b7 \u00d7${m}`, `Every ${esc(info.name)} painting scores ${m}, unless it is in a faux pas`);
      for (const p of v.players) {
        const gs = result(p.id).genres.find((x) => x.genre === g)!;
        if (!gs.count) continue;
        const good = gs.count - gs.faux;
        this.item(p.id, `${genreTag(g, true)}<span class="gi-text">${good} \u00d7 ${m}${gs.faux ? ` <s title="Faux pas">${gs.faux}</s>` : ''}</span><b>${gs.points}</b>`, gs.faux ? 'faux' : '');
        this.count(p.id, gs.points);
        if (gs.faux) {
          const ids = result(p.id).fauxIds.filter((id) => p.wall.some((h) => h.tile.id === id && h.tile.kind === 'painting' && h.tile.genre === g));
          this.world.walls.get(p.id)?.mark(ids, '#ff5a5a');
        }
      }
      this.audio.coin();
      await this.wait(1500);
    }

    // Decor.
    this.setAct('Decor', 'Every shield counts one point');
    for (const p of v.players) {
      const r = result(p.id);
      if (!r.decorPoints) continue;
      this.item(p.id, `${icon('shield', 'ic sh')}<span class="gi-text">Decor</span><b>${r.decorPoints}</b>`, 'decor');
      this.count(p.id, r.decorPoints);
    }
    this.audio.sparkle();
    await this.wait(1600);

    // The eyeline.
    if (res.top) {
      const top = GENRE_INFO[res.top];
      this.setAct('The eyeline', `+${RULES.eyelinePoints} for every ${esc(top.name)} painting in the eyeline band`);
      for (const p of v.players) {
        const r = result(p.id);
        if (!r.eyelineCount) continue;
        this.item(p.id, `${icon('eye')}<span class="gi-text">${r.eyelineCount} \u00d7 ${RULES.eyelinePoints}</span><b>${r.eyelinePoints}</b>`, 'eye');
        this.count(p.id, r.eyelinePoints);
        this.world.walls.get(p.id)?.mark(r.eyelineIds, '#ffd76a');
      }
      this.audio.chime();
      await this.wait(1700);
    }

    // Full walls, corners and excess.
    this.setAct('Finishing touches', `+${RULES.fullPoints} for a full wall \u00b7 \u2212${RULES.cornerPenalty} per bare corner \u00b7 \u2212${RULES.excessPenalty} per excess painting`);
    for (const p of v.players) {
      const r = result(p.id);
      if (r.full) {
        this.item(p.id, `${icon('wall')}<span class="gi-text">Full wall</span><b>+${r.fullPoints}</b>`, 'good');
        this.count(p.id, r.fullPoints);
      }
      if (r.corners) {
        this.item(p.id, `<span class="gi-text">${r.corners} bare corner${r.corners === 1 ? '' : 's'}</span><b>${r.cornerPoints}</b>`, 'neg');
        this.count(p.id, r.cornerPoints);
      }
      if (r.excess) {
        this.item(p.id, `${icon('box')}<span class="gi-text">${r.excess} excess</span><b>${r.excessPoints}</b>`, 'neg');
        this.count(p.id, r.excessPoints);
      }
    }
    this.audio.paper();
    await this.wait(1800);

    for (const r of res.players) {
      const node = this.col(r.pid)?.querySelector<HTMLElement>('.gcol-score b');
      if (node) node.textContent = String(r.total);
      this.scores.set(r.pid, r.total);
    }

    this.skipping = false;
    this.setAct('And the finest wall in the city belongs to\u2026');
    this.audio.drumroll(2.4);
    await this.wait(2700);
    this.showFinal(res, byId, me);
    this.audio.fanfare();
    await this.world.podium(res.players.map((r) => r.pid));
    for (const w of res.winners) this.world.celebrate(w, v.players.map((p) => p.color).concat(['#e2c27a', '#ffffff']));
  }

  private showFinal(res: GameResults, byId: Map<string, PlayerView>, me: string | null) {
    const winners = res.winners.map((id) => byId.get(id)!).filter(Boolean);
    const top = res.players[0];
    const tie = winners.length > 1;
    const sameTotal = res.players.filter((r) => r.total === top.total);
    const brokeTie = sameTotal.length > 1 && !tie;
    const rows = res.players
      .map((r: PlayerResult) => {
        const p = byId.get(r.pid)!;
        return `<tr class="${res.winners.includes(r.pid) ? 'win' : ''} ${r.pid === me ? 'me' : ''}">
          <td class="rk">${r.rank}</td><td class="nm">${dot(p.color)}${esc(p.name)}</td>
          <td>${r.prestigePoints}</td><td>${r.decorPoints}</td><td>${r.eyelinePoints}</td><td>${r.fullPoints}</td><td>${r.cornerPoints}</td><td>${r.excessPoints}</td><td class="tot">${r.total}</td></tr>`;
      })
      .join('');
    const host = this.isHost();
    const note = brokeTie
      ? `<div class="gf-note">Tied on ${top.total} points: decided by bid cards left in hand (${sameTotal.map((r) => `${esc(byId.get(r.pid)!.name)} ${r.handValue}`).join(', ')}).</div>`
      : '';
    const final = el(
      'div',
      'gala-final',
      `<div class="gf-kicker">${tie ? 'A tie! The evening is shared by' : 'The talk of the town'}</div>
       <div class="gf-name">${winners.map((w) => `<span style="--pc:${w.color}">${esc(w.name)}</span>`).join(' & ')}</div>
       <div class="gf-score">${top.total} points${winners.some((w) => w.id === me) ? ' \u00b7 Congratulations!' : ''}</div>
       ${note}
       <table class="gf-table"><thead><tr><th></th><th>Collector</th><th>Paintings</th><th>Decor</th><th>Eyeline</th><th>Full</th><th>Corners</th><th>Excess</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
       <div class="gf-actions">
         <button class="btn ghost admire">${icon('camera')} Admire the walls</button>
         ${host ? '<button class="btn primary again">Back to the lobby</button>' : '<span class="waiting">The host can start a new evening.</span>'}
       </div>`,
    );
    this.root.querySelector('.gala-foot')?.remove();
    this.root.appendChild(final);
    this.root.classList.add('finale');
    final.querySelector('.admire')!.addEventListener('click', () => {
      this.root.classList.remove('show');
      this.reopen.classList.add('show');
      this.hudHidden(false);
    });
    final.querySelector('.again')?.addEventListener('click', () => this.onLobby());
  }
}
