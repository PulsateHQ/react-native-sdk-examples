# Feed

Open the Pulsate feed, read its unread count, and control who is allowed to see it.

## Functions

### showFeed()

```ts
function showFeed(): Promise<void>;
```

Opens the Pulsate feed.

The SDK presents the feed itself, full screen, over whatever is on screen.
Nothing is embedded in the host's navigation and nothing is returned to
place: listen for `onFeedClose` to know when the user came back.

#### Returns

`Promise`\<`void`\>

Resolves once the feed has been asked for, not once it is on
screen. A resolve is not a promise that the feed appeared. On Android a
feed that cannot be started reports nothing. On iOS the three cases below
reject. A presentation the system declines resolves like any other and is
followed by no `onFeedClose`. A second call made while the first feed is
still animating in is one such case.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on iOS in three cases. The first is that there is no
  visible screen to present the feed from. The second is that Pulsate hands
  back no feed to present. The third is that Pulsate hands back something
  that cannot be presented. None of the three is retried.

#### Remarks

- On Android the feed opens as its own task, on top of the app. The system
  back button closes it and returns the user to the screen they came from.
- On iOS the feed is presented full screen over whatever the app
  has on top. There is no system back button, so the feed's own close
  control is the way out.
- Pulsate opens the same feed by itself for a push tap or a message whose
  destination is the feed. Those opens are not reported on either platform:
  `onFeedClose` follows only a feed this call opened. On Android a
  Pulsate-initiated re-open of an already-open feed silences the close of
  that one too. On iOS each open is separate, so a Pulsate-opened feed is
  silent without silencing anything else.
- Opening the feed for a user the host has not authorized closes it again
  immediately. See [Events.addListener](events.md#addlistener) for the events that report it.
  See [setUserAuthorized](#setuserauthorized) for the flag that decides it.

#### Example

```ts
await showFeed();
```

***

### getFeedUnreadCount()

```ts
function getFeedUnreadCount(): Promise<number>;
```

Reads the number of unread messages in the user's feed.

The one count getter. `onBadgeUpdate` reports counts the SDK pushes on its
own. This is the read a host does at a moment of its choosing. The two can
disagree for a while because this one is rate-limited natively.

#### Returns

`Promise`\<`number`\>

The unread total. `0` is also the answer before a user has been
identified, and the answer when the underlying request fails. A `0` does
not by itself mean the inbox is empty.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on Android when the SDK cannot start the read at all. iOS
  has no failure channel on this call: a failure there resolves `0`.

#### Remarks

- On iOS an empty response leaves the call, and every call waiting with it,
  pending until a later read succeeds.
- The SDK reads the count at most once every 30 seconds, on both platforms.
  A call made shortly after another does not fail and does not return a
  cached number. It may wait until the SDK's next read, up to 30 seconds.
  It then resolves with the count read at that moment. Calls waiting together
  resolve together with the same number.
- On Android, in a rare race at the boundary of that half minute a waiting
  call is only settled by the next read. No timeout is applied.
- Reading the count also sends any pending profile or attribute changes to
  Pulsate before the count is read. Those changes can move the count, so
  that send is by design. A change made moments earlier has already been
  sent by the time this resolves. Whether that send succeeded is not reported
  here.
- Do not poll it. Read it when a screen that shows the count appears, and
  keep it up to date from `onBadgeUpdate` in between. The half-minute
  window is fixed by design: the read is one of Pulsate's heavier requests.

#### Example

```ts
const unread = await getFeedUnreadCount();
```

***

### setUserAuthorized()

```ts
function setUserAuthorized(authorized): Promise<void>;
```

Marks the current user as authorized, or withdraws that mark.

This is the gate on what Pulsate will show an unauthorized user, and it
reports every refusal as `onUnauthorizedAction`. What it gates differs by
platform. On Android it is the feed and nothing else, which Pulsate closes
as soon as it comes to the front. On iOS it is the campaigns, in-app
campaigns and calls to action Pulsate would otherwise have presented. The
feed is not gated by it at all on iOS. A fresh install starts authorized.

[Sessions.userHasLoggedIn](sessions.md#userhasloggedin) marks the user authorized and
[Sessions.userHasLoggedOut](sessions.md#userhasloggedout) marks them unauthorized, so a value set
here does not survive the next sign-in or sign-out. This is the direct
control over the same flag. Use it in a host that decides who may see the
feed on some basis of its own.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `authorized` | `boolean` |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the flag has
been stored.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- The flag is stored locally and sent with the next profile update or
  session start. The call itself sends nothing, and nothing reports when the
  value reaches Pulsate.
- **On iOS the flag does not survive a restart.**
  [Sessions.configure](sessions.md#configure) marks the user authorized again, so an app that
  marked someone unauthorized and was then closed comes back authorized.
  Apply your own answer after `configure()` resolves on every launch. On
  Android the value is stored per user and persists.
- On Android the flag is written asynchronously after the promise resolves,
  and a failed write is not reported. On iOS the write is already done when
  the promise resolves. On both, a read with [isUserAuthorized](#isuserauthorized) after
  an awaited write returns the new value.
- Marking a user unauthorized does not close a feed that is already on
  screen. On Android it closes the next time that screen comes to the front.
  A feed [showLastUnauthorizedMessage](#showlastunauthorizedmessage) re-opened is exempt from the
  check for as long as it stays on screen.

#### Example

```ts
await setUserAuthorized(false);
```

***

### isUserAuthorized()

```ts
function isUserAuthorized(): Promise<boolean>;
```

Reports whether the current user is marked as authorized.

Reads the flag [setUserAuthorized](#setuserauthorized) writes. A local read, not a server
read.

#### Returns

`Promise`\<`boolean`\>

`true` when the user may see the feed, `false` when Pulsate closes
it on sight. Before anything has written the flag the answer is `true`.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on Android when the SDK's local store cannot be read. iOS
  reads the value synchronously and has no such failure.

#### Remarks

- On Android the value can be older than the last
  [Sessions.userHasLoggedIn](sessions.md#userhasloggedin) or [Sessions.userHasLoggedOut](sessions.md#userhasloggedout) for a
  moment. Those write the same flag through the same asynchronous path.
- The `true` this answers before anything has written the flag means
  different things per platform. On Android it is a fresh install's default.
  On iOS it is what [Sessions.configure](sessions.md#configure) last set, on every launch.

#### Example

```ts
const authorized = await isUserAuthorized();
```

***

### showLastUnauthorizedMessage()

```ts
function showLastUnauthorizedMessage(): Promise<void>;
```

Re-opens the feed screen Pulsate closed on an unauthorized user.

When Pulsate refuses something to an unauthorized user it keeps what it
closed. This shows that again, and it is what
[Sessions.userHasLoggedIn](sessions.md#userhasloggedin) calls for you after marking the user
authorized. **Call it after `setUserAuthorized(true)`.** The reason differs
by platform. On iOS it does nothing while the user is unauthorized. On
Android it shows the feed anyway, because Pulsate treats the call as your
decision.

#### Returns

`Promise`\<`void`\>

Resolves whether or not there was anything to show.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- Nothing reports whether a screen was shown. With nothing held, and on iOS
  with the user unauthorized, it resolves and does nothing.
- On iOS it shows what it held **once**. The held item is cleared as soon as
  an authorized call runs, so a second call does nothing. On Android what it
  re-opens stays available until one of the events below clears it.
- On iOS it can bring back a refused push campaign and a refused in-app
  campaign. It can also bring back a refused call to action whose
  destination was the feed. A refusal Pulsate recorded only against an
  action button is not among them. Pulsate keeps no destination for one, so
  there is nothing to show.
- On Android the feed it opens stays exempt from the authorization check
  for as long as it is on screen. The flag can change meanwhile.
- The feed this opens does not report `onFeedClose`. Only a feed
  [showFeed](#showfeed) opened does; this one, like the one
  [Sessions.userHasLoggedIn](sessions.md#userhasloggedin) opens the same way, closes with no event.
- Pulsate forgets what it held when the user's alias changes at session
  start. It also forgets on [Sessions.logout](sessions.md#logout), and once the item has
  been shown to an authorized user. Signing out with
  [Sessions.userHasLoggedOut](sessions.md#userhasloggedout) does **not** make it forget: a later
  [Sessions.userHasLoggedIn](sessions.md#userhasloggedin) re-opens what was refused before the
  sign-out.

#### Example

```ts
await setUserAuthorized(true);
await showLastUnauthorizedMessage();
```
