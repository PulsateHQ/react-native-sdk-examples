# Push notifications

The per-user push preference and clearing the notification tray. Native push setup is in the platform guides.

## Functions

### setPushEnabled()

```ts
function setPushEnabled(enabled): Promise<void>;
```

Enables or disables Pulsate push notifications for this user.

This is Pulsate's own preference, not the operating system's notification
permission. Turning it on does not prompt the user, and turning it off does
not revoke anything the app was granted. Your app owns the OS permission.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `enabled` | `boolean` |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- The SDK writes the preference locally at once. It sends the preference to
  the server about sixty seconds later, coalescing rapid toggles into the
  last value.
- A failed send is not reported, and [isPushEnabled](#ispushenabled) reads the local
  value, so neither confirms that the server received it. Treat the flag as
  this device's intent, not as server state.
- On Android a failed send also reverts the local value. On iOS the local
  value stays.

#### Example

```ts
await setPushEnabled(false);
```

***

### isPushEnabled()

```ts
function isPushEnabled(): Promise<boolean>;
```

Reports whether Pulsate push notifications are enabled for this user.

Reads the preference [setPushEnabled](#setpushenabled) writes. A local read, not a
server read. It says nothing about the operating system's notification
permission. A `true` here is consistent with a user who has denied
notifications at the OS level.

#### Returns

`Promise`\<`boolean`\>

The preference; `true` before anything has written it.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on Android when the SDK's local store cannot be read.

#### Example

```ts
const enabled = await isPushEnabled();
```

***

### clearAllNotifications()

```ts
function clearAllNotifications(): Promise<void>;
```

Removes every notification the app has posted and resets the app-icon
badge to zero.

Not scoped to Pulsate's notifications: the app's own notifications and any
other library's are removed with them. The server-side unread count is
untouched and reappears on the next feed refresh or session start. Both
SDKs also do this automatically on logout and on a change of alias.

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

On Android a notification owned by a running foreground service survives,
and the promise still resolves.

#### Example

```ts
await clearAllNotifications();
```
