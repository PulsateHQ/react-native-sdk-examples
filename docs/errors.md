# Errors

Every rejection the SDK raises is a `PulsateError`, and the `onError` event
delivers one. This page lists what its fields mean and which rejection each
call can produce.

## `PulsateError`

| Field | Type | Meaning |
|---|---|---|
| `type` | `string` | One of the rejection types below for a rejection. On the `onError` event, the native SDK's own error type. |
| `message` | `string` | Human-readable text. For a native rejection, the SDK's message. |
| `platform` | `'ios' \| 'android'` | The platform the error was raised on. |
| `nativeMessage` | `string \| undefined` | The native SDK's text when the error crossed the bridge. Absent when the call was refused before reaching the native SDK. |

`PulsateError` extends `Error`, so `instanceof PulsateError` works and
`error.name` is `PulsateError`.

```ts
import { PulsateError, startSession } from '@pulsatehq/react-native-sdk';

try {
  await startSession('customer-12345');
} catch (error) {
  if (error instanceof PulsateError) {
    console.warn(`${error.type} on ${error.platform}: ${error.message}`);
  }
}
```

## Rejection types

| Type | Meaning |
|---|---|
| `VALIDATION_ERROR` | The call was refused for a bad argument, before or at the native boundary. |
| `CONFIGURATION_ERROR` | The SDK is not configured. |
| `REQUEST_ERROR` | The native SDK reported a failure. |
| `VALUE_ERROR` | The native SDK answered a value the contract cannot represent. |

### `VALIDATION_ERROR`

| Call | When it rejects |
|---|---|
| `configure` | A key is not 64 characters, or the keys differ from the configured ones. |
| `startSession` | The alias is blank. |
| `updateAge` | The value is not a safe integer. |
| `updateGender` | The value is neither `'male'` nor `'female'`. |
| `setPrivacy` | The value is neither `'subscribed'` nor `'unsubscribed'`. |
| `setSmallInAppDuration` | The value is not a positive integer, or exceeds 2147483647. |
| `createAttribute` | The number is not finite, exceeds 3.4028234663852886e38 in magnitude, or is small enough that Android's 32-bit float narrows it to zero. The `Date` is invalid. The value is not a string, number, boolean or `Date`. |
| `incrementAttribute`, `decrementAttribute` | The step is not a whole number, or is outside -2147483648 to 2147483647. |

`updateGender` and `setPrivacy` are refused by the native modules, so their
rejections carry `nativeMessage`. Every other row is refused before the native
SDK is reached.

### `CONFIGURATION_ERROR`

| Call | When it rejects |
|---|---|
| Any call | `configure` has not resolved. |
| `configure` | The native SDK cannot be created, on either platform. On Android a key that contains a space is refused here. |
| `configure` | On Android, `PulsateAppId` or `PulsateAppKey` meta-data is in the manifest. |
| `configure` | On Android, the SDK's content provider was removed from the manifest. |

### `REQUEST_ERROR`

| Call | When it rejects |
|---|---|
| `startSession`, `logout` | The request failed or the backend refused it, invalid credentials included. The same on both platforms. |
| `startSession` | On iOS, a later `startSession` superseded this one before the SDK answered. |
| `isInAppEnabled`, `getSmallInAppDuration`, `isPushEnabled`, `isUserAuthorized`, `isLocationEnabled`, `getPrivacy` | On Android the SDK's local store cannot be read. On iOS these reads are synchronous and cannot fail this way. |
| `getFeedUnreadCount` | On Android the SDK cannot start the read at all. iOS has no failure channel on this call and resolves `0` instead, also when the server answers an error status or an empty response. |
| `showFeed` | On iOS there is no visible screen to present the feed from, or the SDK hands back no feed, or hands back something that cannot be presented. |
| `forceAttributeSync` | On iOS the sync failed, a backend error status included. |
| `createEvent`, `createEvents` | On Android the SDK throws while accepting the event. |
| `getLastKnownLocation` | On Android the SDK reports any failure other than the answer that it holds no fix. |

### `VALUE_ERROR`

`getPrivacy` rejects when the SDK answers a level other than `subscribed` or
`unsubscribed`. The SDK versions this package wraps answer only those two.

## What a resolved promise means

Most calls resolve once the native SDK has accepted the call, not once it has
finished acting on it. The [API reference](api/README.md) entry for each
function says which. The rule of thumb:

- `startSession` and `logout` have a real result channel. A resolve means
  the backend accepted the request, on both platforms, with one exception:
  on iOS a `startSession` for the same alias while a session is already
  active resolves without sending anything. On iOS a rejected `logout` does
  not always mean the device is still signed in: when the request that ends
  the session fails, the stored alias is kept and the device stays signed
  in; when that request succeeds and only the logout request fails, the
  alias and the local state are cleared anyway.
- `forceAttributeSync` settles when the sync finishes on iOS and on dispatch
  on Android.
- On iOS an HTTP 500 to any profile sync drops the attribute and event
  changes that request carried. That includes the syncs `startSession`,
  `getFeedUnreadCount`, `forceAttributeSync` and `logout` send, and the
  end-session request when the app goes to the background. Any other
  failure keeps the changes for the next sync.
- Every other call resolves on dispatch. A later failure inside the SDK is
  not reported to the promise.

## The `onError` event

`addListener('onError', handler)` receives a `PulsateError` whose `type` and
`message` come from the native SDK unfiltered. It fires on Android only, once
per in-app message the SDK did not show, with `type` `"INAPP_ERROR"`. The
message says why the message was not shown and names the campaign's ID. Do
not show it to users. See the [API
reference](api/README.md) for details.
