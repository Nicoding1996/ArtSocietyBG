import { el, esc } from './dom';
import { icon } from './icons';

export interface HomeHandlers {
  onCreate(name: string): void;
  onJoin(name: string, code: string): void;
  onHelp(): void;
}

export function renderHome(root: HTMLElement, name: string, code: string, h: HomeHandlers) {
  root.innerHTML = '';
  const card = el('div', 'home-card glass');
  const joining = !!code;
  card.innerHTML = `
    <div class="brand">
      <div class="brand-mark">${icon('sketch')}</div>
      <h1>Art Society</h1>
      <p class="tagline">Bid for paintings, hang them with taste, follow the fashion</p>
    </div>
    <label class="field"><span>Your name</span><input class="name" maxlength="18" value="${esc(name)}" placeholder="e.g. Berthe" autocomplete="nickname" /></label>
    ${
      joining
        ? `<button class="btn primary big join-now">Join room <b>${esc(code)}</b></button><div class="or"><span>or</span></div><button class="btn ghost create">Create a new room instead</button>`
        : `<button class="btn primary big create">Create a room</button>
           <div class="or"><span>or join friends</span></div>
           <form class="join-row"><input class="code" maxlength="4" placeholder="CODE" aria-label="Room code" /><button class="btn">Join</button></form>`
    }
    <button class="link help-link">${icon('help')} How to play</button>
    <p class="fine">2\u20134 players \u00b7 30\u201360 minutes \u00b7 add bots to fill the table</p>`;
  root.appendChild(card);
  const nameInput = card.querySelector<HTMLInputElement>('.name')!;
  const getName = () => nameInput.value.trim() || 'Collector';
  card.querySelector('.create')?.addEventListener('click', () => h.onCreate(getName()));
  card.querySelector('.join-now')?.addEventListener('click', () => h.onJoin(getName(), code));
  const codeInput = card.querySelector<HTMLInputElement>('.code');
  codeInput?.addEventListener('input', () => (codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z]/g, '')));
  card.querySelector('.join-row')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const c = codeInput!.value.trim();
    if (c.length === 4) h.onJoin(getName(), c);
    else codeInput!.focus();
  });
  card.querySelector('.help-link')!.addEventListener('click', h.onHelp);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') (card.querySelector('.join-now, .create') as HTMLButtonElement)?.click();
  });
  setTimeout(() => nameInput.focus(), 50);
}
