# Crash reporting

Turn the native SDKs' crash reporting off or on, and read the stored choice.

## Functions

### setCrashReportingEnabled()

```ts
function setCrashReportingEnabled(enabled): Promise<void>;
```

Enables or disables the native SDKs' crash reporting for this device.

Crash reporting is on by default. When a crash or freeze involves Pulsate
code, the SDK keeps a short report on the device and uploads it to Pulsate.
On Android this package's native code counts as Pulsate code; on iOS only
the Pulsate SDK framework does. The choice is stored on the device, survives
restarts, updates and sign-outs, and is independent of
["User profile".setPrivacy](user-profile.md#setprivacy).

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

- `false` takes effect at once on both platforms: capture stops, the
  reports waiting on the device are deleted, and nothing later is uploaded.
- `true` resumes collection. On iOS a report is delivered from the next
  launch at the earliest. On Android, if the app started with crash
  reporting off, capture resumes from the next app start, because the SDK
  installs its handler before your JavaScript runs. On both platforms,
  crashes and freezes from the time it was off are never reported.
- On iOS reports are collected on iOS 16.1 and later only. The stored
  choice is kept on earlier versions too.
- On Android freezes are reported on Android 11 and later only. Below that
  only crashes are.
- A fresh install collects from its first launch. This call rejects until
  [Sessions.configure](sessions.md#configure) has resolved, so the earliest it can turn
  collection off is right after that.

#### Example

```ts
await setCrashReportingEnabled(false);
```

***

### isCrashReportingEnabled()

```ts
function isCrashReportingEnabled(): Promise<boolean>;
```

Reports the stored crash-reporting choice for this device.

Reads the choice [setCrashReportingEnabled](#setcrashreportingenabled) writes. It is not whether
the running app is collecting right now: on Android turning it back on
takes effect from the next app start when the app started with it off, and
on iOS nothing is collected below iOS 16.1.

#### Returns

`Promise`\<`boolean`\>

`true` when crash reporting is on, which is the answer before
anything has written the choice. `false` when it has been turned off.

#### Throws

[Errors.PulsateError](errors.md#pulsateerror)
- `CONFIGURATION_ERROR` before [Sessions.configure](sessions.md#configure) has resolved.

#### Example

```ts
const enabled = await isCrashReportingEnabled();
```
