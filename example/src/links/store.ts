export type LinkRecord = {
  readonly url: string;
  readonly receivedAtMs: number;
  /** `null` until the registry has started, which in practice never happens. */
  readonly sinceRegistryStartMs: number | null;
  /**
   * A guess, not a native flag: the bridge marks no replayed link as replayed,
   * so the only signal available here is that the native flush happens on the
   * registry's own `addListener` call and therefore lands in the same burst as
   * it. A link tapped live inside the window is indistinguishable and reads as
   * replayed, which is why the screen labels this as inferred.
   */
  readonly fromStartupBurst: boolean;
};

/**
 * Wide enough for the flush to cross the bridge on a cold, still-loading
 * device, short enough that a tester tapping a live link after the app is up
 * is outside it.
 */
const STARTUP_BURST_MS = 2000;

type Listener = () => void;

let registryStartedAtMs: number | null = null;
let lastLink: LinkRecord | null = null;
let consumeInJs = true;
const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of [...listeners]) {
    listener();
  }
}

/** Called by the registry as it subscribes, before the native flush can arrive. */
export function markRegistryStarted(): void {
  registryStartedAtMs = Date.now();
}

export function recordLink(url: string): LinkRecord {
  const receivedAtMs = Date.now();
  const sinceRegistryStartMs =
    registryStartedAtMs === null ? null : receivedAtMs - registryStartedAtMs;
  lastLink = {
    url,
    receivedAtMs,
    sinceRegistryStartMs,
    fromStartupBurst:
      sinceRegistryStartMs !== null && sinceRegistryStartMs <= STARTUP_BURST_MS,
  };
  notifyListeners();
  return lastLink;
}

export function getConsumeInJs(): boolean {
  return consumeInJs;
}

export function setConsumeInJs(value: boolean): void {
  if (value === consumeInJs) {
    return;
  }
  consumeInJs = value;
  notifyListeners();
}

/** Identity is stable between links, which `useSyncExternalStore` requires. */
export function getLastLink(): LinkRecord | null {
  return lastLink;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
