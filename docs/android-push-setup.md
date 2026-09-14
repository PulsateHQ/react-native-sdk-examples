# Set up push notifications on Android

At the end of this page your bare React Native app receives Pulsate push
notifications through Firebase Cloud Messaging, including notifications with
images. Your existing push library keeps working beside Pulsate. This
page is for apps that own their Android project: `AndroidManifest.xml`, the
Gradle files, and any `FirebaseMessagingService`.

If you use Expo prebuild, follow [Set up the Expo config plugin](expo.md)
instead. The plugin performs step 3 for you, and the icon in step 4 when you
set `androidNotificationIcon`. The other steps stay yours. The plugin adds no
permissions, so the `WAKE_LOCK` line in step 3 is yours to add. The iOS
guide is [Set up push notifications on iOS](ios-push-setup.md).

## Requirements

- React Native 0.76 or newer with the New Architecture enabled.
- `minSdkVersion` 28 or higher in `android/build.gradle`. The Pulsate SDK
  declares 28 and the manifest merger fails the build below it.
- A Firebase project of your own with an Android app registered under your
  application ID. Pulsate sends through Firebase Cloud Messaging; there is no
  other transport on Android.
- `@pulsatehq/react-native-sdk` installed and `configure()` resolved, as in
  [Getting started](getting-started.md).
- An emulator image with Google APIs, or a physical device, for
  verification.

You do not add `firebase-messaging` to your own dependencies. The library
exposes it at the version the Pulsate SDK ships, so your messaging service
compiles against the classes the SDK runs on. If the app already declares a
Firebase BoM, keep it; Gradle resolves to the higher version.

## 1. Connect Firebase to the app and to Pulsate

1. In the Firebase console, download `google-services.json` for your Android
   app and place it at `android/app/google-services.json`. The file is per
   application ID, so a debug build with an `applicationIdSuffix` needs its
   own entry in the Firebase app. Firebase describes the procedure in
   [Add Firebase to your Android project](https://firebase.google.com/docs/android/setup).
2. Apply the Google Services Gradle plugin.

   ```groovy
   // android/build.gradle
   buildscript {
       dependencies {
           classpath("com.google.gms:google-services:4.5.0")   // Pulsate
       }
   }
   ```

   ```groovy
   // android/app/build.gradle, last line
   apply plugin: "com.google.gms.google-services"   // Pulsate
   ```

3. In the Firebase console, open **Project settings → Service accounts** and
   choose **Generate new private key**. Firebase describes the key in
   [Authorize send requests](https://firebase.google.com/docs/cloud-messaging/auth-server).
4. In the Pulsate dashboard, open **Settings → App Settings** and find
   **Firebase Cloud Messaging (FCM)**. Upload that JSON file with **Upload
   JSON Secret Key** and save. This is what lets Pulsate send to your
   project. Without it, the dashboard accepts campaigns and nothing is
   delivered.

> [!NOTE]
> If your CI builds the app without `google-services.json`, keep the plugin
> applied and lower its missing-file strategy (plugin 4.4.3 or newer). The
> build then succeeds with no FCM token and no push.
>
> ```groovy
> // android/app/build.gradle
> googleServices {
>     missingGoogleServicesStrategy =
>         com.google.gms.googleservices.GoogleServicesPlugin.MissingGoogleServicesStrategy.WARN
> }
> ```

FCM has no sandbox and production split. One Firebase project and one
service-account key serve every build. The Pulsate app's mode, Development
or Production, affects APNs routing only.

## 2. Request the notification permission

From Android 13 (API 33) posting a notification requires the
`POST_NOTIFICATIONS` runtime permission. The Pulsate SDK declares the
permission in its manifest but never asks the user. Ask at a point that makes
sense in your product. From JavaScript:

```ts
// Anywhere in your app, for example a "Turn on notifications" action
import { PermissionsAndroid, Platform } from 'react-native';

async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (typeof Platform.Version === 'number' && Platform.Version < 33) {
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
```

The permission does not control the FCM token. Firebase issues the token
regardless, and the SDK sends it with the next session start, so the device
appears in the dashboard either way. A denied permission means the push is
delivered to the app and not shown.

The permission is also unrelated to Pulsate's own push flag,
`setPushEnabled()`. That flag is a per-user preference on the Pulsate side.

### Let users turn Pulsate push off

Pulsate keeps its own push preference for each user, separate from the
notification authorization above. Use it for an in-app switch such as
"Offers and news".

```ts
// src/settings/pulsatePush.ts
import { isPushEnabled, setPushEnabled } from '@pulsatehq/react-native-sdk';

export async function applyPushChoice(wantsPush: boolean) {
  await setPushEnabled(wantsPush);
}

export async function readPushChoice() {
  return isPushEnabled();
}
```

Rules for this switch:

- It never shows the system prompt, and it never revokes the authorization.
  A user can have Pulsate push on and the notification permission denied.
- `isPushEnabled()` answers the value set on this device at once. Pulsate
  receives it about sixty seconds later. A change made inside that minute
  replaces the pending one and restarts the minute.
- On Android a failed send is not reported, and the local value goes back to
  what it was.

To remove notifications already on screen, call `clearAllNotifications()`.
It removes every notification the app has posted, including those from other
libraries. It clears the launcher badge on launchers that derive it from
posted notifications. A notification that belongs to a running foreground
service stays. The SDK does the same on
`logout()` and when a session starts for a different alias.

## 3. Register your messaging service

The Pulsate SDK ships its own `FirebaseMessagingService`. FCM delivers each
message to one service per app. An app with its own service, or with another
push library, removes the SDK's service and chains through `PulsatePush`
instead.

1. In `AndroidManifest.xml`, add the `tools` namespace, remove the SDK's
   service, and declare yours.

   ```xml
   <!-- android/app/src/main/AndroidManifest.xml -->
   <manifest xmlns:android="http://schemas.android.com/apk/res/android"
       xmlns:tools="http://schemas.android.com/tools">   <!-- Pulsate -->

       <application …>

           <service
               android:name="com.pulsatehq.internal.features.fcm.receiver.PulsateFirebaseMessagingService"
               tools:node="remove" />   <!-- Pulsate -->

           <service
               android:name=".PushMessagingService"
               android:exported="false">
               <intent-filter android:priority="1">
                   <action android:name="com.google.firebase.MESSAGING_EVENT" />
               </intent-filter>
           </service>

       </application>
   </manifest>
   ```

2. Create the service and chain both callbacks through `PulsatePush`.

   ```kotlin
   // android/app/src/main/java/<YOUR_PACKAGE_PATH>/PushMessagingService.kt
   package <YOUR_PACKAGE>

   import com.google.firebase.messaging.FirebaseMessagingService
   import com.google.firebase.messaging.RemoteMessage
   import com.pulsatehq.reactnativesdk.PulsatePush   // Pulsate

   class PushMessagingService : FirebaseMessagingService() {

       override fun onMessageReceived(message: RemoteMessage) {
           // true: Pulsate consumed the message and has shown it.
           if (PulsatePush.onMessageReceived(message)) {   // Pulsate
               return
           }
           // Not a Pulsate message. Hand it to your other push library here.
       }

       override fun onNewToken(token: String) {
           PulsatePush.onNewToken(token)   // Pulsate
           // Forward the token to your other push library as well.
       }
   }
   ```

   ```java
   // android/app/src/main/java/<YOUR_PACKAGE_PATH>/PushMessagingService.java
   package <YOUR_PACKAGE>;

   import com.google.firebase.messaging.FirebaseMessagingService;
   import com.google.firebase.messaging.RemoteMessage;
   import com.pulsatehq.reactnativesdk.PulsatePush;   // Pulsate

   public class PushMessagingService extends FirebaseMessagingService {

       @Override
       public void onMessageReceived(RemoteMessage message) {
           if (PulsatePush.onMessageReceived(message)) {   // Pulsate
               return;
           }
           // Not a Pulsate message. Hand it to your other push library here.
       }

       @Override
       public void onNewToken(String token) {
           PulsatePush.onNewToken(token);   // Pulsate
           // Forward the token to your other push library as well.
       }
   }
   ```

Rules for this step:

- `onMessageReceived` returns whether Pulsate consumed the message. On
  `true` the SDK has already posted the notification. On `false` the SDK did
  not touch the message, and it is yours to chain. There is no completion
  handler to settle; the boolean is routing only.
- `onNewToken` is forwarded to Pulsate and to every other push library.
- Both calls are safe before `configure()`. The SDK object exists from
  process start, so nothing is buffered and nothing is lost.
- Do not add slow work of your own before the `PulsatePush` call.
  `onMessageReceived` is synchronous for a Pulsate message, including the
  image download, and FCM allows the whole service call 20 seconds.

> [!WARNING]
> Remove only the service. The SDK also registers a content provider,
> `PulsateProvider`, which initialises the SDK at process start. It must
> stay. Without it every message comes back `false` and `configure()` rejects
> with `CONFIGURATION_ERROR`.

### If the app has another push library

React Native Firebase Messaging, notifee and `expo-notifications` each
register a messaging service of their own. Only one service receives a
message, and with several in the merged manifest the winner depends on
priority and then on merge order. Keep the service yours, as above, with
`android:priority="1"`, and chain to the other library on the `false`
branch. Consult that library's documentation for its forwarding entry point,
and remove its service with `tools:node="remove"` the same way if it
declares one.

Redeclare `WAKE_LOCK` as well. A transitive dependency declares `WAKE_LOCK`
with `android:maxSdkVersion="25"`. The manifest merger keeps that cap, so on
Android 8 and later the app has no `WAKE_LOCK`. React Native Firebase's
messaging receiver acquires a wake lock for every push that arrives in the
background and crashes the process without it. One line next to the
`tools:node="remove"` entries makes your uncapped declaration win:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.WAKE_LOCK"
    tools:node="replace" />   <!-- Pulsate -->
```

Firebase Messaging alone only logs a warning without the permission, so a
Pulsate-only app does not crash. It does lose the wake locks FCM holds while
delivering. Add the line either way.

## 4. Set the notification icon

Every Pulsate notification uses the small icon `R.drawable.status_icon`. The
SDK ships a default. To use your own, add a drawable with exactly that name
to the app, as `res/drawable/status_icon.xml` or per-density PNGs. Android's
resource merge lets the app's drawable win. Status icons are white on
transparent, 24 dp; the system tints them.

The notification channel is created by the SDK at process start from three
string resources. You can override them the same way. The resources are
`pulsate_notification_channel_id`, `pulsate_notification_channel_name` and
`pulsate_notification_channel_description`. An override takes effect on the
next launch.

## 5. Optional: remove the location permissions

The SDK's manifest merges nine permissions into the app, three of them
location: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` and
`ACCESS_BACKGROUND_LOCATION`. If the app does not use Pulsate's location
features, you can remove them. The SDK checks the runtime permission before
every location call and backs off when it is missing.

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"
    tools:node="remove" />   <!-- Pulsate -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"
    tools:node="remove" />   <!-- Pulsate -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"
    tools:node="remove" />   <!-- Pulsate -->
```

> [!WARNING]
> Never remove `RECEIVE_BOOT_COMPLETED`. The SDK's boot receiver depends on
> it, and removing it disables re-initialisation after a reboot with no
> error reported.

## 6. Verify

Use an emulator with Google APIs or a physical device.

1. Launch the app, grant the notification permission, and start a session
   with a test alias. The session start carries the FCM token, and the alias
   appears in the dashboard under **Users**.
2. Send a test push to that user from the dashboard. It arrives on the
   device with your status icon.
3. Repeat with the app in the foreground, in the background, and terminated
   by swiping it away. In the terminated state FCM starts the process and
   the service without starting JavaScript, and the notification still
   shows.
4. Tap the notification. The app opens and the campaign's action runs.
5. Send a campaign with an image. The notification shows the image. Nothing
   needs adding for this on Android; the SDK downloads and attaches the
   image itself.

To see what reached the tray:

```sh
adb shell dumpsys notification --noredact | grep -A3 "pkg=<YOUR_APPLICATION_ID>"
```

The SDK writes nothing to logcat. Log the boolean in your service if you
want to see whether it ran.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build fails with `File google-services.json is missing` | The plugin is applied and the file is not at `android/app/google-services.json` | Step 1, point 1. Or set the `WARN` strategy from the note if the build must pass without the file |
| The dashboard accepts the campaign; nothing arrives on any device | No service-account key uploaded to the Pulsate app, or a key from a different Firebase project than `google-services.json` | Step 1, points 3 and 4 |
| The user never appears in the dashboard | No session has started yet, or `configure()` rejected | Step 6, point 1. Start a session and check the `configure()` promise |
| Your service's `onMessageReceived` never runs | Another `MESSAGING_EVENT` service won: the SDK's own, or another push library's | Step 3, point 1. Inspect the merged manifest under `app/build/intermediates/merged_manifests/` |
| `onMessageReceived` returns `true` but nothing shows in the tray | `POST_NOTIFICATIONS` was denied, or the user disabled the Pulsate channel in system settings | Step 2. Check the channel in the app's notification settings |
| `onMessageReceived` returns `false` for a Pulsate push | The payload was not sent through Pulsate, or `PulsateProvider` was removed | Send from the Pulsate dashboard; step 3, the warning |
| The app crashes in the background when a push arrives | The `PulsatePush` calls catch every exception, so the crash comes from the code after them | Step 3, point 2. Check what your `false` branch does with the message |
| The app crashes in the background when a push arrives, and another push library is installed | `WAKE_LOCK` is capped at API 25 by a merged manifest, so the other library's receiver throws | Step 3, the coexistence section: redeclare `WAKE_LOCK` with `tools:node="replace"` |
| The notification shows the SDK's default icon | The drawable is not named exactly `status_icon`, or lives under `mipmap-*` rather than `drawable*` | Step 4 |
| A refreshed FCM token reaches Pulsate only at the next app open | Expected when the app had nothing else pending to sync | Nothing to fix. The next session start sends it |

## How it works

**The sender gate.** The SDK accepts a message whose `sender` data key is
`Pulsate` or `PulsateDebug` and declines everything else with no side
effect. That is why handing a foreign message to `PulsatePush` is harmless
and comes back `false`.

**Why the SDK's service is removed.** FCM resolves the `MESSAGING_EVENT`
action to one service per process: the intent filter's priority decides,
and manifest order breaks ties. `firebase-messaging`'s own base service is
always in the merged manifest at priority -500. `expo-notifications`
declares its service at -1, and React Native Firebase Messaging declares one
at default priority. One service of yours at priority 1 makes dispatch
independent of merge order. React Native Firebase keeps working either way,
because it does its work in a broadcast receiver, not in its service.

**Why the provider stays.** `PulsateProvider` creates the SDK object when the
process starts. That object handles a push with no JavaScript
involved. This covers a push that arrives before JavaScript has run, and one
that arrives in a process FCM started only to deliver it. A push received before the first ever `configure()`
is shown but cannot report delivery statistics, because there are no
credentials yet. A device is targetable only after a session start, so this
is a state a live app does not reach.

**Token refresh.** The SDK does nothing with a refreshed token by itself. It
reads the current token from Firebase when it next talks to the backend.
When you forward a refresh, the library also asks the SDK for a user sync.
The token then reaches Pulsate without waiting for the next session start.
The sync follows the SDK's own rules. It runs about 15 seconds later, and
only if the SDK has other pending user data to send. In a completely idle app the
token rides the next session start instead.

**Threading.** Both `PulsatePush` calls run on FCM's service thread. For a
Pulsate message the SDK parses the payload, downloads the large icon and any
image, and posts the notification before `onMessageReceived` returns `true`.
Delivery tracking is deferred to a background scope. A download that
overruns FCM's 20-second window degrades to a text-only notification.

**What a Pulsate payload looks like.** Pulsate sends data messages, never
`notification` messages, so the message reaches `onMessageReceived` in every
app state. The gating key is `sender`:

```json
{
  "data": {
    "sender": "Pulsate",
    "title": "…",
    "message": "…",
    "cg": "<campaign id>",
    "badge": "1",
    "au": "https://…/image.jpg",
    "at": "jpg"
  }
}
```

`au` and `at` are present only on a campaign with an image, for `jpeg`,
`jpg` and `png`. `PulsateDebug` marks a silent command message. The SDK
handles it and posts no notification. A push from any other provider has no
`sender` key, or a different value, and comes back `false` from
`PulsatePush.onMessageReceived`.
