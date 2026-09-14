# Set up location and geofences

At the end of this page Pulsate tracks the user's location, and your
geofence campaigns can reach them. The page covers bare React Native and
Expo apps; where Expo differs, the step says so.

## Requirements

- `@pulsatehq/react-native-sdk` installed, `configure()` resolved and a
  session started with an alias, as in [Getting started](getting-started.md).
- iOS 15.1 or newer as the app's deployment target.
- Android `minSdkVersion` 28 or higher, and Google Play services on the
  device or emulator. Geofences also need
  [**Location Accuracy**](https://support.google.com/android/answer/3467281)
  turned on, which some devices label **Google Location Accuracy**.
- Geofences and a geofence campaign set up in the Pulsate dashboard.

## 1. Add the iOS usage descriptions

In `ios/<YOUR_APP>/Info.plist`, add both location usage descriptions. iOS
shows the text in its permission prompt. Write the text in your app's own
words; the strings below are examples.

```xml
<!-- ios/<YOUR_APP>/Info.plist -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location to show you offers nearby.</string>   <!-- Pulsate -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app uses your location in the background to tell you about offers nearby.</string>   <!-- Pulsate -->
```

Without both keys iOS shows no prompt and grants nothing. No background mode
is needed: iOS delivers geofence crossings without the `location` background
mode.

On Expo, set the same keys in the app config instead. The Pulsate config
plugin writes no location keys.

```json
// app.json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app uses your location to show you offers nearby.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app uses your location in the background to tell you about offers nearby."
      }
    }
  }
}
```

## 2. Keep the Android permissions

The SDK's manifest adds `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` and
`ACCESS_BACKGROUND_LOCATION` to your app when the build merges manifests.
There is nothing to add.

If you removed them following the optional step in
[Set up push notifications on Android](android-push-setup.md#5-optional-remove-the-location-permissions),
delete those three `tools:node="remove"` entries.

> [!IMPORTANT]
> Google Play reviews every app that declares `ACCESS_BACKGROUND_LOCATION`.
> Complete the location permissions declaration in Play Console before you
> submit a release. See Google's
> [background location access requirements](https://support.google.com/googleplay/android-developer/answer/9799150).

## 3. Ask for the permission

Ask when location makes sense in your flow, after a screen that explains why
the app needs it. Pulsate never asks on Android, so your app must.

On Android, ask in two steps: foreground location first, then background
location. From Android 11 (API 30) the background grant has no dialog. Open
the app's settings page instead, where the user chooses
**Allow all the time**.

```ts
// src/location/requestAndroidLocation.ts
import { Linking, PermissionsAndroid, Platform } from 'react-native';

const { ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_BACKGROUND_LOCATION } =
  PermissionsAndroid.PERMISSIONS;

export async function requestAndroidLocation(): Promise<'granted' | 'settings' | 'denied'> {
  const foreground = await PermissionsAndroid.requestMultiple([
    ACCESS_FINE_LOCATION,
    ACCESS_COARSE_LOCATION,
  ]);
  if (foreground[ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED) {
    return 'denied';
  }
  if (Number(Platform.Version) < 29 || (await PermissionsAndroid.check(ACCESS_BACKGROUND_LOCATION))) {
    return 'granted';
  }
  if (Number(Platform.Version) >= 30) {
    await Linking.openSettings();
    return 'settings';
  }
  const background = await PermissionsAndroid.request(ACCESS_BACKGROUND_LOCATION);
  return background === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
}
```

When the function returns `'settings'`, check the background grant again
once the user comes back to the app.

Rules for Android:

- Precise location is required. On Android 12 and later, a user who chooses
  **Approximate** counts as having denied location, and the SDK records
  nothing.
- With foreground permission alone, the SDK downloads geofences and monitors
  none. Geofencing needs the background grant.

On iOS, `setLocationEnabled(true)` in step 4 shows the system prompt the
first time it runs. To pick the moment yourself, ask first with a permission
library such as `react-native-permissions` or `expo-location`. Geofencing
needs **Always** access with **Precise Location** on.

> [!NOTE]
> When an app asks for Always access, iOS first offers
> **Allow While Using App**. It offers the change to **Always** later, on its
> own schedule. See Apple's
> [location authorization guide](https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services).

## 4. Turn tracking on or off

Tracking is on by default on both platforms. On Android, Pulsate tracks the
user's location as soon as the app holds the permission. On iOS, Pulsate asks
for the permission only when you call `setLocationEnabled(true)`. Set tracking
to match the user's choice. On iOS, turning it off does not stop the device from
monitoring the geofences Pulsate sends it, as the rules below explain.

```ts
// src/location/applyLocationConsent.ts
import { setLocationEnabled } from '@pulsatehq/react-native-sdk';

export async function applyLocationConsent(consented: boolean) {
  await setLocationEnabled(consented);
}
```

Rules for this step:

- If your app uses location for its own features, call
  `setLocationEnabled(false)` for every user who has not agreed to Pulsate
  tracking. On Android the permission alone lets Pulsate track them.
- A resolved promise means the setting was stored on the device.
  `isLocationEnabled()` answers the new value at once.
- On Android, Pulsate receives the setting a minute later at the earliest. On
  iOS the first change goes out at once, and the last change made inside that
  minute is sent when it ends.
- On Android, a change that is undone inside that minute sends nothing.
- Pulsate can turn tracking off from its own side. Read `isLocationEnabled()`
  rather than caching the value.
- On iOS, turning tracking on also starts location updates, which is what
  shows the prompt when the app has never asked.
- On iOS, turning tracking off stops nothing on the device. Geofences stay
  monitored, and crossings are still reported to Pulsate with the device's
  location. That lasts until the user logs out or Pulsate sends the device no
  geofences.
- On Android, turning tracking off and back on in the same run does not
  restart geofence monitoring. Monitoring resumes after the app restarts.
  Set the value once per run.

## 5. Read the last known location

`getLastKnownLocation()` answers a location the SDK holds for the device. On
Android it is the most recent one. On iOS the SDK keeps its locations in no
particular order, so the answer is not always the latest.

```ts
// src/location/logLastKnownLocation.ts
import { getLastKnownLocation } from '@pulsatehq/react-native-sdk';

export async function logLastKnownLocation() {
  const fix = await getLastKnownLocation();
  if (fix === null) {
    return;
  }
  console.log(fix.latitude, fix.longitude, fix.accuracy, new Date(fix.timestamp));
}
```

Rules for this step:

- `null` means the SDK holds no location, including when the app has no
  permission. It is not an error.
- `timestamp` is in milliseconds since the epoch. `accuracy` is in metres and
  can be absent.
- On Android a call with nothing to report can take about ten seconds before
  it resolves `null`.

## 6. Follow geofence crossings on Android

The geofence campaign needs no code: Pulsate delivers it when the device
crosses a geofence. To react in the app as well, subscribe to `onGeofence`
at startup.

```ts
// index.js
import { addListener } from '@pulsatehq/react-native-sdk';

addListener('onGeofence', ({ geofenceIds, transition, location }) => {
  console.log(transition, geofenceIds, location);
});
```

Rules for this step:

- `onGeofence` fires on Android only. iOS reports crossings straight to
  Pulsate, and subscribing there is harmless.
- One crossing is one event. `geofenceIds` can hold several ids. Treat each
  id as an opaque string.
- `transition` is `'enter'` or `'exit'`. The SDK does not register dwell
  times, so `'dwell'` never arrives.
- Expect more events than Pulsate records. The SDK registers its geofences
  about two minutes after every app start, and a device already inside one
  reports an `'enter'` each time.
- The handler never sees geofencing errors the operating system reports.
- Pulsate registers the nearest fences around the device, not every fence in
  the campaign.

## Verify

1. On Android, run `requestAndroidLocation()` and grant both steps.
   `PermissionsAndroid.check(ACCESS_BACKGROUND_LOCATION)` then resolves
   `true`.
2. On iOS, call `applyLocationConsent(true)` on a fresh install. The system
   location prompt appears.
3. On Android, call `getLastKnownLocation()`. It resolves coordinates close
   to the device's position. On iOS it resolves coordinates once Core
   Location has delivered a location to the SDK.
4. On Android, start the app inside a geofence and wait two minutes.
   `onGeofence` fires with `'enter'` and the geofence's id.
5. Cross into a geofence with a device that runs the app. The geofence
   campaign's message arrives.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No location prompt on iOS | A usage description is missing from `Info.plist`, or the user already answered | Add both keys, as in step 1. If the user answered before, send them to the app's page in **Settings** |
| The iOS prompt offers only **Allow While Using App** | iOS asks for Always access in two stages | Expected. iOS offers Always later, as the note in step 3 says |
| Nothing happens when asking for background location on Android | From API 30 that grant has no dialog | Open the app's settings page, as in step 3 |
| Nothing is tracked on Android although the user granted location | The user chose **Approximate** | Ask again and ask the user to keep **Precise** on |
| `getLastKnownLocation()` resolves `null` | The app has no permission, or the device has no location yet | Complete step 3. On an emulator or simulator, set a location in its location controls |
| `getLastKnownLocation()` resolves `null` on iOS right after tracking is turned on | The SDK stores a location only after Core Location delivers one | Read it again later, once the device has reported a location |
| `getLastKnownLocation()` takes about ten seconds on Android | The SDK searched every source and found nothing | Expected when no location is available |
| `isLocationEnabled()` is `true` but nothing is tracked | The operating system permission is missing | Complete step 3 |
| `onGeofence` never fires on Android | Background location is not granted, or the geofences are not registered yet | Grant background location, as in step 3. Wait two minutes after the app starts |
| `onGeofence` never fires, although location is on | **Location Accuracy** is off, so Google Play services registers no geofence | Turn on **Location Accuracy**, labelled **Google Location Accuracy** on some devices, in the location settings |
| Location is tracked for a user who never agreed to it | Tracking is on by default | Call `setLocationEnabled(false)` until the user agrees, as in step 4. On iOS the device still monitors the geofences Pulsate sends it, as the rules in step 4 say |
| Geofence crossings still reach Pulsate after an iOS user opted out | On iOS turning tracking off stops nothing on the device | Expected until the user logs out. See the rules in step 4 |
| `onGeofence` stopped firing after tracking was switched off and on | Monitoring does not restart in the same run | Restart the app, and set the value once per run, as in step 4 |
| `onGeofence` never fires on iOS | iOS reports crossings straight to Pulsate | Expected. Handle geofences on iOS through the campaign only |
| A geofence campaign never triggers on iOS for a user already inside the geofence | iOS reports boundary crossings only | The campaign triggers after the user leaves and enters again |
| Play Console flags background location | The SDK's manifest declares `ACCESS_BACKGROUND_LOCATION` | Complete the declaration, as in step 2, or remove the permissions if the app does not use location |

## How it works

Your app owns the permission. The bridge never asks for it, and the Android
SDK does not either. On iOS the SDK asks through Core Location when tracking
is enabled and the user has never answered.

`setLocationEnabled` stores the user's choice on the device and sends it to
Pulsate on a request of its own. Android waits about a minute, so a burst of
changes becomes one request, and starts or stops geofence monitoring when
that request goes out. iOS sends the first change at once and folds any
later change within that minute into one request at its end.

Pulsate sends the device the geofences near it. The device's operating
system watches them: Google Play services on Android, Core Location on iOS. On
Android the SDK hands each crossing to the bridge, which raises
`onGeofence`, and reports it to Pulsate. On iOS the SDK reports the crossing
to Pulsate directly. Either way Pulsate decides whether a campaign fires.

## Next steps

- [Subscribe to SDK events](handling-events.md)
- [Location reference](api/location.md)
- [Declare the data the SDK collects](data-collection.md)
- [Set up push notifications on Android](android-push-setup.md)
