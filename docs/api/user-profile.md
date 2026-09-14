# User profile

Set the profile fields Pulsate holds for the current user: first name,
last name, email address, gender, age, and phone number. Set the privacy
level that decides whether the user receives campaigns.

## Functions

### updateFirstName()

```ts
function updateFirstName(value): Promise<void>;
```

Sets the current user's first name.

The value crosses to the SDK verbatim. Nothing is validated here or
natively.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `value` | `string` | The name to store. An empty string is stored like any other value. It does not clear the name on the server, because blank fields are omitted from the update the SDK sends. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the value has
been stored.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- On Android the value is written to the SDK's local store asynchronously,
  after the promise resolves. A failed write is not reported. On iOS the
  write is immediate.
- The stored profile belongs to the alias of the session that is running,
  on both platforms. Set a field before [Sessions.startSession](sessions.md#startsession) and
  the next session does not see it.
- A profile change on its own sends nothing to the server. The value reaches
  Pulsate inside the next user update the SDK sends. The SDK sends one only
  when a user action, such as a delivered push, or a custom attribute is
  pending. [Sessions.forceAttributeSync](sessions.md#forceattributesync) does not send one either.

#### Example

```ts
await updateFirstName('Ada');
```

***

### updateLastName()

```ts
function updateLastName(value): Promise<void>;
```

Sets the current user's last name.

The value crosses to the SDK verbatim. Nothing is validated here or
natively.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `value` | `string` | The name to store. An empty string is stored like any other value. It does not clear the name on the server, because blank fields are omitted from the update the SDK sends. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the value has
been stored.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- On Android the value is written to the SDK's local store asynchronously,
  after the promise resolves. A failed write is not reported. On iOS the
  write is immediate.
- The stored profile belongs to the alias of the session that is running,
  on both platforms. Set a field before [Sessions.startSession](sessions.md#startsession) and
  the next session does not see it.
- A profile change on its own sends nothing to the server. The value reaches
  Pulsate inside the next user update the SDK sends. The SDK sends one only
  when a user action, such as a delivered push, or a custom attribute is
  pending. [Sessions.forceAttributeSync](sessions.md#forceattributesync) does not send one either.

#### Example

```ts
await updateLastName('Lovelace');
```

***

### updateEmail()

```ts
function updateEmail(value): Promise<void>;
```

Sets the current user's email address.

The value crosses to the SDK verbatim. No address is parsed anywhere in the
chain, so an unparseable address is stored like any other value.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `value` | `string` | The address to store. An empty string is stored like any other value. It does not clear the address on the server, because blank fields are omitted from the update the SDK sends. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the value has
been stored.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- On Android the value is written to the SDK's local store asynchronously,
  after the promise resolves. A failed write is not reported. On iOS the
  write is immediate.
- The stored profile belongs to the alias of the session that is running,
  on both platforms. Set a field before [Sessions.startSession](sessions.md#startsession) and
  the next session does not see it.
- A profile change on its own sends nothing to the server. The value reaches
  Pulsate inside the next user update the SDK sends. The SDK sends one only
  when a user action, such as a delivered push, or a custom attribute is
  pending. [Sessions.forceAttributeSync](sessions.md#forceattributesync) does not send one either.

#### Example

```ts
await updateEmail('ada@example.com');
```

***

### updateGender()

```ts
function updateGender(value): Promise<void>;
```

Sets the current user's gender.

The string crosses as it is written here, and each platform maps it to its
own SDK enum. See [Gender](#gender) for the two values.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | [`Gender`](#gender) |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the value has
been stored.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `VALIDATION_ERROR` when the value is neither `'male'` nor `'female'`. The
  rejection names the value it was given. The [Gender](#gender) type prevents
  this in TypeScript. The check runs natively. On iOS it runs before the
  configuration check, so an unconfigured call with a bad value reports the
  bad value. On Android the configuration check runs first.
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- On Android the value is written to the SDK's local store asynchronously,
  after the promise resolves. A failed write is not reported. On iOS the
  write is immediate.
- The stored profile belongs to the alias of the session that is running,
  on both platforms. Set a field before [Sessions.startSession](sessions.md#startsession) and
  the next session does not see it.
- A profile change on its own sends nothing to the server. The value reaches
  Pulsate inside the next user update the SDK sends. The SDK sends one only
  when a user action, such as a delivered push, or a custom attribute is
  pending. [Sessions.forceAttributeSync](sessions.md#forceattributesync) does not send one either.

#### Example

```ts
await updateGender('female');
```

***

### updateAge()

```ts
function updateAge(value): Promise<void>;
```

Sets the current user's age, in whole years.

The number crosses to the SDK as it is given.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `value` | `number` | A whole number of years, within the safe integer range. Nothing beyond that check is validated, so a negative age, or one far past a human lifetime, is stored as given. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the value has
been stored.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `VALIDATION_ERROR` when `value` is not a safe integer. That covers `25.5`,
  `NaN` and both infinities. It also covers whole numbers beyond
  `Number.MAX_SAFE_INTEGER`, such as `1e300`, which no longer describe a
  distinct number of years. Raised before the native SDK is reached.
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- The SDKs disagree on the type. Android stores the number as a string and
  iOS as an integer. A whole number is the one shape both keep exactly, so
  Android stores `25` as `"25"` and never as `"25.0"`.
- On Android the value is written to the SDK's local store asynchronously,
  after the promise resolves. A failed write is not reported. On iOS the
  write is immediate.
- The stored profile belongs to the alias of the session that is running,
  on both platforms. Set a field before [Sessions.startSession](sessions.md#startsession) and
  the next session does not see it.
- A profile change on its own sends nothing to the server. The value reaches
  Pulsate inside the next user update the SDK sends. The SDK sends one only
  when a user action, such as a delivered push, or a custom attribute is
  pending. [Sessions.forceAttributeSync](sessions.md#forceattributesync) does not send one either.

#### Example

```ts
await updateAge(37);
```

***

### updatePhoneNumber()

```ts
function updatePhoneNumber(value): Promise<void>;
```

Sets the current user's phone number, in E.164 form.

The value crosses to the SDK verbatim. Nothing is rejected before the
bridge, because each SDK owns the rule it applies.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `value` | `string` | The number in E.164 form, such as `+14155552671`. |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, whether or not the SDK
kept the number.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- Both SDKs drop a number they consider invalid, with no error reported, and
  they disagree on the rule. Android parses the number with libphonenumber
  and requires it to be valid for its region. It then stores the number in
  international format, without spaces or dashes. iOS strips every character
  except `+` and the digits, then requires `+` followed by 8 to 15 digits.
  The same number can be kept on one platform and dropped on the other.
- An empty string is dropped on both platforms. Nothing reports a drop: the
  promise resolves and the number never appears on the user.
- On Android a number the SDK keeps is written to its local store
  asynchronously, after the promise resolves. A failed write is not
  reported. On iOS the write is immediate, and what is stored is the
  stripped number rather than the value given.
- The stored profile belongs to the alias of the session that is running,
  on both platforms. Set a field before [Sessions.startSession](sessions.md#startsession) and
  the next session does not see it.
- A profile change on its own sends nothing to the server. The value reaches
  Pulsate inside the next user update the SDK sends. The SDK sends one only
  when a user action, such as a delivered push, or a custom attribute is
  pending. [Sessions.forceAttributeSync](sessions.md#forceattributesync) does not send one either.

#### Example

```ts
await updatePhoneNumber('+14155552671');
```

***

### setPrivacy()

```ts
function setPrivacy(level): Promise<void>;
```

Sets the current user's privacy level.

The level records whether the user is subscribed to Pulsate campaigns.
Unlike the other profile fields on this page, it sends its own request. See
[PrivacyLevel](#privacylevel) for the two values.

Once Pulsate has stored `'unsubscribed'`, it refuses to start a session for
that user: after a restart, [Sessions.startSession](sessions.md#startsession) rejects with
`REQUEST_ERROR` on Android and resolves on iOS. On iOS, sending
`'subscribed'` for the same alias lifts the refusal. On Android it does so
only on the install that sent `'unsubscribed'`, and only when called after
the rejected [Sessions.startSession](sessions.md#startsession) in the same process. On any other
install, for example after a reinstall or on a second device, the call sends
nothing because `'subscribed'` equals the level stored there, and the user
stays refused.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `level` | [`PrivacyLevel`](#privacylevel) |

#### Returns

`Promise`\<`void`\>

Resolves once the call has been dispatched, not once the level has
reached Pulsate.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `VALIDATION_ERROR` when the value is neither `'subscribed'` nor
  `'unsubscribed'`. The rejection names the value it was given. The
  [PrivacyLevel](#privacylevel) type prevents this in TypeScript. The check runs
  natively. On iOS it runs before the configuration check, so an
  unconfigured call with a bad value reports the bad value. On Android the
  configuration check runs first.
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- The two SDKs send on opposite edges of a sixty-second window. Android
  sends `'subscribed'` at once and holds `'unsubscribed'` for sixty seconds,
  where a `'subscribed'` inside that window cancels it. iOS sends the first
  level of a window at once, `'unsubscribed'` included, and holds any later
  level until the window closes. Two calls a second apart therefore send
  only the second level on Android and both on iOS, the second a minute
  later. If the first request is still in flight when the second call lands,
  iOS drops the second level when the first succeeds. Two requests
  completing out of order leave the device storing the earlier one.
- A level equal to the stored one sends nothing on Android. iOS sends it
  again.
- Android keeps the level for the alias of the session that is running. A
  level set while no alias is active is discarded, unless a session starts
  within those sixty seconds. That covers the time before the first
  [Sessions.startSession](sessions.md#startsession) and after [Sessions.logout](sessions.md#logout). Nothing
  reaches Pulsate, and [getPrivacy](#getprivacy) answers `'subscribed'` again once
  the session starts. Set the level after the session, not before.
- iOS keeps the level for the device. A level set before the first session
  is sent, and is still the level a later session reads. A level also
  survives [Sessions.logout](sessions.md#logout) and stays in force for the next user on
  that device.
- [getPrivacy](#getprivacy) answers the pending level until that level is sent. On
  iOS a send that fails is cached and replayed once at the next successful
  [Sessions.startSession](sessions.md#startsession). Until that replay succeeds,
  [getPrivacy](#getprivacy) keeps answering a level Pulsate never received, across
  app launches.

#### Example

```ts
await setPrivacy('unsubscribed');
```

***

### getPrivacy()

```ts
function getPrivacy(): Promise<PrivacyLevel>;
```

Reports whether the current user is subscribed to Pulsate campaigns.

Reads the level [setPrivacy](#setprivacy) writes. A local read, not a server read.
Until a level has been sent, the answer is that pending level. Otherwise it
is the stored level. Android stores it for the alias of the session that is
running. A level written while no alias was active is not the one a later
session reads. The answer can go back to `'subscribed'` when a session
starts. iOS stores it for the device, so a level written before the first
session is the one every later session reads.

On iOS a send that fails is cached and replayed once at the next successful
[Sessions.startSession](sessions.md#startsession). Until that replay succeeds, this call keeps
answering the pending level, across app launches, while Pulsate still holds
the previous one. See [setPrivacy](#setprivacy).

#### Returns

`Promise`\<[`PrivacyLevel`](#privacylevel)\>

The level; `'subscribed'` before anything has written one.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on Android when the SDK's local store cannot be read.
- `VALUE_ERROR` when the SDK answers a level outside [PrivacyLevel](#privacylevel).
  The rejection names the level it was given, and on iOS the native module
  raises it as well. The SDK versions this package wraps answer only the two
  levels.

#### Example

```ts
const level = await getPrivacy();
```

## Type Aliases

### Gender

```ts
type Gender = "male" | "female";
```

The gender values the SDKs define.

`'male'` and `'female'` are the whole set on both platforms.

***

### PrivacyLevel

```ts
type PrivacyLevel = "subscribed" | "unsubscribed";
```

The two privacy levels both SDKs define.

`'subscribed'` is the level in force before anything has written one.
