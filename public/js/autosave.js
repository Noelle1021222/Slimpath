// Debounced, strictly sequential autosave.
//
// - Only one save is in flight at a time, so an older request can never land
//   after (and overwrite) a newer one.
// - Each save sends a snapshot taken when the request starts; edits made while
//   it is in flight are picked up by a follow-up save.
// - A failed save keeps the edits marked as unsaved until `retry()` (or the next
//   edit) succeeds; nothing is retried in a loop behind the user's back.

/**
 * @param {object} o
 * @param {() => any} o.snapshot  returns a copy of the data to save
 * @param {(data: any) => Promise<void>} o.save
 * @param {(state: 'idle'|'pending'|'saving'|'saved'|'error', err?: Error) => void} [o.onState]
 * @param {number} [o.delay]
 */
export function createAutosave({ snapshot, save, onState = () => {}, delay = 650 }) {
  let version = 0; // bumped on every edit
  let savedVersion = 0; // highest version known to be stored
  let inFlight = null; // Promise of the running save
  let failed = false;
  let timer = null;

  const unsaved = () => version > savedVersion;

  function run() {
    clearTimeout(timer);
    timer = null;
    if (inFlight) return inFlight.then(() => (unsaved() && !failed ? run() : undefined));
    if (!unsaved()) return Promise.resolve();
    const v = version;
    const data = snapshot();
    failed = false;
    onState('saving');
    inFlight = Promise.resolve()
      .then(() => save(data))
      .then(
        () => {
          savedVersion = Math.max(savedVersion, v);
          inFlight = null;
          if (unsaved()) return run(); // edits arrived while saving
          onState('saved');
        },
        (err) => {
          failed = true;
          inFlight = null;
          onState('error', err);
        }
      );
    return inFlight;
  }

  return {
    /** Record an edit and schedule a save. */
    touch() {
      version++;
      onState('pending');
      clearTimeout(timer);
      timer = setTimeout(run, delay);
    },
    /** Save now (e.g. before switching dates). Resolves when nothing is pending or a save failed. */
    flush: run,
    /** Try a failed save again. */
    retry() {
      failed = false;
      return run();
    },
    /** True while some edit is not yet confirmed as stored. */
    hasUnsaved: () => unsaved() || Boolean(inFlight),
    /** Resolves once the queue is quiet (used before reloading the same date). */
    idle() {
      return (inFlight || Promise.resolve()).catch(() => {});
    },
  };
}
