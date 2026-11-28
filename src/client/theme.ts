import { decorInfo, genreInfo, type DecorDef, type GenreDef } from '../shared/content';
import type { DecorShape, Genre, ThemeId } from '../shared/types';

/**
 * The theme this client is showing: the room's choice in the lobby, the game's once it starts. Only names,
 * icons and paintings follow it; the type colours are the same in every theme.
 */
let current: ThemeId = 'classic';

export const theme = (): ThemeId => current;

export function setTheme(next: ThemeId) {
  current = next;
}

/** A type's name, short name, colour and blurb in the current theme. */
export const typeInfo = (g: Genre): GenreDef => genreInfo(current)[g];

/** A type in the middle of a sentence: its name ("Still Life") in the classic theme, "Water painting" in the Avatar one. */
export const typeName = (g: Genre): string => (current === 'avatar' ? `${typeInfo(g).name} painting` : typeInfo(g).name);

/** The same with its article: "a Still Life", "an Air painting". */
export function aTypeName(g: Genre): string {
  const name = typeName(g);
  return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

/** A decor tile's name ("Paper lantern"), its name inside a sentence and its plural, in the current theme. */
export const decorDef = (s: DecorShape): DecorDef => decorInfo(current)[s];

const ELEMENTS: Record<Genre, string> = { city: 'water', landscape: 'earth', portrait: 'fire', still: 'air' };

/** The icon for a type: its subject in the classic theme, its nation's element in the Avatar theme. */
export const typeIcon = (g: Genre): string => (current === 'avatar' ? ELEMENTS[g] : g);

/** Every icon a type can have in any theme, for preloading. */
export const TYPE_ICONS = [...Object.keys(ELEMENTS), ...Object.values(ELEMENTS)];
