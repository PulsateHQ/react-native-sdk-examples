# In-app notifications

Control whether in-app messages are shown, how long a small banner stays on screen, and re-show a withheld message.

## Functions

### setInAppEnabled()

```ts
function setInAppEnabled(enabled): Promise<void>;
```

Enables or disables Pulsate in-app notifications for this device.

This is the SDK's display gate. A message that arrives while the gate is
closed is still received and counted as delivered; it is not shown.
[Sessions.userHasLoggedIn](sessions.md#userhasloggedin) turns the gate on and
[Sessions.userHasLoggedOut](sessions.md#userhasloggedout) turns it off, so a value set here does
not survive the next sign-in or sign-out.

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

- On Android, `setInAppEnabled(true)` also shows the last message that was
  withheld while the gate was closed. On iOS it only opens the gate; use
  [showLastInApp](#showlastinapp) to show the withheld message.
- On Android the flag is per user; on iOS it is per device.
- On Android the flag is written asynchronously after the promise resolves,
  and a failed write is not reported. A read with [isInAppEnabled](#isinappenabled)
  after an awaited write returns the new value on both platforms.

#### Example

```ts
await setInAppEnabled(false);
```

***

### isInAppEnabled()

```ts
function isInAppEnabled(): Promise<boolean>;
```

Reports whether Pulsate in-app notifications are enabled for this device.

Reads the gate [setInAppEnabled](#setinappenabled) writes. A local read, not a server
read.

#### Returns

`Promise`\<`boolean`\>

`true` when messages are shown, `false` when they are withheld.
`false` does not mean none arrived. Before anything has written the flag
the answer is `true` on both platforms.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on Android when the SDK's local store cannot be read.

#### Example

```ts
const enabled = await isInAppEnabled();
```

***

### setSmallInAppDuration()

```ts
function setSmallInAppDuration(seconds): Promise<void>;
```

Sets how long a small in-app banner stays on screen, in whole seconds.

The value stays on the device; nothing is sent to the server. Both SDKs
default to 12 seconds.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `seconds` | `number` | A positive integer no greater than 2147483647. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `VALIDATION_ERROR` when `seconds` is not a positive integer or exceeds
  2147483647, including `0`, negatives, non-integers, `NaN` and
  infinities. Raised before the native SDK is reached.
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

On Android, values above 2147483 seconds are accepted. The banner duration
wraps when it is converted to milliseconds. Stay at or below 2147483, which
is about 24 days.

#### Example

```ts
await setSmallInAppDuration(20);
```

***

### getSmallInAppDuration()

```ts
function getSmallInAppDuration(): Promise<number>;
```

Reports how long a small in-app banner stays on screen, in whole seconds.

Reads the value [setSmallInAppDuration](#setsmallinappduration) wrote.

#### Returns

`Promise`\<`number`\>

The duration in seconds, and the SDK's default of 12 before
anything has been written.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on Android when the SDK's local store cannot be read.

#### Example

```ts
const seconds = await getSmallInAppDuration();
```

***

### showLastInApp()

```ts
function showLastInApp(): Promise<void>;
```

Shows the last in-app message that was withheld from the user.

Bypasses the [setInAppEnabled](#setinappenabled) gate. Both SDKs call this from their own
sign-in flow, so [Sessions.userHasLoggedIn](sessions.md#userhasloggedin) already asks for the last
message again. On iOS that re-show empties the buffer once it has run. On
Android the SDK keeps the last message, so a later call can show it again.
Use it for one case: the app disabled in-app messages, one arrived, and the
app now wants it shown.

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched. The message is shown
asynchronously and nothing reports whether it was. An empty buffer is not
a failure: the promise resolves and nothing is shown.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- What is buffered differs by platform. iOS holds a message that arrived
  while in-app notifications were disabled. Android holds the last message
  it attempted to show, whatever stopped it, and empties the buffer on
  dismiss, tap, app stop and logout. On both, a message the user has seen
  is never shown again.
- On iOS every re-show records a delivery, so repeated calls inflate
  campaign statistics.
- On Android, do not call this within about 80 seconds of a message being
  withheld. The SDK's own retries of that message can cancel the re-show.
  A call made while another message is still arriving cancels that
  message. [setInAppEnabled](#setinappenabled) with `true` is the safer path there.

#### Example

```ts
await showLastInApp();
```
