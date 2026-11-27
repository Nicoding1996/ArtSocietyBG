import { describe, expect, it } from 'vitest';
import { TurnAlert } from '../src/client/turnAlert';

/** A browser tab as the alert sees it: whether it is in the background, its title, and the chimes it played. */
function page(hidden: boolean) {
  return {
    hidden,
    title: 'Art Society',
    chimes: 0,
    chime() {
      this.chimes++;
    },
  };
}

describe('turn alert', () => {
  it('a tab in the background changes its title and chimes once each time the turn begins', () => {
    const tab = page(true);
    const alert = new TurnAlert(tab, 'Art Society');
    alert.update(false);
    expect(tab).toMatchObject({ title: 'Art Society', chimes: 0 });
    alert.update(true);
    expect(tab.title).toMatch(/Your turn/);
    expect(tab.chimes).toBe(1);
    // More updates while it is still their turn stay quiet.
    alert.update(true);
    expect(tab.chimes).toBe(1);
    // The turn is over (say the autopilot played it): the title goes back.
    alert.update(false);
    expect(tab.title).toBe('Art Society');
    alert.update(true);
    expect(tab.chimes).toBe(2);
  });

  it('a tab in view stays quiet, and coming back to the tab puts the title back', () => {
    const tab = page(false);
    const alert = new TurnAlert(tab, 'Art Society');
    alert.update(true);
    expect(tab).toMatchObject({ title: 'Art Society', chimes: 0 });
    alert.update(false);
    tab.hidden = true;
    alert.update(true);
    expect(tab.title).toMatch(/Your turn/);
    tab.hidden = false;
    alert.clear();
    expect(tab.title).toBe('Art Society');
  });
});
