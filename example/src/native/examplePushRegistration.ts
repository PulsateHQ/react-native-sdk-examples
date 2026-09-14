import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

/**
 * The example app's own native helper, not part of the library.
 *
 * PUSH-02 leaves the notification prompt and the registration step to the
 * host, because the Pulsate SDK does neither on either platform. The example
 * app is the host, so the prompt lives here — putting it in the library would
 * make every partner inherit a prompt they did not schedule.
 */
type ExamplePushRegistrationModule = {
  /**
   * iOS only: the `UNUserNotificationCenter` prompt plus
   * `registerForRemoteNotifications`. Android has no native prompt — the
   * `POST_NOTIFICATIONS` runtime permission is asked from JavaScript below.
   */
  requestAuthorization?(): Promise<boolean>;
  getRegistrationOutcome(): Promise<string | null>;
};

const native = NativeModules.ExamplePushRegistration as
  ExamplePushRegistrationModule | undefined;

export const isPushRegistrationAvailable = native !== undefined;

/**
 * `blocked` is Android's `never_ask_again`: the OS will not show the dialog
 * again, so the only way forward is the system settings — the one fact a
 * plain "denied" hides. iOS has no equivalent state at this call site.
 */
export type PushAuthorizationOutcome = 'granted' | 'denied' | 'blocked';

function required(): ExamplePushRegistrationModule {
  if (!native) {
    throw new Error('ExamplePushRegistration is not linked into this build.');
  }
  return native;
}

/**
 * The `POST_NOTIFICATIONS` runtime permission exists from API 33. The version
 * guard is load-bearing, not documentation: below 33 notifications are on by
 * default and there is nothing to ask, but RN's `PermissionsModule` still runs
 * `checkSelfPermission` on the (unknown) name, gets denied, and answers
 * `never_ask_again` — so without the guard the screen would say "blocked" on
 * a device where notifications work. The library's `minSdkVersion` is 28, so
 * both branches are reachable.
 */
async function requestAndroidNotificationPermission(): Promise<PushAuthorizationOutcome> {
  if (typeof Platform.Version === 'number' && Platform.Version < 33) {
    return 'granted';
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
  switch (result) {
    case PermissionsAndroid.RESULTS.GRANTED:
      return 'granted';
    case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
      return 'blocked';
    default:
      return 'denied';
  }
}

/** Resolves the outcome; a denial is an answer, not a rejection. */
export async function requestPushAuthorization(): Promise<PushAuthorizationOutcome> {
  if (Platform.OS === 'android') {
    return requestAndroidNotificationPermission();
  }
  const prompt = required().requestAuthorization;
  if (!prompt) {
    throw new Error('ExamplePushRegistration has no prompt on this platform.');
  }
  return (await prompt()) ? 'granted' : 'denied';
}

/**
 * What registration produced: the APNs outcome recorded by the AppDelegate on
 * iOS, or the FCM token on Android. `null` until the platform has answered.
 */
export function getRegistrationOutcome(): Promise<string | null> {
  return required().getRegistrationOutcome();
}
