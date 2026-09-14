# Location

Turn Pulsate's location tracking on or off, read the last known fix, and follow geofence crossings.

## Functions

### setLocationEnabled()

```ts
function setLocationEnabled(enabled): Promise<void>;
```

Turns Pulsate's location tracking on or off for the current user.

Grant the operating system's location permission before enabling tracking.
The bridge never asks for it. On Android the SDK does not ask either, and
enabling tracking without it starts nothing. On iOS enabling shows the
system prompt when the app has never asked.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `enabled` | `boolean` |

#### Returns

`Promise`\<`void`\>

Resolves once the change has been dispatched. On Android the
setting reaches Pulsate about a minute later. On iOS the first change is
sent at once, and later changes within that minute are sent together at
its end. A resolve does not mean the server has accepted it.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Remarks

- iOS: enabling records the setting and starts Core Location. That shows the
  system permission prompt for Always access if the app has never answered
  it. Disabling records the setting only; region monitoring stops when the
  next server response carries no geofences.
- Android: the setting is stored at once, and about a minute later the SDK
  sends it to Pulsate on a request of its own. The following all apply
  there.
  - The request is skipped when the stored value already matches, and
    geofence monitoring starts or stops only then. A read in between answers
    the value that was set.
  - Once tracking has been switched off in a running process, switching it
    back on sends the new setting to Pulsate. Geofence monitoring does not
    restart until the app process restarts.
  - Pulsate can also switch tracking off from the server, and the app is not
    told when that happens.
  - Geofences reach Play Services only while background location permission
    is granted. With foreground permission alone the SDK stores locations
    and downloads geofences but monitors nothing.
  - The SDK reads the precise grant only, so a user who chooses Approximate
    location on Android 12 and later counts as having denied it.

#### Example

```ts
await setLocationEnabled(true);
```

***

### isLocationEnabled()

```ts
function isLocationEnabled(): Promise<boolean>;
```

Reads whether location tracking is enabled for the current user.

#### Returns

`Promise`\<`boolean`\>

The value last set on this device, which a set call reflects at once,
before Pulsate has been told.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on Android when the SDK's local store cannot be read.

#### Remarks

Android reads the value through an SDK callback, so the read has a failure
path. iOS reads it synchronously and cannot fail.

#### Example

```ts
const enabled = await isLocationEnabled();
```

***

### getLastKnownLocation()

```ts
function getLastKnownLocation(): Promise<Coordinates | null>;
```

Reads the last location the SDK holds for this device.

#### Returns

`Promise`\<[`Coordinates`](#coordinates) \| `null`\>

The location, or `null` when the SDK holds none. That includes when
the app has no location permission. Never rejects for the absence of a fix.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.
- `REQUEST_ERROR` on Android when the SDK reports any failure other than the
  answer that it holds no fix. iOS has no failure path for this call.

#### Remarks

See [Coordinates](#coordinates) for the field units.

On iOS the SDK answers the last row of its own location store. That store is
not ordered by time, so the fix can be older than another one it holds.

On Android the SDK searches memory, its own database and then the fused
location provider twice. A call with nothing to report can take about ten
seconds before it resolves `null`. Without the permission the answer is
immediate.

#### Example

```ts
const fix = await getLastKnownLocation();
```

## Interfaces

### Coordinates

A location the SDK holds for this device.

`timestamp` is epoch milliseconds on both platforms. `accuracy` is horizontal
accuracy in metres and is absent when the platform has none to report for the
fix.

#### Properties

| Property | Type |
| ------ | ------ |
| <a id="property-latitude"></a> `latitude` | `number` |
| <a id="property-longitude"></a> `longitude` | `number` |
| <a id="property-accuracy"></a> `accuracy?` | `number` |
| <a id="property-timestamp"></a> `timestamp` | `number` |

***

### GeofenceEvent

A geofence crossing reported by the SDK.

One crossing can carry several triggering geofences, one transition, and the
fix that triggered it.

#### Remarks

Reported on Android only. iOS monitors its regions inside the SDK and reports
crossings straight to Pulsate, with no client callback to forward.

#### Properties

| Property | Type |
| ------ | ------ |
| <a id="property-geofenceids"></a> `geofenceIds` | `string`[] |
| <a id="property-transition"></a> `transition` | `"enter"` \| `"dwell"` \| `"exit"` |
| <a id="property-location"></a> `location?` | [`Coordinates`](#coordinates) |
