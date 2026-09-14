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
| `startSession`, `logout` | The request failed. On Android that includes a backend refusal, on iOS only a transport failure. |
| `startSession` | On iOS, a later `startSession` superseded this one before the SDK answered. |
| `isInAppEnabled`, `getSmallInAppDuration`, `isPushEnabled`, `isUserAuthorized`, `isLocationEnabled`, `getPrivacy` | On Android the SDK's local store cannot be read. On iOS these reads are synchronous and cannot fail this way. |
| `getFeedUnreadCount` | On Android the SDK cannot start the read at all. iOS has no failure channel on this call and resolves `0` instead. An empty response there leaves the call pending until a later read succeeds. |
| `showFeed` | On iOS there is no visible screen to present the feed from, or the SDK hands back no feed, or hands back something that cannot be presented. |
| `forceAttributeSync` | On iOS the SDK reports the sync failed. |
| `createEvent`, `createEvents` | On Android the SDK throws while accepting the event. |
| `getLastKnownLocation` | On Android the SDK reports any failure other than the answer that it holds no fix. |

### `VALUE_ERROR`

`getPrivacy` rejects when the SDK answers a level other than `subscribed` or
`unsubscribed`. The SDK versions this package wraps answer only those two.

## What a resolved promise means

Most calls resolve once the native SDK has accepted the call, not once it has
finished acting on it. The [API reference](api/README.md) entry for each
function says which. The rule of thumb:

- `startSession` and `logout` have a real result channel. On Android a
  resolve means the backend accepted the request. On iOS it means the request
  was sent.
- `forceAttributeSync` settles when the sync finishes on iOS and on dispatch
  on Android.
- Every other call resolves on dispatch. A later failure inside the SDK is
  not reported to the promise.

## The `onError` event

`addListener('onError', handler)` receives a `PulsateError` whose `type` and
`message` come from the native SDK unfiltered. It fires on Android only, once
per in-app message the SDK did not show, with `type` `"INAPP_ERROR"`. The
message can include the user's profile fields. Do not show it to users or send
it to a third-party logger unredacted. See the [API
reference](api/README.md) for details.
