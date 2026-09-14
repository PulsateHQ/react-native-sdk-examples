# Set up the Expo config plugin

At the end of this page your Expo app receives Pulsate push notifications on
both platforms. A clean `expo prebuild` wires them, with no native file edited
by hand. This page is for apps that use prebuild or a development build.

The plugin performs the native steps of the two bare guides. What it does not
do, you still do: the APNs key and Firebase project, the runtime permission
prompts, and `configure()`. If you own your native projects instead, follow
[Set up push notifications on iOS](ios-push-setup.md) and
[Set up push notifications on Android](android-push-setup.md).

## Requirements

- React Native 0.76 or newer with the New Architecture enabled.
- Expo SDK 53 or newer. The plugin edits the Swift `AppDelegate` that SDK 53
  and later generate and refuses an Objective-C one.
- iOS 15.1 or newer as the app's deployment target.
- Android `minSdkVersion` 28 or higher. The plugin raises it in Groovy
  Gradle projects.
- A development build or a prebuild. The SDK cannot run in Expo Go.
- `ios.bundleIdentifier` and `android.package` set in the app config.
- The prerequisites of both platforms. An APNs key uploaded to Pulsate, as
  in the iOS guide's step 1. A Firebase project with its service-account key
  uploaded to Pulsate, as in the Android guide's step 1.

## 1. Install the package and add the plugin

```sh
npx expo install @pulsatehq/react-native-sdk
```

> Until the first stable release, published versions are previews on the
> `next` dist-tag: append `@next` to the package name when installing.

```json
// app.json
{
  "expo": {
    "plugins": [
      [
        "@pulsatehq/react-native-sdk",
        {
          "iosRichPush": true,
          "androidNotificationIcon": "./assets/pulsate-status-icon.png"
        }
      ]
    ]
  }
}
```

| Name | Default | Description |
|---|---|---|
| `iosRichPush` | `false` | Only for: iOS. Generates the Notification Service Extension target that attaches images to notifications. Adds a second signed binary; see step 3. |
| `androidNotificationIcon` | none | Only for: Android. Path, relative to the project root, of a white-on-transparent PNG. Resized into the app's drawables at every density as `status_icon`, the small icon on every Pulsate notification. Without it the SDK's default icon is used. |
| `theme` | none | Colours for in-app messages and the iOS no-internet banner, plus the Android strings the SDK shows. See [Theme in-app messages](theming.md) for the keys and the bare React Native equivalent. |

The plugin accepts nothing else. Credentials go through `configure()` at
runtime, never through the app config.

## 2. Point Expo at your Firebase file

Place `google-services.json` from your Firebase project in the project and
reference it. Expo places the file and applies the Google Services Gradle
plugin; the Pulsate plugin warns at prebuild time if the key is missing.

```json
// app.json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

## 3. Declare the extension for EAS signing

Skip this step if `iosRichPush` is `false`.

The extension is a separate signed target named
`PulsateNotificationService`, with the bundle identifier of your app plus
`.PulsateNotificationService`. Declare it so EAS provisions and signs it:

```json
// app.json
{
  "expo": {
    "extra": {
      "eas": {
        "build": {
          "experimental": {
            "ios": {
              "appExtensions": [
                {
                  "targetName": "PulsateNotificationService",
                  "bundleIdentifier": "<YOUR_BUNDLE_IDENTIFIER>.PulsateNotificationService"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

If you manage signing yourself instead of letting EAS provision it, add the
extension's bundle identifier and profile to `credentials.json` as well.

> [!WARNING]
> If the extension is signed incorrectly, all pushes stop arriving, not only
> the ones with images. Verify plain text pushes on a device before testing
> images.

## 4. Prebuild and configure

```sh
npx expo prebuild --clean
```

Then call `configure()` and start a session as in
[Getting started](getting-started.md).

Request the notification permission from JavaScript. The plugin wires the
token callbacks, but nothing asks the user or registers for remote
notifications; that stays with the app. On Android, `PermissionsAndroid`
from React Native is enough, as in the Android guide's step 2. On iOS the
request must also register for remote notifications, which
`react-native-permissions` does in one call on both platforms:

```ts
import { requestNotifications } from 'react-native-permissions';

const { status } = await requestNotifications(['alert', 'badge', 'sound']);
```

`expo-notifications`' `requestPermissionsAsync()` followed by
`getDevicePushTokenAsync()` does the same on iOS.

> [!IMPORTANT]
> Do not edit the generated `ios/` and `android/` folders. The next prebuild
> regenerates them, and any manual wiring is lost. Everything Pulsate needs is
> in the plugin.

## Verify

Use a development build on a physical iPhone, and an emulator with Google
APIs or a physical device on Android.

1. Run `npx expo prebuild --clean`. The command completes with no warning
   from `@pulsatehq/react-native-sdk`.
2. Build and launch the app, accept the notification prompt, and start a
   session with a test alias. The user appears in the dashboard.
3. Send a test push from the dashboard. It arrives on both platforms.
4. Send a campaign with an image. On Android the image shows. On iOS it shows
   when `iosRichPush` is `true`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Prebuild fails: "only supports a Swift AppDelegate" | The project generates an Objective-C `AppDelegate`, which Expo SDK 52 and earlier do | Upgrade to Expo SDK 53 or newer |
| Prebuild fails: "the iOS AppDelegate already declares …" | Another plugin or a local modification already implements one of the callbacks Pulsate wires | Remove the other implementation, or the other plugin, for that callback |
| Prebuild fails: "`iosRichPush` needs `ios.bundleIdentifier`" | The app config has no iOS bundle identifier | Set `ios.bundleIdentifier` in `app.json` |
| Prebuild fails: "`android.package` is not set" | The app config has no Android package | Set `android.package` in `app.json` |
| Prebuild warns about `android.googleServicesFile` | The key is missing, so FCM issues no token | Step 2 |
| The iOS build fails on the extension's signing | No provisioning profile for the extension's bundle identifier | Step 3 |
| Pushes never arrive on iOS | See the iOS guide's troubleshooting: APNs environment mismatch is the usual cause | [iOS guide](ios-push-setup.md#troubleshooting) |
| Pushes never arrive on Android | See the Android guide's troubleshooting | [Android guide](android-push-setup.md#troubleshooting) |
| Notifications arrive but have the default icon | `androidNotificationIcon` is not set | Set the prop, as in step 1 |
| Prebuild fails: "androidNotificationIcon: no file at …" | The path in the prop does not resolve from the project root | Correct the path in step 1 |
| Prebuild fails: "androidNotificationIcon must be a PNG" | The file the prop points at is not a PNG | Point the prop at a white-on-transparent PNG, as in step 1 |
| Prebuild fails: "androidNotificationIcon needs `@expo/image-utils`" | The mod ran outside `expo prebuild`, so the resizer could not be resolved | Run `npx expo prebuild`, or drop the prop and add a `status_icon` drawable by hand |
| Prebuild fails: "the first Xcode target is not the application target" | The Xcode project lists another target first, so the extension cannot be embedded | Add the `PulsateNotificationService` target in Xcode, or set `iosRichPush` to `false` in step 1 |
| Prebuild warns that `android/build.gradle.kts` is a Kotlin DSL project | The plugin edits only the Groovy Gradle files, so `minSdkVersion` was left alone | Set `android.minSdkVersion` to 28 with `expo-build-properties` |

## How it works

On every prebuild the plugin applies these changes, each idempotent and
marked in the generated file:

**iOS**

- Adds the five `AppDelegate` forwarding calls from the iOS guide's step 3.
  Sets the app as the notification-centre delegate with the two chained
  callbacks from step 4. Anchored on `didFinishLaunchingWithOptions`, which
  the generated `AppDelegate` always has.
- Adds `remote-notification` to `UIBackgroundModes` in `Info.plist`.
- Sets the `aps-environment` entitlement to `development` when the app
  config sets no value. EAS and Xcode rewrite it to `production` at archive
  time.
- With `theme`, writes a `PulsateTheme` dictionary to `Info.plist` for every
  key that has an iOS raw key.
- With `iosRichPush`, adds the `PulsateNotificationService` target with the
  same `NotificationService.swift` the iOS guide ships, at the app's
  deployment target.

**Android**

- Raises `minSdkVersion` to 28 in `gradle.properties` and in
  `app/build.gradle`. A higher floor is left alone.
- Removes the SDK's own `FirebaseMessagingService` from the merged manifest.
  Registers a generated `PulsateMessagingService` at priority 1, which chains
  through `PulsatePush` exactly as the Android guide's step 3.
- With `androidNotificationIcon`, writes `status_icon` at every density.
- With `theme`, writes `res/values/pulsate_theme.xml`, rewritten in full on
  every prebuild.
- Warns when `android.googleServicesFile` is absent. Expo owns that file
  and the Gradle plugin, so Pulsate writes nothing there.

Push coexistence works the same way as in the bare guides. The generated
`AppDelegate` claims the notification-centre delegate at launch. React
Native Firebase and notifee 7.9.0 or newer chain back to it. On Android
the generated service wins dispatch at priority 1. It hands Pulsate messages
to the SDK and logs the rest. An Android app with a second push library needs
the bare setup instead of the plugin. `expo-notifications` does not receive
notifications in an app wired this way. On iOS the generated `AppDelegate`
owns the notification-centre delegate; on Android the generated service owns
dispatch.

The plugin adds and removes no Android permissions. The SDK's own manifest
merges the location permissions. If the app does not use location, remove them
as in the Android guide's step 5, under "Optional: remove the location
permissions". To use location, follow
[Set up location and geofences](location.md), which also shows the iOS usage
descriptions to add to the app config.

## Next steps

- [Theme in-app messages](theming.md)
- [Control when in-app messages appear](in-app-messages.md)
- [Set up location and geofences](location.md)
