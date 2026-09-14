# Events

Subscribe to the events the SDK initiates.

## Functions

### addListener()

```ts
function addListener<K>(event, handler): Subscription;
```

Subscribes a handler to one SDK event and returns the handle that removes
it.

Each call is its own registration: the same handler registered twice is
called twice and removed once per handle. Handlers are independent; one
that throws does not stop the others, and its error is re-thrown on the
next tick. An event that fires while nothing is subscribed is dropped, not
queued. Subscribe at startup. `onLink` is the one exception, buffered
natively as described below.

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`PulsateEvents`](#pulsateevents) |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `K` | The event name. See [PulsateEvents](#pulsateevents) for the events and their handler types. |
| `handler` | [`PulsateEvents`](#pulsateevents)\[`K`\] | Called with the event's payload each time it fires. |

#### Returns

[`Subscription`](#subscription)

The handle whose `remove()` unsubscribes this handler.

#### Remarks

`onError` fires on Android only; subscribing on iOS is harmless. It is the
SDK's in-app diagnostic channel. It fires once for an in-app message the SDK
did not show, for example one that arrived while
["In-app notifications".setInAppEnabled](in-app-notifications.md#setinappenabled) was `false`. It arrives up to
about 85 seconds after the message arrived, and only while the app stays in
the foreground. The error's `type` is `"INAPP_ERROR"` and its `message` is
the SDK's own text, which can include the user's profile fields. Treat it as
a debug string for developers, never as text to show a user or to send to a
third-party logger unredacted.

`onBadgeUpdate` is the unread count of the user's feed, as the SDK reports
it, forwarded unchanged. There is no getter behind it. `getFeedUnreadCount()`
is the one count getter, and the two can disagree for a while: the getter is
debounced 30 s natively, the event is not. On Android it has two causes and
no others. The first is once shortly after `configure()` resolves, when the
SDK fetches the feed's unread total on registering the bridge's listener.
That fetch reports `0` on a fresh install with no alias yet. It reports `0`
again when that request fails, so a first `0` says nothing about the inbox.
The second is once per Pulsate push that arrives while the app process is
running, with the count the push carries. It does not fire on session start
or when the feed closes. A host that shows a badge should also read
`getFeedUnreadCount()` at those points. Not fired for a push that starts the
process from cold: the listener is registered by `configure()`, which runs
after JavaScript starts. Dropped, not queued, while nothing is subscribed.
The SDK holds a single badge listener. A brownfield host that also calls
`setBadgeUpdateListener` natively replaces the bridge's, and this event then
goes quiet with no error. On iOS it has one live cause. The SDK acts on a
push whose `sender` is `Pulsate` that reaches
`application(_:didReceiveRemoteNotification:fetchCompletionHandler:)`. iOS
routes a push there when it carries `content-available` and the app declares
the `remote-notification` background mode. When that push also carries
`aps.badge`, the SDK reports that number about 0.5 s later. Nothing fires at
`configure()`, because registering the SDK's badge delegate fetches nothing.
Nothing fires for a push presented in the foreground, because that path hands
the badge to iOS and never reaches the SDK's badge timer. Nothing fires on
session start or feed close either. A Pulsate campaign push carries `badge`
and `mutable-content` but no `content-available`, so a campaign push does not
reach that path. The SDK holds one weak `badgeDelegate`: a brownfield host
that sets its own after `configure()` replaces the bridge's, with no error
reported. With the bridge registered the SDK stops writing the app icon badge
itself. iOS applies `aps.badge` on delivery regardless, so the icon still
follows the push. A host that renders the count elsewhere reads it from here.

`onFeedClose` fires when the Pulsate feed closes, with no payload. It reports
only a feed [Feed.showFeed](feed.md#showfeed) opened. A feed Pulsate opened by itself is
silent, whether for a push tap or for a message whose destination is the
feed. So is the one [Feed.showLastUnauthorizedMessage](feed.md#showlastunauthorizedmessage) or
[Sessions.userHasLoggedIn](sessions.md#userhasloggedin) re-opens. On Android such an open arriving
on top of a feed the app opened silences that one's close too. On iOS each
open builds its own feed, so it silences only itself.

On Android it is the feed screen's destruction that fires the event, not the
user's close. It therefore also fires when the system recreates that screen.
A language, font-size, light/dark or multi-window change made while the feed
is on screen fires the event with the feed still open. The real close that
follows is then silent. Rotation is not one of those cases: the feed is
locked to portrait. On iOS it is the feed screen being released that fires
it. That follows the close rather than coinciding with it. Expect the event a
moment after the closing animation, not during it. A feed that was asked for
but could not be presented reports nothing. Dropped, not queued, while
nothing is subscribed.

`onUnauthorizedAction` fires when Pulsate refuses something to a user the
host has not marked as authorized. Both platforms register it in
[Sessions.configure](sessions.md#configure) and both drop it, rather than queueing it, while
nothing is subscribed. What triggers it differs by platform. On Android it is
the feed coming to the front. Pulsate then closes the feed. For a feed
[Feed.showFeed](feed.md#showfeed) opened, `onUnauthorizedAction` is followed by
`onFeedClose`. A feed Pulsate opened itself reports the refusal alone. The
check runs every time that screen comes forward, not only when it is opened.
A feed left open when the host revokes authorization closes the next time the
app comes forward. That is by design. You may withdraw authorization at any
moment, such as a session ending, a periodic biometric check, or the app
being left. Pulsate guarantees the feed stays closed until you authorize
again or open it yourself. The one feed it never fires for there is the one
[Feed.showLastUnauthorizedMessage](feed.md#showlastunauthorizedmessage) re-opens. That feed is exempt from
the check for as long as it is on screen. Revoking authorization while it is
open closes nothing. Dropped, not queued, while nothing is subscribed. On iOS
it is the refusal itself that fires the event. The refusal can be a push
campaign, an in-app campaign, a call to action, or an action button Pulsate
declined to act on. No `onFeedClose` follows, and it fires whether or not
anything opened the feed. Not every one of those leaves something
[Feed.showLastUnauthorizedMessage](feed.md#showlastunauthorizedmessage) can bring back: an action button
leaves nothing. The payload differs to match: iOS carries an `action` label
naming what was refused, Android carries nothing. It is a diagnostic label,
so log it and never branch on it. What a host acts on is that the event
fired. Take the user to your own sign-in screen. Then call
[Feed.setUserAuthorized](feed.md#setuserauthorized) and [Feed.showLastUnauthorizedMessage](feed.md#showlastunauthorizedmessage)
to bring back what was refused.

`onLink` is a URL Pulsate would otherwise have opened itself. It fires for
every link the SDK owns. Those are a push tap, a push action button, and a
link tapped inside the feed. They also include an in-app or feed-card CTA
whose destination is a link, a url or a deeplink. The bridge answers the SDK
`true` for all of them, so the SDK opens nothing and the handler decides. A
handler that does not consume the link must call `Linking.openURL(url)`
itself. That differs from the SDK's own fallback. On Android the SDK opened
the URL from its own activity context, while `Linking.openURL` opens it from
the host's current activity. The difference is deliberate: which task a link
lands in is the host's decision, not the SDK's.

Unlike `onError` and `onBadgeUpdate`, an `onLink` that fires before any
`addListener('onLink')` has run on the current JavaScript instance is not
dropped. It is buffered natively and replayed, in order, on that first
`addListener`. The replay includes a development reload, where the new
JavaScript instance gets its own flush. Removing every handler afterwards
does not re-arm the buffer: a link that fires then is dropped. Subscribe at
bootstrap, and expect a burst of already-tapped links rather than one live
event. A replayed link is indistinguishable from a live one at the handler.
On Android, claiming a link the SDK would have opened also means bringing the
app forward. A tap arriving from outside the app, cold or backgrounded,
starts the launch activity. A link tapped inside the app launches nothing.
The URL is the SDK's string verbatim, with one addition to expect. A link or
url destination containing no `http` reaches the handler with `https://`
prefixed. On iOS the bridge launches nothing. Every link the SDK hands it is
tapped inside an app the system has already brought forward. The string is
the campaign's, with no prefixing. The listener is registered by
[Sessions.configure](sessions.md#configure). A push tapped before that call is replayed to the
SDK after it, so the link still arrives. Two iOS differences are worth
expecting. A link claimed from inside the SDK's feed leaves the feed on
screen, so `Linking.openURL` opens the browser over it. A handler that
navigates in-app does so underneath it until the user closes the feed. A push
CTA whose destination type is `url` opens Safari without consulting the
bridge, so that one path never reaches a handler.

`onGeofence` reports that the device has entered, dwelt in or left a geofence
Pulsate monitors. It fires on Android only; subscribing on iOS is harmless.
The iOS SDK reports its own crossings straight to Pulsate, so there is
nothing for a handler to receive. Three things have to hold before it can
fire on Android. [Location.setLocationEnabled](location.md#setlocationenabled) is `true` and has not
been switched off in this process. Switching it back on restarts nothing
until the app restarts. The app holds background location permission. With
foreground permission alone the SDK downloads the geofences and monitors
none, with no error reported. The campaign's geofences have reached the
device. One crossing is one event naming every geofence it triggered, so
`geofenceIds` can hold more than one id. Each id is the SDK's own
`"<guid>.<name>"` string, passed on verbatim and never split. `location` is
the fix that triggered the crossing and is absent when the system reports
none. The handler runs before the SDK's own de-duplication, so it sees every
crossing the operating system delivers. That includes the burst of `enter`
events the system replays for every geofence the device is already inside
whenever the SDK registers them again. That happens about two minutes after
every app start. An app launched inside a geofence therefore reports an
`enter` on each launch. Expect more events than Pulsate records. The
`transition` type includes `dwell`, but the Android SDK registers entries and
exits only, so `dwell` never arrives. Geofencing errors the operating system
reports never reach the handler. The Android SDK reads the precise grant
only. A user who chooses Approximate location on Android 12 and later counts
as having denied it. Dropped, not queued, while nothing is subscribed.

#### Examples

```ts
const subscription = addListener('onError', (error) => {
  console.warn(`[${error.type}] ${error.message}`);
});
// later
subscription.remove();
```

```ts
addListener('onBadgeUpdate', (count) => setBadge(count));
```

```ts
addListener('onFeedClose', () => refreshUnreadCount());
```

```ts
addListener('onLink', (url) => {
  if (url.startsWith('myapp://')) {
    navigate(url);
    return;
  }
  Linking.openURL(url);
});
```

```ts
addListener('onGeofence', ({ geofenceIds, transition }) => {
  console.log(`${transition}: ${geofenceIds.join(', ')}`);
});
```

## Interfaces

### Subscription

The handle `addListener` returns.

#### Methods

##### remove()

```ts
remove(): void;
```

Removes this handler. Safe to call more than once.

###### Returns

`void`

## Type Aliases

### PulsateEvents

```ts
type PulsateEvents = {
  onError: (error) => void;
  onBadgeUpdate: (count) => void;
  onUnauthorizedAction: (event) => void;
  onFeedClose: () => void;
  onLink: (url) => void;
  onGeofence: (event) => void;
};
```

The events the SDK initiates, keyed by name. Pass a key to
[Events.addListener](#addlistener); the handler type is exact for each event.

#### Properties

##### onError

```ts
onError: (error) => void;
```

Fires on Android for an in-app message the SDK did not show. See
[Events.addListener](#addlistener) for when it fires and what the error carries.
Never fires on iOS.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | [`PulsateError`](errors.md#pulsateerror) |

###### Returns

`void`

##### onBadgeUpdate

```ts
onBadgeUpdate: (count) => void;
```

The unread count of the user's feed, as the SDK reports it. See
[Events.addListener](#addlistener) for when it fires on each platform.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

###### Returns

`void`

##### onUnauthorizedAction

```ts
onUnauthorizedAction: (event) => void;
```

Fires when the SDK refuses the feed to a user the host has not
authorized. See [Events.addListener](#addlistener) for the sequence it arrives in
and what the payload carries on each platform.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`UnauthorizedActionEvent`](#unauthorizedactionevent) |

###### Returns

`void`

##### onFeedClose

```ts
onFeedClose: () => void;
```

Fires when the Pulsate feed closes. See [Events.addListener](#addlistener) for
the closes it reports and the ones it does not.

###### Returns

`void`

##### onLink

```ts
onLink: (url) => void;
```

A URL the SDK asked the app to open. The sources are a push tap, a push
action button, and a link tapped inside the feed. They also include an
in-app or feed-card CTA whose destination is a link, a url or a
deeplink. See
[Events.addListener](#addlistener) for buffering, the `Linking.openURL`
fallback and the per-platform differences.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `url` | `string` |

###### Returns

`void`

##### onGeofence

```ts
onGeofence: (event) => void;
```

A geofence Pulsate monitors that the device has entered, dwelt in or
left. See [Events.addListener](#addlistener) for what has to be granted before it
can fire. Never fires on iOS.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`GeofenceEvent`](location.md#geofenceevent) |

###### Returns

`void`

***

### UnauthorizedActionEvent

```ts
type UnauthorizedActionEvent = {
  action?: string;
};
```

What the SDK reports when it refuses the feed to an unauthorized user.

`action` is a diagnostic label iOS carries and Android does not: the Android
listener has no payload at all, so the field is absent there. The iOS values
are internal to the SDK. They are stable, but nothing guarantees them. Log
the label; never branch on it. What a host acts on is that the event fired.

#### Properties

##### action?

```ts
readonly optional action?: string;
```
