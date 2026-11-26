import type { LogEntry } from '../../shared/types';
import { el, esc } from './dom';
import { icon } from './icons';

export interface ChatLine {
  pid: string;
  name: string;
  color: string;
  text: string;
  at: number;
}

const REACTIONS = ['👏', '😮', '😂', '🎨', '🔥', '😭', '👑', '🤝'];

/** Combined game log + chat feed with an input box and quick reactions. */
export class ChatPanel {
  readonly root: HTMLElement;
  private feed: HTMLElement;
  private input: HTMLInputElement;
  private lines: ChatLine[] = [];
  private log: LogEntry[] = [];
  private colors: Record<string, string> = {};
  private showLog: boolean;
  /** Keeps the newest line in view until the reader scrolls back through the feed. */
  private follow = true;
  onSend: ((text: string) => void) | null = null;
  onReact: ((emoji: string) => void) | null = null;

  constructor(withLog: boolean) {
    this.showLog = withLog;
    this.root = el('div', 'chat panel');
    this.root.innerHTML = `
      <div class="panel-title">${icon('chat')} ${withLog ? 'Chronicle & chat' : 'Chat'}</div>
      <div class="feed" role="log" aria-live="polite"></div>
      ${withLog ? `<div class="reactions">${REACTIONS.map((r) => `<button class="react" data-r="${r}" title="Send a reaction">${r}</button>`).join('')}</div>` : ''}
      <form class="chat-form"><input maxlength="240" placeholder="Say something nice…" aria-label="Chat message" /><button class="icon-btn" title="Send">${icon('chat')}</button></form>`;
    this.feed = this.root.querySelector('.feed')!;
    this.feed.addEventListener('scroll', () => {
      // A hidden feed reports zero sizes, so only a visible one tells where the reader is.
      if (!this.feed.clientHeight) return;
      this.follow = this.feed.scrollTop + this.feed.clientHeight >= this.feed.scrollHeight - 30;
    });
    // The feed forgets its scroll position while hidden or moved to another screen.
    new ResizeObserver(() => {
      if (this.follow) this.feed.scrollTop = this.feed.scrollHeight;
    }).observe(this.feed);
    this.input = this.root.querySelector('input')!;
    this.root.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.input.value.trim();
      if (text && this.onSend) this.onSend(text);
      this.input.value = '';
    });
    this.root.querySelectorAll<HTMLButtonElement>('.react').forEach((b) => b.addEventListener('click', () => this.onReact?.(b.dataset.r!)));
    // Keep keystrokes in the chat box from reaching the 3D controls.
    this.input.addEventListener('keydown', (e) => e.stopPropagation());
  }

  setColors(colors: Record<string, string>) {
    this.colors = colors;
  }

  addChat(line: ChatLine) {
    this.lines.push(line);
    if (this.lines.length > 100) this.lines.shift();
    this.render();
  }

  setLog(log: LogEntry[]) {
    if (!this.showLog) return;
    const lastOld = this.log[this.log.length - 1]?.id;
    const lastNew = log[log.length - 1]?.id;
    if (lastOld === lastNew && log.length === this.log.length) return;
    this.log = log.slice(-60);
    this.render();
  }

  private render() {
    type Item = { at: number; html: string };
    const items: Item[] = [];
    // Log entries have no timestamp; interleave them by arrival using their ids as a stable order.
    this.log.forEach((l) => {
      const c = l.pid ? this.colors[l.pid] : undefined;
      items.push({ at: l.id, html: `<div class="line log lk-${l.kind}">${c ? `<i class="pdot" style="--pc:${c}"></i>` : ''}${esc(l.text)}</div>` });
    });
    const base = this.log.length ? this.log[this.log.length - 1].id : 0;
    this.lines.forEach((m, i) => {
      items.push({ at: m.at > 0 ? m.at : base + i, html: `<div class="line chatline"><b style="color:${esc(m.color)}">${esc(m.name)}</b> ${esc(m.text)}</div>` });
    });
    items.sort((a, b) => a.at - b.at);
    this.feed.innerHTML = items.map((i) => i.html).join('');
    if (this.follow) this.feed.scrollTop = this.feed.scrollHeight;
  }

  /** Jumps to the newest line, e.g. when the panel comes back into view. */
  showLatest() {
    this.follow = true;
    this.feed.scrollTop = this.feed.scrollHeight;
  }

  /** Chat lines are ordered after the log entry that was newest when they arrived. */
  stamp(): number {
    const base = this.log.length ? this.log[this.log.length - 1].id : 0;
    return base + 0.5 + this.lines.length * 1e-4;
  }
}
