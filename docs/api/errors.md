# Errors

The error type every promise rejects with, and the rejection types.

## Classes

### PulsateError

The error every Pulsate promise rejects with, and the payload of the
`onError` event.

Extends `Error`, so `instanceof PulsateError` works and `name` is
`"PulsateError"`.

#### Example

```ts
try {
  await startSession('customer-12345');
} catch (error) {
  if (error instanceof PulsateError && error.type === 'REQUEST_ERROR') {
    // the backend refused the session
  }
}
```

#### Extends

- `Error`

#### Constructors

##### Constructor

```ts
new PulsateError(init): PulsateError;
```

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `init` | [`PulsateErrorInit`](#pulsateerrorinit) |

###### Returns

[`PulsateError`](#pulsateerror)

###### Overrides

```ts
Error.constructor
```

#### Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="property-type-1"></a> `type` | `readonly` | `string` | A [PulsateRejectionType](#pulsaterejectiontype) for a rejection, or the SDK's own error type on the `onError` event. |
| <a id="property-platform-1"></a> `platform` | `readonly` | [`PulsatePlatform`](#pulsateplatform) | The platform the error was raised on. |
| <a id="property-nativemessage-1"></a> `nativeMessage?` | `readonly` | `string` | The native SDK's text when the error crossed the bridge. Absent when the call was refused before reaching it. |

## Interfaces

### PulsateErrorInit

The fields a [PulsateError](#pulsateerror) is constructed from.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-type"></a> `type` | `string` | A [PulsateRejectionType](#pulsaterejectiontype), or the SDK's error type on the `onError` event. |
| <a id="property-platform"></a> `platform` | [`PulsatePlatform`](#pulsateplatform) | The platform the error was raised on. |
| <a id="property-message"></a> `message` | `string` | Human-readable text. |
| <a id="property-nativemessage"></a> `nativeMessage?` | `string` | The native SDK's text, when the error crossed the bridge. |

## Type Aliases

### PulsatePlatform

```ts
type PulsatePlatform = "ios" | "android";
```

The platform a [PulsateError](#pulsateerror) was raised on.

***

### PulsateRejectionType

```ts
type PulsateRejectionType = 
  | "VALIDATION_ERROR"
  | "CONFIGURATION_ERROR"
  | "REQUEST_ERROR"
  | "VALUE_ERROR";
```

The rejection types a promise can reject with.

- `VALIDATION_ERROR`: the argument was refused, or the credentials differ
  from the ones already configured. Most arguments are refused before the
  native SDK is reached, and a few by the bridge's native module.
- `CONFIGURATION_ERROR`: the SDK is not configured. `configure()` has not
  resolved, or its preconditions are not met.
- `REQUEST_ERROR`: the native SDK reported a failed request or a failed
  local read.
- `VALUE_ERROR`: the native SDK answered a value the contract cannot
  represent; raised by `getPrivacy` for a level outside the two.
