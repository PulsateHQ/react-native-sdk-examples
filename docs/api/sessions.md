# Sessions

Initialise the SDK and manage the user's session: `configure`, `startSession`, `logout`, the sign-in signals, and `forceAttributeSync`.

## Functions

### configure()

```ts
function configure(config): Promise<void>;
```

Initialises the SDK with your app's credentials. Call it once at startup,
before any other Pulsate call.

Idempotent: calling it again with the same keys resolves without touching
the native SDK. Calling it again with different keys rejects, because iOS
cannot swap credentials at runtime; changed keys take effect on the next
cold launch.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `config` | [`PulsateConfig`](#pulsateconfig) | The credentials, and the iOS delegate options which stay at their defaults in every supported setup. |

#### Returns

`Promise`\<`void`\>

Resolves once the native SDK is initialised. Every other function
rejects with `CONFIGURATION_ERROR` until then.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `VALIDATION_ERROR` when either key is not exactly 64 characters, or when
  the keys differ from the ones already configured. The length check runs
  before the native SDK is reached.
- `CONFIGURATION_ERROR` when the native SDK cannot be created, on either
  platform. On Android a key that contains a space is refused here
  rather than by the length check above.
- `CONFIGURATION_ERROR` on Android when `PulsateAppId` or `PulsateAppKey`
  meta-data is present in the manifest. Manifest keys would override the
  ones passed here.
- `CONFIGURATION_ERROR` on Android when the SDK's `PulsateProvider` content
  provider was removed from the manifest.

#### Example

```ts
await configure({ appId: '<YOUR_APP_ID>', appKey: '<YOUR_APP_KEY>' });
```

***

### startSession()

```ts
function startSession(alias, options?): Promise<void>;
```

Starts a session for `alias`, the user every later call is attributed to.

Call it with the app in the foreground; in the background the SDK retries
a few times and then fails. Starting a session for a different alias
replaces the previous user and clears notifications.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `alias` | `string` | A stable identifier for the user, such as a customer ID. Crosses to the SDK verbatim. Must not be blank. |
| `options?` | \{ `debug?`: `boolean`; \} | Optional session settings. |
| `options.debug?` | `boolean` | Enables the SDK's debug logging on iOS. Accepted on both platforms; it has an effect on iOS only. On iOS the flag crosses to the SDK unchanged, and the debug logs stay on the device: they are never uploaded. On iOS, shaking the device then opens the SDK's debug screen; use it in development builds only. The Android bridge takes no debug flag, so the value stays on the JavaScript side there. |

#### Returns

`Promise`\<`void`\>

Resolves once the backend has accepted the session.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `VALIDATION_ERROR` when `alias` is empty or whitespace. Raised before the
  native SDK is reached.
- `CONFIGURATION_ERROR` before [configure](#configure) has resolved.
- `REQUEST_ERROR` when the session failed, a backend refusal such as
  invalid credentials included.
- `REQUEST_ERROR` on iOS when a later `startSession` supersedes this one
  before the SDK answers. The SDK holds one session listener, so only the
  newest call can resolve.

#### Remarks

- On Android a different alias clears Pulsate's notifications only, once
  the session has started. A switch straight from one user to another can
  be missed, so the previous user's notifications and unread count stay.
  Call [logout](#logout) before starting a session for a different user.
- On iOS a different alias clears every notification of the app, including
  other libraries' and local notifications scheduled but not yet delivered.
  This happens before the request, so also when `startSession` rejects with
  `REQUEST_ERROR`.
- On iOS the first session after install, or after a `logout()` that ended
  the session, counts as a different alias.

#### Example

```ts
await startSession('customer-12345');
```

***

### logout()

```ts
function logout(): Promise<void>;
```

Ends the session for the user the SDK holds.

The stored alias is cleared, and on Android in-app state goes with it.
Notifications are cleared on both platforms: on Android the Pulsate
notifications, once a session has started; on iOS every notification of the
app, including local notifications scheduled but not yet delivered. Call it
once per sign-out.

#### Returns

`Promise`\<`void`\>

Resolves once the backend has accepted the logout.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [configure](#configure) has resolved.
- `REQUEST_ERROR` when the logout fails at the backend.

#### Remarks

- On Android the SDK throttles logout. A second call within about ten
  seconds of the previous one is dropped and its promise never settles.
- On Android a rejection does not mean the device is still signed in. The
  logout proceeds after the failure the rejection reports, and the local
  state is cleared either way.
- On iOS a rejection can mean the device is still signed in. The SDK first
  ends the session with the backend. When that request fails, the logout
  stops there and the stored alias is kept, so call `logout()` again later.
  The notifications are already cleared by then, and `onBadgeUpdate` has
  fired `0`. When only the logout request itself fails, the local state is
  cleared.

#### Example

```ts
await logout();
```

***

### userHasLoggedIn()

```ts
function userHasLoggedIn(): Promise<void>;
```

Tells the SDK the user has signed in to your app.

A campaign-gating signal, not session lifetime: [startSession](#startsession) and
[logout](#logout) own the session. This pair tells the SDK whether the person
using the app is authenticated, so campaigns targeted at signed-in users
can be delivered. Call it from your own login flow.

On both platforms it re-enables in-app notifications and marks the user
authorized. It also shows the last in-app message that was withheld while
the user was unauthorized. On both it also replays whatever Pulsate withheld
when it refused an unauthorized user. The two steps are
[Feed.setUserAuthorized](feed.md#setuserauthorized) followed by
[Feed.showLastUnauthorizedMessage](feed.md#showlastunauthorizedmessage), which you can also call directly
on either platform.

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the SDK has
acted on it.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [configure](#configure) has resolved.

#### Remarks

- On Android what it replays is the feed screen Pulsate closed. A feed
  refused before a [userHasLoggedOut](#userhasloggedout) is still held, so this call
  re-opens it.
- On iOS what it replays is the campaign or call to action Pulsate
  declined.

#### Example

```ts
await userHasLoggedIn();
```

***

### userHasLoggedOut()

```ts
function userHasLoggedOut(): Promise<void>;
```

Tells the SDK the user has signed out of your app.

The counterpart of [userHasLoggedIn](#userhasloggedin): marks the user unauthorized and
disables in-app notifications. It does not end the Pulsate session;
[logout](#logout) does that. The authorization flag it writes is the one
[Feed.setUserAuthorized](feed.md#setuserauthorized) controls directly. Pulsate closes the feed
for this user until something marks them authorized again. On Android it
does not clear a feed Pulsate already refused and held. The next
[userHasLoggedIn](#userhasloggedin) re-opens it.

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [configure](#configure) has resolved.

#### Example

```ts
await userHasLoggedOut();
```

***

### forceAttributeSync()

```ts
function forceAttributeSync(): Promise<void>;
```

Sends the user attributes set since the last sync to the backend now,
instead of waiting for the SDK's own schedule.

Call it once per user action, never in a loop. The delays below are by
design: they fold a burst of changes into one request.

#### Returns

`Promise`\<`void`\>

On iOS, resolves when the sync finishes, and immediately when
there is nothing to sync. On Android, resolves once the call has been
dispatched. The sync runs about fifteen seconds later, and only if the SDK
has other pending user data. A later failure is not reported.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [configure](#configure) has resolved.
- `REQUEST_ERROR` on iOS when the SDK reports the sync failed.

#### Remarks

On iOS the call goes through a thirty-second debounce. The first call in a
window runs at once. A later call inside the open window settles at the end
of the window, when the sync the window sends at its end finishes. Every
call queued in the window settles with that sync's result. The SDK's own user
updates share the same window, such as those after a location update or a
geofence crossing. Do not await this promise where the user is waiting: it
can take thirty seconds.

#### Example

```ts
await forceAttributeSync();
```

## Interfaces

### PulsateConfig

Credentials and the iOS delegate ownership options passed to [configure](#configure).

#### Properties

| Property | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| <a id="property-appid"></a> `appId` | `string` | `undefined` | The SDK App ID from the Pulsate dashboard. Exactly 64 characters. |
| <a id="property-appkey"></a> `appKey` | `string` | `undefined` | The SDK App Key from the Pulsate dashboard. Exactly 64 characters. |
| <a id="property-iospulsateappdelegate"></a> ~~`iosPulsateAppDelegate?`~~ | `boolean` | `false` | iOS only. Leave at the default, `false`: your app keeps its own `AppDelegate` and forwards the push callbacks to `PulsatePush`, as the iOS push guide shows. With `true` the SDK takes over the `AppDelegate` and forwards to yours itself; your app must then forward nothing, or the two forward to each other in a loop. Ignored on Android. **Deprecated** The Pulsate iOS SDK deprecates acting as your `AppDelegate` and will remove it in a future major release, together with this option. Leave it unset. |
| <a id="property-iospulsatenotificationdelegate"></a> `iosPulsateNotificationDelegate?` | `boolean` | `false` | iOS only. Leave at the default, `false`: your app keeps its own `UNUserNotificationCenter` delegate and forwards its callbacks to `PulsatePush`, as the iOS push guide shows. With `true` the SDK takes over the delegate and forwards to yours itself; your app must then forward nothing there, or the two forward to each other in a loop. Notifications from other senders are then never presented. Ignored on Android. |
