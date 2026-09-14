# Control when in-app messages appear

At the end of this page your app decides when Pulsate in-app messages may
appear, and how long a small message stays on screen. These are runtime
calls, so no rebuild is needed. To change the colours, see
[Theme in-app messages](theming.md).

## Requirements

- `@pulsatehq/react-native-sdk` installed, `configure()` resolved and a
  session started with an alias, as in [Getting started](getting-started.md).
- React Native 0.76 or newer with the New Architecture enabled.
- iOS 15.1 or newer as the app's deployment target.
- Android `minSdkVersion` 28 or higher.
- An in-app campaign in the Pulsate dashboard, to see the effect.

## 1. Pause messages during a flow

Turn in-app messages off before a flow that must not be interrupted, such
as a payment, and on again after it.

```ts
// src/checkout/withInAppPaused.ts
import { Platform } from 'react-native';
import {
  isInAppEnabled,
  setInAppEnabled,
  showLastInApp,
} from '@pulsatehq/react-native-sdk';

export async function withInAppPaused(task: () => Promise<void>) {
  const wasEnabled = await isInAppEnabled();
  await setInAppEnabled(false);
  try {
    await task();
  } finally {
    await setInAppEnabled(wasEnabled);
    if (wasEnabled && Platform.OS === 'ios') {
      await showLastInApp();
    }
  }
}
```

A message that arrives while messages are off is counted as delivered and is
not shown. When messages are on again, Android shows the last withheld
message by itself. iOS only turns messages back on, so the sample calls
`showLastInApp()` there. `showLastInApp()` bypasses the gate, and resolves
whether or not a message was buffered.

Rules for this step:

- On Android, do not call `showLastInApp()` within about 80 seconds of a
  message being withheld. The SDK is still retrying that message, and the
  two cancel each other. A call made while another message is arriving
  cancels that message.
- On iOS every `showLastInApp()` records another delivery, which inflates the
  campaign's statistics. Call it once.
- `userHasLoggedIn()` turns messages on and `userHasLoggedOut()` turns them
  off, so a value set here lasts until the next of those calls.
- What the SDK keeps for later differs by platform. See
  [How it works](#how-it-works).
- The setting is per user on Android and per device on iOS.
  `isInAppEnabled()` reads it, and answers `true` until something changes
  it.
- On Android the flag is written after `setInAppEnabled` resolves, and a
  failed write is not reported. A read that awaits the write first returns
  the new value.

## 2. Set how long a small message stays

A small in-app message disappears after 12 seconds by default. Change the
duration once, at startup.

```ts
// src/pulsate/configureInApp.ts
import { setSmallInAppDuration } from '@pulsatehq/react-native-sdk';

export async function configureInApp() {
  await setSmallInAppDuration(20);
}
```

The value is a whole number of seconds and stays on the device. It must be a
positive integer no greater than 2147483647. `setSmallInAppDuration` rejects
with `VALIDATION_ERROR` for anything else, including zero, a negative number,
a decimal, `NaN` and the infinities. `getSmallInAppDuration()` reads the value
back.

> [!IMPORTANT]
> On Android, stay at or below 2147483 seconds. A larger value is accepted, and
> the banner duration wraps when it is converted to milliseconds.

## 3. Handle in-app errors on Android

On Android, a message that could not be shown fires `onError` with type
`"INAPP_ERROR"` after the SDK's retries are exhausted. That happens up to about
85 seconds after the message arrived, and only while the app stays in the
foreground. A message withheld while messages are off is one such case.
`onError` never fires on iOS.

See [Subscribe to SDK events](handling-events.md) for how to handle
`onError` safely.

## Verify

1. Call `setInAppEnabled(false)`, then trigger an in-app campaign from the
   dashboard. No message appears, and `isInAppEnabled()` resolves `false`.
2. Call `setInAppEnabled(true)`. On Android the withheld message appears. On
   iOS, call `showLastInApp()` as well, and the message appears.
3. Call `setSmallInAppDuration(20)` and trigger a small in-app message. It
   stays on screen for about 20 seconds.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No in-app message ever appears | Messages are off, set by `setInAppEnabled(false)` or `userHasLoggedOut()` | Call `setInAppEnabled(true)`, as in step 1 |
| A withheld message does not appear on iOS after messages are on again | iOS only turns messages back on | Call `showLastInApp()`, as in step 1 |
| A withheld message never reappears on Android after `showLastInApp()` | The call came within about 80 seconds of the message being withheld | Use `setInAppEnabled(true)` alone on Android, as in step 1 |
| A campaign's delivery count grows without new users on iOS | `showLastInApp()` was called repeatedly | Call it once per withheld message |
| `setSmallInAppDuration` rejects with `VALIDATION_ERROR` | The value is not a positive integer, or is above 2147483647 | Pass a positive whole number of seconds, as in step 2 |
| Messages come back after a sign-in | `userHasLoggedIn()` turns messages on | Call `setInAppEnabled(false)` after it if the flow is still running |

## How it works

The on and off setting is a flag on the device. Pulsate still sends the
message and counts it as delivered; the SDK decides locally whether to show
it. What the SDK keeps for later differs by platform. iOS keeps a message
that arrived while messages were off. Android keeps the last message it
tried to show, whatever stopped it. It forgets that message when the user
dismisses or taps a message, when the app stops, and on logout.

## Next steps

- [Theme in-app messages](theming.md)
- [Subscribe to SDK events](handling-events.md)
- [In-app notifications reference](api/in-app-notifications.md)
