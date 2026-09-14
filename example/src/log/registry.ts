import { Linking } from 'react-native';

import {
  addListener,
  type PulsateEvents,
  type Subscription,
} from '@pulsatehq/react-native-sdk';
import { addInternalListener } from '@pulsatehq/react-native-sdk/internal';

import { routeLink } from '../links/navigation';
import {
  getConsumeInJs,
  markRegistryStarted,
  recordLink,
} from '../links/store';
import { append, type LogEntry } from './store';

export type ToastNotifier = (message: string) => void;

export type ListenerRegistryOptions = {
  notify: ToastNotifier;
};

let notifier: ToastNotifier | undefined;

const TOAST_MAX_LENGTH = 120;

function toastText(text: string): string {
  return text.length <= TOAST_MAX_LENGTH
    ? text
    : `${text.slice(0, TOAST_MAX_LENGTH - 1)}…`;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function record(
  name: string,
  detail: string,
  source: LogEntry['source']
): void {
  append(name, detail, source);
  notifier?.(toastText(detail === '' ? name : `${name}: ${detail}`));
}

/**
 * App-side milestones — a screen navigated to, a bootstrap step reached — so
 * they interleave with SDK events on one timeline. Screens use this; they never
 * append to the store directly.
 */
export function logAppEvent(name: string, detail = ''): void {
  record(name, detail, 'app');
}

function forwardToLinking(url: string): void {
  Linking.openURL(url).then(
    () => {
      logAppEvent('link.openURL', `Opened: ${url}`);
    },
    (error: unknown) => {
      logAppEvent('link.openURL', `Rejected: ${describeError(error)}`);
    }
  );
}

/**
 * One entry per `PulsateEvents` member — plus the internal `onPushReceived`
 * — added here in the phase that lands the area's API (plan §8), never in a
 * screen. Each subscribe is guarded so
 * a native binary that predates an event's spec property (a `TypeError` from
 * the emitter) costs that one event, logged, and never the bootstrap.
 */
function subscribeAll(): Subscription[] {
  const subscriptions: Subscription[] = [];
  // One guard for every subscription, public or internal: a native binary
  // that predates an event's spec property throws a `TypeError` from the
  // emitter, and that costs the one event, logged, never the bootstrap.
  const guarded = (event: string, subscribe: () => Subscription): void => {
    try {
      subscriptions.push(subscribe());
    } catch (error: unknown) {
      logAppEvent(
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
    record('onError', `[${error.type}] ${error.message}`, 'event');
  });

  subscribe('onBadgeUpdate', (count) => {
    record('onBadgeUpdate', `count=${count}`, 'event');
  });

  subscribe('onFeedClose', () => {
    record('feed.close', '', 'event');
  });

  subscribe('onUnauthorizedAction', (event) => {
    record(
      'feed.unauthorized',
      event.action === undefined ? '' : `action=${event.action}`,
      'event'
    );
  });

  subscribe('onLink', (url) => {
    record('onLink', url, 'event');
    recordLink(url);
    if (getConsumeInJs()) {
      routeLink(url);
      return;
    }
    forwardToLinking(url);
  });

  subscribe('onGeofence', (event) => {
    const fix =
      event.location === undefined
        ? 'no fix'
        : `${event.location.latitude},${event.location.longitude}`;
    record(
      'onGeofence',
      `${event.transition} ${event.geofenceIds.join(', ')} (${fix})`,
      'event'
    );
  });

  guarded('onPushReceived', () =>
    addInternalListener('onPushReceived', (event) => {
      record(
        'onPushReceived',
        `${event.entryPoint} consumed=${event.consumed} buffered=${event.buffered}`,
        'event'
      );
    })
  );

  return subscriptions;
}

/**
 * Starts the registry and returns its teardown. Safe to call before any screen
 * mounts; the returned function removes this start's subscriptions and
 * detaches the toast notifier, so a fast-refresh reload cannot leave a stale
 * host attached or double-deliver through two registrations.
 */
export function startListenerRegistry(
  options: ListenerRegistryOptions
): () => void {
  notifier = options.notify;
  markRegistryStarted();
  const subscriptions = subscribeAll();

  logAppEvent(
    'registry.started',
    `Listener registry started; ${subscriptions.length} SDK events subscribed.`
  );

  return () => {
    try {
      for (const subscription of subscriptions) {
        try {
          subscription.remove();
        } catch (error: unknown) {
          logAppEvent('registry.remove', describeError(error));
        }
      }
    } finally {
      // Only the notifier this start attached — a stale fast-refresh teardown
      // must not clear a newer registry's live notifier — and detached even
      // if a removal threw, or the stale host this teardown exists to
      // prevent is exactly what it would leave behind.
      if (notifier === options.notify) {
        notifier = undefined;
      }
    }
  };
}
