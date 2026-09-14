import { EventType, type Event as NotifeeEvent } from '@notifee/react-native';
import { getApps } from '@react-native-firebase/app';

import { logAppEvent } from '../log/registry';

export const PREFIX = '[coexist]';

/**
 * GoogleService-Info.plist and google-services.json are gitignored, so a build
 * without them has no default app and every `getMessaging()` call throws. The
 * experiment degrades to "Firebase absent" rather than taking the app down.
 */
export function isFirebaseConfigured(): boolean {
  return getApps().length > 0;
}

function compact(payload: unknown): string {
  try {
    const json = JSON.stringify(payload);
    if (json === undefined) {
      return String(payload);
    }
    return json.length > 500 ? `${json.slice(0, 500)}…` : json;
  } catch {
    return String(payload);
  }
}

export function record(
  source: 'firebase' | 'notifee',
  event: string,
  payload: unknown
): void {
  logAppEvent(`${PREFIX} ${source}.${event}`, compact(payload));
}

export function describeNotifeeEvent(event: NotifeeEvent): unknown {
  return {
    type: EventType[event.type] ?? event.type,
    id: event.detail.notification?.id,
    title: event.detail.notification?.title,
    pressAction: event.detail.pressAction?.id,
    data: event.detail.notification?.data,
  };
}
