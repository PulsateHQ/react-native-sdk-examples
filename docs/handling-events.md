# Subscribe to SDK events

At the end of this page your app receives every event the Pulsate SDK
raises. That covers links, feed closes, refusals, badge counts, geofence
crossings and in-app errors. It covers bare React Native and Expo apps alike.

## Requirements

- `@pulsatehq/react-native-sdk` installed and `configure()` resolved, as in
  [Getting started](getting-started.md).

## 1. Subscribe at startup

In the file that registers your app, call `addListener` for each event you
handle, before any screen mounts.

```ts
// index.js
import { AppRegistry } from 'react-native';
import { addListener } from '@pulsatehq/react-native-sdk';

import App from './App';
import { name as appName } from './app.json';

addListener('onLink', (url) => routeLink(url));
addListener('onFeedClose', () => refreshInbox());
addListener('onUnauthorizedAction', () => openSignIn());

AppRegistry.registerComponent(appName, () => App);
```

`routeLink`, `refreshInbox` and `openSignIn` stand for your own functions.
[Getting started](getting-started.md) step 5 shows a complete `onLink`
handler.

An event that fires while nothing is subscribed to it is dropped. Module
scope is the one place that is guaranteed to run before the SDK has
anything to report.

> [!NOTE]
> `onLink` is the one exception. Links that arrive before the first
> `addListener('onLink', …)` are held natively and delivered, in order, as
> soon as you subscribe. Expect a burst of already-tapped links at that
> moment.

## 2. Remove handlers you add later

`addListener` returns a `Subscription`. A handler added inside a component
must be removed when the component unmounts.

```tsx
// src/screens/InboxScreen.tsx
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { addListener } from '@pulsatehq/react-native-sdk';

export function InboxScreen() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const subscription = addListener('onBadgeUpdate', (count) => {
      setUnread(count);
    });
    return () => subscription.remove();
  }, []);

  return <Text>{unread}</Text>;
}
```

Each call is its own registration. The same handler added twice runs twice,
and each `remove()` removes one registration. `remove()` is safe to call
more than once.

## 3. Handle each event

| Event | Payload | Android | iOS |
|---|---|---|---|
| `onLink` | `url: string` | A push tap, a push action button, an in-app or feed-card call to action, or a link tapped in the feed | The same sources, with two exceptions: a push call to action whose destination type is `url` opens Safari, and a feed link whose destination uses the `pulsate://` scheme is consumed by the feed and never reaches `onLink`. Give feed cards an `https://` destination or your app's own scheme |
| `onFeedClose` | none | A feed `showFeed()` opened has closed | Same |
| `onUnauthorizedAction` | `{ action?: string }` | The feed came to the front for an unauthorized user. No `action` | Pulsate refused a campaign, an in-app message, a call to action or an action button. `action` names which |
| `onBadgeUpdate` | `count: number` | Shortly after `configure()`, and for each Pulsate push while the app runs | Fires for a push whose `sender` is `Pulsate`, that carries `content-available` and `aps.badge`, in an app that declares the `remote-notification` background mode. Pulsate campaign pushes carry no `content-available` |
| `onGeofence` | `GeofenceEvent` | The device entered or left a Pulsate geofence | Never fires |
| `onError` | `PulsateError` | The SDK's retries for an in-app message are exhausted | Never fires |

Subscribing to an event that never fires on a platform is harmless, so the
same code runs on both.

Rules for this step:

- `onLink`: the SDK opens nothing. Route the URLs your app owns and pass the
  rest to `Linking.openURL`, or the link goes nowhere.
- `onFeedClose`: a feed Pulsate opened by itself reports no close. See
  [Show the Pulsate feed](feed.md).
- `onFeedClose`: on Android the event follows the feed screen's destruction.
  A language, font size, dark mode or multi-window change recreates that
  screen, fires the event early and silences the real close.
- `onUnauthorizedAction`: act on the event, not on `action`. The label is
  for logs.
- On Android, `onBadgeUpdate`: a first `0` after `configure()` says nothing
  about the inbox. Read `getFeedUnreadCount()` when a screen appears as well.
- `onGeofence`: needs background location permission on Android. See
  [Set up location and geofences](location.md).

## 4. Keep `onError` out of your UI

`onError` is a diagnostic for developers. Its `type` is an opaque string,
`"INAPP_ERROR"` for the errors the SDK reports. Its `message` is the SDK's
own text, which can include the user's profile fields.

```ts
// index.js
import { addListener } from '@pulsatehq/react-native-sdk';

addListener('onError', (error) => {
  if (__DEV__) {
    console.warn(`[Pulsate] ${error.type}: ${error.message}`);
  }
});
```

> [!WARNING]
> Never show `onError` text to a user. Never send it to a third-party logger
> without removing the message first.

## Verify

1. Tap a Pulsate push whose call to action is a deep link. `onLink` fires
   with the URL.
2. Open the feed with `showFeed()` and close it. `onFeedClose` fires once.
3. On Android, call `setUserAuthorized(false)` and open the feed.
   `onUnauthorizedAction` fires, then `onFeedClose`.
4. On Android, send a Pulsate push while the app runs. `onBadgeUpdate` fires
   with the unread count.
5. Kill the app, tap a Pulsate push with a deep link, and let the app start.
   `onLink` fires once your startup code subscribes.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| A handler never fires | The event fired before the subscription and was dropped | Subscribe at module scope, as in step 1 |
| `onGeofence` or `onError` never fires on iOS | These events are Android-only, as the table in step 3 shows | Handle the iOS case without them |
| `onBadgeUpdate` never fires on iOS for a Pulsate campaign | A campaign push carries no `content-available`, which is what the iOS badge path needs | Read `getFeedUnreadCount()` when a screen appears |
| A handler fires twice for one event | `addListener` ran twice without a `remove()`, for example on a component that mounted twice | Return `subscription.remove` from the effect, as in step 2 |
| A handler still fires after its screen closed | The subscription was never removed | Call `remove()` on unmount, as in step 2 |
| Several `onLink` events arrive at once after startup | Links tapped before the subscription were held and delivered together | Handle each URL. The burst is expected |
| A tapped link opens nothing | The handler neither routed the URL nor passed it to `Linking.openURL` | Pass URLs your app does not own to `Linking.openURL` |
| A push call to action opens Safari on iOS without `onLink` | The campaign's destination type is `url` | Use a `deeplink` destination for links your app routes |
| `onLink` brings the app to the front on Android | A link tapped outside the app, such as in a push notification, starts the launch activity | Expected. Route the link once the app is on screen |

## How it works

The package forwards each SDK callback to JavaScript as an event. When
no JavaScript handler is registered for that event, the event is discarded
rather than queued, so a late subscriber never sees it.

`onLink` differs because a link can arrive before JavaScript runs at all,
for example when a push tap starts the app. The package holds those links
and delivers them on the first `addListener('onLink', …)` of each app start,
including after a development reload. Removing every
handler afterwards does not start holding again.

## Next steps

- [Show the Pulsate feed](feed.md)
- [Set up location and geofences](location.md)
- [Events reference](api/events.md)
- [Errors](errors.md)
