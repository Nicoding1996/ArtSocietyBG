/** What the turn alert needs from the page: whether the tab is in the background, its title, a sound. */
export interface TurnHost {
  readonly hidden: boolean;
  title: string;
  chime(): void;
}

/**
 * Tells a player whose tab is in the background that the game is waiting for them: the tab's title
 * says so and a chime plays, once each time their turn begins. The title goes back when they return.
 */
export class TurnAlert {
  private mine = false;

  constructor(
    private readonly host: TurnHost,
    private readonly base: string,
  ) {}

  /** Call with every new game state: whether the game is now waiting for this player. */
  update(mine: boolean) {
    const begins = mine && !this.mine;
    this.mine = mine;
    if (begins && this.host.hidden) {
      this.host.title = `\u25cf Your turn \u00b7 ${this.base}`;
      this.host.chime();
    } else if (!mine) this.clear();
  }

  /** The player is looking at the tab again, or the game screen closes. */
  clear() {
    if (this.host.title !== this.base) this.host.title = this.base;
  }
}
