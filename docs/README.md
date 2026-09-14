# Pulsate React Native SDK documentation

Guides and reference for `@pulsatehq/react-native-sdk`. Start with
[Getting started](getting-started.md), then the push guide for your project
type.

## Guides

- [Getting started](getting-started.md): requirements, install,
  `configure()`, the first session, and how to verify it in the dashboard.
- [Set up push notifications on iOS](ios-push-setup.md): bare React Native.
  APNs, the `AppDelegate` wiring, the notification-centre delegate, rich
  push, coexistence with another push library.
- [Set up push notifications on Android](android-push-setup.md): bare React
  Native. Firebase, the notification permission, the messaging service, the
  icon, coexistence with another push library.
- [Set up the Expo config plugin](expo.md): Expo prebuild and development
  builds. The plugin performs the native steps of both bare guides.
- [Theme in-app messages](theming.md): the colour keys for in-app messages and
  the iOS no-internet banner, plus the Android strings. Set them from Expo or
  by hand.
- [Control when in-app messages appear](in-app-messages.md): pausing
  messages, the small-message duration, and the in-app messages the SDK stops
  trying to show on Android.
- [Update the user profile and privacy](user-profile.md): the profile
  fields, when they reach Pulsate, and the privacy level on each platform.
- [Send custom attributes and events](attributes-and-events.md): the session
  the dashboard needs, events, attribute types, counters, and when changes
  reach Pulsate.
- [Show the Pulsate feed](feed.md): opening the feed, the unread count, and
  deciding which users may see Pulsate content.
- [Set up location and geofences](location.md): the usage descriptions and
  permissions, turning tracking on, the last known location, and geofence
  crossings.
- [Declare the data the SDK collects](data-collection.md): what reaches
  Pulsate and when, the App Store and Google Play declarations, and how to
  stop collection.
- [Subscribe to SDK events](handling-events.md): when to subscribe, removing
  handlers, and which event fires on which platform.

## Reference

The [API reference](api/README.md) has one page per area. It is generated from
the source, so it is exact for the installed version.

- [Sessions](api/sessions.md)
- [User profile](api/user-profile.md)
- [Attributes and events](api/attributes-and-events.md)
- [Feed](api/feed.md)
- [In-app notifications](api/in-app-notifications.md)
- [Push notifications](api/push-notifications.md)
- [Location](api/location.md)
- [Events](api/events.md)
- [Errors](api/errors.md)

[Errors](errors.md) describes the `PulsateError` type and the rejection codes.

## Versions

The [changelog](../CHANGELOG.md) lists what each release adds.

These guides describe the shipped SDK versions the package pins and
supersede the native iOS and Android pages on docs.pulsatehq.com for React
Native apps.
