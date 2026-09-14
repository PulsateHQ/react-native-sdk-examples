# Getting started

At the end of this page the SDK is installed and configured with your app's
credentials. A session is running for a known user and visible in the Pulsate
dashboard, and campaign links reach your router. Push notifications are the
next page.

## Requirements

- React Native 0.76 or newer with the New Architecture enabled. The SDK is a
  TurboModule and does not support the old architecture.
- iOS 15.1 or newer as the app's deployment target.
- Android `minSdkVersion` 28 or higher.
- A Pulsate app and its **SDK App ID** and **SDK App Key**, from the
  dashboard under **Settings → App Settings → SDK Connect**. Both are
  64-character strings.
- Expo users: Expo SDK 53 or newer with prebuild or a development build.
  The SDK cannot run in Expo Go.

## 1. Install the package

```sh
npm install @pulsatehq/react-native-sdk
```

Or, with Yarn:

```sh
yarn add @pulsatehq/react-native-sdk
```

> Until the first stable release, published versions are previews on the
> `next` dist-tag: append `@next` to the package name when installing.

Then install the iOS pods:

```sh
cd ios && pod install
```

On Expo, install with `npx expo install @pulsatehq/react-native-sdk` and
continue with [Set up the Expo config plugin](expo.md), which adds the
plugin and runs prebuild.

The package pulls in the native Pulsate SDKs itself: `PULPulsate` through
CocoaPods and `com.pulsatehq.sdk:PulsateSdk` from Maven Central. Both are
public. Nothing needs adding to your Podfile or Gradle files.

## 2. Configure the SDK at startup

Call `configure()` once, as early as your app starts, before any other
Pulsate call. Every other function rejects with `CONFIGURATION_ERROR` until
it has resolved.

```ts
// src/pulsate.ts
import { configure } from '@pulsatehq/react-native-sdk';

export async function configurePulsate() {
  await configure({
    appId: '<YOUR_APP_ID>',
    appKey: '<YOUR_APP_KEY>',
  });
}
```

Call `configurePulsate()` from your app's entry point.

Rules for this step:

- Both keys must be exactly 64 characters. Anything else rejects with
  `VALIDATION_ERROR` before the native SDK is reached.
- `configure()` is idempotent. Calling it again with the same keys resolves;
  calling it with different keys rejects with `VALIDATION_ERROR`. Changed
  keys take effect on the next cold launch.
- On Android, do not put `PulsateAppId` or `PulsateAppKey` meta-data in the
  manifest. Manifest keys override runtime credentials, so `configure()`
  rejects with `CONFIGURATION_ERROR` when they are present.
- `PulsateConfig` has two iOS-only options, `iosPulsateAppDelegate` and
  `iosPulsateNotificationDelegate`. Leave them at their default, `false`.
  The iOS push guide explains what they do.

> [!IMPORTANT]
> Use a Pulsate app in **Development Mode** for debug builds and one in
> **Production Mode** for release builds. Select the matching keys per build
> configuration. The mode is chosen when the app is created. Find it in
> **Settings → App Manager**. It decides which APNs environment Pulsate sends
> to.

## 3. Start a session for the user

A session ties everything that follows to one user, identified by an alias
you choose: a customer ID, a member number, any stable string. Start it when
you know who the user is, with the app in the foreground.

```ts
// src/pulsate.ts
import { startSession } from '@pulsatehq/react-native-sdk';

export async function startPulsateSession(alias: string) {
  await startSession(alias);
}
```

Rules for this step:

- The alias is required. A blank alias rejects with `VALIDATION_ERROR`.
- Call it with the app in the foreground. In the background the SDK retries
  and then fails: after about 12 seconds on iOS, about 30 seconds on Android.
- Starting a session for a different alias replaces the previous user and
  clears every notification in the tray, including notifications other
  libraries posted.
- What a resolved promise means differs by platform. On Android the backend
  accepted the session; invalid credentials reject with `REQUEST_ERROR`. On
  iOS a resolve means the request was sent. Confirm the user in the dashboard,
  as in **Verify**.

## 4. Signal sign-in and sign-out

If your app has its own login, tell the SDK when the user is authenticated
so campaigns targeted at signed-in users can be delivered.

```ts
// src/auth.ts
import { userHasLoggedIn, userHasLoggedOut } from '@pulsatehq/react-native-sdk';

// After your own login succeeds
export async function onSignIn() {
  await userHasLoggedIn();
}

// When the user signs out of your app
export async function onSignOut() {
  await userHasLoggedOut();
}
```

These do not start or end the Pulsate session. `startSession()` and
`logout()` do that.

```ts
// src/auth.ts
import { logout } from '@pulsatehq/react-native-sdk';

// When the user's identity should no longer be attached to this device
export async function forgetUser() {
  await logout();
}
```

## 5. Handle links from campaigns

The SDK hands your app the destination instead of opening it. This covers a
push CTA, an in-app button and a link in the feed. The destination arrives
through the `onLink` event. Subscribe once at startup, before any screen mounts. A link that
cold-started the app is delivered as soon as you subscribe. Route on the URLs
your app owns.

```ts
// src/links.ts
import { addListener } from '@pulsatehq/react-native-sdk';
import { createNavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';

// Type the ref with your stack's param list.
type RootStackParamList = {
  LinkTarget: { url: string };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// A link can arrive before the navigation container is ready, so hold it.
let pendingUrl: string | null = null;

addListener('onLink', (url) => {
  if (!url.startsWith('myapp://')) {
    // Not ours: hand it to the system. `openURL` rejects when no app claims
    // the scheme.
    Linking.openURL(url).catch(() => {});
    return;
  }
  if (navigationRef.isReady()) {
    navigationRef.navigate('LinkTarget', { url });
  } else {
    pendingUrl = url;
  }
});

export function drainPendingLink() {
  if (pendingUrl !== null) {
    navigationRef.navigate('LinkTarget', { url: pendingUrl });
    pendingUrl = null;
  }
}
```

Then drain what you held, once navigation exists:

```tsx
// App.tsx
import { NavigationContainer } from '@react-navigation/native';

import { drainPendingLink, navigationRef } from './src/links';
import { RootStack } from './src/RootStack';

export default function App() {
  return (
    <NavigationContainer ref={navigationRef} onReady={drainPendingLink}>
      <RootStack />
    </NavigationContainer>
  );
}
```

[Subscribe to SDK events](handling-events.md) covers the held links and the
other events the SDK raises.

## 6. Verify

1. Run the app in debug on a device or emulator. `configure()` resolves.
2. Start a session with a test alias. The promise resolves.
3. In the Pulsate dashboard, open **Users** and search for the alias. The
   alias appears in the list.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `configure()` rejects with `VALIDATION_ERROR` | A key is not 64 characters, or `configure()` was called again with different keys | Step 2. Copy both keys from **Settings → App Settings → SDK Connect**. Restart the app after changing keys |
| `configure()` rejects with `CONFIGURATION_ERROR` on Android | `PulsateAppId` or `PulsateAppKey` meta-data is in the manifest | Step 2. Remove the meta-data; pass credentials only through `configure()` |
| `configure()` rejects with `CONFIGURATION_ERROR` on Android and the manifest has no Pulsate meta-data | The SDK's `PulsateProvider` content provider was removed from the merged manifest | Remove any manifest entry that removes `PulsateProvider`. See the warning in step 3 of [Set up push notifications on Android](android-push-setup.md) |
| Any call rejects with `CONFIGURATION_ERROR` | `configure()` has not resolved yet | Step 2. Await `configure()` before the first Pulsate call |
| `startSession()` rejects with `VALIDATION_ERROR` | The alias is empty or whitespace | Step 3. Pass a non-blank alias |
| `startSession()` rejects with `REQUEST_ERROR` on Android | The backend refused the session, usually invalid credentials | Step 3. Check the keys and the app's mode in **App Manager** |
| `startSession()` resolves on iOS but the user never appears in the dashboard | On iOS the SDK does not inspect the HTTP status, so a refused request still resolves | Step 3. Check the keys and the app's mode in **App Manager** |
| The build fails on Android with a manifest merger error mentioning `minSdkVersion` | The app's `minSdkVersion` is below 28 | See **Requirements**. Set `minSdkVersion = 28` in the `ext` block of your app's `android/build.gradle` |

## How it works

Nothing opens unless your app opens it. The SDK has already answered that your
app is handling the link. A URL you neither route nor pass to
`Linking.openURL` goes nowhere.

On iOS a push call to action whose destination type is `url` opens Safari
without consulting the listener. Use a `deeplink` destination for anything you
want to route yourself.

## Next steps

- [Set up push notifications on iOS](ios-push-setup.md)
- [Set up push notifications on Android](android-push-setup.md)
- [Set up the Expo config plugin](expo.md)
- [Theme in-app messages](theming.md)
- [Subscribe to SDK events](handling-events.md)
- [Update the user profile and privacy](user-profile.md)
- [Send custom attributes and events](attributes-and-events.md)
- [Show the Pulsate feed](feed.md)
- [Set up location and geofences](location.md)
- [Declare the data the SDK collects](data-collection.md)
- [Control when in-app messages appear](in-app-messages.md)
- [API reference](api/README.md)
- [Errors](errors.md)
