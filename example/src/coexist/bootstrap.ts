import notifee from '@notifee/react-native';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

import { logAppEvent } from '../log/registry';
import { registerCoexistTestCategory } from './categories';
import {
  PREFIX,
  describeNotifeeEvent,
  isFirebaseConfigured,
  record,
} from './record';

/**
 * App-bootstrap half of the rig: imported by `index.js` and `App.tsx` only.
 * Screens use `./actions` so they can be quoted in the integration docs
 * without dragging this wiring along.
 */

/**
 * The two handlers RNFirebase and notifee require to be registered before
 * `AppRegistry.registerComponent`, so they exist when the OS starts the app
 * headless for a background message. Called from `index.js`, never from a
 * component.
 */
export function registerCoexistBackgroundHandlers(): void {
  notifee.onBackgroundEvent(async (event) => {
    record('notifee', 'onBackgroundEvent', describeNotifeeEvent(event));
  });

  if (!isFirebaseConfigured()) {
    logAppEvent(
      `${PREFIX} firebase.background`,
      'Skipped: no Firebase app — the GoogleService plist/json is absent.'
    );
    return;
  }

  setBackgroundMessageHandler(getMessaging(), async (message) => {
    record('firebase', 'setBackgroundMessageHandler', message);
  });
}

/**
 * Foreground registrations. Returns its teardown so a fast-refresh reload does
 * not leave two of each listener attached.
 */
export function startCoexistListeners(): () => void {
  let disposed = false;
  const unsubscribes: (() => void)[] = [
    notifee.onForegroundEvent((event) => {
      record('notifee', 'onForegroundEvent', describeNotifeeEvent(event));
    }),
  ];

  if (!isFirebaseConfigured()) {
    logAppEvent(
      `${PREFIX} firebase.start`,
      'Skipped: no Firebase app — the GoogleService plist/json is absent.'
    );
  } else {
    const messaging = getMessaging();
    unsubscribes.push(
      onMessage(messaging, async (message) => {
        record('firebase', 'onMessage', message);
      }),
      onNotificationOpenedApp(messaging, (message) => {
        record('firebase', 'onNotificationOpenedApp', message);
      })
    );

    // A cold start from a notification tap: reported once, and `null` is the
    // ordinary answer for a normal launch. The promise cannot be cancelled, so
    // the teardown flag keeps a reload's dead instance from writing a line.
    getInitialNotification(messaging)
      .then((message) => {
        if (!disposed) {
          record('firebase', 'getInitialNotification', message);
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          record('firebase', 'getInitialNotification.rejected', String(error));
        }
      });
  }

  registerCoexistTestCategory();

  logAppEvent(
    `${PREFIX} start`,
    `Coexistence listeners attached; Firebase ${isFirebaseConfigured() ? 'present' : 'absent'}.`
  );

  return () => {
    disposed = true;
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  };
}
