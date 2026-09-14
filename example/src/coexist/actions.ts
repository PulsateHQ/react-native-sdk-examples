import { Platform } from 'react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { getMessaging, getToken } from '@react-native-firebase/messaging';

import { COEXIST_CATEGORY_ID } from './categories';
import { isFirebaseConfigured, record } from './record';

/**
 * Screen-callable half of the rig: the two controls on the Push screen's
 * "Neighbour push stack" card. No bootstrap wiring lives here.
 */

const LOCAL_NOTIFICATION_ID = 'coexist-local';

/**
 * Posts a notification that is unambiguously notifee's, so the AppDelegate
 * `willPresent` trace shows Pulsate declining it and the host presenting it.
 */
export async function displayCoexistLocalNotification(): Promise<string> {
  if (Platform.OS !== 'ios') {
    // notifee on Android needs a channel this rig does not create; the ADR
    // result is iOS-only and the Push screen hides the card there.
    throw new Error('The coexistence rig is iOS-only for now.');
  }
  const settings = await notifee.requestPermission();
  record('notifee', 'requestPermission', settings);
  if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
    throw new Error(
      `Notifications not authorized (status ${settings.authorizationStatus}); nothing was posted.`
    );
  }

  const id = await notifee.displayNotification({
    id: LOCAL_NOTIFICATION_ID,
    title: 'notifee local',
    body: 'Posted by notifee, not by Pulsate.',
    ios: { categoryId: COEXIST_CATEGORY_ID },
  });
  record('notifee', 'displayNotification', { id });
  return id;
}

/**
 * `getToken()` only. `registerDeviceForRemoteMessages()` is deliberately not
 * called: with `FirebaseAppDelegateProxyEnabled` false its promise never
 * settles, so awaiting it would hang this button forever. The APNs token
 * reaches Firebase from `AppDelegate` instead.
 */
export async function logFcmToken(): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'No Firebase app — the GoogleService plist/json is absent.'
    );
  }
  try {
    const token = await getToken(getMessaging());
    // The screen shows the same prefix; the whole token is a push credential
    // and stays out of the log store.
    record('firebase', 'getToken.resolved', {
      prefix: token.slice(0, 12),
      length: token.length,
    });
    return token;
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : 'unknown';
    record('firebase', 'getToken.rejected', {
      code,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
