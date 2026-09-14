# Changelog

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
