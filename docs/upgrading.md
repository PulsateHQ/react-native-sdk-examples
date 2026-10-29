# Upgrade the SDK

This page lists what to change in your app, and what behaves differently,
when you move to a newer version of `@pulsatehq/react-native-sdk`. Each
section covers one upgrade. Apply them in order if you skip a version. For
every change in a release, see the [changelog](../CHANGELOG.md).

## Upgrade from 1.0 to 1.1

Version 1.1 moves to the Pulsate iOS SDK 4.10.1 and the Pulsate Android SDK
4.9.2. The JavaScript API only gains functions, so existing calls compile
unchanged. Several calls behave differently, as the tables below list.

### Requirements

- Xcode 26.2 or newer to build for iOS.
- iOS 15.1 or newer as the app's deployment target. The iOS SDK requires iOS
  15.0, so the React Native minimum is unchanged.
- Android `minSdkVersion` 28 or higher, unchanged.

### Steps

1. Install the new version.

   ```sh
   npm install @pulsatehq/react-native-sdk@^1.1.0
   ```

2. On iOS, if your `Podfile` declares `pod 'PULPulsate'`, remove that line.
   The iOS SDK now ships inside this package, and with a second copy
   `pod install` fails with `frameworks with conflicting names:
   pulpulsate.xcframework`. Make no other `Podfile` change.
3. Run `cd ios && pod install`. On Expo, run `npx expo prebuild --clean`
   instead. The `PULPulsate` pod disappears from `Podfile.lock`.
4. Decide whether your app keeps crash reporting. The native SDKs now report
   crashes and freezes that involve Pulsate code, on by default. To turn it
   off, call `setCrashReportingEnabled(false)` after `configure()`. Update
   your App Store and Google Play declarations either way, as
   [Declare the data the SDK collects](data-collection.md) describes.
5. If you pass `iosPulsateAppDelegate: true` to `configure()`, plan the move
   to `false`. The option is deprecated. `true` keeps working in 1.x, but the
   iOS SDK removes the mode it selects in a future major release. With
   `false`, your `AppDelegate` forwards the push callbacks, as in
   [Set up push notifications on iOS](ios-push-setup.md).
6. If your Android manifest redeclares `WAKE_LOCK` with
   `tools:node="replace"` for Pulsate, you can remove the line. It is
   harmless if you leave it.

### New in 1.1

| Addition | Platform | Details |
|---|---|---|
| `setCrashReportingEnabled` and `isCrashReportingEnabled` | Both | Turn the native crash reporting off or on. The choice persists on the device. See the [crash reporting reference](api/crash-reporting.md) |
| `bigInAppOverlay` theme key | Both | Colours the dimmed overlay behind a big in-app message. It is the one key that accepts `#AARRGGBB`. See the [colour keys](theming.md#colour-keys) |
| dSYM for the iOS SDK | iOS | Your release archives carry it, so Pulsate frames in your crash reports are symbolicated |

### Behaviour changes on iOS

| Change | What to do |
|---|---|
| `startSession`, `logout` and `forceAttributeSync` reject with `REQUEST_ERROR` when Pulsate answers with an error status. They used to resolve | Handle the rejection where you await these calls. See [Errors](errors.md) |
| A rejected `logout` does not always mean the user is still logged in. If the session could not be ended, the device stays logged in. If only the logout request fails, the device is logged out locally anyway | Treat a rejected `logout` as unknown state. Call `logout()` again when the user signs out next |
| The value set with `setUserAuthorized` survives an app restart. It used to reset to `true` on every launch. A `configure()` with a different app ID or key resets it to `true` | Nothing, unless your app relied on the reset. Re-applying your own value after `configure()` keeps working |
| The item `showLastUnauthorizedMessage()` replays survives backgrounding and an app restart for up to an hour, and is released only after it has been shown. A campaign push that arrives while the app is in front is no longer refused and fires no `onUnauthorizedAction` | Call `showLastUnauthorizedMessage()` after a restart too. Do not rely on the app going to the background to discard a refused item. See [Show the Pulsate feed](feed.md) |
| An HTTP 500 on a profile update or a session end discards the pending attribute and event changes it carried. Other statuses keep them for the next attempt | See [Errors](errors.md) |
| Every `forceAttributeSync()` call inside the 30-second window settles when the window's sync finishes. A call could stay pending forever before | You can await it again, but not where the user is waiting: it can take 30 seconds |
| `getFeedUnreadCount()` resolves `0` when Pulsate answers with an error status or an empty response. It used to stay pending until a later read succeeded | Treat `0` as unknown, as in [Show the Pulsate feed](feed.md) |
| The SDK keeps the notification categories your app registered, except identifiers that start with `PUL`, which it replaces with its own | Rename any category of yours that starts with `PUL`. See [Set up push notifications on iOS](ios-push-setup.md) |
| `onBadgeUpdate` fires with `0` after `clearAllNotifications()`, after `logout()`, and when `startSession` uses a new alias | Treat `0` as an empty inbox |
| `startSession(alias, { debug: true })` is supported. Debug logs stay on the device. Shaking the device then opens the SDK's debug screen, for anyone using the app | Pass `debug: true` in development builds only |
| Crash and hang reports are on by default, on iOS 16.1 and later | Step 4 |
| The overlay behind a big in-app message is darker when `bigInAppOverlay` is not set: black at 85% opacity instead of 50% | Set `bigInAppOverlay` to `#80000000` to keep the 1.0 look. See [The overlay](theming.md#the-overlay) |
| An in-app message that arrives while another is on screen waits and shows after the first one is closed. It used to show on top of it. A campaign delivered again while it is on screen or waiting shows once | Nothing |
| With `iosPulsateAppDelegate: true` in an app that uses a scene delegate, sessions now end when the app goes to the background and start again when it returns, so you see more and shorter sessions. With the default `false` nothing changes | Nothing. See [If the app uses a scene delegate](ios-push-setup.md#if-the-app-uses-a-scene-delegate) |
| The `PulsateReactNative` pod compiles with one deprecation warning from the Pulsate SDK. A build that treats warnings in pods as errors fails | Leave `PulsateReactNative` out of any warnings-as-errors setting you apply to pods |

### Behaviour changes on Android

| Change | What to do |
|---|---|
| `onBadgeUpdate` also fires when a session starts, when the feed closes, and with `0` on `logout()` and when `startSession` uses a new alias. The count after a session start or a feed close can arrive up to 30 seconds late | Nothing. You can drop your own reads at those points |
| The SDK can miss a change of user made with the app in the foreground, for example from one new user straight to another. The SDK then skips its session-start work for the new user: no `0` from `onBadgeUpdate`, the previous user's notifications stay in the tray, and no user update or in-app message follows that start | Call `logout()` before the next user's `startSession()` |
| A Pulsate push without a `badge` field no longer fires `onBadgeUpdate`. A count equal to the last one reported does not fire again | Read `getFeedUnreadCount()` when a screen appears, as in [Show the Pulsate feed](feed.md) |
| `getFeedUnreadCount()` can take up to 30 seconds to resolve when called within 30 seconds of `configure()`, a session start or a feed close | Never block a screen on the count |
| A Pulsate push that carries a `badge` field shows that number on the notification. A push without one shows the last unread count the SDK knows | Nothing |
| `logout()` and a `startSession` with a new alias remove only Pulsate's notifications from the tray. They used to remove every notification. `clearAllNotifications()` still removes every notification | Call `clearAllNotifications()` after `logout()` if your app relied on the full clear |
| A session end that cannot reach Pulsate within 15 minutes is discarded | Nothing |
| Switching tracking off and back on with `setLocationEnabled` restarts geofence monitoring in the same run, two to three minutes after the second call. In 1.0 it stayed off until the app restarted | Remove any app restart you added to bring monitoring back. See [Location](location.md) |
| The `onError` message no longer includes the user's profile fields. It says why an in-app message was not shown and names the campaign's ID | Nothing |
| Forwarding a refreshed FCM token through `PulsatePush.onNewToken` no longer sends a second user update | Nothing |
| The SDK writes only errors to Logcat, in debug and release builds alike. It writes its full logs only while Pulsate debug mode is on for the device | Nothing. A debug build does not show more of Pulsate's logs |
| The SDK no longer logs through Timber. Timber trees your app plants, such as a crash reporter's breadcrumb tree, no longer receive Pulsate's logs | Nothing, unless you relied on those logs |
| In-app messages: the small message's text follows `smallInAppText` for personal messages too, and the message text under a big message's sender header follows `bigInAppBody` | Check both colours against your theme. See [Theme in-app messages](theming.md) |
| The overlay behind a standard big in-app message is lighter when `bigInAppOverlay` is not set: black at 50% opacity instead of 67%. HTML in-app messages keep 67% | Set `bigInAppOverlay` to `#AA000000` to keep the 1.0 look. See [The overlay](theming.md#the-overlay) |
| Crash and freeze reports are on by default. Freezes are reported on Android 11 and later | Step 4 |
| Native code that implements `IPulsateBadgeUpdateListener` no longer compiles. The SDK replaces it with `IPulsateUnreadCountListener` | Move native code to the new listener |
| Notifications that 1.0 posted and that are still in the tray when the app updates are never removed by `logout()` or a new-alias `startSession`. They stay until the user dismisses them | Nothing, or call `clearAllNotifications()` once after the update |
| Going back from 1.1 to 1.0 deletes Pulsate's on-device database, and with it any attribute and event changes not yet sent | Do not roll an app that shipped 1.1 back to 1.0 |
