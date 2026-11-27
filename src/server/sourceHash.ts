import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * A short hash of the rules and messages shared by the page and the server (src/shared). The page is
 * built with it and the server sends its own, so a server left running on older code (while the page
 * was rebuilt from newer code, or the other way round) is noticed instead of misreading the game.
 * Line endings are ignored, so a checkout with CRLF files hashes the same.
 */
export function sharedSourceHash(sharedDir: string): string {
  const h = createHash('sha256');
  for (const name of readdirSync(sharedDir).filter((n) => n.endsWith('.ts')).sort()) {
    h.update(name);
    h.update(readFileSync(path.join(sharedDir, name), 'utf8').replace(/\r\n/g, '\n'));
  }
  return h.digest('hex').slice(0, 12);
}
