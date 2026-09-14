export type LogSource = 'event' | 'app';

export type LogEntry = {
  readonly id: string;
  readonly timestampMs: number;
  readonly name: string;
  readonly detail: string;
  readonly source: LogSource;
};

/**
 * Bounded so a chatty event (`onBadgeUpdate` during a sync) cannot grow the
 * buffer without limit across a long QA session. The oldest entry is dropped.
 */
const CAPACITY = 500;

type Listener = () => void;

let entries: readonly LogEntry[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of [...listeners]) {
    listener();
  }
}

export function append(
  name: string,
  detail: string,
  source: LogSource
): LogEntry {
  nextId += 1;
  const entry: LogEntry = {
    id: String(nextId),
    timestampMs: Date.now(),
    name,
    detail,
    source,
  };
  const next = [entry, ...entries];
  // Newest first, so the cap trims the tail and `getEntries` needs no reversal.
  entries = next.length > CAPACITY ? next.slice(0, CAPACITY) : next;
  notifyListeners();
  return entry;
}

export function clear(): void {
  if (entries.length === 0) {
    return;
  }
  entries = [];
  notifyListeners();
}

/**
 * Newest first. The identity is stable between appends, which is what
 * `useSyncExternalStore` requires of a snapshot.
 */
export function getEntries(): readonly LogEntry[] {
  return entries;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
