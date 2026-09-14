import {
  addListener,
  type PulsateEvents,
  type Subscription,
} from '@pulsatehq/react-native-sdk';
import { addInternalListener } from '@pulsatehq/react-native-sdk/internal';

export type LogLine = { id: number; at: string; name: string; detail: string };

type Sink = (line: LogLine) => void;

let sink: Sink | undefined;
let nextId = 0;

/**
 * App-side milestones and SDK events share one timeline. The `[expo]` prefix
 * makes this build's lines greppable in a device log that also carries the
 * bare example's `[pulsate]` output — the two apps share a bundle id.
 */
export function logEvent(name: string, detail = ''): void {
  const line = { id: nextId++, at: new Date().toISOString(), name, detail };
  console.log(`[expo] ${name}${detail === '' ? '' : `: ${detail}`}`);
  sink?.(line);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * One entry per `PulsateEvents` member, plus the internal `onPushReceived`
 * receipt the device scenarios assert. Each subscribe is guarded for the bare
 * registry's reason: a native binary that predates an event's spec property
 * throws a `TypeError` from the emitter, and that costs the one event,
 * logged, never the bootstrap.
 */
function subscribeAll(): Subscription[] {
  const subscriptions: Subscription[] = [];
  const guarded = (event: string, subscribe: () => Subscription): void => {
    try {
      subscriptions.push(subscribe());
    } catch (error: unknown) {
      logEvent(
        'registry.subscribe',
        `${event} not subscribed: ${describeError(error)}`
      );
    }
  };
  const subscribe = <K extends keyof PulsateEvents>(
    event: K,
    handler: PulsateEvents[K]
  ): void => guarded(event, () => addListener(event, handler));

  subscribe('onError', (error) => {
    logEvent('onError', `[${error.type}] ${error.message}`);
  });
  subscribe('onBadgeUpdate', (count) => {
    logEvent('onBadgeUpdate', String(count));
  });
  subscribe('onFeedClose', () => {
    logEvent('feed.close');
  });
  subscribe('onUnauthorizedAction', (event) => {
    logEvent(
      'feed.unauthorized',
      event.action === undefined ? '' : `action=${event.action}`
    );
  });
  // The whole URL alone, like the bare registry: the device flows assert that
  // string, so nothing may be prepended to it.
  subscribe('onLink', (url) => {
    logEvent('onLink', url);
  });
  subscribe('onGeofence', (event) => {
    const fix =
      event.location === undefined
        ? 'no fix'
        : `${event.location.latitude},${event.location.longitude}`;
    logEvent(
      'onGeofence',
      `${event.transition} ${event.geofenceIds.join(', ')} (${fix})`
    );
  });
  guarded('onPushReceived', () =>
    addInternalListener('onPushReceived', (event) => {
      logEvent(
        'onPushReceived',
        `${event.entryPoint} consumed=${event.consumed} buffered=${event.buffered}`
      );
    })
  );

  return subscriptions;
}

/** Starts the registry and returns its teardown. */
export function startListenerRegistry(options: { onLine: Sink }): () => void {
  sink = options.onLine;
  const subscriptions = subscribeAll();
  logEvent(
    'registry.started',
    `${subscriptions.length} SDK events subscribed.`
  );
  return () => {
    try {
      for (const subscription of subscriptions) {
        try {
          subscription.remove();
        } catch (error: unknown) {
          logEvent('registry.remove', describeError(error));
        }
      }
    } finally {
      if (sink === options.onLine) {
        sink = undefined;
      }
    }
  };
}
