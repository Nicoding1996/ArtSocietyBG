/**
 * Runs `fn` and logs an error instead of letting it escape. Used where the server is entered (messages,
 * disconnects, timers, housekeeping): every room lives in this one process, so an error that escaped
 * would end every game on the server, not just the one it came from. Returns false if `fn` threw.
 */
export function guarded(what: string, fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch (err) {
    console.error(`[art-society] ${what} failed:`, err);
    return false;
  }
}
