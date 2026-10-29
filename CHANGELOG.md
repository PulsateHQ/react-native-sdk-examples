# Changelog

## 1.1.0

### Minor Changes

- ff16579: **Android: Pulsate Android SDK 4.9.2**

  - On Android, `onBadgeUpdate` now also fires when a session starts, when the
    feed closes, and with `0` on `logout()` and when `startSession` uses a new
    alias. The count after a session start or
    a feed close can arrive up to 30 seconds late.
  - On Android, a Pulsate push without a `badge` field no longer fires
    `onBadgeUpdate`, and a count equal to the last one reported is not repeated.
  - On Android, `getFeedUnreadCount()` can take up to 30 seconds to resolve when
    it is called within 30 seconds of `configure()`, a session start or a feed
    close. The SDK's own unread-count reads now share the rate limit that
    `getFeedUnreadCount()` already had.
  - On Android, a Pulsate push that carries a `badge` field still shows that
    number on the notification. A push without one now shows the last unread
    count the SDK knows.
  - On Android the SDK can miss a change of user made with the app in the
    foreground, for example from one new user straight to another. The SDK
    then skips its session-start work for the new user: no `0` from
    `onBadgeUpdate`, the previous user's notifications stay in the tray, and no
    user update or in-app message follows that start. Call `logout()` before
    the next user's `startSession()`.
  - On Android, `logout()` and a `startSession` with a new alias remove only
    Pulsate's notifications from the tray. They used to remove every
    notification. `clearAllNotifications()` still removes every notification.
  - On Android, a session end that cannot reach Pulsate within 15 minutes is
    discarded.
  - On Android, the `onError` message no longer includes the user's profile
    fields. It says why an in-app message was not shown and names the campaign.
  - On Android the SDK writes only errors to Logcat, in debug and release builds
    alike, unless Pulsate turns on debug mode for the device.
  - On Android the SDK no longer logs through Timber, so Timber trees your app
    plants no longer receive Pulsate's logs.
  - On Android, switching location tracking off and then back on in the same
    run restarts geofence monitoring, two to three minutes after the second call.
    It used to stay off until the app restarted.
  - Native Android code that implements `IPulsateBadgeUpdateListener` no longer
    compiles. The SDK replaces it with `IPulsateUnreadCountListener`.

- 03a4fd9: **New `setCrashReportingEnabled` and `isCrashReportingEnabled`**

  - `setCrashReportingEnabled(false)` turns off the native SDKs' crash
    reporting on this device and deletes reports waiting to be sent;
    `setCrashReportingEnabled(true)` turns it back on. Crash reporting is on by
    default on both platforms, from the first launch after the update.
  - `isCrashReportingEnabled()` resolves the stored choice.
  - The choice is kept on the device across restarts, updates and sign-outs.
    Both calls reject with `CONFIGURATION_ERROR` before `configure()`.
  - Turning it off applies at once on both platforms. Turning it back on
    applies at once on iOS; on Android, if the app started with crash reporting
    off, capture resumes from the next app start.

- 222ddaf: **Theming: the big in-app message overlay**

  - The Expo plugin's `theme.colors` takes a new key, `bigInAppOverlay`, for the
    dimmed layer behind a big in-app message. It is the only key that accepts
    alpha: write it as `#AARRGGBB`, or as `#RRGGBB` for an opaque overlay. Bare
    React Native apps set `pulsate_big_in_app_message_overlay_color` in the
    `PulsateTheme` dictionary on iOS and as a colour resource on Android.
  - The defaults differ when the key is not set: black at 85% opacity on iOS,
    black at 50% opacity on Android.
  - On Android the default overlay behind a standard big in-app message is
    lighter than in 1.0: black at 50% opacity instead of 67%. Set
    `bigInAppOverlay` to `#AA000000` to keep the 1.0 look.
  - On iOS the default overlay behind a big in-app message is darker than in
    1.0: black at 85% opacity instead of 50%. Set `bigInAppOverlay` to
    `#80000000` to keep the 1.0 look.
  - On Android the key reaches standard big in-app messages only. HTML in-app
    messages keep a fixed black overlay.
  - On Android, two existing keys now reach more text: `bigInAppBody` also
    colours the message text beside the sender in the big in-app header, and
    `smallInAppText` now colours the personal small in-app message as well as
    the corporate one.

- 86cc6d1: **iOS: `iosPulsateAppDelegate` deprecated; notification categories kept by the SDK**

  - `iosPulsateAppDelegate` in `PulsateConfig` is deprecated. The Pulsate iOS SDK
    deprecates acting as your `AppDelegate` and will remove that mode in a future
    major release; this option goes with it. Leave it unset. With the default,
    `configure()` now uses the SDK's current initializer.
  - The Pulsate iOS SDK now keeps the notification categories your app
    registered when it registers its own, so the library no longer merges them
    itself. The SDK treats any category identifier that starts with `PUL` as its
    own and replaces it: if one of your categories starts with `PUL`, rename it.
  - Nothing changes in your `AppDelegate`. The library no longer forwards the
    application lifecycle callbacks, which the Pulsate iOS SDK has observed
    itself since 4.10.0.

- 5d33698: **iOS SDK 4.10.1, bundled in the package**

  - The iOS Pulsate SDK (`PULPulsate`) 4.10.1 now ships inside this package,
    so CocoaPods no longer downloads it. If your app also integrates
    `PULPulsate` directly, remove that integration.
  - The SDK's debug symbols (dSYM) ship with it and are copied into your
    release archives, so Pulsate frames in your own crash reports are
    symbolicated.
  - `startSession`, `logout` and `forceAttributeSync` now reject with
    `REQUEST_ERROR` on iOS when the server answers with an error status. They
    used to resolve. A rejected `logout` does not always mean the user is still
    logged in: if the session could not be ended the device stays logged in,
    but if only the logout request itself fails the device is logged out
    locally anyway.
  - On iOS the value set with `setUserAuthorized` now survives an app restart.
    It used to be reset to `true` on every launch. On iOS it is one value for
    the device, whichever user is signed in. A `configure()` with an app ID or
    key different from the last one clears it, so the user is authorized
    again. An app that re-applied its own value after `configure()` on every
    launch can keep doing so.
  - Native crash reporting in the iOS SDK is on by default on iOS 16.1 and
    later. Turn it off with `setCrashReportingEnabled(false)`.
  - Building for iOS requires Xcode 26.2 or later.
  - On iOS, `getFeedUnreadCount()` now resolves `0` when the server answers
    with an error status or an empty response. It used to stay pending until a
    later read succeeded, together with every call waiting with it.
  - On iOS every `forceAttributeSync()` call made inside the 30-second window
    now settles when the window's sync finishes. A call could stay pending
    forever before.
  - On iOS the item `showLastUnauthorizedMessage` replays now survives
    backgrounding and an app restart for up to an hour, and is released only
    after it has been shown. A campaign push that arrives while the app is in
    front is no longer refused and fires no `onUnauthorizedAction`.
  - On iOS an HTTP 500 to a profile update or a session end discards the
    attribute and event changes that request carried. Other error statuses keep
    them for the next attempt.

### Patch Changes

- 6e37292: **Android**

  - A push that arrives while React Native is reloading or shutting down no
    longer reports `onPushReceived` through an event emitter that is being torn
    down. The report waits until the emit has returned, or is dropped when no
    JavaScript instance is attached.

- 1c9f284: **Android: token refresh and `WAKE_LOCK` on Pulsate SDK 4.9.2**

  - On Android, forwarding a refreshed FCM token through `PulsatePush.onNewToken`
    no longer makes the library request a second user update. The Pulsate SDK
    sends the new token itself (since SDK 4.9.0) while a user is signed in;
    otherwise the next session start carries it.
  - On Android, redeclaring `WAKE_LOCK` with `tools:node="replace"` in the app
    manifest is no longer required. Pulsate SDK 4.9.2 no longer caps the
    permission, so the merged manifest keeps it on every Android version. The
    line is harmless if you leave it in place.

- 21bd157: **Docs: SDK logs on the device**

  - `docs/data-collection.md` now describes what the SDKs write to the device
    log, that it is not sent to Pulsate, and how to change the Android Logcat
    level from native code.

- 61059bb: **iOS keeps clearing the app-icon badge**

  - From iOS SDK 4.9, `clearAllNotifications()`, `logout()` and a
    `startSession` with a new alias no longer clear the app-icon badge when the
    app receives badge updates through a delegate, which this package always
    does. The package now clears the icon badge itself on those calls, so they
    behave as before.
  - On iOS, `onBadgeUpdate` now fires with `0` after `clearAllNotifications()`,
    after `logout()`, and when `startSession` uses a new alias.
  - A new alias is one that differs from the alias of the last session. The
    first `startSession` after installing the app or after `logout()` counts as
    a new alias, even for the same user. If `logout()` rejects, the alias may
    still be stored, and the same user's next `startSession` is then not a new
    alias.

- 111ba30: **iOS**

  - `startSession(alias, { debug: true })` is now supported on iOS. With iOS
    SDK 4.10.1 the debug logs stay on the device and are never uploaded.
    Shaking the device then opens the SDK's debug screen, so use `debug: true`
    in development builds only.

- 42eba00: **iOS**

  - An iOS build that cannot find the Pulsate iOS SDK now fails with
    `PULPulsate did not resolve in the pod build` instead of building an app
    whose Pulsate calls fail at runtime.

- c3c5044: **Docs: iOS apps with a scene delegate**

  - Set up push notifications on iOS has a new section, If the app uses a scene
    delegate, for apps that move to the scene-based life cycle, which Xcode 27
    requires. It covers where the Pulsate calls go and how a cold-start link
    reaches `getInitialURL()`. Troubleshooting gains the matching rows.

- 15f3c08: **Licence**

  - `LICENSE` section 10 now covers the copies of the iOS SDK that ship inside
    this package: the binary (`PULPulsate.xcframework`), its debug symbols and
    its licence file. For those copies this package's licence applies in place
    of the iOS SDK licence file. It also covers the copies that package
    registries, their mirrors and caches make while serving the package.

- 75b5614: **Docs and examples**

  - Getting started installs the package from `latest`, not `@next`. Step 1
    now says to raise `minSdkVersion` to 28, which the React Native template
    does not do for you.
  - The bare example's `tsconfig.json` resolves under TypeScript 6 and no
    longer asks for Jest types the example does not install.
  - The bare example ignores `android/app/.cxx/` and `ios/.xcode.env.local`.
  - Both examples state the Node they need: 22.13 at minimum (React Native
    0.85's floor on a supported LTS line), 24 LTS recommended, 24.13 tested.
    Their `package.json` `engines` say the same, minus the lines React Native
    0.85 itself rejects (23.x and 24.0–24.2).
  - The Expo example's log keeps event names on one line, and its README says
    the session starts from the button.
  - The package's `repository` on npm is the public examples repository, so
    the licence link and the README's relative links resolve instead of pointing
    at the private SDK repository.

- 502b810: **Theming**

  - The Expo plugin's error for a colour that is not `#RRGGBB` no longer says
    that iOS drops alpha. With the iOS SDK 4.10.1 it does not. Colours other
    than `bigInAppOverlay` are still six-digit hex only.

- 6e37292: **SDK behaviour changes added to the upgrade guide**

  - On iOS, an in-app message that arrives while another is on screen now waits
    until the first one is closed, and a campaign delivered again while it is on
    screen or waiting shows once.
  - On iOS, with `iosPulsateAppDelegate: true` in an app that uses a scene
    delegate, sessions now end when the app goes to the background, so you see
    more and shorter sessions.
  - On iOS, the `PulsateReactNative` pod compiles with one deprecation warning
    from the Pulsate SDK, so a build that treats warnings in pods as errors
    fails.
  - On Android, notifications that 1.0 posted are never removed by `logout()`
    or a new-alias `startSession`. They stay until the user dismisses them or
    the app calls `clearAllNotifications()`.
  - On Android, going back from 1.1 to 1.0 deletes Pulsate's on-device
    database, and with it any attribute and event changes not yet sent.

- 111ba30: **Docs**

  - A new guide, Upgrade the SDK (`docs/upgrading.md`), lists what to change in
    your app and what behaves differently when you move from 1.0 to 1.1.
  - Getting started says that the iOS SDK ships inside the package under the
    package's licence, that a `pod 'PULPulsate'` line must go, and that
    building for iOS needs Xcode 26.2 or later.
  - The badge-event descriptions in Subscribe to SDK events and Show the
    Pulsate feed match the iOS SDK 4.10.1 and Android SDK 4.9.2 behaviour.
  - Set up push notifications on iOS says that the iOS SDK keeps your
    notification categories, except identifiers starting with `PUL`, and shows
    how to add categories after startup without removing Pulsate's. It also
    marks `iosPulsateAppDelegate` as deprecated.

## 1.0.0

### Major Changes

- 17b11aa: First release. Wraps `PULPulsate` 4.8.3 on iOS and `PulsateSdk` 4.8.4 on
  Android. React Native 0.76 or newer, New Architecture only.

  **Added**

  - Sessions: `configure`, `startSession`, `logout`, `userHasLoggedIn`,
    `userHasLoggedOut`, `forceAttributeSync`.
  - User profile: `updateFirstName`, `updateLastName`, `updateEmail`,
    `updateGender`, `updateAge`, `updatePhoneNumber`, `setPrivacy` and
    `getPrivacy`. See [Update the user profile and privacy](docs/user-profile.md).
  - Attributes and events: `createEvent`, `createEvents`, `createAttribute`,
    `incrementAttribute` and `decrementAttribute`. See
    [Send custom attributes and events](docs/attributes-and-events.md).
  - In-app notifications: `setInAppEnabled`, `isInAppEnabled`,
    `setSmallInAppDuration`, `getSmallInAppDuration`, `showLastInApp`.
  - Push notifications: `setPushEnabled`, `isPushEnabled` and
    `clearAllNotifications`. The native entry points `PulsatePush` for the iOS
    `AppDelegate` and the Android `FirebaseMessagingService`, including rich
    push and coexistence with another push library.
  - Feed: `showFeed`, `getFeedUnreadCount`, `setUserAuthorized`,
    `isUserAuthorized` and `showLastUnauthorizedMessage`. On iOS,
    `showLastUnauthorizedMessage` shows the held message only after the user is
    authorized again. See [Show the Pulsate feed](docs/feed.md).
  - Location: `setLocationEnabled`, `isLocationEnabled` and
    `getLastKnownLocation`. See
    [Set up location and geofences](docs/location.md).
  - Events: `addListener` with `onError` (Android), `onLink`, `onFeedClose`,
    `onUnauthorizedAction`, `onGeofence` (Android), and `onBadgeUpdate`
    (Android, and on iOS for a push carrying `content-available`). See
    [Subscribe to SDK events](docs/handling-events.md).
  - Theming: a `theme` prop on the Expo config plugin, and the same values in
    `Info.plist` and `res/values/pulsate_theme.xml` for bare React Native
    projects. Colours apply at build time. See
    [Theme in-app messages](docs/theming.md).
  - `PulsateError` with the rejection types `VALIDATION_ERROR`,
    `CONFIGURATION_ERROR`, `REQUEST_ERROR` and `VALUE_ERROR`. `getPrivacy`
    rejects with `VALUE_ERROR` when the SDK answers an unknown privacy level.
    See [Errors](docs/errors.md).
  - Expo config plugin with the `iosRichPush`, `androidNotificationIcon` and
    `theme` props.
  - Guides for getting started, iOS push, Android push, Expo, the user profile
    and privacy, custom attributes and events, the feed, location and
    geofences, in-app message controls, theming, subscribing to SDK events, the
    data the SDK collects, and the API reference.

## 1.0.0-next.0

Pre-release of 1.0.0, published once by hand to bootstrap npm trusted
publishing; same contents as 1.0.0.
