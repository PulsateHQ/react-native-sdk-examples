# Pulsate React Native examples

Runnable example apps for
[`@pulsatehq/react-native-sdk`](https://www.npmjs.com/package/@pulsatehq/react-native-sdk).

| Directory | What it is |
|---|---|
| [`example`](example) | Bare React Native app covering every public method and event |
| [`example-expo`](example-expo) | Expo app installed through the Pulsate config plugin |

Each directory has its own README with setup, run instructions and a tour of how
it is put together. Both depend on the published library, so they install
straight from npm with nothing local required.

Pick the bare app to explore the full API surface, screen by screen, with a log
of every event the SDK emits. Pick the Expo app to see what the config plugin
generates, including the iOS notification service extension.

## Documentation

The reference and integration guides are in [`docs/`](docs/) here, and ship
inside the package as `node_modules/@pulsatehq/react-native-sdk/docs`:

| File | Covers |
|---|---|
| `getting-started.md` | Installing and configuring the SDK |
| `android-push-setup.md` | Firebase, the manifest, and the push service |
| `ios-push-setup.md` | APNs keys, entitlements, the notification service extension |
| `expo.md` | The config plugin and what prebuild generates |
| `theming.md` | In-app message colours and Android strings |
| `in-app-messages.md` | When in-app messages appear and for how long |
| `user-profile.md` | Profile fields and the privacy level |
| `attributes-and-events.md` | Custom events, attributes and counters |
| `feed.md` | The feed, its unread count, and who may see Pulsate content |
| `location.md` | Location permissions, tracking and geofences |
| `handling-events.md` | Subscribing to the events the SDK raises |
| `errors.md` | What each rejection means |
| `api/` | Generated API reference |

## Requirements

| | Version |
|---|---|
| Node | 24.13 or later |
| React Native (bare example) | 0.85 |
| Expo (Expo example) | SDK 54 |
| Xcode | 16 or later, with CocoaPods |
| cmake | Only if the Hermes prebuilt cannot be downloaded |
| Android | JDK 17, compile SDK 36, minimum SDK 28 |

iOS builds need a Mac. The Expo example cannot run in Expo Go, because the SDK
ships native code — it needs a development build.

If `pod install` fails with `Unable to locate the executable cmake`, React
Native could not download its prebuilt Hermes and is falling back to building
it from source. That is usually a transient problem with React Native's Maven
proxy rather than anything wrong with your setup: retry in a few minutes, or
install cmake (`brew install cmake`) to let the source build proceed.

## Versioning

A tag here matches the SDK release the examples were generated from. Check out
the tag matching the version you depend on. The default branch may be slightly
ahead if an example fix shipped between releases.

## Contributing

These apps are generated from the SDK repository, so a pull request opened here
cannot be merged and the next release would overwrite it. Please open an issue
instead, or contact Pulsate support, and the fix will ship in a following
release.
