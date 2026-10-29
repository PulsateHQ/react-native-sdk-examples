# Pulsate React Native example (bare)

A bare React Native app exercising every public method and event in
`@pulsatehq/react-native-sdk`. Each SDK area has its own screen, and a Log
screen records every event the SDK emits, so you can watch what a call
actually produces before wiring it into your own app.

This copy is standalone. It depends on the published library, not on Pulsate's
repository.

## Requirements

Node 22.13 at minimum (the oldest release React Native 0.85 accepts on a
supported LTS line); Node 24 LTS recommended, and 24.13 is what this example is
built and tested with. React Native 0.85, JDK 17 for Android, and Xcode 16 or
later with CocoaPods for iOS (built and tested with Xcode 26). iOS builds need
a Mac.

If `pod install` fails with `Unable to locate the executable cmake`, React
Native could not download its prebuilt Hermes and is building it from source
instead. Retry in a few minutes, or `brew install cmake`.

## Setup

```bash
npm install
```

`package-lock.json` pins the dependency tree resolved when this release was
mirrored, so every clone installs the same tree. `npm ci` installs exactly
that; `npm install` keeps it unless you change `package.json`.

Installing creates `src/credentials.local.ts` from the committed template. If you
installed with `--ignore-scripts`, copy `src/credentials.local.example.ts`
to `src/credentials.local.ts` yourself — the app cannot build without it. Open
it and paste the 64-character app ID and key from your Pulsate admin. The app
runs without them, but `configure` is skipped and nothing reaches the
dashboard.

## Running

```bash
npm run start        # Metro
npm run android
npm run ios          # pods install automatically on first build
```

iOS needs CocoaPods. If you use bundler, `bundle install` then `bundle exec pod
install` from `ios/` reproduces the pinned toolchain in `Gemfile.lock`.

## How it is put together

`configure` is called once at bootstrap in `src/App.tsx`, which is the flow a
real integration uses: configure, then register listeners, then start a session
when you know who the user is. Credentials come from `src/credentials.ts`, which
reads the gitignored `credentials.local.ts`.

| Path | What it holds |
|---|---|
| `src/screens/` | One screen per SDK area — sessions, attributes, push, in-app, feed, deeplinks, location — plus Settings and Log |
| `src/log/` | The listener registry every SDK event flows through, feeding the Log screen |
| `src/links/` | Deeplink routing, showing how to turn a consumed link into navigation |
| `src/coexist/` | Running alongside Firebase Messaging and Notifee, including background handlers registered in `index.js` |
| `src/ui/`, `src/theme/` | A small hand-rolled component kit, so nothing here depends on a UI library |
| `ios/PulsateNotificationService/` | The notification service extension that renders rich pushes |

The Log screen is the fastest way to understand the SDK: every event the
library emits is recorded there with its payload, so you can call something and
see exactly what comes back.

## Change the bundle identifiers before testing push

The app ships with Pulsate's own identifiers so it builds out of the box:

| Platform | Identifier |
|---|---|
| iOS | `pulsate.reactnativesdk.app` |
| Android | `pulsatehq.reactnativesdk.example` |

Push will not reach you on those. Replace them with identifiers registered to
your own Apple and Firebase accounts, in `ios/` via Xcode and in
`android/app/build.gradle`, and add your own `google-services.json` under
`android/app/`.

## Push

Android needs `google-services.json` from your Firebase project. iOS needs a
push-enabled provisioning profile and an APNs key uploaded to Pulsate; the
`PulsateNotificationService` target is the notification service extension that
renders rich pushes.

The app also demonstrates coexistence with Firebase Messaging and Notifee, so
you can see how Pulsate behaves alongside another push stack rather than
assuming it must own the token.

## Notes

`src/credentials.local.ts` is created by `npm install` and is already listed in
`.gitignore`. Keep it that way — it holds your app ID and key.

The app registers the `pulsate` URL scheme in
`ios/ReactNativeSdkExample/Info.plist` for its own demo links (the Deeplinks
screen). Your app does not need it: the SDK delivers campaign links through
`onLink`. Register your own scheme if you want one. Two apps on a phone that
both claim `pulsate` compete for the same links.
