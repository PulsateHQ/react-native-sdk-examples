# Attributes and events

Store custom attributes on the current user, and send the custom events that campaigns are triggered from.

## Functions

### createAttribute()

```ts
function createAttribute(key, value): Promise<void>;
```

Stores a custom attribute on the current user.

Custom attributes are the user properties campaigns segment on. There is no
way to delete one from here. See [AttributeValue](#attributevalue) for the types an
attribute can hold and the type each is stored under.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | The attribute name, as it will appear in the dashboard. Crosses to the SDK verbatim and is not validated. |
| `value` | [`AttributeValue`](#attributevalue) | The value to store. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the value has
been stored or sent.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `VALIDATION_ERROR` when `value` is a number that is not finite, meaning
  `NaN`, `Infinity` or `-Infinity`.
- `VALIDATION_ERROR` when `value` is a number whose magnitude is above
  3.4028234663852886e38. That is the largest value the Android SDK's 32-bit
  float attribute can hold, and above it Android's conversion becomes an
  infinity.
- `VALIDATION_ERROR` when `value` is a number so small that the same
  conversion narrows it to zero, below about 7e-46 in magnitude. Zero itself
  is stored.
- `VALIDATION_ERROR` when `value` is an invalid `Date`, such as
  `new Date('nonsense')`.
- `VALIDATION_ERROR` when `value` is of any other type. The
  [AttributeValue](#attributevalue) type prevents this in TypeScript.
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- On Android the attribute is written to the SDK's local store
  asynchronously, after the promise resolves. A failed write is not
  reported.
- The attribute reaches Pulsate inside the next user update the SDK sends.
  [Sessions.forceAttributeSync](sessions.md#forceattributesync) sends one about 15 seconds later, and
  that update carries the user's profile fields as well. Until it is sent,
  only one value per key is sent. The platforms keep opposite ends of the
  pair. Writing a key twice before the update goes out sends the second
  value on Android and the first on iOS. The other write is discarded with
  no error, and the promise resolves either way. Write a key once per update,
  or force a sync between the two writes, when it matters which value lands.
- The Pulsate SDKs also describe sending that update when the app enters the
  background. This package neither triggers nor verifies that path;
  [Sessions.forceAttributeSync](sessions.md#forceattributesync) is the only sync it exercises.
- Changing the type stored under an existing key does nothing on iOS. While
  an entry for that key is pending, the SDK skips any write whose type
  differs from it, and the promise still resolves. Android replaces the entry
  whatever its type.
- An empty key is dropped by both SDKs, and the drop is not reported. The
  promise resolves. An empty string value is stored on Android and dropped on
  iOS, also with no error.
- A decimal is narrowed to a 32-bit float on Android, so about 7 significant
  digits survive there. iOS stores the digits as written. That conversion
  also changes the notation of large whole numbers: 3000000000 is stored as
  `3.0E9`, and a millisecond timestamp such as 1694160000000 as `1.69416E12`.
  Store such a value as a string when the digits matter.
- A `Date` is stored in the device's own time zone on Android, in the form
  `Tue Sep 08 12:34:56 GMT+03:00 2026`. Its month and day names are always
  English. On iOS it is stored as `2026-09-08 09:34:56` in UTC. Seconds are
  the finest resolution on both, and the milliseconds are truncated rather
  than rounded. Use a string attribute when the exact wire format matters.
- An attribute written before the first [Sessions.startSession](sessions.md#startsession), or
  after [Sessions.logout](sessions.md#logout), is not dropped. It is held until the next
  update is sent and is then attributed to whoever is identified by then.

#### Example

```ts
await createAttribute('plan', 'gold');
await createAttribute('loyalty_points', 1250);
await createAttribute('newsletter', true);
await createAttribute('signed_up_at', new Date());
```

***

### incrementAttribute()

```ts
function incrementAttribute(key, by?): Promise<void>;
```

Adds `by` to a numeric custom attribute on the current user.

The attribute is the one [createAttribute](#createattribute) writes: the counter changes
the same named value, and the two calls compete for it. Use this when the
app knows the change rather than the total, such as counting purchases.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `key` | `string` | `undefined` | The attribute name, as it will appear in the dashboard. Crosses to the SDK verbatim and is not validated. |
| `by` | `number` | `1` | A whole number between -2147483648 and 2147483647. A negative step reverses the direction, so incrementing by -3 decrements by 3, and a step of 0 changes nothing. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the counter has
been changed or sent.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `VALIDATION_ERROR` when `by` is not a whole number, or is outside
  -2147483648 to 2147483647. Decimal steps are not supported.
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- On Android the change is written to the SDK's local store asynchronously,
  after the promise resolves. On iOS it is written before the promise
  resolves. A failed write is not reported on either platform.
- The change reaches Pulsate inside the next user update the SDK sends.
  [Sessions.forceAttributeSync](sessions.md#forceattributesync) sends one about 15 seconds later.
  Until it is sent, only the last pending change per attribute name is kept
  on Android. Two increments of one key count once, and the later call
  replaces the earlier one entirely, step and direction included. There is
  no reliable way to make both count from the app. A
  [Sessions.forceAttributeSync](sessions.md#forceattributesync) call resolves as soon as it is
  dispatched and only restarts the same 15-second timer. A second change
  made before the update has actually left still replaces the first. Treat
  one pending change per key per update as the ceiling on Android, or send
  the running total with [createAttribute](#createattribute) instead.
- A counter change and a [createAttribute](#createattribute) write on the same key
  compete the same way on Android: only the later call is kept.
- An empty key is dropped by both SDKs, and the drop is not reported: the
  promise resolves.
- A change made before the first [Sessions.startSession](sessions.md#startsession), or after
  [Sessions.logout](sessions.md#logout), is not dropped. It is held until the next
  update is sent and is then attributed to whoever is identified by then.
- On iOS the SDK keeps one entry per call but sends only the earliest for
  each key. Of two increments with no sync between them, iOS sends the
  first and Android the second. Likewise, a counter change on a key with a
  pending write of another type is discarded on iOS, where Android keeps the
  later write.

#### Example

```ts
await incrementAttribute('purchases');
await incrementAttribute('loyalty_points', 50);
```

***

### decrementAttribute()

```ts
function decrementAttribute(key, by?): Promise<void>;
```

Subtracts `by` from a numeric custom attribute on the current user.

The counterpart to [incrementAttribute](#incrementattribute), with the same rules. Those
are the same whole-number step, the same competition with
[createAttribute](#createattribute) for the key, and the same point at which the change
is sent.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `key` | `string` | `undefined` | The attribute name, as it will appear in the dashboard. Crosses to the SDK verbatim and is not validated. |
| `by` | `number` | `1` | A whole number between -2147483648 and 2147483647. A negative step reverses the direction, so decrementing by -3 increments by 3, and a step of 0 changes nothing. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the counter has
been changed or sent.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `VALIDATION_ERROR` when `by` is not a whole number, or is outside
  -2147483648 to 2147483647. Decimal steps are not supported.
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- On Android the change is written to the SDK's local store asynchronously,
  after the promise resolves. On iOS it is written before the promise
  resolves. A failed write is not reported on either platform.
- The change reaches Pulsate inside the next user update the SDK sends.
  [Sessions.forceAttributeSync](sessions.md#forceattributesync) sends one about 15 seconds later.
  Until it is sent, only the last pending change per attribute name is kept
  on Android. Two decrements of one key count once, and the later call
  replaces the earlier one entirely, step and direction included. There is
  no reliable way to make both count from the app. A
  [Sessions.forceAttributeSync](sessions.md#forceattributesync) call resolves as soon as it is
  dispatched and only restarts the same 15-second timer. A second change
  made before the update has actually left still replaces the first. Treat
  one pending change per key per update as the ceiling on Android, or send
  the running total with [createAttribute](#createattribute) instead.
- A counter change and a [createAttribute](#createattribute) write on the same key
  compete the same way on Android: only the later call is kept.
- An empty key is dropped by both SDKs, and the drop is not reported: the
  promise resolves.
- A change made before the first [Sessions.startSession](sessions.md#startsession), or after
  [Sessions.logout](sessions.md#logout), is not dropped. It is held until the next
  update is sent and is then attributed to whoever is identified by then.
- On iOS the SDK keeps one entry per call but sends only the earliest for
  each key. Of two decrements with no sync between them, iOS sends the
  first and Android the second. Likewise, a counter change on a key with a
  pending write of another type is discarded on iOS, where Android keeps the
  later write.

#### Example

```ts
await decrementAttribute('credits');
await decrementAttribute('credits', 10);
```

***

### createEvent()

```ts
function createEvent(name): Promise<void>;
```

Sends a custom event named `name` for the current user.

Custom events are what campaigns are triggered from. A dashboard campaign can
select an event only after the backend has seen it from an identified user.
Send events from a session started with an alias, as
[Sessions.startSession](sessions.md#startsession) describes. If the event triggers a campaign,
the SDK presents the in-app message itself; no JavaScript event announces it.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | The event name, as it will appear in the dashboard. Crosses to the SDK verbatim and is not validated. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the backend
has accepted the event. A dropped or rejected request is not reported.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on Android when the SDK throws while accepting the event.

#### Remarks

Without a session, Android drops the event before sending and iOS sends it
anonymously without registering the name. An empty name is sent on iOS and
dropped on Android; a whitespace-only name is sent on both.

#### Example

```ts
await createEvent('viewed_offers');
```

***

### createEvents()

```ts
function createEvents(names): Promise<void>;
```

Sends several custom events for the current user in one request.

The batch form of [createEvent](#createevent), and the same rules apply to each
name. Use it when a screen produces several events at once; one request
carries them all.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `names` | `string`[] | The event names, in the order they are sent. Every name crosses to the SDK verbatim and is not validated. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the backend
has accepted the events. A dropped or rejected request is not reported.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on Android when the SDK throws while accepting the events.

#### Remarks

- Every name in the list is sent, including an empty one. This is where the
  batch call differs from [createEvent](#createevent), which drops an empty name on
  Android.
- An empty list sends nothing on Android; iOS sends an empty request.
- Without a session, Android drops the whole batch before sending.

#### Example

```ts
await createEvents(['viewed_offers', 'added_to_cart']);
```

## Type Aliases

### AttributeValue

```ts
type AttributeValue = string | number | boolean | Date;
```

The values a custom attribute can hold.

Each member is stored under its own type on the server. A `string` is
stored as a string and a `boolean` as a boolean. A whole number in the
32-bit range is stored as an integer, and any other number as a decimal.
A `Date` is stored as a date.
